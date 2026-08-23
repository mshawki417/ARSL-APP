# 🤟 Arabic Sign Language Recognition — Desktop Application

A real-time desktop application for recognizing **Arabic Sign Language (ArSL)**, built with PySide6/Qt and powered by dual deep learning models. Supports both alphabet-level and word-level recognition with Arabic text-to-speech output.

---

## ✨ Features

- 🖐️ **Real-time hand detection** using YOLO
- 🔤 **Arabic alphabet recognition** — 31 classes via EfficientNetB0 (`.keras`)
- 🗣️ **Word-level recognition** — 32 Yemeni ArSL words via ONNX model + MediaPipe landmarks
- 🏆 **Dual-model architecture** — "best confidence wins" strategy
- 🔊 **Arabic Text-to-Speech** via gTTS
- 🎨 **Modern white UI** with institutional branding (Egyptian Military Academy & DiGiLiANS)

---

## 🗂️ Project Structure

```
├── main.py                  # Application entry point
├── main_window.py           # Main UI window (PySide6)
├── camera_worker.py         # Camera capture thread
├── hand_detector.py         # YOLO-based hand detection
├── inference.py             # Alphabet model inference (EfficientNetB0)
├── inference_words.py       # Word model inference (ONNX + MediaPipe)
├── labels.py                # Alphabet class labels (31 classes)
├── labels_words.py          # Word class labels (32 classes)
├── tts_worker.py            # Arabic TTS worker thread
├── scaler.pkl               # Feature scaler for landmark normalization
├── sign_model.onnx          # ONNX word recognition model
├── best_model.keras         # EfficientNetB0 alphabet classifier  ← Git LFS
├── best_sign_model.h5       # Backup model weights               ← Git LFS
├── requirements.txt         # Python dependencies
├── logo_military.png        # Egyptian Military Academy logo
└── logo_digilians.png       # DiGiLiANS logo
```

---

## ⚙️ Requirements

- Python 3.9+
- Webcam

Install dependencies:

```bash
pip install -r requirements.txt
```

Key packages include:
- `PySide6` — GUI framework
- `opencv-python` — camera capture
- `mediapipe` — hand landmark detection
- `onnxruntime` — ONNX model inference
- `tensorflow` / `keras` — alphabet model
- `gtts` + `pygame` — Arabic TTS playback

---

## 🚀 Running the Application

```bash
python main.py
```

---

## 🧠 Model Details

| Model | Task | Classes | Format |
|---|---|---|---|
| EfficientNetB0 | Arabic Alphabet | 31 | `.keras` |
| ONNX + MediaPipe | ArSL Words | 32 | `.onnx` |

The system runs both models simultaneously on each frame and outputs the prediction with the highest confidence score.

> ⚠️ **Note:** The `.keras` and `.h5` model files are tracked with **Git LFS** due to their size.

---

## 📦 Building as Executable

A `main.spec` file is included for PyInstaller:

```bash
pip install pyinstaller
pyinstaller main.spec
```

The executable will be output to the `dist/` folder.

---

## 📸 Screenshots

> *(Add screenshots here)*

---

## 🏛️ Acknowledgements

Developed under the supervision of the **Egyptian Military Academy** in collaboration with **DiGiLiANS**.

---

## 👤 Author

**Mustafa** — AI & Deep Learning Engineer  
Cairo, Egypt
