"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useStats } from "@/lib/stats";
import { NUM_LETTERS, NUM_WORDS } from "@/lib/labels";
import { Icon, type IconName } from "./Icon";
import { Logos, Panel, TopBar } from "./ui";

const STEPS: { key: string; icon: IconName; tint: string }[] = [
  { key: "tech.s1", icon: "camera", tint: "from-[#3db9f5] to-[#2a7fd6]" },
  { key: "tech.s2", icon: "hand", tint: "from-[#35d4b3] to-[#14937a]" },
  { key: "tech.s3", icon: "cpu", tint: "from-[#ff9ccb] to-[#e0529a]" },
  { key: "tech.s4", icon: "target", tint: "from-[#ffd45e] to-[#f5a800]" },
  { key: "tech.s5", icon: "volume", tint: "from-[#9d86ff] to-[#6c4cf1]" },
];

const STACK = ["MediaPipe Hand Landmarker", "EfficientNetB0 (ONNX)", "Landmark MLP (ONNX)", "ONNX Runtime Web (WASM)", "Next.js · React · TypeScript", "Web Speech API"];

export function TechScreen({ onBack }: { onBack: () => void }) {
  const { t, dir } = useI18n();
  const s = useStats();
  const [active, setActive] = useState(0);

  return (
    <>
      <TopBar title={t("tech.title")} icon="cpu" onBack={onBack} />
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
        <Panel title={t("tech.sub")} icon="layers" bodyClassName="!pt-4 sm:!p-8">
          <ol className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
            {STEPS.map((st, i) => (
              <li key={st.key} className="flex flex-1 flex-col items-center gap-3 lg:flex-row">
                <button
                  onClick={() => setActive(i)}
                  aria-current={active === i}
                  className={`flex w-full flex-col items-center gap-2 rounded-3xl p-4 text-center transition-all duration-300 ${
                    active === i ? "-translate-y-1 bg-white shadow-[0_18px_40px_-16px_rgba(108,76,241,0.55)]" : "bg-white/50 hover:bg-white/80"
                  }`}
                >
                  <span className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br text-white ${st.tint}`}>
                    <Icon name={st.icon} size={28} />
                  </span>
                  <span className="font-black">{t(`${st.key}.t`)}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <Icon name={dir === "rtl" ? "arrowLeft" : "arrowRight"} size={22} className="rotate-90 text-violet/50 lg:rotate-0" />
                )}
              </li>
            ))}
          </ol>

          <p key={active} className="animate-rise mt-6 rounded-2xl bg-violet-l/70 p-4 text-lg font-semibold" aria-live="polite">
            <b className="text-violet-d">
              {t(`${STEPS[active].key}.t`)}:
            </b>{" "}
            {t(`${STEPS[active].key}.d`)}
          </p>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title={t("tech.why")} icon="sparkles">
            <ul className="space-y-3 font-semibold">
              {(["tech.w1", "tech.w2", "tech.w3", "tech.w4"] as const).map((k) => (
                <li key={k} className="flex gap-3 rounded-2xl bg-violet-l/60 p-3">
                  <Icon name="check" size={20} className="mt-0.5 shrink-0 text-mint" />
                  <span>{t(k)}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title={t("tech.stack")} icon="cpu" bodyClassName="space-y-5">
            <div className="flex flex-wrap gap-2" dir="ltr">
              {STACK.map((x) => (
                <span key={x} className="chip">
                  {x}
                </span>
              ))}
            </div>
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-lg font-black">
                <Icon name="zap" size={20} className="text-violet" />
                {t("tech.live")}
              </h3>
              <dl className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                <Num label={t("st.fps")} value={s.fps > 0 ? s.fps.toFixed(0) : "—"} />
                <Num label={t("st.total")} value={s.totalMs > 0 ? `${Math.round(s.totalMs)} ${t("common.ms")}` : "—"} />
                <Num label={t("common.letters")} value={String(NUM_LETTERS)} />
                <Num label={t("common.words")} value={String(NUM_WORDS)} />
              </dl>
            </div>
          </Panel>
        </div>

        <footer className="glass flex flex-wrap items-center gap-5 p-5">
          <Logos size={52} />
          <p className="flex-1 text-sm font-semibold text-muted">{t("tech.credits")}</p>
        </footer>
      </main>
    </>
  );
}

function Num({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-violet-l/70 p-3">
      <dd className="text-xl font-black tabular-nums text-violet-d" dir="ltr">
        {value}
      </dd>
      <dt className="text-xs font-bold text-muted">{label}</dt>
    </div>
  );
}
