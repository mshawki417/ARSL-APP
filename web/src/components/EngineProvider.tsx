"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Recognizer, type LoadProgress } from "@/lib/recognizer";
import { ALL_CLASSES, type SignClass } from "@/lib/labels";

type Status = "loading" | "ready" | "error";

interface Engine {
  status: Status;
  /** 0..1 */
  progress: number;
  recognizer: Recognizer | null;
  /** Fatal: ONNX models failed. */
  error: string | null;
  /** Non-fatal: hand landmarker failed (camera modes can't run until it loads). */
  handsError: string | null;
  retry: () => void;
}

const Ctx = createContext<Engine | null>(null);

declare global {
  interface Window {
    /** Exposed only with ?debug=1, for automated parity checks. */
    __arsl?: {
      recognizer: Recognizer;
      runWords: (features: number[]) => Promise<number[]>;
      runLetters: (nhwc: number[] | Float32Array) => Promise<number[]>;
      classes: SignClass[];
    };
  }
}

export function EngineProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [progress, setProgress] = useState(0);
  const [recognizer, setRecognizer] = useState<Recognizer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [handsError, setHandsError] = useState<string | null>(null);
  const started = useRef(false);

  const start = useCallback(() => {
    setStatus("loading");
    setError(null);
    setHandsError(null);
    setProgress(0);

    Recognizer.load((p: LoadProgress) => setProgress(p.fraction))
      .then(async ({ recognizer: r, handsError: he }) => {
        setRecognizer(r);
        if (he) setHandsError(he);
        setStatus("ready");
        if (new URLSearchParams(window.location.search).has("debug")) {
          window.__arsl = {
            recognizer: r,
            runWords: async (f) => Array.from(await r.runWords(Float32Array.from(f))),
            runLetters: async (x) => Array.from(await r.runLetters(x instanceof Float32Array ? x : Float32Array.from(x))),
            classes: ALL_CLASSES,
          };
        }
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    if (started.current) return; // StrictMode double-invoke guard
    started.current = true;
    start();
  }, [start]);

  const retry = useCallback(() => {
    // If only the hand model failed we can retry just that (cheap); otherwise reload everything.
    if (recognizer && handsError) {
      setHandsError(null);
      recognizer
        .retryLandmarker()
        .catch((e: unknown) => setHandsError(e instanceof Error ? e.message : String(e)));
    } else {
      start();
    }
  }, [recognizer, handsError, start]);

  const value = useMemo<Engine>(
    () => ({ status, progress, recognizer, error, handsError, retry }),
    [status, progress, recognizer, error, handsError, retry],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEngine(): Engine {
  const v = useContext(Ctx);
  if (!v) throw new Error("useEngine must be used inside <EngineProvider>");
  return v;
}
