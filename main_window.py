"""
Arabic Sign Language Translator — White Enhanced UI v5
White theme matching original design, bigger logos, enhanced cards,
bilingual AR+EN display, YOLO sensitivity slider, auto-speak real-time.
"""

import sys, os, cv2, numpy as np
from PySide6.QtCore    import Qt, QTimer, QSize
from PySide6.QtGui     import (QImage, QPixmap, QColor, QFont, QPainter,
                                QPainterPath, QPen, QBrush, QLinearGradient)
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QLabel, QPushButton,
    QVBoxLayout, QHBoxLayout, QFrame, QGraphicsDropShadowEffect,
    QMessageBox, QComboBox, QSlider, QProgressBar, QTextEdit,
    QSizePolicy
)
from camera_worker   import CameraWorker
from tts_worker      import TTSWorker
from inference       import SignLanguageClassifier
from inference_words import WordClassifier
from hand_detector   import HandDetector

# ── White Palette ──────────────────────────────────────────────────────────
BG        = "#FFFFFF"
BG2       = "#F4F6FB"
BG3       = "#E8ECF5"
ACCENT    = "#1558D6"
ACCENT_L  = "#E8EFFF"
ACCENT_D  = "#0F3FA8"
SUCCESS   = "#00A66C"
SUCCESS_L = "#E6F7F2"
WARNING   = "#D97706"
WARNING_L = "#FEF3C7"
DANGER    = "#DC2626"
DANGER_L  = "#FEF2F2"
PURPLE    = "#7C3AED"
PURPLE_L  = "#F5F0FF"
TXT1      = "#111827"
TXT2      = "#4B5563"
TXT3      = "#9CA3AF"
BORDER    = "#E5E7EB"
BORDER2   = "#D1D5DB"
SHADOW    = "#0000001A"

SS = f"""
* {{ box-sizing: border-box; }}

QMainWindow, QWidget {{
    background: {BG2};
    color: {TXT1};
    font-family: 'Segoe UI', 'Cairo', 'Arial', sans-serif;
}}

/* TOP BAR */
QFrame#topBar {{
    background: {BG};
    border-bottom: 2px solid {BORDER};
}}

/* CARDS */
QFrame#card {{
    background: {BG};
    border-radius: 16px;
    border: 1px solid {BORDER};
}}

/* VIDEO */
QFrame#videoFrame {{
    background: #0A0A12;
    border-radius: 16px;
    border: 2px solid {BORDER};
}}

/* LABELS */
QLabel {{ background: transparent; }}

QLabel#appName {{
    font-size: 20px;
    font-weight: 800;
    color: {TXT1};
    letter-spacing: -0.5px;
}}
QLabel#appTagline {{
    font-size: 12px;
    color: {TXT2};
    letter-spacing: 0.1px;
}}
QLabel#logoCaption {{
    font-size: 9px;
    color: {TXT3};
    font-weight: 700;
    letter-spacing: 1.5px;
}}
QLabel#pill {{
    font-size: 11px;
    font-weight: 700;
    border-radius: 20px;
    padding: 4px 14px;
    letter-spacing: 0.3px;
}}
QLabel#secLabel {{
    font-size: 9px;
    font-weight: 700;
    color: {TXT3};
    letter-spacing: 2px;
}}
QLabel#bigArabic {{
    font-size: 80px;
    font-weight: 900;
    color: {ACCENT};
    background: transparent;
    border: none;
}}
QLabel#bigEnglish {{
    font-size: 16px;
    font-weight: 700;
    color: {TXT2};
    background: transparent;
    border: none;
}}
QLabel#fps {{
    font-size: 12px;
    color: {TXT3};
    font-weight: 600;
}}
QLabel#modelBadge {{
    font-size: 10px;
    font-weight: 700;
    border-radius: 8px;
    padding: 3px 10px;
}}
QLabel#hintLabel {{
    font-size: 10px;
    color: {TXT3};
    background: transparent;
}}

/* BUTTONS */
QPushButton {{
    background: {BG};
    color: {TXT1};
    border: 1px solid {BORDER2};
    border-radius: 10px;
    padding: 8px 16px;
    font-size: 12px;
    font-weight: 600;
    min-height: 38px;
}}
QPushButton:hover {{
    background: {BG2};
    border: 1.5px solid {ACCENT};
    color: {ACCENT};
}}
QPushButton:pressed {{ background: {BG3}; }}

QPushButton#btnPrimary {{
    background: {ACCENT};
    color: white;
    border: none;
    font-size: 13px;
    font-weight: 700;
    border-radius: 10px;
}}
QPushButton#btnPrimary:hover {{
    background: {ACCENT_D};
}}

QPushButton#btnDanger {{
    background: {DANGER_L};
    color: {DANGER};
    border: 1px solid #FCA5A5;
    border-radius: 10px;
}}
QPushButton#btnDanger:hover {{ background: #FEE2E2; }}

QPushButton#btnGhost {{
    background: transparent;
    color: {TXT2};
    border: 1px solid {BORDER};
    border-radius: 10px;
}}
QPushButton#btnGhost:hover {{
    background: {BG2};
    color: {TXT1};
    border: 1px solid {BORDER2};
}}

QPushButton#btnGreen {{
    background: {SUCCESS_L};
    color: {SUCCESS};
    border: 1px solid #6EE7B7;
    border-radius: 10px;
    font-weight: 700;
}}
QPushButton#btnGreen:hover {{ background: #D1FAE5; }}

/* SENTENCE BOX */
QTextEdit#sentBox {{
    background: {BG2};
    border: 1.5px solid {BORDER};
    border-radius: 12px;
    font-size: 26px;
    font-weight: 700;
    padding: 14px 18px;
    color: {TXT1};
}}
QTextEdit#sentBox:focus {{
    border: 1.5px solid {ACCENT};
    background: {BG};
}}

/* PROGRESS BARS */
QProgressBar {{
    background: {BG3};
    border: none;
    border-radius: 4px;
    max-height: 7px;
    min-height: 7px;
}}
QProgressBar::chunk           {{ background: {ACCENT};  border-radius: 4px; }}
QProgressBar#barGreen::chunk  {{ background: {SUCCESS}; border-radius: 4px; }}
QProgressBar#barPurple::chunk {{ background: {PURPLE};  border-radius: 4px; }}

/* COMBO */
QComboBox {{
    background: {BG};
    border: 1px solid {BORDER2};
    border-radius: 8px;
    padding: 5px 10px;
    font-size: 12px;
    color: {TXT1};
    min-height: 34px;
}}
QComboBox QAbstractItemView {{
    background: {BG};
    color: {TXT1};
    border: 1px solid {BORDER};
    selection-background-color: {ACCENT_L};
}}

/* SLIDER */
QSlider::groove:horizontal {{
    background: {BG3};
    border: none;
    height: 5px;
    border-radius: 3px;
}}
QSlider::handle:horizontal {{
    background: {ACCENT};
    border: 2px solid white;
    width: 18px; height: 18px;
    margin: -7px 0;
    border-radius: 9px;
}}
QSlider::sub-page:horizontal {{
    background: {ACCENT};
    border-radius: 3px;
}}

/* SCROLLBAR */
QScrollBar:vertical {{
    background: transparent; width: 5px; border-radius: 3px;
}}
QScrollBar::handle:vertical {{
    background: {BORDER2}; border-radius: 3px; min-height: 30px;
}}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{ height: 0; }}
"""


