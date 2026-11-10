"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useEngine } from "./EngineProvider";
import { useI18n } from "@/lib/i18n";
import { stats } from "@/lib/stats";
import type { FrameResult, Mode, Thresholds } from "@/lib/recognizer";

/** Pairs of landmark indices forming the hand skeleton. */
const BONES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

export type Tone = "idle" | "seen" | "good" | "match";
const TONE_COLORS: Record<Tone, { bone: string; dot: string; box: string }> = {
  idle: { bone: "rgba(255,255,255,0.85)", dot: "#ffffff", box: "rgba(255,255,255,0.6)" },
  seen: { bone: "#3db9f5", dot: "#ffffff", box: "#3db9f5" },
  good: { bone: "#2ec4a6", dot: "#ffffff", box: "#2ec4a6" },
  match: { bone: "#ffc83d", dot: "#ffffff", box: "#ffc83d" },
};

type CamState = "starting" | "running" | "denied" | "nocam" | "busy" | "insecure" | "error";

interface Props {
  mode: Mode;
  thresholds: Thresholds;
  /** Called after every processed frame (≈10-15 Hz). */
  onFrame: (r: FrameResult) => void;
  /** Colours the skeleton overlay. */
  tone?: Tone;
  /** Extra content layered over the video (not mirrored). */
  overlay?: ReactNode;
  className?: string;
  showCameraPicker?: boolean;
}

/** Minimum gap between inferences (~15 Hz, same cadence as the desktop app). */
const MIN_INTERVAL_MS = 66;

