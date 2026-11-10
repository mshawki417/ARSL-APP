"use client";

import { useCallback, useEffect, useState } from "react";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { EngineProvider } from "./EngineProvider";
import { Intro } from "./Intro";
import { Hub } from "./Hub";
import { LiveMode } from "./LiveMode";
import { Challenge } from "./Challenge";
import { StatsScreen } from "./StatsScreen";
import { TechScreen } from "./TechScreen";

export type Screen = "intro" | "hub" | "live" | "challenge" | "stats" | "tech";

const KEYS: Record<string, Screen> = { "1": "live", "2": "challenge", "3": "stats", "4": "tech" };

export function App() {
  return (
    <I18nProvider>
      <EngineProvider>
        <Shell />
      </EngineProvider>
    </I18nProvider>
  );
}

function Shell() {
  const { t } = useI18n();
  const [screen, setScreen] = useState<Screen>("intro");
  const home = useCallback(() => setScreen("hub"), []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  }, []);

  // Presenter shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (screen === "intro") {
        if (e.key === "Enter") setScreen("hub");
      } else if (e.key === "Escape") {
        setScreen("hub");
      } else if (KEYS[e.key]) {
        setScreen(KEYS[e.key]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, toggleFullscreen]);

  useEffect(() => {
    document.title = t("app.title");
  }, [t]);

  switch (screen) {
    case "intro":
      return <Intro onStart={() => setScreen("hub")} />;
    case "hub":
      return <Hub go={setScreen} />;
    case "live":
      return <LiveMode onBack={home} />;
    case "challenge":
      return <Challenge onBack={home} />;
    case "stats":
      return <StatsScreen onBack={home} go={setScreen} />;
    case "tech":
      return <TechScreen onBack={home} />;
  }
}
