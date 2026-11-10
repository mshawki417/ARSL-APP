"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { NUM_LETTERS, NUM_WORDS, LETTER_CLASSES } from "@/lib/labels";
import { useEngine } from "./EngineProvider";
import { Logos } from "./ui";

const BUBBLES = [
  { ch: "أ", c: "bg-coral", x: "6%", y: "14%", r: "-8deg", d: "0s" },
  { ch: "ب", c: "bg-sun", x: "88%", y: "10%", r: "6deg", d: "-1.4s" },
  { ch: "ج", c: "bg-mint", x: "10%", y: "72%", r: "10deg", d: "-2.8s" },
  { ch: "د", c: "bg-sky", x: "86%", y: "70%", r: "-6deg", d: "-4s" },
  { ch: "م", c: "bg-pink", x: "24%", y: "3%", r: "4deg", d: "-2s" },
  { ch: "ع", c: "bg-grape text-white", x: "70%", y: "84%", r: "-4deg", d: "-3.3s" },
];

export function Intro({ onStart }: { onStart: () => void }) {
  const { t, lang } = useI18n();
  const { status, progress, error, retry } = useEngine();
  const [letterIdx, setLetterIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setLetterIdx((i) => (i + 1) % LETTER_CLASSES.length), 1400);
    return () => clearInterval(id);
  }, []);

  const pct = Math.round(progress * 100);
  const ready = status === "ready";

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10 text-center">
      {BUBBLES.map((b) => (
        <span
          key={b.ch}
          aria-hidden
          className={`animate-float absolute hidden h-20 w-20 place-items-center rounded-[28%] border-[3px] border-ink text-5xl font-black shadow-[0_5px_0_#1d1b3a] sm:grid ${b.c}`}
          style={{ left: b.x, top: b.y, ["--r" as string]: b.r, animationDelay: b.d }}
        >
          {b.ch}
        </span>
      ))}

      <div className="animate-rise relative z-10 flex max-w-3xl flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-bold uppercase tracking-wide opacity-70">{t("intro.supervised")}</p>
          <Logos size={64} />
        </div>

        <div
          key={letterIdx}
          aria-hidden
          className="animate-pop grid h-36 w-36 place-items-center rounded-[34%] border-4 border-ink bg-sun text-8xl font-black shadow-[0_8px_0_#1d1b3a]"
        >
          {LETTER_CLASSES[letterIdx].ar}
        </div>

        <div>
          <h1 className="text-4xl font-black leading-tight sm:text-6xl">{t("app.title")}</h1>
          <p className="mt-3 text-xl font-semibold sm:text-2xl">{t("app.tagline")}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <span className="chip bg-coral/20">🔤 {t("intro.chip.letters", { n: NUM_LETTERS })}</span>
          <span className="chip bg-sky/25">🤟 {t("intro.chip.words", { n: NUM_WORDS })}</span>
          <span className="chip bg-mint/25">🔒 {t("intro.chip.private")}</span>
        </div>

        <div className="flex w-full max-w-md flex-col items-center gap-3">
          <button className="btn btn-grape btn-lg w-full" onClick={onStart} autoFocus>
            {t("intro.cta")} <span aria-hidden>{lang === "ar" ? "←" : "→"}</span>
          </button>

          {status === "error" ? (
            <div role="alert" className="rounded-2xl border-2 border-ink bg-coral/25 p-3 text-sm font-bold">
              <p>{t("engine.error")}</p>
              {error && (
                <p className="mt-1 text-xs opacity-70" dir="ltr">
                  {error}
                </p>
              )}
              <button className="btn mt-2" onClick={retry}>
                {t("common.retry")}
              </button>
            </div>
          ) : (
            <div className="w-full" aria-live="polite">
              <div className="h-3 w-full overflow-hidden rounded-full border-2 border-ink bg-white">
                <div className="h-full bg-mint transition-[width] duration-300" style={{ width: `${ready ? 100 : pct}%` }} />
              </div>
              <p className="mt-1 text-sm font-semibold opacity-80">{ready ? `✓ ${t("intro.ready")}` : `${t("intro.loading")} ${pct}%`}</p>
            </div>
          )}
          <p className="text-xs font-semibold opacity-60">{t("intro.hint")}</p>
        </div>
      </div>
    </main>
  );
}
