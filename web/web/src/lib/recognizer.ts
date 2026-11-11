/**
 * In-browser recognition engine — the web port of the desktop app's
 * CameraWorker + SignLanguageClassifier + WordClassifier pipeline.
 *
 *   video frame ─► MediaPipe HandLandmarker (≤2 hands, IMAGE mode like the desktop app)
 *        │
 *        ├─► WORDS : 156 landmark features ─► StandardScaler ─► ONNX MLP (32 words)
 *        │            (UNMIRRORED frame — the model was trained without flip augmentation)
 *        │
 *        └─► LETTERS: best hand box (from landmarks) cropped from the MIRRORED frame
 *                     ─► 224×224 RGB ─► ONNX EfficientNetB0 (31 letters)
 *
 *   highest confidence wins  ─►  text (+ speech, game logic, stats…)
 *
 * One deliberate change vs. the desktop app: the hand box for the letters model comes
 * from MediaPipe landmarks instead of a YOLO detector (YOLO is a PyTorch model and the
 * landmarks are already computed for the words model, so this costs nothing extra).
 */

import type { HandLandmarker, HandLandmarkerResult } from "@mediapipe/tasks-vision";
import type { InferenceSession, Tensor } from "onnxruntime-web";

import { applyScaler, extractFeatures, isEmptyFeatures, NUM_FEATURES, type Landmark, type Scaler } from "./features";
import { LETTER_CLASSES, NUM_LETTERS, NUM_WORDS, WORD_CLASSES, type SignKind } from "./labels";
import { fetchBytes, loadOrt, type Ort } from "./ort";
import { asset } from "./paths";
import { smoothLetter, smoothWord, VoteBuffer } from "./smoothing";
import { stats } from "./stats";

export type Mode = "both" | "alphabet" | "words";

export interface SignResult {
  kind: SignKind;
  index: number;
  id: string;
  ar: string;
  en: string;
  /** Confidence of the current frame's top class. */
  confidence: number;
  isStable: boolean;
  probs: number[];
}

export interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface FrameResult {
  /** Normalised landmarks of the RAW (unmirrored) frame. */
  hands: Landmark[][];
  /** Box (raw-frame pixels) around the hand fed to the letters model. */
  box: Box | null;
  letter: SignResult | null;
  word: SignResult | null;
  best: SignResult | null;
}

export interface Thresholds {
  letter: number;
  word: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = { letter: 0.55, word: 0.6 };

const IMG_SIZE = 224;
const BOX_PADDING = 0.3; // YOLO used 0.25 on a looser box; landmark boxes are tighter
const TASK_CDN =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export interface LoadProgress {
  /** 0..1 overall. */
  fraction: number;
  label: string;
}

export interface LoadResult {
  recognizer: Recognizer;
  /** Set when the models loaded but the hand landmarker could not (e.g. offline, first run). */
  handsError?: string;
}

export class Recognizer {
  mode: Mode = "both";
  thresholds: Thresholds = { ...DEFAULT_THRESHOLDS };

  private letterBuf = new VoteBuffer(8);
  private wordBuf = new VoteBuffer(6);
  private mirror: HTMLCanvasElement;
  private crop: HTMLCanvasElement;

  private constructor(
    private readonly ort: Ort,
    private readonly wordsSession: InferenceSession,
    private readonly lettersSession: InferenceSession,
    private readonly scaler: Scaler,
    private landmarker: HandLandmarker | null,
    public delegate: "GPU" | "CPU" | "none",
  ) {
    this.mirror = document.createElement("canvas");
    this.crop = document.createElement("canvas");
    this.crop.width = this.crop.height = IMG_SIZE;
  }

  get hasLandmarker() {
    return this.landmarker !== null;
  }

