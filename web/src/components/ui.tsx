"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { asset } from "@/lib/paths";
import { loadHints, type Hint } from "@/lib/storage";
import { Icon, type IconName } from "./Icon";

/* ------------------------------ logos ------------------------------ */
export function Logos({ size = 44, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={asset("/brand/logo_military.png")} alt="Egyptian Military Academy" style={{ height: size, width: "auto" }} />
      <span className="h-7 w-px bg-line" aria-hidden />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={asset("/brand/logo_digilians.png")} alt="DiGiLiANS" style={{ height: size, width: "auto" }} />
    </div>
  );
}

/* ------------------------- language switch ------------------------- */
export function LangSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <button
      className="btn !px-3.5"
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      aria-label={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
    >
      <Icon name="globe" size={18} />
      {lang === "ar" ? "EN" : "عربي"}
    </button>
  );
}

/* ----------------------------- demo top bar ----------------------------- */
export function TopBar({
  title,
  icon = "hand",
  onBack,
  right,
}: {
  title: string;
  icon?: IconName;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const { t, dir } = useI18n();
  return (
    <header className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 pt-4">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#7d5fff] to-[#4b32c3] text-white shadow-[0_10px_24px_-12px_rgba(75,50,195,0.9)]">
        <Icon name={icon} size={26} />
      </span>
      <h1 className="text-2xl font-black sm:text-3xl">{title}</h1>
      {onBack && (
        <button className="btn btn-sm" onClick={onBack} aria-label={t("common.home")}>
          <Icon name={dir === "rtl" ? "arrowRight" : "arrowLeft"} size={16} />
          {t("common.home")}
        </button>
      )}
      <div className="ms-auto flex items-center gap-3">
        {right}
        <Logos size={34} className="hidden md:flex" />
        <LangSwitch />
      </div>
    </header>
  );
}

/* --------------------------------- panel --------------------------------- */
export function Panel({
  title,
  icon,
  aside,
  children,
  className = "",
  bodyClassName = "",
}: {
  title: string;
  icon?: IconName;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-head">
        <h2 className="panel-tab">
          {icon && <Icon name={icon} size={20} />}
          {title}
        </h2>
        {aside}
      </div>
      <div className={`panel-body ${bodyClassName}`}>{children}</div>
    </section>
  );
}

/* -------------------------- confidence bar -------------------------- */
export function ConfidenceBar({
  label,
  icon,
  value,
  threshold,
  active = true,
  color,
}: {
  label: string;
  icon?: IconName;
  value: number;
  threshold?: number;
  active?: boolean;
  color?: string;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={`flex items-center gap-3 ${active ? "" : "opacity-50"}`}>
      <span className="w-24 shrink-0 text-sm font-bold text-muted sm:w-32">
        {icon && <Icon name={icon} size={16} className="me-1.5 inline text-violet" />}
        {label}
      </span>
      <div className="meter flex-1">
        <i style={{ width: active ? `${pct}%` : 0, ...(color ? { background: color } : null) }} />
        {threshold !== undefined && <b style={{ insetInlineStart: `${threshold * 100}%` }} />}
      </div>
      <span className="w-14 rounded-full bg-violet-l px-2 py-0.5 text-center text-sm font-black tabular-nums text-violet-d" dir="ltr">
        {active ? `${pct}%` : "--%"}
      </span>
    </div>
  );
}

/* --------------------------- progress ring --------------------------- */
export function ProgressRing({
  fraction,
  size = 120,
  stroke = 12,
  color = "#6c4cf1",
  children,
}: {
  fraction: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8e2ff" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, fraction)))}
          style={{ transition: "stroke-dashoffset 0.12s linear, stroke 0.3s" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

/* ------------------------------ confetti ------------------------------ */
const CONFETTI_COLORS = ["#6c4cf1", "#ffc83d", "#22b99a", "#3db9f5", "#ff7eb6", "#b9a6ff"];

export function Confetti({ burstKey, count = 36 }: { burstKey: number; count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const dist = 120 + Math.random() * 220;
        return {
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist - 60,
          rot: (Math.random() - 0.5) * 720,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          size: 8 + Math.random() * 8,
          delay: Math.random() * 0.1,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [burstKey, count],
  );
  if (!burstKey) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden key={burstKey}>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute left-1/2 top-1/2 block rounded-sm"
          style={
            {
              width: p.size,
              height: p.size * 0.6,
              background: p.color,
              "--dx": `${p.dx}px`,
              "--dy": `${p.dy}px`,
              "--rot": `${p.rot}deg`,
              animation: `confetti 1.1s ease-out ${p.delay}s both`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/* ------------------------------ hint view ------------------------------ */
const BONES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];
const HAND_COLORS = ["#6c4cf1", "#f5a800"];

function Skeleton({ hint }: { hint: Hint }) {
  // mirrored to match the mirrored camera preview
  return (
    <svg viewBox="-0.06 -0.06 1.12 1.12" className="h-full w-full -scale-x-100" role="img" aria-label="hint">
      {hint.hands.map((h, i) => (
        <g key={i} stroke={HAND_COLORS[i % 2]} strokeWidth={0.022} strokeLinecap="round" fill={HAND_COLORS[i % 2]}>
          {BONES.map(([a, b], k) => (
            <line key={k} x1={h[a][0]} y1={h[a][1]} x2={h[b][0]} y2={h[b][1]} />
          ))}
          {h.map((p, k) => (
            <circle key={k} cx={p[0]} cy={p[1]} r={0.02} stroke="none" />
          ))}
        </g>
      ))}
    </svg>
  );
}

/**
 * Reference for a sign. Priority:
 *   1. an optional photo in /public/signs/<kind>-<index>.(webp|png|jpg)
 *   2. a skeleton learned the first time the app recognised that sign
 */
export function HintView({ signId }: { signId: string }) {
  const { t } = useI18n();
  const [hint, setHint] = useState<Hint | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const exts = ["webp", "png", "jpg"];
  const slug = signId.replace(":", "-");

  useEffect(() => {
    setHint(loadHints()[signId] ?? null);
    setImgIdx(0);
  }, [signId]);

  if (imgIdx < exts.length) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={asset(`/signs/${slug}.${exts[imgIdx]}`)}
        alt=""
        className="h-full w-full object-contain"
        onError={() => setImgIdx((i) => i + 1)}
      />
    );
  }
  if (hint) return <Skeleton hint={hint} />;
  return <p className="p-3 text-center text-sm font-semibold text-muted">{t("ch.nohint")}</p>;
}
