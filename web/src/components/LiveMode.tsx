"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { sfx, speak, stopSpeaking, ttsSupported, hasArabicVoice } from "@/lib/audio";
import { loadHints, normalizeForHint, saveHint } from "@/lib/storage";
import { stats } from "@/lib/stats";
import { useSignTracker } from "@/lib/useSignTracker";
import type { FrameResult, Mode, SignResult } from "@/lib/recognizer";
import { CameraStage, type Tone } from "./CameraStage";
import { ConfidenceBar, ProgressRing, TopBar } from "./ui";

interface Item {
  kind: "letter" | "word" | "space";
  text: string;
}

function sentenceText(items: Item[]): string {
  let s = "";
  for (const it of items) {
    if (it.kind === "space") s += " ";
    else if (it.kind === "word") {
      if (s && !s.endsWith(" ")) s += " ";
      s += `${it.text} `;
    } else s += it.text;
  }
  return s.trim();
}

const HINT_MIN_CONFIDENCE = 0.85;

export function LiveMode({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("both");
  const [sensitivity, setSensitivity] = useState(60);
  const [items, setItems] = useState<Item[]>([]);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [noVoice, setNoVoice] = useState(false);
  const [lastFrame, setLastFrame] = useState<FrameResult | null>(null);

  const thresholds = useMemo(() => ({ letter: sensitivity / 100, word: sensitivity / 100 }), [sensitivity]);
  const learned = useRef<Set<string>>(new Set());
  const autoSpeakRef = useRef(autoSpeak);
  autoSpeakRef.current = autoSpeak;

  useEffect(() => {
    learned.current = new Set(Object.keys(loadHints()));
    return () => stopSpeaking();
  }, []);

  const sayIt = useCallback((text: string) => {
    if (!ttsSupported()) {
      setNoVoice(true);
      return;
    }
    const ok = speak(text);
    setNoVoice(!ok && !hasArabicVoice());
  }, []);

  const addSign = useCallback(
    (s: SignResult) => {
      setItems((prev) => [...prev, { kind: s.kind, text: s.ar }]);
      sfx.add();
      stats.noteRecognition(s.id);
      if (autoSpeakRef.current) sayIt(s.ar);
    },
    [sayIt],
  );

  const tracker = useSignTracker({ confirmMs: 1200, onConfirm: addSign });
  const { feed } = tracker;

  const onFrame = useCallback(
    (r: FrameResult) => {
      setLastFrame(r);
      feed(r);
      // Learn a skeleton hint the first time a sign is recognised with high confidence.
      const b = r.best;
      if (b && b.isStable && b.confidence >= HINT_MIN_CONFIDENCE && !learned.current.has(b.id)) {
        const hint = normalizeForHint(r.hands);
        if (hint) {
          saveHint(b.id, hint);
          learned.current.add(b.id);
        }
      }
    },
    [feed],
  );

  const { current, holdFrac } = tracker;
  const tone: Tone = !current ? "idle" : holdFrac > 0 ? "good" : "seen";
  const sentence = sentenceText(items);

  const modes: { id: Mode; label: string }[] = [
    { id: "both", label: t("live.mode.both") },
    { id: "alphabet", label: t("live.mode.alphabet") },
    { id: "words", label: t("live.mode.words") },
  ];

  return (
    <>
      <TopBar title={t("live.title")} onBack={onBack} />
      <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[3fr_2fr]">
        {/* camera column */}
        <section className="flex flex-col gap-4">
          <CameraStage mode={mode} thresholds={thresholds} onFrame={onFrame} tone={tone} showCameraPicker />

          <div className="card flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
            <div role="group" aria-label="mode" className="flex gap-2">
              {modes.map((m) => (
                <button
                  key={m.id}
                  aria-pressed={mode === m.id}
                  onClick={() => setMode(m.id)}
                  className={`btn !px-4 !py-2 ${mode === m.id ? "btn-grape" : ""}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <label className="flex min-w-[12rem] flex-1 items-center gap-3 font-bold">
              {t("live.sensitivity")}
              <input
                type="range"
                min={30}
                max={95}
                value={sensitivity}
                onChange={(e) => setSensitivity(Number(e.target.value))}
                className="h-2 flex-1"
                aria-valuetext={`${sensitivity}%`}
              />
              <span className="w-12 tabular-nums" dir="ltr">
                {sensitivity}%
              </span>
            </label>
          </div>
        </section>

        {/* results column */}
        <section className="flex flex-col gap-4">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black">{t("live.detected")}</h2>
              <span className="chip">
                {t("live.hands")}: <b>{lastFrame?.hands.length ?? 0}</b>
              </span>
            </div>

            <div className="mt-3 flex items-center gap-5" aria-live="polite">
              <ProgressRing fraction={holdFrac} size={128} color={holdFrac >= 1 ? "#ffc83d" : "#2ec4a6"}>
                <span key={current?.id ?? "none"} className={`animate-pop px-1 text-center font-black leading-none ${current ? (current.ar.length > 4 ? "text-3xl" : "text-5xl") : "text-4xl opacity-30"}`}>
                  {current ? current.ar : "؟"}
                </span>
              </ProgressRing>
              <div className="min-w-0">
                {current ? (
                  <>
                    <p className="truncate text-xl font-black" dir="ltr">
                      {current.en}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-2">
                      <span className={`chip ${current.kind === "letter" ? "bg-coral/25" : "bg-sky/30"}`}>{current.kind === "letter" ? t("common.letter") : t("common.word")}</span>
                      {current.isStable && <span className="chip bg-mint/30">✓ {t("live.stable")}</span>}
                    </p>
                    <p className="mt-2 text-sm font-semibold opacity-70">{t("live.hold")}</p>
                  </>
                ) : (
                  <p className="text-lg font-bold opacity-60">{t("live.waiting")}</p>
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <ConfidenceBar
                label={`${t("live.mode.alphabet")} · ${t("live.confidence")}`}
                value={lastFrame?.letter?.confidence ?? 0}
                threshold={thresholds.letter}
                color="bg-coral"
                active={!!lastFrame?.letter}
              />
              <ConfidenceBar
                label={`${t("live.mode.words")} · ${t("live.confidence")}`}
                value={lastFrame?.word?.confidence ?? 0}
                threshold={thresholds.word}
                color="bg-sky"
                active={!!lastFrame?.word}
              />
            </div>
          </div>

          <div className="card flex flex-1 flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black">{t("live.sentence")}</h2>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-bold">
                <input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} className="h-4 w-4" />
                {t("live.autospeak")}
              </label>
            </div>

            <div className="min-h-[5rem] rounded-2xl border-2 border-dashed border-ink/40 bg-cream p-3 text-3xl font-black leading-relaxed" aria-live="polite">
              {sentence || <span className="text-base font-semibold opacity-50">{t("live.sentence.empty")}</span>}
            </div>

            {noVoice && <p className="rounded-xl bg-sun/40 p-2 text-sm font-bold">{t("live.nonvoice")}</p>}

            <div className="flex flex-wrap gap-2">
              <button className="btn btn-mint" disabled={!sentence} onClick={() => sayIt(sentence)}>
                🔊 {t("live.speak")}
              </button>
              <button
                className="btn"
                disabled={!current}
                onClick={() => current && addSign(current)}
                title={t("live.add")}
              >
                ＋ {t("live.add")}
              </button>
              <button className="btn" onClick={() => setItems((p) => [...p, { kind: "space", text: " " }])}>
                ␣ {t("live.space")}
              </button>
              <button className="btn" disabled={!items.length} onClick={() => setItems((p) => p.slice(0, -1))}>
                ⌫ {t("live.back")}
              </button>
              <button className="btn btn-coral" disabled={!items.length} onClick={() => setItems([])}>
                ✕ {t("live.clear")}
              </button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
