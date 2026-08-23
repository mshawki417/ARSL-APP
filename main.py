"""
Arabic Sign Language Translator — Entry Point v5
Two models, one shared YOLO hand detector:
  • best_model.keras   — Arabic alphabet (EfficientNetB0, on YOLO hand crop)
  • sign_model.onnx    — Yemeni words   (MediaPipe landmarks on YOLO hand
                          crop + ONNX) — YOLO locates the hand, MediaPipe
                          only extracts landmarks from that crop
  • scaler.pkl         — Feature scaler for the words model

Place ALL files in the same folder as this script, then run:
    python main.py
"""

import sys, os
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
os.environ.setdefault("GLOG_minloglevel",      "3")

from PySide6.QtWidgets import QApplication, QMessageBox
from PySide6.QtGui     import QFont, QIcon
from main_window import MainWindow

HERE = os.path.dirname(os.path.abspath(__file__))

REQUIRED = {
    "Alphabet model" : "best_model.keras",
    "Words model"    : "sign_model.onnx",
    "Feature scaler" : "scaler.pkl",
}


def check_files():
    missing = []
    for label, fname in REQUIRED.items():
        if not os.path.exists(os.path.join(HERE, fname)):
            missing.append(f"  •  {label}  →  {fname}")
    if missing:
        app = QApplication(sys.argv)
        QMessageBox.critical(
            None, "Missing Files",
            "The following required files were not found:\n\n"
            + "\n".join(missing)
            + f"\n\nPlace them in:\n{HERE}"
        )
        sys.exit(1)


def main():
    check_files()

    app = QApplication(sys.argv)
    app.setApplicationName("Arabic Sign Language Translator")
    app.setApplicationVersion("4.0")
    app.setFont(QFont("Segoe UI", 10))

    # Apply dark title bar on Windows 11
    try:
        from ctypes import windll, byref, c_int, sizeof
        DWMWA_USE_IMMERSIVE_DARK_MODE = 20
    except ImportError:
        pass

    win = MainWindow(
        model_path      = os.path.join(HERE, "best_model.keras"),
        word_model_path = os.path.join(HERE, "sign_model.onnx"),
        scaler_path     = os.path.join(HERE, "scaler.pkl"),
    )
    win.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
