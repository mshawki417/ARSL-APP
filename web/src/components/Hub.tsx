"use client";

import { useI18n } from "@/lib/i18n";
import { NUM_LETTERS, NUM_WORDS } from "@/lib/labels";
import { useStats } from "@/lib/stats";
import { TopBar } from "./ui";
import type { Screen } from "./App";

const CARDS: { screen: Exclude<Screen, "intro" | "hub">; key: string; icon: string; bg: string; n: number }[] = [
  { screen: "live", key: "hub.live", icon: "✋", bg: "bg-sky", n: 1 },
  { screen: "challenge", key: "hub.challenge", icon: "🏆", bg: "bg-sun", n: 2 },
  { screen: "stats", key: "hub.stats", icon: "📊", bg: "bg-mint", n: 3 },
  { screen: "tech", key: "hub.tech", icon: "⚙️", bg: "bg-pink", n: 4 },
];

export function Hub({ go }: { go: (s: Screen) => void }) {
  const { t } = useI18n();
  const s = useStats();

  return (
    <>
      <TopBar title={t("hub.title")} />
      <main className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="grid gap-5 sm:grid-cols-2">
          {CARDS.map((c, i) => (
            <button
              key={c.screen}
              onClick={() => go(c.screen)}
              style={{ animationDelay: `${i * 80}ms` }}
              className={`card animate-rise group flex items-center gap-5 p-6 text-start transition-transform hover:-translate-y-1 focus-visible:-translate-y-1 ${c.bg}`}
            >
              <span className="grid h-24 w-24 shrink-0 place-items-center rounded-3xl border-[3px] border-ink bg-white text-5xl shadow-[0_4px_0_#1d1b3a] transition-transform group-hover:rotate-6" aria-hidden>
                {c.icon}
              </span>
              <span>
                <span className="block text-2xl font-black sm:text-3xl">{t(c.key)}</span>
                <span className="mt-1 block text-base font-semibold sm:text-lg">{t(`${c.key}.desc`)}</span>
              </span>
              <kbd className="ms-auto hidden rounded-lg border-2 border-ink bg-white px-2 py-1 text-sm font-black sm:block">{c.n}</kbd>
            </button>
          ))}
        </div>

        <section className="card mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 p-5" aria-label={t("hub.album")}>
          <h2 className="text-xl font-black">🎴 {t("hub.album")}</h2>
          <span className="chip bg-coral/20">
            {t("common.letters")}: <b dir="ltr">{s.discoveredLetters.length}/{NUM_LETTERS}</b>
          </span>
          <span className="chip bg-sky/25">
            {t("common.words")}: <b dir="ltr">{s.discoveredWords.length}/{NUM_WORDS}</b>
          </span>
          <p className="ms-auto text-sm font-semibold opacity-60">{t("hub.keys")}</p>
        </section>
      </main>
    </>
  );
}
