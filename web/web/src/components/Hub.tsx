"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { NUM_LETTERS, NUM_WORDS } from "@/lib/labels";
import { useStats } from "@/lib/stats";
import { useEngine } from "./EngineProvider";
import { Icon, type IconName } from "./Icon";
import { LangSwitch, Logos } from "./ui";
import type { Screen } from "./App";

const CARDS: { screen: Exclude<Screen, "hub">; key: string; icon: IconName; n: number; tint: string }[] = [
  { screen: "live", key: "hub.live", icon: "hand", n: 1, tint: "from-[#7d5fff] to-[#4b32c3]" },
  { screen: "challenge", key: "hub.challenge", icon: "trophy", n: 2, tint: "from-[#ffd45e] to-[#f5a800]" },
  { screen: "stats", key: "hub.stats", icon: "chart", n: 3, tint: "from-[#3db9f5] to-[#2a7fd6]" },
  { screen: "tech", key: "hub.tech", icon: "cpu", n: 4, tint: "from-[#35d4b3] to-[#14937a]" },
];

export function Hub({ go }: { go: (s: Screen) => void }) {
  const { t, dir } = useI18n();
  const s = useStats();
  const { status, progress, error, retry } = useEngine();
  const pct = Math.round(progress * 100);

  return (
    <>
      <header className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 pt-4">
        <Link href="/" className="btn btn-sm" aria-label={t("hub.site")}>
          <Icon name="home" size={16} />
          {t("hub.site")}
        </Link>
        <div className="ms-auto flex items-center gap-3">
          <Logos size={34} className="hidden md:flex" />
          <LangSwitch />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-6">
        <div className="animate-rise mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black sm:text-5xl">{t("hub.title")}</h1>
            <p className="mt-2 text-lg font-semibold text-muted">{t("app.tagline")}</p>
          </div>

          {/* engine status */}
          <div className="glass flex min-w-[15rem] items-center gap-3 px-4 py-3" aria-live="polite">
            {status === "ready" ? (
              <>
                <span className="live-dot" />
                <span className="font-bold text-ink">{t("hub.ready")}</span>
              </>
            ) : status === "error" ? (
              <>
                <span className="font-bold text-coral">{t("engine.error")}</span>
                <button className="btn btn-sm" onClick={retry}>
                  {t("common.retry")}
                </button>
                {error && <span className="sr-only">{error}</span>}
              </>
            ) : (
              <div className="w-full">
                <p className="mb-1.5 text-sm font-bold text-muted">
                  {t("hub.loading")} <span dir="ltr">{pct}%</span>
                </p>
                <div className="meter">
                  <i style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {CARDS.map((c, i) => (
            <button
              key={c.screen}
              onClick={() => go(c.screen)}
              style={{ animationDelay: `${i * 70}ms` }}
              className="glass spot animate-rise group flex items-center gap-5 p-6 text-start"
            >
              <span
                className={`grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-gradient-to-br text-white shadow-[0_14px_28px_-14px_rgba(35,31,77,0.6)] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 ${c.tint}`}
              >
                <Icon name={c.icon} size={38} />
              </span>
              <span className="min-w-0">
                <span className="block text-2xl font-black">{t(c.key)}</span>
                <span className="mt-1 block font-semibold text-muted">{t(`${c.key}.desc`)}</span>
              </span>
              <span className="ms-auto hidden items-center gap-2 sm:flex">
                <kbd className="rounded-lg bg-violet-l px-2 py-1 text-sm font-black text-violet-d">{c.n}</kbd>
                <Icon name={dir === "rtl" ? "arrowLeft" : "arrowRight"} size={22} className="text-violet transition-transform duration-300 group-hover:-translate-x-1 rtl:group-hover:translate-x-0 rtl:group-hover:-translate-x-1" />
              </span>
            </button>
          ))}
        </div>

        <section className="glass mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 p-5" aria-label={t("hub.album")}>
          <h2 className="flex items-center gap-2 text-xl font-black">
            <Icon name="layers" size={22} className="text-violet" />
            {t("hub.album")}
          </h2>
          <span className="chip chip-coral">
            {t("common.letters")}: <b dir="ltr">{s.discoveredLetters.length}/{NUM_LETTERS}</b>
          </span>
          <span className="chip chip-sky">
            {t("common.words")}: <b dir="ltr">{s.discoveredWords.length}/{NUM_WORDS}</b>
          </span>
          <p className="ms-auto text-sm font-semibold text-muted">{t("hub.keys")}</p>
        </section>
      </main>
    </>
  );
}
