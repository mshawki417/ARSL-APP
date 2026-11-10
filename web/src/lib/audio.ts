"use client";

/**
 * Speech + sound effects — all generated in the browser, no audio files.
 *
 * Text-to-speech uses the Web Speech API (`speechSynthesis`) with an Arabic voice.
 * Which Arabic voices exist depends on the OS/browser (Windows & macOS ship some,
 * Chrome adds online Google voices). `hasArabicVoice()` lets the UI say so honestly.
 */

let voicesCache: SpeechSynthesisVoice[] = [];

function refreshVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  voicesCache = window.speechSynthesis.getVoices();
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  refreshVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoices);
}

export function arabicVoice(): SpeechSynthesisVoice | null {
  const ar = voicesCache.filter((v) => v.lang.toLowerCase().startsWith("ar"));
  if (!ar.length) return null;
  return (
    ar.find((v) => v.lang.toLowerCase() === "ar-eg") ??
    ar.find((v) => v.lang.toLowerCase() === "ar-sa") ??
    ar.find((v) => v.default) ??
    ar[0]
  );
}

export function hasArabicVoice(): boolean {
  refreshVoices();
  return arabicVoice() !== null;
}

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Speak Arabic text. Resolves true when speech started, false when no Arabic voice is available. */
export function speak(text: string, opts?: { onEnd?: () => void }): boolean {
  if (!ttsSupported() || !text.trim()) return false;
  refreshVoices();
  const voice = arabicVoice();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice?.lang ?? "ar-SA";
  if (voice) u.voice = voice;
  u.rate = 0.95;
  u.onend = () => opts?.onEnd?.();
  u.onerror = () => opts?.onEnd?.();
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
  return voice !== null;
}

export function stopSpeaking() {
  if (ttsSupported()) window.speechSynthesis.cancel();
}

/* ------------------------------------------------------------------ */
/* Sound effects (Web Audio, synthesised)                              */
/* ------------------------------------------------------------------ */

let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(m: boolean) {
  muted = m;
}
export function isMuted() {
  return muted;
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.15) {
  const c = audio();
  if (!c || muted) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  success() {
    tone(659.25, 0, 0.12, "triangle"); // E5
    tone(783.99, 0.1, 0.12, "triangle"); // G5
    tone(1046.5, 0.2, 0.25, "triangle"); // C6
  },
  add() {
    tone(880, 0, 0.09, "sine", 0.1);
  },
  fail() {
    tone(220, 0, 0.18, "sawtooth", 0.08);
    tone(165, 0.14, 0.25, "sawtooth", 0.08);
  },
  tick() {
    tone(1200, 0, 0.04, "square", 0.04);
  },
  levelUp() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, i * 0.09, 0.2, "triangle"));
  },
};
