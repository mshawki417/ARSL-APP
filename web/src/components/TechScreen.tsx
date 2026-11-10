"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useStats } from "@/lib/stats";
import { NUM_LETTERS, NUM_WORDS } from "@/lib/labels";
import { Logos, TopBar } from "./ui";

const STEPS = [
  { key: "tech.s1", icon: "📷", bg: "bg-sky" },
  { key: "tech.s2", icon: "🖐️", bg: "bg-mint" },
  { key: "tech.s3", icon: "🧠", bg: "bg-pink" },
  { key: "tech.s4", icon: "🏁", bg: "bg-sun" },
  { key: "tech.s5", icon: "💬", bg: "bg-coral" },
] as const;

const STACK = ["MediaPipe Hand Landmarker", "EfficientNetB0 (ONNX)", "Landmark MLP (ONNX)", "ONNX Runtime Web (WASM)", "Next.js · React · TypeScript", "Web Speech API"];

export function TechScreen({ onBack }: { onBack: () => void }) {
  const { t, dir } = useI18n();
  const s = useStats();
  const [active, setActive] = useState(0);
  const arrow = dir === "rtl" ? "◀" : "▶";

  return (
    <>
      <TopBar title={t("tech.title")} onBack={onBack} />
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
        <section className="card p-5 sm:p-8">
          <h2 className="mb-5 text-xl font-black">{t("tech.sub")}</h2>

          <ol className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
            {STEPS.map((st, i) => (
              <li key={st.key} className="flex flex-1 flex-col items-center gap-3 lg:flex-row">
                <button
                  onClick={() => setActive(i)}
                  aria-current={active === i}
                  className={`flex w-full flex-col items-center gap-2 rounded-3xl border-[3px] border-ink p-4 text-center transition-all ${st.bg} ${
                    active === i ? "-translate-y-1 shadow-[0_6px_0_#1d1b3a]" : "opacity-80 hover:opacity-100"
                  }`}
                >
                  <span className="text-4xl" aria-hidden>
                    {st.icon}
                  </span>
                  <span className="text-xs font-black opacity-70">{i + 1}</span>
                  <span className="font-black">{t(`${st.key}.t`)}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <span className="rotate-90 text-2xl lg:rotate-0" aria-hidden>
                    {arrow}
                  </span>
                )}
              </li>
            ))}
          </ol>

          <p key={active} className="animate-rise mt-6 rounded-2xl border-2 border-ink bg-cream p-4 text-lg font-semibold" aria-live="polite">
            <b>
              {active + 1}. {t(`${STEPS[active].key}.t`)}:
            </b>{" "}
            {t(`${STEPS[active].key}.d`)}
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card p-5">
            <h2 className="mb-3 text-xl font-black">✨ {t("tech.why")}</h2>
            <ul className="space-y-3 font-semibold">
              {(["tech.w1", "tech.w2", "tech.w3", "tech.w4"] as const).map((k) => (
                <li key={k} className="flex gap-3 rounded-2xl bg-cream p-3">
                  <span aria-hidden>✅</span>
                  <span>{t(k)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card space-y-5 p-5">
            <div>
              <h2 className="mb-3 text-xl font-black">🛠️ {t("tech.stack")}</h2>
              <div className="flex flex-wrap gap-2" dir="ltr">
                {STACK.map((x) => (
                  <span key={x} className="chip bg-grape/10">
                    {x}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h2 className="mb-3 text-xl font-black">📡 {t("tech.live")}</h2>
              <dl className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                <Num label={t("st.fps")} value={s.fps > 0 ? s.fps.toFixed(0) : "—"} />
                <Num label={t("st.total")} value={s.totalMs > 0 ? `${Math.round(s.totalMs)} ${t("common.ms")}` : "—"} />
                <Num label={t("common.letters")} value={String(NUM_LETTERS)} />
                <Num label={t("common.words")} value={String(NUM_WORDS)} />
              </dl>
            </div>
          </section>
        </div>

        <footer className="card flex flex-wrap items-center gap-5 p-5">
          <Logos size={52} />
          <p className="flex-1 text-sm font-semibold opacity-80">{t("tech.credits")}</p>
        </footer>
      </main>
    </>
  );
}

function Num({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-ink bg-cream p-3">
      <dd className="text-xl font-black tabular-nums" dir="ltr">
        {value}
      </dd>
      <dt className="text-xs font-bold opacity-70">{label}</dt>
    </div>
  );
}
