"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { asset } from "@/lib/paths";
import { SITE } from "@/lib/site";
import { speak, stopSpeaking, ttsSupported, hasArabicVoice } from "@/lib/audio";
import { LETTER_CLASSES, NUM_LETTERS, NUM_WORDS, WORD_CLASSES } from "@/lib/labels";
import { Icon, type IconName } from "./Icon";
import { LangSwitch, Logos } from "./ui";

const SECTIONS = ["features", "how", "try", "uses", "faq"] as const;

function useCount(target: number, run: boolean, ms = 1400) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setV(target);
    let raf = 0;
    const s = performance.now();
    const tick = (n: number) => {
      const p = Math.min(1, (n - s) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, ms]);
  return v;
}

function useSeen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

/* ------------------------------ nav ------------------------------ */
function Nav({ progress }: { progress: number }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: "-45% 0px -50% 0px" });
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);
  return (
    <header className="sticky top-0 z-40 px-3 pt-3">
      <div className="glass-strong mx-auto flex max-w-7xl items-center gap-3 px-3 py-2 sm:px-4">
        <a href="#top" className="flex items-center gap-2 font-black">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#7d5fff] to-[#4b32c3] text-white">
            <Icon name="hand" size={22} />
          </span>
          <span className="hidden sm:block">{t("app.title")}</span>
        </a>
        <nav className="ms-4 hidden items-center gap-1 lg:flex" aria-label="sections">
          {SECTIONS.map((s) => (
            <a key={s} href={`#${s}`} className={`rounded-full px-3 py-1.5 text-sm font-bold transition-colors ${active === s ? "bg-violet-l text-violet-d" : "text-muted hover:text-ink"}`}>
              {t(`land.nav.${s}`)}
            </a>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <LangSwitch />
          <Link href="/demo/" className="btn btn-primary hidden sm:inline-flex">
            <Icon name="play" size={16} />
            {t("land.nav.demo")}
          </Link>
          <button className="btn btn-icon lg:hidden" aria-label={t("land.nav.menu")} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            <Icon name={open ? "x" : "menu"} size={20} />
          </button>
        </div>
        <div className="pointer-events-none absolute inset-x-6 -bottom-px h-[3px] overflow-hidden rounded-full">
          <div className="h-full origin-[right_center] rtl:origin-right bg-gradient-to-l from-violet to-sun" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
      {open && (
        <div className="glass-strong animate-rise mx-auto mt-2 flex max-w-7xl flex-col gap-1 p-3 lg:hidden">
          {SECTIONS.map((s) => (
            <a key={s} href={`#${s}`} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 font-bold hover:bg-violet-l">
              {t(`land.nav.${s}`)}
            </a>
          ))}
          <Link href="/demo/" className="btn btn-primary mt-1 justify-center">
            {t("land.nav.demo")}
          </Link>
        </div>
      )}
    </header>
  );
}

/* ------------------------------ hero ------------------------------ */
function Hero() {
  const { t } = useI18n();
  const vref = useRef<HTMLVideoElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(true);
  const prefetch = () => {
    ["/models/words.onnx", "/models/alphabet.onnx"].forEach((p) => fetch(asset(p)).catch(() => {}));
  };
  const toggle = () => {
    const v = vref.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };
  const onMove = (e: React.PointerEvent) => {
    const el = wrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-y * 6).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * 8).toFixed(2)}deg`);
  };
  const reset = () => {
    wrap.current?.style.setProperty("--rx", "0deg");
    wrap.current?.style.setProperty("--ry", "0deg");
  };
  return (
    <section id="top" className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-10 lg:grid-cols-[1fr_1.1fr] lg:pt-16">
      <div>
        <span className="chip chip-mint animate-rise">
          <span className="live-dot" />
          {t("land.chip.private")}
        </span>
        <h1 className="animate-rise mt-5 text-4xl font-black leading-[1.25] sm:text-5xl lg:text-[3.4rem]" style={{ animationDelay: "80ms" }}>
          <span className="gradient-text">{t("land.hero.title")}</span>
        </h1>
        <p className="animate-rise mt-5 max-w-xl text-lg font-semibold text-muted" style={{ animationDelay: "160ms" }}>
          {t("land.hero.sub")}
        </p>
        <div className="animate-rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: "240ms" }}>
          <Link href="/demo/" className="btn btn-accent btn-lg" onPointerEnter={prefetch} onFocus={prefetch}>
            <Icon name="play" size={20} />
            {t("land.hero.cta")}
          </Link>
          <a href="#how" className="btn btn-lg">
            <Icon name="chevronDown" size={20} />
            {t("land.hero.secondary")}
          </a>
        </div>
        <ul className="animate-rise mt-8 flex flex-wrap gap-x-6 gap-y-2 font-bold text-muted" style={{ animationDelay: "320ms" }}>
          {(["trust1", "trust2", "trust3"] as const).map((k) => (
            <li key={k} className="flex items-center gap-2">
              <Icon name="check" size={18} className="text-mint" />
              {t(`land.hero.${k}`)}
            </li>
          ))}
        </ul>
      </div>

      <div ref={wrap} onPointerMove={onMove} onPointerLeave={reset} className="relative [perspective:1200px]" style={{ ["--rx" as string]: "0deg", ["--ry" as string]: "0deg" }}>
        <div className="glass-strong relative overflow-hidden p-2 transition-transform duration-300 [transform:rotateX(var(--rx))_rotateY(var(--ry))] sm:p-3">
          <video
            ref={vref}
            className="aspect-video w-full rounded-[1.4rem] bg-violet-l"
            src={asset("/video/hero.mp4")}
            poster={asset("/video/poster.jpg")}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-label={t("land.video.label")}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
          <div className="absolute inset-x-5 bottom-5 flex items-center gap-2">
            <button className="btn btn-icon" onClick={toggle} aria-label={playing ? t("land.video.pause") : t("land.video.play")}>
              <Icon name={playing ? "pause" : "play"} size={18} />
            </button>
            <button className="btn btn-icon" onClick={() => vref.current?.requestFullscreen?.()} aria-label={t("land.video.full")}>
              <Icon name="maximize" size={18} />
            </button>
          </div>
        </div>
        <span className="chip chip-sun absolute -top-3 end-6 animate-float">
          <Icon name="zap" size={14} />
          {t("land.chip.speed")}
        </span>
        <p className="mt-3 text-center text-xs font-semibold text-muted">{t("land.video.note")}</p>
      </div>
    </section>
  );
}

/* ------------------------- partners + numbers ------------------------- */
function Numbers() {
  const { t } = useI18n();
  const [ref, seen] = useSeen<HTMLDivElement>();
  const a = useCount(NUM_LETTERS, seen);
  const b = useCount(NUM_WORDS, seen);
  const c = useCount(0, seen);
  const items = [
    { v: a, k: "letters", icon: "letters" as IconName },
    { v: b, k: "words", icon: "message" as IconName },
    { v: "<1s", k: "ms", icon: "zap" as IconName },
    { v: c, k: "upload", icon: "shield" as IconName },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16">
      <div className="reveal glass flex flex-wrap items-center justify-center gap-x-8 gap-y-3 p-4">
        <Logos size={44} />
        <p className="text-center font-bold text-muted">{t("land.partners")}</p>
      </div>
      <div ref={ref} className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map((it, i) => (
          <div key={it.k} className="reveal glass spot p-5 text-center" style={{ ["--d" as string]: `${i * 80}ms` }}>
            <Icon name={it.icon} size={26} className="mx-auto text-violet" />
            <p className="mt-2 text-4xl font-black tabular-nums text-violet-d" dir="ltr">
              {it.k === "ms" ? "< 1s" : it.v}
            </p>
            <p className="mt-1 text-sm font-bold text-muted">{t(`land.num.${it.k}`)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------- features ----------------------------- */
const FEATS: { k: string; icon: IconName; tint: string; span?: string }[] = [
  { k: "privacy", icon: "shield", tint: "from-[#35d4b3] to-[#14937a]", span: "lg:col-span-2" },
  { k: "speed", icon: "zap", tint: "from-[#ffd45e] to-[#f5a800]" },
  { k: "models", icon: "layers", tint: "from-[#7d5fff] to-[#4b32c3]" },
  { k: "voice", icon: "volume", tint: "from-[#ff9ccb] to-[#e0529a]" },
  { k: "anywhere", icon: "globe", tint: "from-[#3db9f5] to-[#2a7fd6]", span: "lg:col-span-2" },
  { k: "game", icon: "trophy", tint: "from-[#ffd45e] to-[#f5a800]" },
];
function Section({ id, title, sub, children }: { id: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-20">
      <div className="reveal mb-8 max-w-2xl">
        <h2 className="text-3xl font-black sm:text-4xl">{title}</h2>
        {sub && <p className="mt-2 text-lg font-semibold text-muted">{sub}</p>}
      </div>
      {children}
    </section>
  );
}
function Features() {
  const { t } = useI18n();
  return (
    <Section id="features" title={t("land.feat.title")} sub={t("land.feat.sub")}>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATS.map((f, i) => (
          <article key={f.k} className={`reveal glass spot group p-6 ${f.span ?? ""}`} style={{ ["--d" as string]: `${i * 70}ms` }}>
            <span className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br text-white transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 ${f.tint}`}>
              <Icon name={f.icon} size={28} />
            </span>
            <h3 className="mt-4 text-xl font-black">{t(`land.feat.${f.k}.t`)}</h3>
            <p className="mt-2 font-semibold text-muted">{t(`land.feat.${f.k}.d`)}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

