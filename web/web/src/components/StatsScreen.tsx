"use client";

import { useI18n } from "@/lib/i18n";
import { LETTER_CLASSES, NUM_LETTERS, NUM_WORDS, WORD_CLASSES } from "@/lib/labels";
import { stats, useStats } from "@/lib/stats";
import { Icon } from "./Icon";
import { Panel, TopBar } from "./ui";
import type { Screen } from "./App";

function Metric({ label, value, unit, budget, gradient }: { label: string; value: number; unit: string; budget: number; gradient: string }) {
  const empty = value <= 0;
  return (
    <div className="glass spot p-4" data-tilt="off">
      <p className="text-sm font-bold text-muted">{label}</p>
      <p className="mt-1 text-4xl font-black tabular-nums text-violet-d" dir="ltr">
        {empty ? "—" : value < 10 ? value.toFixed(1) : Math.round(value)}
        <span className="ms-1 text-base font-bold text-muted">{unit}</span>
      </p>
      <div className="meter mt-3 !h-2.5">
        <i style={{ width: `${empty ? 0 : Math.min(100, (value / budget) * 100)}%`, background: gradient }} />
      </div>
    </div>
  );
}

function ConfidenceChart({ values, empty }: { values: number[]; empty: string }) {
  const W = 600;
  const H = 160;
  if (values.length < 2) {
    return <div className="grid h-40 place-items-center rounded-2xl border-2 border-dashed border-line text-sm font-semibold text-muted">{empty}</div>;
  }
  const step = W / (values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(H - v * H).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full" preserveAspectRatio="none" role="img" aria-label="confidence over time">
      <defs>
        <linearGradient id="cc" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#6c4cf1" stopOpacity="0.35" />
          <stop offset="1" stopColor="#6c4cf1" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1={0} x2={W} y1={H - g * H} y2={H - g * H} stroke="#6c4cf1" strokeOpacity={0.14} strokeDasharray="6 6" />
      ))}
      <polyline points={`0,${H} ${pts} ${W},${H}`} fill="url(#cc)" stroke="none" />
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
      <TopBar title={t("st.title")} icon="chart" onBack={onBack} />
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
        {!hasData && (
          <div className="glass animate-rise flex flex-wrap items-center gap-4 !bg-[#fff6d6]/90 p-4">
            <Icon name="bulb" size={22} className="text-sun-d" />
            <p className="font-bold">{t("st.empty")}</p>
            <button className="btn btn-primary" onClick={() => go("live")}>
              <Icon name="hand" size={18} />
              {t("hub.live")}
            </button>
          </div>
        )}

        <section aria-label={t("st.live")}>
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black">
            <Icon name="zap" size={22} className="text-violet" />
            {t("st.live")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label={t("st.fps")} value={s.fps} unit="fps" budget={30} gradient="linear-gradient(90deg,#35d4b3,#14937a)" />
            <Metric label={t("st.mediapipe")} value={s.mediapipeMs} unit={t("common.ms")} budget={100} gradient="linear-gradient(90deg,#3db9f5,#2a7fd6)" />
            <Metric label={t("st.words")} value={s.wordsMs} unit={t("common.ms")} budget={100} gradient="linear-gradient(90deg,#ff9ccb,#e0529a)" />
            <Metric label={t("st.alphabet")} value={s.alphabetMs} unit={t("common.ms")} budget={300} gradient="linear-gradient(90deg,#ff8a8a,#e84a6f)" />
            <Metric label={t("st.total")} value={s.totalMs} unit={t("common.ms")} budget={300} gradient="linear-gradient(90deg,#9d86ff,#6c4cf1)" />
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <Panel
            title={t("st.conf")}
            icon="chart"
            aside={
              avgConf > 0 ? (
                <span className="chip chip-mint" dir="ltr">
                  avg {Math.round(avgConf * 100)}%
                </span>
              ) : undefined
            }
          >
            <ConfidenceChart values={s.confidence} empty={t("st.empty")} />
            <dl className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-3">
              <Mini label={t("st.recognitions")} value={String(s.recognitions)} />
              <Mini label={t("st.frames")} value={String(s.frames)} />
              <Mini label={t("st.load")} value={s.loadMs ? `${(s.loadMs / 1000).toFixed(1)}s` : "—"} />
            </dl>
          </Panel>

          <Panel title={t("st.privacy")} icon="shield" bodyClassName="space-y-4">
            <p className="font-semibold">{t("st.privacy.v")}</p>
            <div>
              <h3 className="flex items-center gap-2 text-lg font-black">
                <Icon name="cpu" size={20} className="text-violet" />
                {t("st.models")}
              </h3>
              <ul className="mt-2 space-y-2 text-sm font-semibold">
                <li className="flex justify-between gap-3 rounded-xl bg-violet-l/70 p-2.5">
                  <span>EfficientNetB0 · {t("st.alphabet")}</span>
                  <span>
                    {t("st.classes", { n: NUM_LETTERS })} · {t("st.mb", { n: 24 })}
                  </span>
                </li>
                <li className="flex justify-between gap-3 rounded-xl bg-violet-l/70 p-2.5">
                  <span>Landmark MLP · {t("st.words")}</span>
                  <span>
                    {t("st.classes", { n: NUM_WORDS })} · {t("st.mb", { n: "1.2" })}
                  </span>
                </li>
                <li className="flex justify-between gap-3 rounded-xl bg-violet-l/70 p-2.5">
                  <span>{t("st.backend")}</span>
                  <span dir="ltr" className="text-end">
                    {s.backend}
                  </span>
                </li>
              </ul>
            </div>
          </Panel>
        </div>

        <Panel
          title={t("st.album")}
          icon="layers"
          aside={
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip chip-coral" dir="ltr">
                {s.discoveredLetters.length}/{NUM_LETTERS} {t("common.letters")}
              </span>
              <span className="chip chip-sky" dir="ltr">
                {s.discoveredWords.length}/{NUM_WORDS} {t("common.words")}
              </span>
              <button className="btn btn-sm" onClick={() => stats.resetDiscovered()}>
                <Icon name="refresh" size={14} />
                {t("st.album.reset")}
              </button>
            </div>
          }
        >
          <div className="flex flex-wrap gap-2">
            {LETTER_CLASSES.map((c) => (
              <Sticker key={c.id} text={c.ar} title={c.en} on={s.discoveredLetters.includes(c.id)} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {WORD_CLASSES.map((c) => (
              <Sticker key={c.id} text={c.ar} title={c.en} on={s.discoveredWords.includes(c.id)} wide />
            ))}
          </div>
        </Panel>
      </main>
    </>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-violet-l/70 p-3">
      <dd className="text-2xl font-black tabular-nums text-violet-d" dir="ltr">
        {value}
      </dd>
      <dt className="text-xs font-bold text-muted">{label}</dt>
    </div>
  );
}

function Sticker({ text, title, on, wide }: { text: string; title: string; on: boolean; wide?: boolean }) {
  return (
    <span
      title={title}
      aria-label={`${title}${on ? " ✓" : ""}`}
      className={`grid h-12 place-items-center rounded-xl px-2 text-lg font-black transition-all duration-300 ${wide ? "min-w-16" : "w-12"} ${
        on
          ? "bg-gradient-to-br from-[#7d5fff] to-[#4b32c3] text-white shadow-[0_8px_16px_-8px_rgba(75,50,195,0.8)] hover:-translate-y-0.5"
          : "border-2 border-dashed border-line bg-white/60 text-violet/30"
      }`}
    >
      {text}
    </span>
  );
}
