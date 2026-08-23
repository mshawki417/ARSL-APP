"""
Hand detection using a pretrained YOLOv8-nano hand-detection model.

Model: Bingsu/adetailer's hand_yolov8n.pt (Hugging Face) -- a widely used,
single-class ("hand") YOLOv8n detector. It is auto-downloaded and cached
locally the first time the app runs (requires internet on first launch only;
after that it's cached in the user's home folder and works offline).

This sits in front of the Arabic Sign Language classifier: we only classify
a frame if YOLO is confident a hand is actually present, and we crop tightly
to the hand box before classification (this also tends to improve the
classifier's accuracy, since it now sees a zoomed-in hand instead of a full
frame with background clutter).
"""

import os
import numpy as np

MODEL_REPO_ID = "Bingsu/adetailer"
MODEL_FILENAME = "hand_yolov8n.pt"
LOCAL_CACHE_DIR = os.path.join(os.path.expanduser("~"), ".arsl_app", "models")


class HandDetector:
    def __init__(self, confidence_threshold: float = 0.5, padding_ratio: float = 0.25,
                 iou_threshold: float = 0.75):
        self.confidence_threshold = confidence_threshold
        self.padding_ratio = padding_ratio
        # Higher IoU threshold = less aggressive Non-Max Suppression, so two
        # hands that are close together (clasped, overlapping, signing
        # side-by-side) don't get merged down into a single detection.
        self.iou_threshold = iou_threshold
        self.model = self._load_model()

    def _load_model(self):
        from ultralytics import YOLO
        from huggingface_hub import hf_hub_download

        os.makedirs(LOCAL_CACHE_DIR, exist_ok=True)

        local_path = os.path.join(LOCAL_CACHE_DIR, MODEL_FILENAME)
        if not os.path.exists(local_path):
            downloaded_path = hf_hub_download(
                repo_id=MODEL_REPO_ID,
                filename=MODEL_FILENAME,
                local_dir=LOCAL_CACHE_DIR,
            )
            local_path = downloaded_path

        model = YOLO(local_path)
        return model

    def detect(self, frame_rgb: np.ndarray):
        """
        Runs hand detection on a single RGB frame, returns the single
        BEST hand (used to crop for the alphabet classifier).
        Returns the single best hand detection as a dict, or None if no hand
        is confidently detected:
            {
                "box": (x1, y1, x2, y2)  # padded, clamped to frame bounds
                "confidence": float
            }
        """
        all_hands = self.detect_all(frame_rgb, max_hands=1)
        return all_hands[0] if all_hands else None

    def detect_all(self, frame_rgb: np.ndarray, max_hands: int = 2):
        """
        Runs hand detection on a single RGB frame, returns up to
        `max_hands` detections sorted by confidence (highest first).
        Used to draw a box around EACH hand on screen (the words model
        reads both hands via MediaPipe independently, but this lets the
        on-screen YOLO box reflect that two hands can be present).
        Returns a list of dicts: [{"box": (x1,y1,x2,y2), "confidence": f}, ...]
        """
        results = self.model.predict(
            frame_rgb, verbose=False, conf=self.confidence_threshold,
            iou=self.iou_threshold, max_det=max_hands,
        )

        if not results or len(results[0].boxes) == 0:
            return []

        boxes = results[0].boxes
        h, w = frame_rgb.shape[:2]
        order = boxes.conf.argsort(descending=True)

        detections = []
        for idx in order.tolist():
            conf = float(boxes.conf[idx])
            x1, y1, x2, y2 = boxes.xyxy[idx].tolist()

            box_w = x2 - x1
            box_h = y2 - y1
            pad_x = box_w * self.padding_ratio
            pad_y = box_h * self.padding_ratio

            x1 = max(0, int(x1 - pad_x))
            y1 = max(0, int(y1 - pad_y))
            x2 = min(w, int(x2 + pad_x))
            y2 = min(h, int(y2 + pad_y))

            detections.append({"box": (x1, y1, x2, y2), "confidence": conf})

        return detections

    @staticmethod
    def crop(frame_rgb: np.ndarray, box):
        x1, y1, x2, y2 = box
        return frame_rgb[y1:y2, x1:x2]
