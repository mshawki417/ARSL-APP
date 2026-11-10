/**
 * Temporal smoothing — ports of the vote logic in the desktop app:
 *   - letters:  SignLanguageClassifier.predict_smoothed  (window 8, thr 0.55)
 *   - words:    WordClassifier.detect_and_predict        (window 6, thr 0.60)
 * Both keep a ring buffer of recent class indices and call a prediction
 * "stable" when >= 60% of the buffer agrees.
 */

export class VoteBuffer {
  private history: number[] = [];
  constructor(private readonly maxLen: number) {}

  push(index: number) {
    this.history.push(index);
    if (this.history.length > this.maxLen) this.history.shift();
  }

  reset() {
    this.history = [];
  }

  get length() {
    return this.history.length;
  }

  /** Majority vote. Returns null until enough samples have been collected. */
  vote(minSamples: number): { index: number; agreement: number } | null {
    if (this.history.length < minSamples) return null;
    const counts = new Map<number, number>();
    for (const v of this.history) counts.set(v, (counts.get(v) ?? 0) + 1);
    // numpy.unique + argmax picks the SMALLEST index on ties; match that.
    let bestIdx = -1;
    let bestCount = -1;
    for (const [idx, c] of [...counts.entries()].sort((a, b) => a[0] - b[0])) {
      if (c > bestCount) {
        bestCount = c;
        bestIdx = idx;
      }
    }
    return { index: bestIdx, agreement: bestCount / this.history.length };
  }
}

export interface SmoothedPrediction {
  /** Class index to display (voted winner when stable, else raw argmax). */
  index: number;
  /** Confidence of the current frame's argmax (not of the voted class). */
  confidence: number;
  isStable: boolean;
  probs: Float32Array | number[];
}

export function argmax(p: ArrayLike<number>): number {
  let best = 0;
  for (let i = 1; i < p.length; i++) if (p[i] > p[best]) best = i;
  return best;
}

/** Letters: low-confidence frames are NOT pushed, but stability is still evaluated. */
export function smoothLetter(
  buf: VoteBuffer,
  probs: ArrayLike<number>,
  threshold: number,
): SmoothedPrediction {
  const idx = argmax(probs);
  const conf = probs[idx];
  if (conf >= threshold) buf.push(idx);

  let display = idx;
  let stable = false;
  const v = buf.vote(Math.max(3, 8 >> 1));
  if (v && v.agreement >= 0.6) {
    display = v.index;
    stable = true;
  }
  return { index: display, confidence: conf, isStable: stable, probs: Array.from(probs) };
}

/** Words: frames below threshold are reported as unstable and never touch the buffer. */
export function smoothWord(
  buf: VoteBuffer,
  probs: ArrayLike<number>,
  threshold: number,
): SmoothedPrediction {
  const idx = argmax(probs);
  const conf = probs[idx];
  if (conf < threshold) {
    return { index: idx, confidence: conf, isStable: false, probs: Array.from(probs) };
  }
  buf.push(idx);

  let display = idx;
  let stable = false;
  const v = buf.vote(Math.max(3, 6 >> 1));
  if (v && v.agreement >= 0.6) {
    display = v.index;
    stable = true;
  }
  return { index: display, confidence: conf, isStable: stable, probs: Array.from(probs) };
}