# ── Helpers ────────────────────────────────────────────────────────────────
def drop_shadow(w, blur=20, color="#00000018", dy=4):
    fx = QGraphicsDropShadowEffect()
    fx.setBlurRadius(blur)
    fx.setColor(QColor(color))
    fx.setOffset(0, dy)
    w.setGraphicsEffect(fx)


def make_logo(path: str, size: int) -> QPixmap:
    """Scale logo and clip to circle with white border ring."""
    raw = QPixmap(path)
    if raw.isNull():
        return QPixmap()
    inner = size - 8
    raw = raw.scaled(inner, inner, Qt.KeepAspectRatio, Qt.SmoothTransformation)
    out = QPixmap(size, size)
    out.fill(Qt.transparent)
    p = QPainter(out)
    p.setRenderHint(QPainter.Antialiasing)
    # White circle background + border
    p.setBrush(QBrush(QColor("#FFFFFF")))
    p.setPen(QPen(QColor(BORDER2), 1.5))
    p.drawEllipse(0, 0, size, size)
    # Clip inner circle
    clip = QPainterPath()
    clip.addEllipse(4, 4, size - 8, size - 8)
    p.setClipPath(clip)
    ox = (size - raw.width())  // 2
    oy = (size - raw.height()) // 2
    p.drawPixmap(ox, oy, raw)
    p.end()
    return out


