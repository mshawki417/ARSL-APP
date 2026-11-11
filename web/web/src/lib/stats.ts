"use client";

import { useSyncExternalStore } from "react";
import { load, save } from "./storage";

/**
 * Tiny observable store for live performance numbers + session counters.
 * The recognizer pushes timings in; the dashboard subscribes. Updates are
 * throttled (~4 Hz) so React isn't re-rendered on every video frame.
 */

export interface StatsSnapshot {
  backend: string;
  frames: number;
  framesWithHand: number;
  fps: number;
  /** Exponential moving averages, milliseconds. */
  mediapipeMs: number;
  wordsMs: number;
  alphabetMs: number;
  totalMs: number;
  /** Confidence of the winning prediction over time (most recent last). */
  confidence: number[];
  /** Number of distinct stable recognitions this session. */
  recognitions: number;
  discoveredLetters: string[];
  discoveredWords: string[];
  loadMs: number;
}

const EMPTY: StatsSnapshot = {
  backend: "—",
  frames: 0,
  framesWithHand: 0,
  fps: 0,
  mediapipeMs: 0,
  wordsMs: 0,
  alphabetMs: 0,
  totalMs: 0,
  confidence: [],
  recognitions: 0,
  discoveredLetters: [],
  discoveredWords: [],
  loadMs: 0,
};

const CONF_WINDOW = 90;
const ema = (prev: number, next: number) => (prev === 0 ? next : prev * 0.85 + next * 0.15);

class StatsStore {
  private snap: StatsSnapshot = { ...EMPTY };
  private listeners = new Set<() => void>();
  private lastEmit = 0;
  private lastFrameAt = 0;
  private discovered = { letters: new Set<string>(), words: new Set<string>() };
  private hydrated = false;

  private hydrate() {
    if (this.hydrated || typeof window === "undefined") return;
    this.hydrated = true;
    const d = load<{ letters: string[]; words: string[] }>("discovered", { letters: [], words: [] });
    this.discovered.letters = new Set(d.letters);
    this.discovered.words = new Set(d.words);
    this.snap = { ...this.snap, discoveredLetters: d.letters, discoveredWords: d.words };
  }

  subscribe = (fn: () => void) => {
    this.hydrate();
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = () => this.snap;
  getServerSnapshot = () => EMPTY;

  private emit(force = false) {
    const now = performance.now();
    if (!force && now - this.lastEmit < 250) return;
    this.lastEmit = now;
    this.snap = { ...this.snap };
    this.listeners.forEach((l) => l());
  }

  setBackend(backend: string, loadMs: number) {
    this.snap.backend = backend;
    this.snap.loadMs = loadMs;
    this.emit(true);
  }

  recordFrame(t: { mediapipeMs: number; wordsMs?: number; alphabetMs?: number; totalMs: number; hasHand: boolean; bestConfidence?: number }) {
    const s = this.snap;
    s.frames++;
    const now = performance.now();
    if (this.lastFrameAt) {
      const inst = 1000 / Math.max(1, now - this.lastFrameAt);
      s.fps = s.fps === 0 ? inst : s.fps * 0.9 + inst * 0.1;
    }
    this.lastFrameAt = now;
    s.mediapipeMs = ema(s.mediapipeMs, t.mediapipeMs);
    s.totalMs = ema(s.totalMs, t.totalMs);
    if (t.wordsMs !== undefined) s.wordsMs = ema(s.wordsMs, t.wordsMs);
    if (t.alphabetMs !== undefined) s.alphabetMs = ema(s.alphabetMs, t.alphabetMs);
    if (t.hasHand) {
      s.framesWithHand++;
      if (t.bestConfidence !== undefined) {
        s.confidence = [...s.confidence.slice(-(CONF_WINDOW - 1)), t.bestConfidence];
      }
    }
    this.emit();
  }

  /** Call when the camera stops so FPS doesn't show a stale value. */
  idle() {
    this.snap.fps = 0;
    this.lastFrameAt = 0;
    this.emit(true);
  }

  /** A sign was confirmed (stable). Tracks the "collection" of signs discovered. */
  noteRecognition(id: string) {
    this.hydrate();
    this.snap.recognitions++;
    const isLetter = id.startsWith("letter:");
    const set = isLetter ? this.discovered.letters : this.discovered.words;
    if (!set.has(id)) {
      set.add(id);
      this.snap.discoveredLetters = [...this.discovered.letters];
      this.snap.discoveredWords = [...this.discovered.words];
      save("discovered", { letters: this.snap.discoveredLetters, words: this.snap.discoveredWords });
    }
    this.emit(true);
  }

  resetDiscovered() {
    this.discovered = { letters: new Set(), words: new Set() };
    this.snap.discoveredLetters = [];
    this.snap.discoveredWords = [];
    save("discovered", { letters: [], words: [] });
    this.emit(true);
  }
}

export const stats = new StatsStore();

export function useStats(): StatsSnapshot {
  return useSyncExternalStore(stats.subscribe, stats.getSnapshot, stats.getServerSnapshot);
}
