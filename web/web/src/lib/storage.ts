import type { Landmark } from "./features";

const PREFIX = "arsl:";

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* private mode / quota — the demo works fine without persistence */
  }
}

/* ------------------------------------------------------------------ */
/* Learned reference poses ("hints")                                   */
/* ------------------------------------------------------------------ */

/**
 * The repo ships no reference photos of the signs, so the app learns a skeleton
 * hint for each sign the first time it is recognised with high confidence.
 * Landmarks are stored in a square 0..1 box that preserves the layout of both hands.
 */
export type Hint = { hands: [number, number][][] };

export function normalizeForHint(hands: Landmark[][]): Hint | null {
  const pts = hands.slice(0, 2).filter((h) => h.length >= 21);
  if (!pts.length) return null;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const h of pts)
    for (const p of h) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  const size = Math.max(maxX - minX, maxY - minY, 1e-6);
  const r = (v: number) => Math.round(v * 1000) / 1000;
  return {
    hands: pts.map((h) => h.slice(0, 21).map((p) => [r((p.x - minX) / size), r((p.y - minY) / size)] as [number, number])),
  };
}

export function loadHints(): Record<string, Hint> {
  return load<Record<string, Hint>>("hints", {});
}

export function saveHint(id: string, hint: Hint): void {
  const all = loadHints();
  all[id] = hint;
  save("hints", all);
}