def cv2pix(frame_bgr: np.ndarray, boxes=None, conf: float = 0.0) -> QPixmap:
    # Accept either a single box tuple (legacy) or a list of boxes
    if boxes is not None and isinstance(boxes, tuple):
        boxes = [boxes]

    if boxes:
        for i, box in enumerate(boxes):
            x1, y1, x2, y2 = box
            # Subtle blue-tinted fill
            overlay = frame_bgr.copy()
            cv2.rectangle(overlay, (x1, y1), (x2, y2), (21, 88, 214), -1)
            cv2.addWeighted(overlay, 0.08, frame_bgr, 0.92, 0, frame_bgr)
            # Crisp border
            cv2.rectangle(frame_bgr, (x1, y1), (x2, y2), (21, 88, 214), 2)
            # Corner L-marks
            L = 20
            thick = 3
            for px, py, dx, dy in [(x1, y1, 1, 1), (x2, y1, -1, 1),
                                     (x1, y2, 1, -1), (x2, y2, -1, -1)]:
                cv2.line(frame_bgr, (px, py), (px + dx * L, py), (21, 88, 214), thick)
                cv2.line(frame_bgr, (px, py), (px, py + dy * L), (21, 88, 214), thick)
            # Confidence badge above box (only the best/first box shows %)
            badge = f" Hand {conf:.0%} " if (i == 0 and conf > 0) else " Hand "
            bx = x1
            by = max(y1 - 28, 4)
            (tw, th), _ = cv2.getTextSize(badge, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(frame_bgr, (bx, by), (bx + tw + 4, by + th + 6),
                          (21, 88, 214), -1)
            cv2.putText(frame_bgr, badge, (bx + 2, by + th + 2),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1,
                        cv2.LINE_AA)

    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    h, w, c = rgb.shape
    return QPixmap.fromImage(QImage(rgb.data, w, h, c * w, QImage.Format_RGB888))


def sep_line():
    d = QFrame()
    d.setFixedHeight(1)
    d.setStyleSheet(f"background:{BORDER};border:none;")
    return d


def make_metric_row(label: str, color: str, bar_name: str = ""):
    frame = QFrame()
    frame.setStyleSheet(
        f"QFrame{{background:{BG2};border-radius:10px;border:1px solid {BORDER};}}")
    fl = QHBoxLayout(frame)
    fl.setContentsMargins(12, 8, 12, 8)
    fl.setSpacing(8)

    dot = QLabel("●")
    dot.setStyleSheet(f"color:{color};font-size:9px;background:transparent;border:none;")
    fl.addWidget(dot)

    lbl = QLabel(label)
    lbl.setStyleSheet(
        f"font-size:11px;font-weight:600;color:{TXT2};background:transparent;border:none;")
    fl.addWidget(lbl)
    fl.addStretch()

    bar = QProgressBar()
    bar.setRange(0, 100); bar.setValue(0); bar.setTextVisible(False)
    bar.setFixedWidth(90)
    if bar_name:
        bar.setObjectName(bar_name)
    fl.addWidget(bar)

    pct = QLabel("0%")
    pct.setFixedWidth(36)
    pct.setAlignment(Qt.AlignRight | Qt.AlignVCenter)
    pct.setStyleSheet(
        f"font-size:11px;font-weight:700;color:{color};background:transparent;border:none;")
    fl.addWidget(pct)

    return frame, bar, pct


# ── Main Window ────────────────────────────────────────────────────────────
class MainWindow(QMainWindow):
    def __init__(self, model_path: str, word_model_path: str, scaler_path: str):
        super().__init__()
        self.setWindowTitle("Arabic Sign Language Translator")
        self.resize(1420, 880)
        self.setMinimumSize(1100, 720)
        self.setStyleSheet(SS)

        _here = os.path.dirname(os.path.abspath(__file__))
        self._logo_mil  = os.path.join(_here, "logo_military.png")
        self._logo_digi = os.path.join(_here, "logo_digilians.png")

        self._box         = None
        self._box_conf    = 0.0
        self._best_result = None
        self._hold_cand   = None
        self._hold_count  = 0
        self._last_spoken = ""
        self._speak_cd    = 0
        self._auto_speak  = True
        self._shown_errors = set()

        self._build_ui()
        self._load_models(model_path, word_model_path, scaler_path)
        self._start_workers()

    # ── Model loading ──────────────────────────────────────────────────────
    def _load_models(self, mp, wmp, sp):
        self._pill("Loading alphabet model…", WARNING)
        QApplication.processEvents()
        try:
            self.clf = SignLanguageClassifier(mp)
        except Exception as e:
            QMessageBox.critical(self, "Model Error", f"Alphabet model failed:\n{e}")
            sys.exit(1)

        self._pill("Loading words model…", WARNING)
        QApplication.processEvents()
        try:
            self.word_clf = WordClassifier(wmp, sp)
        except Exception as e:
            QMessageBox.critical(self, "Words Model Error", f"Words model failed:\n{e}")
            sys.exit(1)

        self._pill("Loading YOLO hand detector…", WARNING)
        QApplication.processEvents()
        try:
            self.hand_det = HandDetector(
                confidence_threshold=self.yoloSens.value() / 100)
        except Exception as e:
            QMessageBox.critical(self, "Hand Detector Error",
                f"{e}\n\nRequires internet on first run (~6 MB).")
            sys.exit(1)

    # ── Workers ────────────────────────────────────────────────────────────
    def _start_workers(self):
        self.cam = CameraWorker(self.clf, self.word_clf, self.hand_det)
        self.cam.set_mode(getattr(self, "_model_mode", "both"))
        self.cam.frame_ready.connect(self._on_frame)
        self.cam.best_ready.connect(self._on_best)
        self.cam.letter_ready.connect(self._on_letter)
        self.cam.word_ready.connect(self._on_word)
        self.cam.no_hand_detected.connect(self._on_no_hand)
        self.cam.hand_box_ready.connect(self._on_box)
        self.cam.error_occurred.connect(self._on_cam_err)
        self.cam.fps_updated.connect(lambda f: self.fpsLbl.setText(f"{f:.0f} FPS"))
        self.cam.start()

        self.tts = TTSWorker()
        self.tts.speaking_started.connect(lambda _: (
            self.speakBtn.setText("🔊  Speaking…"),
            self.speakBtn.setEnabled(False)))
        self.tts.speaking_finished.connect(lambda: (
            self.speakBtn.setText("🔊  Speak"),
            self.speakBtn.setEnabled(True)))
        self.tts.speak_error.connect(
            lambda e: QMessageBox.warning(self, "Voice Error", e))
        self.tts.start()

        self._pill("Live", SUCCESS)

        self._ht = QTimer(self)
        self._ht.setInterval(150)
        self._ht.timeout.connect(self._check_hold)
        self._ht.start()

    # ── Build UI ───────────────────────────────────────────────────────────
    def _build_ui(self):
        root = QWidget()
        self.setCentralWidget(root)
        main_v = QVBoxLayout(root)
        main_v.setContentsMargins(0, 0, 0, 0)
        main_v.setSpacing(0)

        # ═══════════════ TOP BAR ══════════════════════════════════════════
        bar = QFrame()
        bar.setObjectName("topBar")
        bar.setFixedHeight(86)
        drop_shadow(bar, blur=12, color="#0000000F", dy=3)

        bh = QHBoxLayout(bar)
        bh.setContentsMargins(28, 0, 28, 0)
        bh.setSpacing(0)

        # ── Left: Military logo (BIGGER) ──────────────────────────────────
        ll = QVBoxLayout()
        ll.setSpacing(3)
        ll.setAlignment(Qt.AlignVCenter | Qt.AlignLeft)

        mil_lbl = QLabel()
        mpix = make_logo(self._logo_mil, 68)   # 68px — big
        if not mpix.isNull():
            mil_lbl.setPixmap(mpix)
        else:
            mil_lbl.setText("🎖")
            mil_lbl.setFont(QFont("Segoe UI", 28))

        mil_cap = QLabel("EGYPTIAN MILITARY ACADEMY")
        mil_cap.setObjectName("logoCaption")

        ll.addWidget(mil_lbl, alignment=Qt.AlignLeft)
        ll.addWidget(mil_cap, alignment=Qt.AlignLeft)
        bh.addLayout(ll)

        bh.addStretch()

        # ── Centre: Title + tagline ────────────────────────────────────────
        ct = QVBoxLayout()
        ct.setSpacing(4)
        ct.setAlignment(Qt.AlignVCenter)

        appname = QLabel("Arabic Sign Language Translator")
        appname.setObjectName("appName")
        appname.setAlignment(Qt.AlignHCenter)

        tagline = QLabel(
            "Real-time Recognition  ·  Alphabet & Words  ·  لغة الإشارة العربية")
        tagline.setObjectName("appTagline")
        tagline.setAlignment(Qt.AlignHCenter)

        ct.addWidget(appname)
        ct.addWidget(tagline)
        bh.addLayout(ct)

        bh.addStretch()

        # ── Right: status + fps + Digilians logo (BIGGER) ─────────────────
        rs = QHBoxLayout()
        rs.setSpacing(18)
        rs.setAlignment(Qt.AlignVCenter | Qt.AlignRight)

        sc = QVBoxLayout()
        sc.setSpacing(4)
        sc.setAlignment(Qt.AlignVCenter)

        self.statusPill = QLabel("Starting")
        self.statusPill.setObjectName("pill")
        self.statusPill.setStyleSheet(
            f"background:{WARNING_L};color:{WARNING};border-radius:20px;"
            f"padding:4px 14px;font-size:11px;font-weight:700;")

        self.fpsLbl = QLabel("")
        self.fpsLbl.setObjectName("fps")
        self.fpsLbl.setAlignment(Qt.AlignHCenter)

        sc.addWidget(self.statusPill, alignment=Qt.AlignHCenter)
        sc.addWidget(self.fpsLbl,    alignment=Qt.AlignHCenter)
        rs.addLayout(sc)

        rl = QVBoxLayout()
        rl.setSpacing(3)
        rl.setAlignment(Qt.AlignVCenter | Qt.AlignRight)

        digi_lbl = QLabel()
        dpix = make_logo(self._logo_digi, 68)   # 68px — big
        if not dpix.isNull():
            digi_lbl.setPixmap(dpix)
        else:
            digi_lbl.setText("🎓")
            digi_lbl.setFont(QFont("Segoe UI", 28))

        digi_cap = QLabel("DiGiLiANS")
        digi_cap.setObjectName("logoCaption")

        rl.addWidget(digi_lbl, alignment=Qt.AlignRight)
        rl.addWidget(digi_cap, alignment=Qt.AlignRight)
        rs.addLayout(rl)

        bh.addLayout(rs)
        main_v.addWidget(bar)

        # ═══════════════ BODY ══════════════════════════════════════════════
        body = QWidget()
        body.setStyleSheet(f"background:{BG2};")
        bdy = QHBoxLayout(body)
        bdy.setContentsMargins(20, 18, 20, 18)
        bdy.setSpacing(16)
        main_v.addWidget(body, stretch=1)

        # ═══════════ LEFT COLUMN — camera ══════════════════════════════════
        left = QVBoxLayout()
        left.setSpacing(12)

        # Video card
        self.vidFrame = QFrame()
        self.vidFrame.setObjectName("videoFrame")
        self.vidFrame.setMinimumHeight(430)
        drop_shadow(self.vidFrame, blur=28, color="#00000022", dy=8)

        vfl = QVBoxLayout(self.vidFrame)
        vfl.setContentsMargins(0, 0, 0, 0)

        self.vidLbl = QLabel()
        self.vidLbl.setAlignment(Qt.AlignCenter)
        self.vidLbl.setMinimumHeight(430)
        self.vidLbl.setStyleSheet(
            f"color:#555;font-size:14px;border-radius:16px;background:transparent;")
        self.vidLbl.setText("Connecting to camera…")
        vfl.addWidget(self.vidLbl)

        left.addWidget(self.vidFrame, stretch=1)

        # ── Controls strip (matches original layout) ───────────────────────
        ctrl = QFrame()
        ctrl.setObjectName("card")
        ctrl.setStyleSheet(
            f"QFrame#card{{background:{BG};border-radius:14px;border:1px solid {BORDER};}}")
        drop_shadow(ctrl, blur=10, color="#00000012", dy=2)

        ctl = QHBoxLayout(ctrl)
        ctl.setContentsMargins(16, 10, 16, 10)
        ctl.setSpacing(10)

        self.pauseBtn = QPushButton("⏸  Pause")
        self.pauseBtn.clicked.connect(self._pause)
        self.pauseBtn.setObjectName("btnGhost")
        self.pauseBtn.setFixedWidth(110)
        ctl.addWidget(self.pauseBtn)

        self.camCombo = QComboBox()
        self.camCombo.addItems(["Camera 0", "Camera 1", "Camera 2"])
        self.camCombo.currentIndexChanged.connect(self._change_cam)
        self.camCombo.setFixedWidth(110)
        ctl.addWidget(self.camCombo)

        ctl.addStretch()

        # Model sensitivity
        def _sens_lbl(text):
            l = QLabel(text)
            l.setStyleSheet(f"font-size:11px;color:{TXT2};font-weight:600;")
            return l

        ctl.addWidget(_sens_lbl("Sensitivity"))
        self.sens = QSlider(Qt.Horizontal)
        self.sens.setRange(30, 90); self.sens.setValue(55)
        self.sens.setFixedWidth(100)
        self.sens.valueChanged.connect(self._on_sens)
        ctl.addWidget(self.sens)

        self.sensValLbl = QLabel("55%")
        self.sensValLbl.setFixedWidth(36)
        self.sensValLbl.setStyleSheet(
            f"font-size:11px;font-weight:700;color:{ACCENT};")
        ctl.addWidget(self.sensValLbl)

        ctl.addSpacing(12)

        # YOLO sensitivity
        ctl.addWidget(_sens_lbl("YOLO"))
        self.yoloSens = QSlider(Qt.Horizontal)
        self.yoloSens.setRange(10, 90); self.yoloSens.setValue(50)
        self.yoloSens.setFixedWidth(100)
        self.yoloSens.valueChanged.connect(self._on_yolo_sens)
        ctl.addWidget(self.yoloSens)

        self.yoloValLbl = QLabel("50%")
        self.yoloValLbl.setFixedWidth(36)
        self.yoloValLbl.setStyleSheet(
            f"font-size:11px;font-weight:700;color:{ACCENT};")
        ctl.addWidget(self.yoloValLbl)

        left.addWidget(ctrl)
        bdy.addLayout(left, stretch=3)

        # ═══════════ RIGHT COLUMN ══════════════════════════════════════════
        right = QVBoxLayout()
        right.setSpacing(14)
        right.setAlignment(Qt.AlignTop)

        # ── CURRENT SIGN CARD ──────────────────────────────────────────────
        pred = QFrame()
        pred.setObjectName("card")
        pred.setStyleSheet(
            f"QFrame#card{{background:{BG};border-radius:16px;border:1px solid {BORDER};}}")
        drop_shadow(pred, blur=18, color="#00000015", dy=5)

        pl = QVBoxLayout(pred)
        pl.setContentsMargins(22, 18, 22, 18)
        pl.setSpacing(0)

        # Header row
        ph = QHBoxLayout()
        sec1 = QLabel("CURRENT SIGN")
        sec1.setObjectName("secLabel")
        ph.addWidget(sec1)
        ph.addStretch()
        self.modelBadge = QLabel("—")
        self.modelBadge.setObjectName("modelBadge")
        self.modelBadge.setStyleSheet(
            f"background:{ACCENT_L};color:{ACCENT};"
            f"border-radius:8px;padding:3px 10px;font-size:10px;font-weight:700;")
        ph.addWidget(self.modelBadge)
        pl.addLayout(ph)
        pl.addSpacing(10)

        # Model selector row — choose which model(s) actually run
        msel = QHBoxLayout()
        msel.setSpacing(6)
        self.modeBtns = {}
        for key, label in [("both", "🤝 Both"),
                            ("alphabet", "🔤 Alphabet"),
                            ("words", "📝 Words")]:
            b = QPushButton(label)
            b.setCheckable(True)
            b.clicked.connect(lambda checked, k=key: self._set_model_mode(k))
            msel.addWidget(b)
            self.modeBtns[key] = b
        pl.addLayout(msel)
        pl.addSpacing(12)
        self._set_model_mode("both")

        # Sign display area
        sign_area = QFrame()
        sign_area.setStyleSheet(
            f"background:{BG2};border-radius:14px;border:1px solid {BORDER};")
        sign_area.setFixedHeight(175)

        sal = QVBoxLayout(sign_area)
        sal.setAlignment(Qt.AlignCenter)
        sal.setContentsMargins(10, 8, 10, 8)
        sal.setSpacing(4)

        self.bigArabic = QLabel("✋")
        self.bigArabic.setObjectName("bigArabic")
        self.bigArabic.setAlignment(Qt.AlignCenter)
        self.bigArabic.setStyleSheet(
            f"color:{TXT3};font-size:80px;font-weight:900;"
            f"background:transparent;border:none;")
        sal.addWidget(self.bigArabic)

        self.bigEnglish = QLabel("No hand detected")
        self.bigEnglish.setObjectName("bigEnglish")
        self.bigEnglish.setAlignment(Qt.AlignCenter)
        self.bigEnglish.setStyleSheet(
            f"color:{TXT3};font-size:16px;font-weight:700;"
            f"background:transparent;border:none;")
        sal.addWidget(self.bigEnglish)

        pl.addWidget(sign_area)
        pl.addSpacing(16)

        pl.addWidget(sep_line())
        pl.addSpacing(12)

        # Confidence metrics
        sec2 = QLabel("CONFIDENCE")
        sec2.setObjectName("secLabel")
        pl.addWidget(sec2)
        pl.addSpacing(8)

        self._rowA, self._barA, self._valA = make_metric_row("Sign (Alphabet)", ACCENT)
        self._rowH, self._barH, self._valH = make_metric_row("Hand detection",  SUCCESS, "barGreen")
        self._rowW, self._barW, self._valW = make_metric_row("Words model",     PURPLE,  "barPurple")

        for row in (self._rowA, self._rowH, self._rowW):
            pl.addWidget(row)
            pl.addSpacing(6)

        right.addWidget(pred)

        # ── SENTENCE BUILDER CARD ──────────────────────────────────────────
        sent = QFrame()
        sent.setObjectName("card")
        sent.setStyleSheet(
            f"QFrame#card{{background:{BG};border-radius:16px;border:1px solid {BORDER};}}")
        drop_shadow(sent, blur=18, color="#00000015", dy=5)

        sl_layout = QVBoxLayout(sent)
        sl_layout.setContentsMargins(22, 18, 22, 18)
        sl_layout.setSpacing(10)

        # Header
        sh = QHBoxLayout()
        sec3 = QLabel("BUILT SENTENCE")
        sec3.setObjectName("secLabel")
        sh.addWidget(sec3)
        sh.addStretch()
        self.autoLbl = QLabel("AUTO-SPEAK  OFF")
        self.autoLbl.setObjectName("secLabel")
        self.autoLbl.setStyleSheet(
            f"color:{TXT3};font-size:9px;font-weight:700;letter-spacing:1.5px;")
        sh.addWidget(self.autoLbl)
        sl_layout.addLayout(sh)

        # Text area
        self.sentBox = QTextEdit()
        self.sentBox.setObjectName("sentBox")
        self.sentBox.setLayoutDirection(Qt.RightToLeft)
        self.sentBox.setMinimumHeight(95)
        self.sentBox.setMaximumHeight(130)
        self.sentBox.setPlaceholderText("...احرفك ستظهر هنا")
        sl_layout.addWidget(self.sentBox)

        # Row 1 buttons — matching original layout
        row1 = QHBoxLayout()
        row1.setSpacing(8)
        for txt, fn, obj in [
            ("➕  Add Letter", self._add,  ""),
            ("⎵  Space",       lambda: self.sentBox.insertPlainText(" "), ""),
            ("⌫  Delete",      self._del,  ""),
            ("✕  Clear",       lambda: self.sentBox.clear(), "btnDanger"),
        ]:
            b = QPushButton(txt)
            b.clicked.connect(fn)
            if obj:
                b.setObjectName(obj)
            row1.addWidget(b)
        sl_layout.addLayout(row1)

        # Row 2 — speak buttons
        row2 = QHBoxLayout()
        row2.setSpacing(8)

        self.speakBtn = QPushButton("🔊  Speak")
        self.speakBtn.setObjectName("btnPrimary")
        self.speakBtn.clicked.connect(self._speak)
        row2.addWidget(self.speakBtn, stretch=2)

        self.autoBtn = QPushButton("Auto-speak: On ✅")
        self.autoBtn.setObjectName("btnGreen")
        self.autoBtn.clicked.connect(self._toggle_auto)
        row2.addWidget(self.autoBtn, stretch=1)

        sl_layout.addLayout(row2)
        right.addWidget(sent, stretch=1)

        # Hint
        hint = QLabel(
            "💡  Hold a sign steady ~1.5 s to add it automatically"
            "  ·  YOLO detects & boxes your hand for both models in real-time")
        hint.setObjectName("hintLabel")
        hint.setWordWrap(True)
        right.addWidget(hint)

        bdy.addLayout(right, stretch=2)

    # ── Status pill ────────────────────────────────────────────────────────
    def _pill(self, txt: str, color: str):
        self.statusPill.setText(txt)
        self.statusPill.setStyleSheet(
            f"background:{color}22;color:{color};border-radius:20px;"
            f"padding:4px 14px;font-size:11px;font-weight:700;")

    # ── Slots ──────────────────────────────────────────────────────────────
    def _on_box(self, box):
        self._box = box
        if box is not None and self._best_result:
            self._box_conf = self._best_result.get("hand_confidence", 0.0)
        else:
            self._box_conf = 0.0

    def _on_frame(self, frame):
        pix = cv2pix(frame, self._box, self._box_conf)
        scaled = pix.scaled(
            self.vidLbl.width(), self.vidLbl.height(),
            Qt.KeepAspectRatio, Qt.SmoothTransformation)
        self.vidLbl.setPixmap(scaled)

    def _on_letter(self, r):
        pct  = int(r["confidence"] * 100)
        hpct = int(r.get("hand_confidence", 0) * 100)
        self._barA.setValue(pct);  self._valA.setText(f"{pct}%")
        self._barH.setValue(hpct); self._valH.setText(f"{hpct}%")

    def _on_word(self, r):
        pct = int(r["confidence"] * 100)
        self._barW.setValue(pct); self._valW.setText(f"{pct}%")

    def _on_best(self, r):
        self._best_result = r
        arabic  = r["arabic"]
        english = r["name_en"]
        stable  = r["is_stable"]
        model   = r.get("model", "?")
        is_word = (model == "words")

        if stable:
            color = SUCCESS
        elif is_word:
            color = PURPLE
        else:
            color = ACCENT

        tag_c = PURPLE if is_word else ACCENT
        tag_t = ("Word" if is_word else "Alphabet") + (" ✓" if stable else "")

        self.bigArabic.setText(arabic)
        self.bigArabic.setStyleSheet(
            f"color:{color};font-size:80px;font-weight:900;"
            f"background:transparent;border:none;")

        self.bigEnglish.setText(english)
        self.bigEnglish.setStyleSheet(
            f"color:{color if stable else TXT2};font-size:16px;"
            f"font-weight:{'700' if stable else '600'};"
            f"background:transparent;border:none;")

        self.modelBadge.setText(tag_t)
        self.modelBadge.setStyleSheet(
            f"background:{tag_c}18;color:{tag_c};"
            f"border-radius:8px;padding:3px 10px;font-size:10px;font-weight:700;")

        # Hold-to-add
        if stable and arabic == self._hold_cand:
            self._hold_count += 1
        else:
            self._hold_count = 0
        self._hold_cand = arabic if stable else None

        # Auto-speak
        if stable and self._auto_speak:
            if arabic != self._last_spoken and self._speak_cd <= 0:
                self.tts.speak(arabic)
                self._last_spoken = arabic
                self._speak_cd    = 20
        if self._speak_cd > 0:
            self._speak_cd -= 1

    def _on_no_hand(self):
        self._best_result = None
        self._hold_cand   = None
        self._hold_count  = 0
        self._box         = None
        self._box_conf    = 0.0

        self.bigArabic.setText("✋")
        self.bigArabic.setStyleSheet(
            f"color:{TXT3};font-size:80px;font-weight:900;"
            f"background:transparent;border:none;")
        self.bigEnglish.setText("No hand detected")
        self.bigEnglish.setStyleSheet(
            f"color:{TXT3};font-size:16px;font-weight:600;"
            f"background:transparent;border:none;")
        self.modelBadge.setText("—")
        self.modelBadge.setStyleSheet(
            f"background:{BG2};color:{TXT3};"
            f"border-radius:8px;padding:3px 10px;font-size:10px;font-weight:700;")
        for bar, val in [(self._barA, self._valA), (self._barH, self._valH),
                         (self._barW, self._valW)]:
            bar.setValue(0); val.setText("0%")

    def _check_hold(self):
        if self._hold_count >= 10 and self._hold_cand:
            self._add()
            self._hold_count = -20

    def _set_model_mode(self, mode: str):
        self._model_mode = mode
        for k, b in self.modeBtns.items():
            checked = (k == mode)
            b.setChecked(checked)
            b.setObjectName("btnGreen" if checked else "btnGhost")
            b.style().unpolish(b)
            b.style().polish(b)
        if hasattr(self, "cam"):
            self.cam.set_mode(mode)

    def _on_cam_err(self, msg):
        self._pill("Error", DANGER)
        if msg in self._shown_errors:
            return
        self._shown_errors.add(msg)
        if "webcam" in msg.lower() or "camera" in msg.lower():
            QMessageBox.warning(self, "Camera Error", msg)
        else:
            QMessageBox.warning(self, "Model Error", msg)

    def _on_sens(self, val: int):
        self.sensValLbl.setText(f"{val}%")
        self.clf.confidence_threshold      = val / 100
        self.word_clf.confidence_threshold = val / 100

    def _on_yolo_sens(self, val: int):
        self.yoloValLbl.setText(f"{val}%")
        if hasattr(self, "hand_det"):
            self.hand_det.confidence_threshold = val / 100

    # ── Actions ────────────────────────────────────────────────────────────
    def _add(self):
        if self._best_result:
            txt = self._best_result["arabic"]
            cur = self.sentBox.textCursor()
            cur.movePosition(cur.MoveOperation.End)
            self.sentBox.setTextCursor(cur)
            self.sentBox.insertPlainText(txt + " ")

    def _del(self):
        cur = self.sentBox.textCursor()
        cur.movePosition(cur.MoveOperation.End)
        cur.deletePreviousChar()
        self.sentBox.setTextCursor(cur)

    def _speak(self):
        txt = self.sentBox.toPlainText().strip()
        if txt:
            self.tts.speak(txt)
        else:
            QMessageBox.information(self, "Empty", "Add letters or words first.")

    def _toggle_auto(self):
        self._auto_speak = not self._auto_speak
        on = self._auto_speak
        self.autoBtn.setText(f"Auto-speak: {'On ✅' if on else 'Off'}")
        self.autoBtn.setObjectName("btnGreen" if on else "btnGhost")
        self.autoBtn.setStyleSheet("")
        col = SUCCESS if on else TXT3
        self.autoLbl.setText(f"AUTO-SPEAK  {'ON' if on else 'OFF'}")
        self.autoLbl.setStyleSheet(
            f"color:{col};font-size:9px;font-weight:700;letter-spacing:1.5px;"
            f"background:transparent;")

    def _pause(self):
        if "Pause" in self.pauseBtn.text():
            self.cam.pause()
            self.pauseBtn.setText("▶  Resume")
            self._pill("Paused", WARNING)
        else:
            self.cam.resume()
            self.pauseBtn.setText("⏸  Pause")
            self._pill("Live", SUCCESS)

    def _change_cam(self, idx: int):
        self.cam.stop()
        self.cam = CameraWorker(self.clf, self.word_clf, self.hand_det,
                                camera_index=idx)
        self.cam.set_mode(getattr(self, "_model_mode", "both"))
        self.cam.frame_ready.connect(self._on_frame)
        self.cam.best_ready.connect(self._on_best)
        self.cam.letter_ready.connect(self._on_letter)
        self.cam.word_ready.connect(self._on_word)
        self.cam.no_hand_detected.connect(self._on_no_hand)
        self.cam.hand_box_ready.connect(self._on_box)
        self.cam.error_occurred.connect(self._on_cam_err)
        self.cam.fps_updated.connect(lambda f: self.fpsLbl.setText(f"{f:.0f} FPS"))
        self.cam.start()

    def closeEvent(self, e):
        self.cam.stop(); self.tts.stop(); e.accept()
