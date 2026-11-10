"use client";

import { useI18n } from "@/lib/i18n";
import { LETTER_CLASSES, NUM_LETTERS, NUM_WORDS, WORD_CLASSES } from "@/lib/labels";
import { stats, useStats } from "@/lib/stats";
import { TopBar } from "./ui";
import type { Screen } from "./App";

function Metric({ label, value, unit, color, budget }: { label: string; value: number; unit: string; color: string; budget?: number }) {
  const empty = value <= 0;
  return (
    <div className="card p-4">
      <p className="text-sm font-bold opacity-70">{label}</p>
      <p className="mt-1 text-4xl font-black tabular-nums" dir="ltr">
        {empty ? "—" : value < 10 ? value.toFixed(1) : Math.round(value)}
        <span className="ms-1 text-base font-bold opacity-60">{unit}</span>
      </p>
      {budget !== undefined && (
        <div className="mt-2 h-2.5 overflow-hidden rounded-full border-2 border-ink bg-white">
          <div className={`h-full ${color}`} style={{ width: `${empty ? 0 : Math.min(100, (value / budget) * 100)}%` }} />
        </div>
      )}
    </div>
  );
}

function ConfidenceChart({ values, empty }: { values: number[]; empty: string }) {
  const W = 600;
  const H = 160;
  if (values.length < 2) {
    return <div className="grid h-40 place-items-center rounded-2xl border-2 border-dashed border-ink/30 text-sm font-semibold opacity-60">{empty}</div>;
  }
  const step = W / (values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(H - v * H).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full" preserveAspectRatio="none" role="img" aria-label="confidence over time">
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1={0} x2={W} y1={H - g * H} y2={H - g * H} stroke="#1d1b3a" strokeOpacity={0.12} strokeDasharray="6 6" />
      ))}
      <polyline points={`0,${H} ${pts} ${W},${H}`} fill="#6c4cf1" fillOpacity={0.15} stroke="none" />
      <polyline points={pts} fill="none" stroke="#6c4cf1" strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function StatsScreen({ onBack, go }: { onBack: () => void; go: (s: Screen) => void }) {
  const { t } = useI18n();
  const s = useStats();
  const hasData = s.frames > 0;
  const avgConf = s.confidence.length ? s.confidence.reduce((a, b) => a + b, 0) / s.confidence.length : 0;

  return (
    <>
      <TopBar title={t("st.title")} onBack={onBack} />
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
        {!hasData && (
          <div className="card flex flex-wrap items-center gap-4 bg-sun/40 p-4">
            <p className="font-bold">{t("st.empty")}</p>
            <button className="btn btn-grape" onClick={() => go("live")}>
              ✋ {t("hub.live")}
            </button>
          </div>
        )}

        <section aria-label={t("st.live")}>
          <h2 className="mb-3 text-xl font-black">⚡ {t("st.live")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label={t("st.fps")} value={s.fps} unit="fps" color="bg-mint" budget={30} />
            <Metric label={t("st.mediapipe")} value={s.mediapipeMs} unit={t("common.ms")} color="bg-sky" budget={100} />
            <Metric label={t("st.words")} value={s.wordsMs} unit={t("common.ms")} color="bg-pink" budget={100} />
            <Metric label={t("st.alphabet")} value={s.alphabetMs} unit={t("common.ms")} color="bg-coral" budget={300} />
            <Metric label={t("st.total")} value={s.totalMs} unit={t("common.ms")} color="bg-grape" budget={300} />
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <section className="card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-black">📈 {t("st.conf")}</h2>
              {avgConf > 0 && (
                <span className="chip bg-mint/30" dir="ltr">
                  avg {Math.round(avgConf * 100)}%
                </span>
              )}
            </div>
            <div className="mt-3">
              <ConfidenceChart values={s.confidence} empty={t("st.empty")} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-3">
              <Mini label={t("st.recognitions")} value={String(s.recognitions)} />
              <Mini label={t("st.frames")} value={String(s.frames)} />
              <Mini label={t("st.load")} value={s.loadMs ? `${(s.loadMs / 1000).toFixed(1)}s` : "—"} />
            </dl>
          </section>

          <section className="card space-y-4 p-5">
            <div>
              <h2 className="text-xl font-black">🔒 {t("st.privacy")}</h2>
              <p className="mt-1 font-semibold">{t("st.privacy.v")}</p>
            </div>
            <div>
              <h2 className="text-xl font-black">🧠 {t("st.models")}</h2>
              <ul className="mt-2 space-y-2 text-sm font-semibold">
                <li className="flex justify-between gap-3 rounded-xl bg-cream p-2">
                  <span>EfficientNetB0 · {t("st.alphabet")}</span>
                  <span>
                    {t("st.classes", { n: NUM_LETTERS })} · {t("st.mb", { n: 24 })}
                  </span>
                </li>
                <li className="flex justify-between gap-3 rounded-xl bg-cream p-2">
                  <span>Landmark MLP · {t("st.words")}</span>
                  <span>
                    {t("st.classes", { n: NUM_WORDS })} · {t("st.mb", { n: "1.2" })}
                  </span>
                </li>
                <li className="flex justify-between gap-3 rounded-xl bg-cream p-2">
                  <span>{t("st.backend")}</span>
                  <span dir="ltr" className="text-end">
                    {s.backend}
                  </span>
                </li>
              </ul>
            </div>
          </section>
        </div>

        <section className="card p-5" aria-label={t("st.album")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black">🎴 {t("st.album")}</h2>
            <div className="flex items-center gap-3">
              <span className="chip bg-coral/20" dir="ltr">
                {s.discoveredLetters.length}/{NUM_LETTERS} {t("common.letters")}
              </span>
              <span className="chip bg-sky/25" dir="ltr">
                {s.discoveredWords.length}/{NUM_WORDS} {t("common.words")}
              </span>
              <button className="btn !px-3 !py-1 text-sm" onClick={() => stats.resetDiscovered()}>
                {t("st.album.reset")}
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {LETTER_CLASSES.map((c) => (
              <Sticker key={c.id} text={c.ar} title={c.en} on={s.discoveredLetters.includes(c.id)} color="bg-coral" />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {WORD_CLASSES.map((c) => (
              <Sticker key={c.id} text={c.ar} title={c.en} on={s.discoveredWords.includes(c.id)} color="bg-sky" wide />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-ink bg-cream p-3">
      <dd className="text-2xl font-black tabular-nums" dir="ltr">
        {value}
      </dd>
      <dt className="text-xs font-bold opacity-70">{label}</dt>
    </div>
  );
}

function Sticker({ text, title, on, color, wide }: { text: string; title: string; on: boolean; color: string; wide?: boolean }) {
  return (
    <span
      title={title}
      aria-label={`${title}${on ? " ✓" : ""}`}
      className={`grid h-12 place-items-center rounded-xl border-2 border-ink px-2 text-lg font-black ${wide ? "min-w-16" : "w-12"} ${
        on ? `${color} shadow-[0_3px_0_#1d1b3a]` : "border-dashed border-ink/30 bg-white text-ink/30"
      }`}
    >
      {text}
    </span>
  );
}
