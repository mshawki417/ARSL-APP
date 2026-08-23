"""
Inference engine for the Yemeni Arabic Sign Language WORDS model.

Architecture (landmark-based, NOT image-based):
  Camera frame (FULL frame, not the YOLO crop -- this model needs to see
  up to TWO hands, while YOLO's hand box is single-hand and only feeds
  the alphabet model)
    -> MediaPipe HandLandmarker (new Tasks API), num_hands=2
    -> extract 156 features per frame:
         2 hands × 78 features each
         78 = 21 landmarks × 3 (x, y, z), wrist-relative and scaled so the
              wrist->middle-finger-MCP distance is 1.0, PLUS 15
              inter-fingertip distances on those normalized landmarks
         (distances between all pairs of: wrist, thumb_tip, index_tip,
          middle_tip, ring_tip, pinky_tip = C(6,2) = 15)
    -> StandardScaler (scaler.pkl from training)
    -> ONNX model (sign_model.onnx) — 0.24ms inference
    -> softmax output, 32 classes

MediaPipe hand_landmarker.task is downloaded automatically on first run
(~8 MB) and cached in ~/.arsl_app/models/.

Why ONNX over H5?
  ONNX: ~0.11ms per inference
  TF H5: ~5-15ms per inference
  -> ONNX is 50-100x faster on CPU, critical for real-time <8s response.
"""

import os
import urllib.request
import numpy as np
import pickle
import warnings
from collections import deque

from labels_words import INDEX_TO_WORD_AR, INDEX_TO_WORD_EN, NUM_WORD_CLASSES

MODEL_CACHE_DIR = os.path.join(os.path.expanduser("~"), ".arsl_app", "models")
TASK_MODEL_URL  = (
    "https://storage.googleapis.com/mediapipe-models/"
    "hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
)
TASK_MODEL_NAME = "hand_landmarker.task"

# fingertip + wrist landmark indices for distance features
_DIST_INDICES = [0, 4, 8, 12, 16, 20]   # wrist, thumb, index, middle, ring, pinky


def _download_task_model() -> str:
    os.makedirs(MODEL_CACHE_DIR, exist_ok=True)
    local = os.path.join(MODEL_CACHE_DIR, TASK_MODEL_NAME)
    if not os.path.exists(local):
        urllib.request.urlretrieve(TASK_MODEL_URL, local)
    return local


def _extract_features(hand_landmarks_list) -> np.ndarray:
    """
    Convert MediaPipe HandLandmarker result to a 156-dim feature vector,
    matching the EXACT normalization used to build the training data
    (verified against yemeni_sign_landmarks.h5):
        1. Translate so the wrist (landmark 0) is the origin.
        2. Scale so the wrist -> middle-finger-MCP (landmark 9) distance
           is exactly 1.0 (this is what makes fingertip-relative
           coordinates reach magnitudes of ~2-2.5).
        3. Compute the 15 pairwise distances from those normalized points.
    A hand slot with no detection, or a degenerate (zero-length) palm
    reference, is left as all zeros -- exactly like training.
    Always returns exactly 156 floats.
    """
    features = np.zeros(156, dtype=np.float32)

    for h_idx, hand in enumerate(hand_landmarks_list[:2]):
        lm = hand  # list of NormalizedLandmark
        offset = h_idx * 78

        coords = np.array([[p.x, p.y, p.z] for p in lm], dtype=np.float32)  # (21,3)

        # 1. Translate: wrist (landmark 0) becomes the origin
        wrist = coords[0].copy()
        coords_rel = coords - wrist

        # 2. Scale: wrist -> middle-finger-MCP (landmark 9) distance == 1.0
        scale = float(np.linalg.norm(coords_rel[9]))
        if scale < 1e-6:
            continue  # degenerate detection, leave this hand's slot as zeros
        coords_norm = coords_rel / scale

        features[offset: offset + 63] = coords_norm.flatten()

        # 3. Euclidean distances between 6 key points, using normalized coords
        key_pts = coords_norm[_DIST_INDICES]  # (6,3)
        d_idx = offset + 63
        for i in range(len(_DIST_INDICES)):
            for j in range(i + 1, len(_DIST_INDICES)):
                dist = np.linalg.norm(key_pts[i] - key_pts[j])
                features[d_idx] = dist
                d_idx += 1

    return features