  static async load(onProgress: (p: LoadProgress) => void): Promise<LoadResult> {
    const t0 = performance.now();
    const report = (fraction: number, label: string) => onProgress({ fraction: Math.min(1, fraction), label });

    report(0.02, "runtime");
    const ort = await loadOrt();
    report(0.06, "scaler");

    const scaler = (await (await fetch(asset("/models/scaler.json"))).json()) as Scaler;
    if (scaler.mean.length !== NUM_FEATURES || scaler.scale.length !== NUM_FEATURES) {
      throw new Error("scaler.json has the wrong size");
    }

    report(0.08, "words");
    const sessionOpts = { executionProviders: ["wasm"], graphOptimizationLevel: "all" as const };
    const wordsBytes = await fetchBytes(asset("/models/words.onnx"), (f) => report(0.08 + f * 0.04, "words"), 1_227_250);
    const wordsSession = await ort.InferenceSession.create(wordsBytes, sessionOpts);

    report(0.12, "alphabet");
    const lettersBytes = await fetchBytes(
      asset("/models/alphabet.onnx"),
      (f) => report(0.12 + f * 0.5, "alphabet"),
      24_162_635,
    );
    report(0.62, "alphabet");
    const lettersSession = await ort.InferenceSession.create(lettersBytes, sessionOpts);

    // Warm up so the first real frame isn't slow (also catches broken model files early).
    report(0.7, "warmup");
    await lettersSession.run({ [lettersSession.inputNames[0]]: new ort.Tensor("float32", new Float32Array(IMG_SIZE * IMG_SIZE * 3), [1, IMG_SIZE, IMG_SIZE, 3]) });
    await wordsSession.run({ [wordsSession.inputNames[0]]: new ort.Tensor("float32", new Float32Array(NUM_FEATURES), [1, NUM_FEATURES]) });

    // Hand landmarker (MediaPipe). Failure here is non-fatal for the ONNX models.
    report(0.78, "hands");
    let landmarker: HandLandmarker | null = null;
    let delegate: "GPU" | "CPU" | "none" = "none";
    let handsError: string | undefined;
    try {
      const built = await buildLandmarker((f) => report(0.78 + f * 0.2, "hands"));
      landmarker = built.landmarker;
      delegate = built.delegate;
    } catch (e) {
      handsError = e instanceof Error ? e.message : String(e);
    }

    const recognizer = new Recognizer(ort, wordsSession, lettersSession, scaler, landmarker, delegate);
    stats.setBackend(`ONNX Runtime Web · WASM${landmarker ? ` · MediaPipe ${delegate}` : ""}`, performance.now() - t0);
    report(1, "ready");
    return { recognizer, handsError };
  }

  /** Retry just the hand landmarker (e.g. after the user comes back online). */
  async retryLandmarker(onProgress?: (f: number) => void): Promise<void> {
    if (this.landmarker) return;
    const built = await buildLandmarker(onProgress);
    this.landmarker = built.landmarker;
    this.delegate = built.delegate;
    stats.setBackend(`ONNX Runtime Web · WASM · MediaPipe ${built.delegate}`, 0);
  }

  resetSmoothing() {
    this.letterBuf.reset();
    this.wordBuf.reset();
  }

