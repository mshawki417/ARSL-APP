"""
Threaded Arabic TTS using gTTS (Google Text-to-Speech, online -> natural voice)
with pygame for playback. Runs in its own QThread via a simple job queue so
speaking never freezes the UI.
"""

import os
import tempfile
import threading
import queue
import time

from PySide6.QtCore import QObject, Signal, QThread


class TTSWorker(QThread):
    speaking_started = Signal(str)
    speaking_finished = Signal()
    speak_error = Signal(str)

    def __init__(self, parent=None):
        super().__init__(parent)
        self._queue = queue.Queue()
        self._running = False
        self._mixer_ready = False

    def run(self):
        self._running = True
        try:
            import pygame
            pygame.mixer.init()
            self._mixer_ready = True
        except Exception as e:
            self.speak_error.emit(f"Audio system failed to start: {e}")
            self._mixer_ready = False

        while self._running:
            try:
                text = self._queue.get(timeout=0.2)
            except queue.Empty:
                continue

            if text is None:
                break

            self._speak_now(text)

    def _speak_now(self, text: str):
        try:
            from gtts import gTTS
            import pygame

            self.speaking_started.emit(text)

            tmp_path = os.path.join(tempfile.gettempdir(), f"arsl_tts_{int(time.time()*1000)}.mp3")
            tts = gTTS(text=text, lang="ar")
            tts.save(tmp_path)

            if self._mixer_ready:
                pygame.mixer.music.load(tmp_path)
                pygame.mixer.music.play()
                while pygame.mixer.music.get_busy() and self._running:
                    time.sleep(0.05)

            try:
                os.remove(tmp_path)
            except OSError:
                pass

            self.speaking_finished.emit()
        except Exception as e:
            self.speak_error.emit(
                f"Couldn't generate speech (check your internet connection): {e}"
            )

    def speak(self, text: str):
        if text and text.strip():
            self._queue.put(text.strip())

    def stop(self):
        self._running = False
        self._queue.put(None)
        self.wait(2000)
