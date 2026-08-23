"""
Background QThread — owns the webcam and runs BOTH models on every frame.

Pipeline:
  1. YOLO hand detector -> UP TO TWO hand boxes (drawn on screen so both
     hands are visible), highest-confidence one is used to crop for the
     alphabet classifier (alphabet signs are one-handed).
  2. Alphabet classifier (EfficientNetB0) gets the single best YOLO crop
     from the MIRRORED frame (matches how it was trained/used).
  3. Words classifier: MediaPipe runs on the FULL, UNMIRRORED frame
     (independently of YOLO) -- the words training data was captured
     with no horizontal-flip augmentation, so feeding it the mirrored
     display frame flips hand geometry left/right and breaks predictions.

The winner (highest confidence) is emitted as the primary prediction.
Both results are also emitted separately so the UI can show both.
"""

import time
import cv2
import numpy as np
from PySide6.QtCore import QThread, Signal

from inference       import SignLanguageClassifier
from inference_words import WordClassifier
from hand_detector   import HandDetector


class CameraWorker(QThread):
    frame_ready       = Signal(np.ndarray)   # raw BGR for display
    letter_ready      = Signal(dict)          # alphabet model result
    word_ready        = Signal(dict)          # words model result
    best_ready        = Signal(dict)          # highest-confidence winner
    no_hand_detected  = Signal()
    hand_box_ready    = Signal(object)        # (x1,y1,x2,y2) or None
    error_occurred    = Signal(str)
    fps_updated       = Signal(float)

    def __init__(self, classifier, word_classifier, hand_detector,
                 camera_index=0, parent=None):
        super().__init__(parent)
        self.classifier      = classifier
        self.word_classifier = word_classifier
        self.hand_detector   = hand_detector
        self.camera_index    = camera_index
        self._running        = False
        self._paused         = False
        self._frame_count    = 0
        self.infer_every_n   = 2
        self.mode             = "both"  # "both" | "alphabet" | "words"

    def set_mode(self, mode: str):
        """Choose which model(s) actually run: 'alphabet', 'words', or 'both'."""
        if mode in ("alphabet", "words", "both"):
            self.mode = mode

    def run(self):
        self._running = True
        cap = cv2.VideoCapture(self.camera_index, cv2.CAP_DSHOW)
        if not cap.isOpened():
            cap = cv2.VideoCapture(self.camera_index)
        if not cap.isOpened():
            self.error_occurred.emit(
                "Could not open the webcam. Make sure it is connected "
                "and not used by another application."
            )
            return

        cap.set(cv2.CAP_PROP_FRAME_WIDTH,  1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

        prev_time  = time.time()
        fps_smooth = 0.0

        while self._running:
            if self._paused:
                time.sleep(0.05)
                continue

            ret, frame_bgr_raw = cap.read()
            if not ret:
                continue

            # Display + alphabet model: mirrored, for a natural selfie view.
            frame_bgr = cv2.flip(frame_bgr_raw, 1)
            self.frame_ready.emit(frame_bgr)

            self._frame_count += 1
            if self._frame_count % self.infer_every_n == 0:
                frame_rgb       = cv2.cvtColor(frame_bgr,     cv2.COLOR_BGR2RGB)
                # Words model: UNMIRRORED frame. Training data for the words
                # model was captured with no_flip=True, so feeding it the
                # mirrored frame flips hand geometry left/right and produces
                # consistently wrong (often single-class) predictions.
                frame_rgb_unflipped = cv2.cvtColor(frame_bgr_raw, cv2.COLOR_BGR2RGB)
                self._run_inference(frame_rgb, frame_rgb_unflipped)

            now = time.time()
            dt  = now - prev_time
            prev_time = now
            if dt > 0:
                fps = 1.0 / dt
                fps_smooth = fps_smooth * 0.9 + fps * 0.1 if fps_smooth else fps
                self.fps_updated.emit(fps_smooth)

        cap.release()

    def _run_inference(self, frame_rgb, frame_rgb_words=None):
        if frame_rgb_words is None:
            frame_rgb_words = frame_rgb

        letter_result = None
        word_result   = None
        run_alphabet  = self.mode in ("alphabet", "both")
        run_words     = self.mode in ("words", "both")

        # ── Step 1: YOLO hand detection — up to 2 hands for display ─────────
        hands = []
        crop  = None
        try:
            hands = self.hand_detector.detect_all(frame_rgb, max_hands=2)
            if hands:
                # emit ALL boxes so both hands are drawn on screen
                self.hand_box_ready.emit([h["box"] for h in hands])
                best = hands[0]   # already sorted by confidence
                crop = self.hand_detector.crop(frame_rgb, best["box"])
                if crop.size == 0:
                    crop = None
            else:
                self.hand_box_ready.emit(None)
        except Exception as e:
            self.error_occurred.emit(f"Hand detector error: {e}")

        # ── Step 2: Alphabet model (EfficientNetB0 on the best YOLO crop) ──
        if run_alphabet:
            if hands and crop is not None:
                try:
                    r = self.classifier.predict_smoothed(crop)
                    r["hand_confidence"] = hands[0]["confidence"]
                    r["model"] = "alphabet"
                    letter_result = r
                    self.letter_ready.emit(r)
                except Exception as e:
                    self.error_occurred.emit(f"Alphabet model error: {e}")
            else:
                self.classifier.reset_smoothing()

        # ── Step 3: Words model — MediaPipe on the FULL frame, independent
        #    of YOLO, so it can see and use BOTH hands ───────────────────────
        if run_words:
            try:
                wr = self.word_classifier.detect_and_predict(frame_rgb_words)
                if wr:
                    wr["model"] = "words"
                    word_result = wr
                    self.word_ready.emit(wr)
                else:
                    self.word_classifier.reset_smoothing()
            except Exception as e:
                self.error_occurred.emit(f"Words model error: {e}")

        # ── Best winner: highest confidence across whichever model(s) ran ───
        candidates = [r for r in [letter_result, word_result] if r is not None]
        if candidates:
            best = max(candidates, key=lambda r: r["confidence"])
            self.best_ready.emit(best)
        else:
            self.no_hand_detected.emit()

    def pause(self):
        self._paused = True

    def resume(self):
        self._paused = False
        self.classifier.reset_smoothing()
        self.word_classifier.reset_smoothing()

    def stop(self):
        self._running = False
        self.wait(3000)