  /** Run both models on the current video frame. */
  async process(video: HTMLVideoElement): Promise<FrameResult> {
    const empty: FrameResult = { hands: [], box: null, letter: null, word: null, best: null };
    if (!this.landmarker || video.readyState < 2 || !video.videoWidth) return empty;

    const t0 = performance.now();
    const result: HandLandmarkerResult = this.landmarker.detect(video);
    const mediapipeMs = performance.now() - t0;

    const hands: Landmark[][] = result.landmarks.map((h) => h.map((p) => ({ x: p.x, y: p.y, z: p.z })));
    if (!hands.length) {
      this.resetSmoothing();
      stats.recordFrame({ mediapipeMs, totalMs: performance.now() - t0, hasHand: false });
      return empty;
    }

    const runWords = this.mode === "words" || this.mode === "both";
    const runLetters = this.mode === "alphabet" || this.mode === "both";

    let box: Box | null = null;
    let letterInput: Float32Array | null = null;
    if (runLetters) {
      // Alphabet signs are one-handed: use the most confident hand.
      let bestHand = 0;
      let bestScore = -1;
      result.handedness.forEach((cats, i) => {
        const s = cats[0]?.score ?? 0;
        if (s > bestScore) {
          bestScore = s;
          bestHand = i;
        }
      });
      const cropped = this.cropHand(video, hands[bestHand]);
      if (cropped) {
        box = cropped.box;
        letterInput = cropped.tensor;
      }
    } else {
      box = boxOf(hands[0], video.videoWidth, video.videoHeight);
    }

    let wordMs: number | undefined;
    let letterMs: number | undefined;

    const wordsTask = (async (): Promise<SignResult | null> => {
      if (!runWords) return null;
      const feats = extractFeatures(hands);
      if (isEmptyFeatures(feats)) {
        this.wordBuf.reset();
        return null;
      }
      const ts = performance.now();
      const probs = await this.runWords(feats);
      wordMs = performance.now() - ts;
      const sm = smoothWord(this.wordBuf, probs, this.thresholds.word);
      const c = WORD_CLASSES[sm.index];
      return { kind: "word", index: sm.index, id: c.id, ar: c.ar, en: c.en, confidence: sm.confidence, isStable: sm.isStable, probs: sm.probs as number[] };
    })();

    const lettersTask = (async (): Promise<SignResult | null> => {
      if (!runLetters) return null;
      if (!letterInput) {
        this.letterBuf.reset();
        return null;
      }
      const ts = performance.now();
      const probs = await this.runLetters(letterInput);
      letterMs = performance.now() - ts;
      const sm = smoothLetter(this.letterBuf, probs, this.thresholds.letter);
      const c = LETTER_CLASSES[sm.index];
      return { kind: "letter", index: sm.index, id: c.id, ar: c.ar, en: c.en, confidence: sm.confidence, isStable: sm.isStable, probs: sm.probs as number[] };
    })();

    const [word, letter] = await Promise.all([wordsTask, lettersTask]);

    // Highest confidence wins (same rule as the desktop app).
    const candidates = [letter, word].filter((r): r is SignResult => r !== null);
    const best = candidates.length ? candidates.reduce((a, b) => (b.confidence > a.confidence ? b : a)) : null;

    stats.recordFrame({
      mediapipeMs,
      wordsMs: wordMs,
      alphabetMs: letterMs,
      totalMs: performance.now() - t0,
      hasHand: true,
      bestConfidence: best?.confidence,
    });

    return { hands, box, letter, word, best };
  }

  /* ---------------------------------------------------------------- */
  /* Raw model access (also used by the ?debug=1 parity hooks)          */
  /* ---------------------------------------------------------------- */

  async runWords(features: Float32Array): Promise<Float32Array> {
    const scaled = applyScaler(features, this.scaler);
    const input = new this.ort.Tensor("float32", scaled, [1, NUM_FEATURES]);
    const out = await this.wordsSession.run({ [this.wordsSession.inputNames[0]]: input });
    const probs = out[this.wordsSession.outputNames[0]].data as Float32Array;
    if (probs.length !== NUM_WORDS) throw new Error(`words model returned ${probs.length} classes`);
    return probs;
  }

  async runLetters(nhwc: Float32Array): Promise<Float32Array> {
    const input: Tensor = new this.ort.Tensor("float32", nhwc, [1, IMG_SIZE, IMG_SIZE, 3]);
    const out = await this.lettersSession.run({ [this.lettersSession.inputNames[0]]: input });
    const probs = out[this.lettersSession.outputNames[0]].data as Float32Array;
    if (probs.length !== NUM_LETTERS) throw new Error(`alphabet model returned ${probs.length} classes`);
    return probs;
  }

  /* ---------------------------------------------------------------- */

