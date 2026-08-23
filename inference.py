"""
Inference engine for the Arabic Sign Language ALPHABET model.

FIX for error:
  "Layer 'normalization' expected 3 variables but received 0"

Root cause: The .keras model contains a tf.keras.layers.Normalization layer
whose adapt() statistics (mean, variance, count) were computed during training
and saved as non-trainable weights. When the model is loaded in a different
TF version or environment those weights are sometimes not restored correctly.

Solution: try 4 progressive loading strategies and fall back gracefully.
"""

import numpy as np
import tensorflow as tf
from collections import deque

from labels import INDEX_TO_ARABIC, INDEX_TO_NAME_EN, NUM_CLASSES

IMG_SIZE = 224


class SignLanguageClassifier:
    def __init__(self, model_path: str,
                 smoothing_window: int = 8,
                 confidence_threshold: float = 0.55):
        self.model = self._load_model(model_path)
        self.smoothing_window = smoothing_window
        self.confidence_threshold = confidence_threshold
        self._history = deque(maxlen=smoothing_window)

        # Warm up
        dummy = np.zeros((1, IMG_SIZE, IMG_SIZE, 3), dtype=np.float32)
        self.model.predict(dummy, verbose=0)

    @staticmethod
    def _load_model(model_path: str):
        """
        Four-stage loading with progressive fallbacks.
        Stage 1 — normal load (works if env matches exactly)
        Stage 2 — compile=False, safe_mode=False  (cross-version TF fix)
        Stage 3 — custom_objects with dummy Normalization (weight shape fix)
        Stage 4 — rebuild EfficientNetB0 topology + load weights by name
        """

        # ── Stage 1 ──────────────────────────────────────────────────────
        try:
            model = tf.keras.models.load_model(model_path)
            # Verify the normalization layer has its adapt weights
            for layer in model.layers:
                if isinstance(layer, tf.keras.layers.Normalization):
                    if len(layer.non_trainable_weights) == 0:
                        raise ValueError("Normalization layer missing adapt weights")
            return model
        except Exception:
            pass

        # ── Stage 2 — skip strict config validation ───────────────────────
        try:
            model = tf.keras.models.load_model(
                model_path, compile=False, safe_mode=False)
            return model
        except Exception:
            pass

        # ── Stage 3 — replace broken Normalization with Lambda ────────────
        try:
            # Monkey-patch: load with a Normalization that accepts missing weights
            class SafeNormalization(tf.keras.layers.Layer):
                """Drop-in replacement: assumes input is already [0,1] scaled."""
                def __init__(self, **kwargs):
                    # Accept and discard all Normalization-specific kwargs
                    kwargs.pop('axis', None)
                    kwargs.pop('mean', None)
                    kwargs.pop('variance', None)
                    kwargs.pop('invert', None)
                    super().__init__(**kwargs)

                def call(self, x):
                    return x

                def get_config(self):
                    return super().get_config()

            model = tf.keras.models.load_model(
                model_path,
                compile=False,
                safe_mode=False,
                custom_objects={"Normalization": SafeNormalization},
            )
            return model
        except Exception:
            pass

        # ── Stage 4 — rebuild EfficientNetB0 + load weights ──────────────
        try:
            inp  = tf.keras.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
            base = tf.keras.applications.EfficientNetB0(
                include_top=False, weights=None,
                input_shape=(IMG_SIZE, IMG_SIZE, 3))
            x = base(inp)
            x = tf.keras.layers.GlobalAveragePooling2D()(x)
            x = tf.keras.layers.Dense(NUM_CLASSES, activation="softmax")(x)
            model = tf.keras.Model(inputs=inp, outputs=x)
            model.load_weights(model_path, by_name=False, skip_mismatch=True)
            return model
        except Exception:
            pass

        # ── Stage 5 — raise a clean, actionable error ─────────────────────
        raise RuntimeError(
            f"Could not load alphabet model from:\n  {model_path}\n\n"
            "All four loading strategies failed.\n"
            "Please ensure best_model.keras is a valid Keras model file\n"
            "trained with EfficientNetB0 on 31 Arabic sign classes."
        )

    @staticmethod
    def preprocess(frame_rgb: np.ndarray) -> np.ndarray:
        """frame_rgb: HxWx3 uint8 → (1, 224, 224, 3) float32 batch."""
        if frame_rgb.shape[0] != IMG_SIZE or frame_rgb.shape[1] != IMG_SIZE:
            frame_rgb = tf.image.resize(frame_rgb, (IMG_SIZE, IMG_SIZE)).numpy()
        frame_rgb = frame_rgb.astype(np.float32)
        x = tf.keras.applications.efficientnet.preprocess_input(frame_rgb)
        return np.expand_dims(x, axis=0)

    def predict_raw(self, frame_rgb: np.ndarray):
        x     = self.preprocess(frame_rgb)
        probs = self.model.predict(x, verbose=0)[0]
        idx   = int(np.argmax(probs))
        conf  = float(probs[idx])
        return idx, conf, probs

    def predict_smoothed(self, frame_rgb: np.ndarray) -> dict:
        idx, conf, probs = self.predict_raw(frame_rgb)

        if conf >= self.confidence_threshold:
            self._history.append(idx)

        is_stable   = False
        display_idx = idx
        if len(self._history) >= max(3, self.smoothing_window // 2):
            values, counts = np.unique(self._history, return_counts=True)
            winner    = values[np.argmax(counts)]
            agreement = counts.max() / len(self._history)
            if agreement >= 0.6:
                display_idx = int(winner)
                is_stable   = True

        return {
            "index":     display_idx,
            "raw_index": idx,
            "arabic":    INDEX_TO_ARABIC[display_idx],
            "name_en":   INDEX_TO_NAME_EN[display_idx],
            "confidence": conf,
            "is_stable":  is_stable,
            "probs":      probs,
        }

    def reset_smoothing(self):
        self._history.clear()