export function CameraStage({ mode, thresholds, onFrame, tone = "seen", overlay, className = "", showCameraPicker }: Props) {
  const { t } = useI18n();
  const { recognizer, status, error: engineError, handsError, retry } = useEngine();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onFrameRef = useRef(onFrame);
  const toneRef = useRef(tone);
  onFrameRef.current = onFrame;
  toneRef.current = tone;

  const [cam, setCam] = useState<CamState>("starting");
  const [camError, setCamError] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [hasHand, setHasHand] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // keep the recognizer in sync with the controls
  useEffect(() => {
    if (!recognizer) return;
    recognizer.mode = mode;
    recognizer.thresholds = thresholds;
  }, [recognizer, mode, thresholds]);

  /* ---------------------------- camera ---------------------------- */
  useEffect(() => {
    let cancelled = false;
    setCam("starting");

    async function start() {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setCam("insecure");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
            ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play().catch(() => undefined);
        }
        setCam("running");
        const all = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) setDevices(all.filter((d) => d.kind === "videoinput"));
      } catch (e) {
        if (cancelled) return;
        const name = (e as DOMException)?.name;
        if (name === "NotAllowedError" || name === "SecurityError") setCam("denied");
        else if (name === "NotFoundError" || name === "OverconstrainedError") setCam("nocam");
        else if (name === "NotReadableError" || name === "AbortError") setCam("busy");
        else {
          setCamError((e as Error)?.message ?? "");
          setCam("error");
        }
      }
    }
    void start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      stats.idle();
    };
  }, [deviceId, attempt]);

  /* ------------------------- recognition loop ------------------------- */
  const draw = useCallback((r: FrameResult | null) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const W = video.videoWidth;
    const H = video.videoHeight;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    if (!r || !r.hands.length) return;

    const c = TONE_COLORS[toneRef.current];
    const unit = Math.max(2, W / 320);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (r.box) {
      ctx.strokeStyle = c.box;
      ctx.lineWidth = unit * 1.2;
      ctx.setLineDash([unit * 5, unit * 3]);
      ctx.strokeRect(r.box.x1, r.box.y1, r.box.x2 - r.box.x1, r.box.y2 - r.box.y1);
      ctx.setLineDash([]);
    }
    for (const hand of r.hands) {
      ctx.strokeStyle = c.bone;
      ctx.lineWidth = unit * 1.1;
      ctx.beginPath();
      for (const [a, b] of BONES) {
        ctx.moveTo(hand[a].x * W, hand[a].y * H);
        ctx.lineTo(hand[b].x * W, hand[b].y * H);
      }
      ctx.stroke();
      ctx.fillStyle = c.dot;
      for (const p of hand) {
        ctx.beginPath();
        ctx.arc(p.x * W, p.y * H, unit * 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, []);

  useEffect(() => {
    if (!recognizer || !recognizer.hasLandmarker || cam !== "running") return;
    let stopped = false;
    let busy = false;
    let last = 0;
    let raf = 0;
    let failures = 0;

    const tick = () => {
      if (stopped) return;
      raf = requestAnimationFrame(tick);
      const v = videoRef.current;
      const now = performance.now();
      if (busy || !v || document.hidden || now - last < MIN_INTERVAL_MS) return;
      busy = true;
      last = now;
      recognizer
        .process(v)
        .then((r) => {
          if (stopped) return;
          failures = 0;
          setHasHand(r.hands.length > 0);
          draw(r);
          onFrameRef.current(r);
        })
        .catch((e) => {
          failures++;
          console.error("[recognizer]", e);
          if (failures >= 5) {
            stopped = true;
            setCamError(e instanceof Error ? e.message : String(e));
            setCam("error");
          }
        })
        .finally(() => {
          busy = false;
        });
    };
    raf = requestAnimationFrame(tick);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      recognizer.resetSmoothing();
      draw(null);
    };
  }, [recognizer, cam, draw]);

  /* ----------------------------- render ----------------------------- */
  const blocked: { msg: string; retry: boolean; detail?: string } | null =
    status === "loading"
      ? { msg: t("engine.waiting"), retry: false }
      : status === "error"
        ? { msg: t("engine.error"), retry: true, detail: engineError ?? undefined }
        : handsError
          ? { msg: t("engine.hands.error"), retry: true, detail: handsError }
          : null;

  const camMessage: Record<Exclude<CamState, "running" | "starting">, string> = {
    denied: t("cam.denied"),
    nocam: t("cam.nocam"),
    busy: t("cam.busy"),
    insecure: t("cam.insecure"),
    error: `${t("cam.error")}${camError ? `: ${camError}` : ""}`,
  };

  return (
    <div className={`relative overflow-hidden rounded-[28px] border-[3px] border-ink bg-ink ${className}`} style={{ aspectRatio: "16 / 9" }}>
      {/* mirrored layer: video + landmark canvas stay perfectly aligned */}
      <div className="absolute inset-0 -scale-x-100">
        <video ref={videoRef} playsInline muted autoPlay className="h-full w-full object-cover" />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover" />
      </div>

      {cam === "running" && !blocked && !hasHand && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <span className="rounded-full bg-white/90 px-4 py-1.5 text-sm font-bold text-ink shadow">{t("cam.nohand")}</span>
        </div>
      )}

      {overlay}

      {(cam === "starting" || blocked) && (
        <Notice>
          <p className="text-lg font-bold">{blocked ? blocked.msg : t("cam.starting")}</p>
          {blocked?.detail && (
            <p className="mt-1 max-w-md text-xs opacity-70" dir="ltr">
              {blocked.detail}
            </p>
          )}
          {blocked?.retry && (
            <button className="btn btn-sun mt-3" onClick={retry}>
              {t("common.retry")}
            </button>
          )}
        </Notice>
      )}

      {cam !== "running" && cam !== "starting" && (
        <Notice>
          <p className="max-w-md text-lg font-bold">{camMessage[cam]}</p>
          <button className="btn btn-sun mt-3" onClick={() => setAttempt((a) => a + 1)}>
            {t("common.retry")}
          </button>
        </Notice>
      )}

      {showCameraPicker && devices.length > 1 && cam === "running" && (
        <label className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-ink">
          {t("cam.select")}
          <select
            className="max-w-[10rem] rounded bg-transparent text-xs"
            value={deviceId || devices[0]?.deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
          >
            {devices.map((d, i) => (
              <option key={d.deviceId || i} value={d.deviceId}>
                {d.label || `${t("cam.select")} ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink/85 p-6 text-center text-white">{children}</div>
  );
}