  /**
   * Crop one hand for the letters model. The desktop app feeds this model the MIRRORED
   * frame, so we mirror the pixels (and the box) before cropping.
   * Returns raw 0..255 RGB as NHWC float32 — the EfficientNet graph rescales internally.
   */
  private cropHand(video: HTMLVideoElement, hand: Landmark[]): { box: Box; tensor: Float32Array } | null {
    const W = video.videoWidth;
    const H = video.videoHeight;
    const raw = boxOf(hand, W, H);
    if (!raw) return null;

    // mirror the box horizontally
    const mx1 = W - raw.x2;
    const mx2 = W - raw.x1;
    const sw = mx2 - mx1;
    const sh = raw.y2 - raw.y1;
    if (sw < 8 || sh < 8) return null;

    if (this.mirror.width !== W || this.mirror.height !== H) {
      this.mirror.width = W;
      this.mirror.height = H;
    }
    const mctx = this.mirror.getContext("2d", { willReadFrequently: false })!;
    mctx.setTransform(-1, 0, 0, 1, W, 0);
    mctx.drawImage(video, 0, 0, W, H);
    mctx.setTransform(1, 0, 0, 1, 0, 0);

    const cctx = this.crop.getContext("2d", { willReadFrequently: true })!;
    cctx.imageSmoothingEnabled = true;
    cctx.imageSmoothingQuality = "medium";
    cctx.drawImage(this.mirror, mx1, raw.y1, sw, sh, 0, 0, IMG_SIZE, IMG_SIZE);
    const px = cctx.getImageData(0, 0, IMG_SIZE, IMG_SIZE).data; // RGBA

    const tensor = new Float32Array(IMG_SIZE * IMG_SIZE * 3);
    for (let i = 0, j = 0; i < px.length; i += 4) {
      tensor[j++] = px[i];
      tensor[j++] = px[i + 1];
      tensor[j++] = px[i + 2];
    }
    return { box: raw, tensor };
  }
}

/** Padded, clamped pixel box around a hand's landmarks (raw frame coordinates). */
export function boxOf(hand: Landmark[], W: number, H: number, padding = BOX_PADDING): Box | null {
  if (!hand.length) return null;
  let x1 = Infinity,
    y1 = Infinity,
    x2 = -Infinity,
    y2 = -Infinity;
  for (const p of hand) {
    x1 = Math.min(x1, p.x * W);
    y1 = Math.min(y1, p.y * H);
    x2 = Math.max(x2, p.x * W);
    y2 = Math.max(y2, p.y * H);
  }
  const padX = (x2 - x1) * padding;
  const padY = (y2 - y1) * padding;
  const box: Box = {
    x1: Math.max(0, Math.floor(x1 - padX)),
    y1: Math.max(0, Math.floor(y1 - padY)),
    x2: Math.min(W, Math.ceil(x2 + padX)),
    y2: Math.min(H, Math.ceil(y2 + padY)),
  };
  return box.x2 - box.x1 > 0 && box.y2 - box.y1 > 0 ? box : null;
}

/* -------------------------------------------------------------------- */
/* MediaPipe loading                                                      */
/* -------------------------------------------------------------------- */

/** Prefer a locally bundled hand_landmarker.task (offline demos); fall back to Google's CDN. */
async function resolveTaskModel(): Promise<string> {
  const local = asset("/models/hand_landmarker.task");
  try {
    const head = await fetch(local, { method: "HEAD" });
    const type = head.headers.get("content-type") ?? "";
    const len = Number(head.headers.get("content-length") ?? 0);
    if (head.ok && !type.includes("text/html") && (len === 0 || len > 1_000_000)) return local;
  } catch {
    /* fall through to CDN */
  }
  return TASK_CDN;
}

async function buildLandmarker(onProgress?: (f: number) => void): Promise<{ landmarker: HandLandmarker; delegate: "GPU" | "CPU" }> {
  const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
  onProgress?.(0.1);
  const fileset = await FilesetResolver.forVisionTasks(asset("/mediapipe/wasm"));
  onProgress?.(0.3);
  const modelAssetPath = await resolveTaskModel();
  onProgress?.(0.4);

  let lastError: unknown;
  for (const delegate of ["GPU", "CPU"] as const) {
    try {
      const landmarker = await HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath, delegate },
        runningMode: "IMAGE", // same as the desktop app — no temporal tracking, matches training
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      onProgress?.(1);
      return { landmarker, delegate };
    } catch (e) {
      lastError = e;
    }
  }
  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    modelAssetPath === TASK_CDN
      ? `Hand model could not be loaded (needs internet on first run, or place hand_landmarker.task in /models). ${msg}`
      : msg,
  );
}
