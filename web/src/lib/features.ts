/**
 * Feature extraction for the WORDS model — an exact port of
 * `_extract_features` in the desktop app's inference_words.py.
 *
 * Per hand (78 numbers):
 *   - 21 landmarks x (x, y, z), translated so the wrist is the origin and
 *     scaled so wrist -> middle-finger-MCP (landmark 9) has length 1.0   (63)
 *   - 15 pairwise distances between wrist + 5 fingertips                  (15)
 * Two hand slots -> 156 numbers. A missing/degenerate hand stays all zeros,
 * exactly like the training data.
 */

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export const FEATURES_PER_HAND = 78;
export const NUM_FEATURES = 156;

// wrist, thumb tip, index tip, middle tip, ring tip, pinky tip
const DIST_INDICES = [0, 4, 8, 12, 16, 20] as const;

export function extractFeatures(hands: Landmark[][]): Float32Array {
  const features = new Float32Array(NUM_FEATURES);

  const count = Math.min(hands.length, 2);
  for (let h = 0; h < count; h++) {
    const lm = hands[h];
    if (lm.length < 21) continue;
    const offset = h * FEATURES_PER_HAND;

    const wrist = lm[0];
    // 1. translate: wrist is the origin
    const rel = lm.slice(0, 21).map((p) => [p.x - wrist.x, p.y - wrist.y, p.z - wrist.z]);

    // 2. scale: |wrist -> landmark 9| == 1.0
    const scale = Math.hypot(rel[9][0], rel[9][1], rel[9][2]);
    if (scale < 1e-6) continue; // degenerate detection -> leave the slot as zeros

    const norm = rel.map((p) => [p[0] / scale, p[1] / scale, p[2] / scale]);

    for (let i = 0; i < 21; i++) {
      features[offset + i * 3] = norm[i][0];
      features[offset + i * 3 + 1] = norm[i][1];
      features[offset + i * 3 + 2] = norm[i][2];
    }

    // 3. pairwise distances (normalised coordinates), upper triangle, row-major
    let d = offset + 63;
    for (let i = 0; i < DIST_INDICES.length; i++) {
      for (let j = i + 1; j < DIST_INDICES.length; j++) {
        const a = norm[DIST_INDICES[i]];
        const b = norm[DIST_INDICES[j]];
        features[d++] = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      }
    }
  }

  return features;
}

/** True when every hand slot is zero (nothing meaningful to classify). */
export function isEmptyFeatures(f: Float32Array): boolean {
  for (let i = 0; i < f.length; i++) if (f[i] !== 0) return false;
  return true;
}

export interface Scaler {
  mean: number[];
  scale: number[];
}

/** sklearn StandardScaler.transform: (x - mean) / scale */
export function applyScaler(f: Float32Array, s: Scaler): Float32Array {
  const out = new Float32Array(f.length);
  for (let i = 0; i < f.length; i++) out[i] = (f[i] - s.mean[i]) / s.scale[i];
  return out;
}
