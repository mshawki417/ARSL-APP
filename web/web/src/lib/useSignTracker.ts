"use client";

import { useCallback, useRef, useState } from "react";
import type { FrameResult, SignResult } from "./recognizer";

/**
 * Turns the raw per-frame stream into "the user is HOLDING sign X":
 *  - `current`   latest winning prediction (may still be unstable) — for display
 *  - `holdFrac`  0..1 progress of holding the same STABLE sign
 *  - `onConfirm` fires once when the hold reaches `confirmMs`; re-arms only after
 *                the sign changes or the hand drops (so repeated letters need a pause)
 */
export function useSignTracker(opts: { confirmMs: number; onConfirm?: (s: SignResult) => void }) {
  const [current, setCurrent] = useState<SignResult | null>(null);
  const [holdFrac, setHoldFrac] = useState(0);

  const idRef = useRef<string | null>(null);
  const sinceRef = useRef(0);
  const firedRef = useRef(false);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const feed = useCallback((r: FrameResult) => {
    const best = r.best;
    setCurrent(best);
    const stable = best && best.isStable ? best : null;

    if (!stable) {
      idRef.current = null;
      firedRef.current = false;
      setHoldFrac(0);
      return;
    }
    const now = performance.now();
    if (stable.id !== idRef.current) {
      idRef.current = stable.id;
      sinceRef.current = now;
      firedRef.current = false;
    }
    const { confirmMs, onConfirm } = optsRef.current;
    const frac = Math.min(1, (now - sinceRef.current) / confirmMs);
    setHoldFrac(frac);
    if (!firedRef.current && frac >= 1) {
      firedRef.current = true;
      onConfirm?.(stable);
    }
  }, []);

  const reset = useCallback(() => {
    idRef.current = null;
    firedRef.current = false;
    setCurrent(null);
    setHoldFrac(0);
  }, []);

  return { current, holdFrac, feed, reset };
}