class WordClassifier:
    def __init__(
        self,
        onnx_model_path: str,
        scaler_path: str,
        confidence_threshold: float = 0.60,
        smoothing_window: int = 6,
    ):
        import onnxruntime as ort

        self.session = ort.InferenceSession(onnx_model_path)
        self.input_name = self.session.get_inputs()[0].name

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            with open(scaler_path, "rb") as f:
                self.scaler = pickle.load(f)

        self.confidence_threshold = confidence_threshold
        self._history = deque(maxlen=smoothing_window)

        # MediaPipe HandLandmarker (Tasks API — works with mediapipe 0.10.x)
        task_path = _download_task_model()
        self._landmarker = self._build_landmarker(task_path)

    @staticmethod
    def _build_landmarker(task_path: str):
        import mediapipe as mp
        from mediapipe.tasks import python as mp_python
        from mediapipe.tasks.python import vision as mp_vision

        base_options = mp_python.BaseOptions(model_asset_path=task_path)
        options = mp_vision.HandLandmarkerOptions(
            base_options=base_options,
            num_hands=2,
            min_hand_detection_confidence=0.5,
            min_hand_presence_confidence=0.5,
            min_tracking_confidence=0.5,
            running_mode=mp_vision.RunningMode.IMAGE,
        )
        return mp_vision.HandLandmarker.create_from_options(options)

    def detect_and_predict(self, frame_rgb: np.ndarray):
        """
        Full pipeline: full camera frame -> MediaPipe (up to 2 hands) ->
        features -> ONNX -> result dict.
        Returns None if no hands detected with sufficient confidence.
        Returns dict:
            arabic, name_en, confidence, is_stable, probs, has_hand
        """
        import mediapipe as mp

        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB, data=frame_rgb.astype(np.uint8)
        )
        result = self._landmarker.detect(mp_image)

        if not result.hand_landmarks:
            self.reset_smoothing()
            return None

        features = _extract_features(result.hand_landmarks)

        # If every hand slot came back all-zero (degenerate/too-small palm
        # reference -- see _extract_features), there's no real geometry to
        # classify. Feeding an all-zero vector through the model still
        # produces *a* class with real (if low) confidence, which is
        # misleading. Treat this exactly like "no hand detected".
        if not np.any(features):
            self.reset_smoothing()
            return None

        features_scaled = self.scaler.transform(
            features.reshape(1, -1)
        ).astype(np.float32)

        probs = self.session.run(None, {self.input_name: features_scaled})[0][0]
        idx  = int(np.argmax(probs))
        conf = float(probs[idx])

        # Reject low-confidence single-frame predictions outright instead of
        # letting them quietly poison the stability/smoothing history.
        if conf < self.confidence_threshold:
            return {
                "arabic":    INDEX_TO_WORD_AR[idx],
                "name_en":   INDEX_TO_WORD_EN[idx],
                "confidence": conf,
                "is_stable":  False,
                "probs":      probs,
                "hand_landmarks": result.hand_landmarks,
            }

        self._history.append(idx)

        is_stable    = False
        display_idx  = idx
        if len(self._history) >= max(3, (self._history.maxlen or 6) // 2):
            vals, counts = np.unique(self._history, return_counts=True)
            winner = vals[np.argmax(counts)]
            if counts.max() / len(self._history) >= 0.6:
                display_idx = int(winner)
                is_stable   = True

        return {
            "arabic":    INDEX_TO_WORD_AR[display_idx],
            "name_en":   INDEX_TO_WORD_EN[display_idx],
            "confidence": conf,
            "is_stable":  is_stable,
            "probs":      probs,
            "hand_landmarks": result.hand_landmarks,
        }

    def reset_smoothing(self):
        self._history.clear()