/* ----------------------------- how it works ----------------------------- */
const STEPS: { key: string; icon: IconName; tint: string }[] = [
  { key: "tech.s1", icon: "camera", tint: "from-[#3db9f5] to-[#2a7fd6]" },
  { key: "tech.s2", icon: "hand", tint: "from-[#35d4b3] to-[#14937a]" },
  { key: "tech.s3", icon: "cpu", tint: "from-[#ff9ccb] to-[#e0529a]" },
  { key: "tech.s4", icon: "target", tint: "from-[#ffd45e] to-[#f5a800]" },
  { key: "tech.s5", icon: "volume", tint: "from-[#9d86ff] to-[#6c4cf1]" },
];
function How() {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => setI((v) => (v + 1) % STEPS.length), 3200);
    return () => clearInterval(id);
  }, [auto]);
  return (
    <Section id="how" title={t("land.how.title")} sub={t("land.how.sub")}>
      <div className="reveal glass p-5 sm:p-8">
        <ol className="relative grid gap-3 sm:grid-cols-5">
          {STEPS.map((s, k) => (
            <li key={s.key}>
              <button
                onClick={() => {
                  setI(k);
                  setAuto(false);
                }}
                aria-current={i === k}
                className={`flex w-full flex-col items-center gap-2 rounded-3xl p-4 text-center transition-all duration-300 ${i === k ? "-translate-y-1 bg-white shadow-[0_18px_40px_-16px_rgba(108,76,241,0.55)]" : "bg-white/50 hover:bg-white/80"}`}
              >
                <span className={`relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br text-white ${s.tint}`}>
                  <Icon name={s.icon} size={28} />
                  {i === k && <span className="absolute inset-0 animate-ping rounded-2xl bg-white/40" />}
                </span>
                <span className="font-black">{t(`${s.key}.t`)}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="meter mt-5 !h-2">
          <i style={{ width: `${((i + 1) / STEPS.length) * 100}%`, transition: "width .5s cubic-bezier(.2,.8,.2,1)" }} />
        </div>
        <p key={i} className="animate-rise mt-5 rounded-2xl bg-violet-l/70 p-4 text-lg font-semibold" aria-live="polite">
          <b className="text-violet-d">{t(`${STEPS[i].key}.t`)}:</b> {t(`${STEPS[i].key}.d`)}
        </p>
        <button className="btn btn-sm mt-4" onClick={() => setAuto((v) => !v)}>
          <Icon name={auto ? "pause" : "play"} size={14} />
          {auto ? t("land.how.pause") : t("land.how.resume")}
        </button>
      </div>
    </Section>
  );
}

/* ----------------------------- try it ----------------------------- */
function Try() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"letters" | "words">("letters");
  const [sel, setSel] = useState<{ id: string; ar: string; en: string } | null>(null);
  const [noVoice, setNoVoice] = useState(false);
  const list = tab === "letters" ? LETTER_CLASSES : WORD_CLASSES;
  const say = useCallback((text: string) => {
    if (!ttsSupported()) return setNoVoice(true);
    const ok = speak(text);
    setNoVoice(!ok && !hasArabicVoice());
  }, []);
  useEffect(() => () => stopSpeaking(), []);
  return (
    <Section id="try" title={t("land.try.title")} sub={t("land.try.sub")}>
      <div className="reveal grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="glass p-5">
          <div className="seg mb-4" role="tablist">
            {(["letters", "words"] as const).map((k) => (
              <button key={k} role="tab" aria-selected={tab === k} className="seg-btn" onClick={() => setTab(k)}>
                <Icon name={k === "letters" ? "letters" : "message"} size={16} />
                {t(`land.try.${k}`)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {list.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSel(c);
                  say(c.ar);
                }}
                aria-pressed={sel?.id === c.id}
                className={`btn !h-12 !rounded-xl !px-3 text-lg font-black ${sel?.id === c.id ? "btn-primary" : ""}`}
              >
                {c.ar}
              </button>
            ))}
          </div>
        </div>
        <div className="glass-strong flex flex-col items-center justify-center gap-3 p-6 text-center">
          {sel ? (
            <>
              <p key={sel.id} className="animate-pop text-7xl font-black text-violet-d">
                {sel.ar}
              </p>
              <p className="text-xl font-black" dir="ltr">
                {sel.en}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button className="btn btn-primary" onClick={() => say(sel.ar)}>
                  <Icon name="volume" size={18} />
                  {t("land.try.speak")}
                </button>
                <Link href="/demo/" className="btn btn-accent">
                  <Icon name="camera" size={18} />
                  {t("land.try.open")}
                </Link>
              </div>
              {noVoice && <p className="rounded-xl bg-[#fff1c2] p-2 text-sm font-bold text-[#7a5600]">{t("land.try.novoice")}</p>}
            </>
          ) : (
            <>
              <Icon name="hand" size={52} className="animate-float text-violet/40" />
              <p className="font-bold text-muted">{t("land.try.none")}</p>
            </>
          )}
          <p className="text-xs font-semibold text-muted">{t("land.try.tip")}</p>
        </div>
      </div>
    </Section>
  );
}

/* ----------------------------- use cases ----------------------------- */
const USES: { k: string; icon: IconName; tint: string }[] = [
  { k: "edu", icon: "school", tint: "from-[#7d5fff] to-[#4b32c3]" },
  { k: "gov", icon: "landmark", tint: "from-[#35d4b3] to-[#14937a]" },
  { k: "biz", icon: "building", tint: "from-[#ffd45e] to-[#f5a800]" },
  { k: "lab", icon: "bulb", tint: "from-[#ff9ccb] to-[#e0529a]" },
];
function Uses() {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  const u = USES[i];
  return (
    <Section id="uses" title={t("land.uses.title")} sub={t("land.uses.sub")}>
      <div className="reveal grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-3">
          {USES.map((x, k) => (
            <button key={x.k} onClick={() => setI(k)} aria-pressed={i === k} className={`glass flex items-center gap-4 p-4 text-start transition-all duration-300 ${i === k ? "!bg-white ring-2 ring-violet/40 [transform:translateX(-6px)] rtl:[transform:translateX(6px)]" : "hover:!bg-white/80"}`}>
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white ${x.tint}`}>
                <Icon name={x.icon} size={24} />
              </span>
              <span className="text-lg font-black">{t(`land.uses.${x.k}`)}</span>
            </button>
          ))}
        </div>
        <div key={u.k} className="glass-strong animate-rise flex flex-col justify-center gap-4 p-8">
          <span className={`grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br text-white ${u.tint}`}>
            <Icon name={u.icon} size={40} />
          </span>
          <h3 className="text-3xl font-black">{t(`land.uses.${u.k}`)}</h3>
          <p className="text-lg font-semibold text-muted">{t(`land.uses.${u.k}.d`)}</p>
          <Link href="/demo/" className="btn btn-primary self-start">
            <Icon name="play" size={18} />
            {t("land.nav.demo")}
          </Link>
        </div>
      </div>
    </Section>
  );
}

/* ----------------------------- faq ----------------------------- */
function Faq() {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(1);
  return (
    <Section id="faq" title={t("land.faq.title")}>
      <div className="reveal mx-auto flex max-w-3xl flex-col gap-3">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div key={n} className="glass overflow-hidden">
            <button className="flex w-full items-center gap-3 p-4 text-start text-lg font-black" aria-expanded={open === n} onClick={() => setOpen(open === n ? null : n)}>
              <span className="flex-1">{t(`land.faq.${n}.q`)}</span>
              <Icon name="chevronDown" size={22} className={`text-violet transition-transform duration-300 ${open === n ? "rotate-180" : ""}`} />
            </button>
            <div className="grid transition-[grid-template-rows] duration-300" style={{ gridTemplateRows: open === n ? "1fr" : "0fr" }}>
              <p className="overflow-hidden px-4 font-semibold text-muted">
                <span className="block pb-4">{t(`land.faq.${n}.a`)}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ----------------------------- cta + footer ----------------------------- */
function Cta() {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(location.href.split("#")[0]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: t("app.title"), url: location.href.split("#")[0] });
      else await copy();
    } catch {}
  };
  const wa = SITE.whatsapp && `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(t("land.cta.mailSubject"))}`;
  const mail = SITE.email && `mailto:${SITE.email}?subject=${encodeURIComponent(t("land.cta.mailSubject"))}`;
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16">
      <div className="reveal relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#7d5fff] to-[#4b32c3] p-8 text-white shadow-[0_30px_60px_-30px_rgba(75,50,195,0.8)] sm:p-12">
        <div className="pointer-events-none absolute -top-20 end-0 h-64 w-64 rounded-full bg-sun/40 blur-3xl" />
        <h2 className="relative text-3xl font-black sm:text-4xl">{t("land.cta.title")}</h2>
        <p className="relative mt-2 max-w-xl text-lg font-semibold text-white/85">{t("land.cta.sub")}</p>
        <div className="relative mt-6 flex flex-wrap gap-3">
          <Link href="/demo/" className="btn btn-accent btn-lg">
            <Icon name="play" size={20} />
            {t("land.cta.demo")}
          </Link>
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" className="btn btn-lg">
              <Icon name="message" size={20} />
              {t("land.cta.whatsapp")}
            </a>
          )}
          {mail && (
            <a href={mail} className="btn btn-lg">
              <Icon name="mail" size={20} />
              {t("land.cta.email")}
            </a>
          )}
          <button className="btn btn-lg" onClick={copy}>
            <Icon name={copied ? "check" : "copy"} size={20} />
            {copied ? t("land.cta.copied") : t("land.cta.copy")}
          </button>
          <button className="btn btn-lg" onClick={share}>
            <Icon name="share" size={20} />
            {t("land.cta.share")}
          </button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 pb-24 text-sm font-semibold text-muted">
      <Logos size={36} />
      <span>{t("land.foot.rights")}</span>
      <a href="#top" className="btn btn-sm ms-auto">
        <Icon name="chevronUp" size={14} />
        {t("land.foot.top")}
      </a>
    </footer>
  );
}

/* ----------------------------- page ----------------------------- */
export function Landing() {
  const { t } = useI18n();
  const [progress, setProgress] = useState(0);
  const [pill, setPill] = useState(false);
  useEffect(() => {
    const on = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? h.scrollTop / max : 0);
      setPill(h.scrollTop > 700);
    };
    on();
    addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, []);
  return (
    <>
      <Nav progress={progress} />
      <main>
        <Hero />
        <Numbers />
        <Features />
        <How />
        <Try />
        <Uses />
        <Faq />
        <Cta />
      </main>
      <Footer />
      <div className={`fixed bottom-5 end-5 z-40 transition-all duration-500 ${pill ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-16 opacity-0"}`}>
        <Link href="/demo/" className="btn btn-accent btn-lg shadow-xl" tabIndex={pill ? 0 : -1}>
          <Icon name="play" size={20} />
          {t("land.nav.demo")}
        </Link>
      </div>
    </>
  );
}
