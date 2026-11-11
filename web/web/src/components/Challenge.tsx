"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { sfx } from "@/lib/audio";
import { ALL_CLASSES, LETTER_CLASSES, WORD_CLASSES, type SignClass } from "@/lib/labels";
import { load, normalizeForHint, save, saveHint } from "@/lib/storage";
import { stats } from "@/lib/stats";
import { useSignTracker } from "@/lib/useSignTracker";
import type { FrameResult, Mode, SignResult } from "@/lib/recognizer";
import type { Landmark } from "@/lib/features";
import { CameraStage, type Tone } from "./CameraStage";
import { Icon, type IconName } from "./Icon";
import { Confetti, HintView, Panel, ProgressRing, TopBar } from "./ui";

type LevelId = 1 | 2 | 3;
type Phase = "menu" | "countdown" | "playing" | "result";
type Feedback = "none" | "success" | "timeout";

const LEVELS: { id: LevelId; key: string; icon: IconName; tint: string; count: number; pool: () => SignClass[] }[] = [
  { id: 1, key: "ch.l1", icon: "letters", tint: "from-[#ff8a8a] to-[#e84a6f]", count: 8, pool: () => LETTER_CLASSES },
  { id: 2, key: "ch.l2", icon: "message", tint: "from-[#3db9f5] to-[#2a7fd6]", count: 8, pool: () => WORD_CLASSES },
  { id: 3, key: "ch.l3", icon: "layers", tint: "from-[#ffd45e] to-[#f5a800]", count: 10, pool: () => ALL_CLASSES },
];

const ROUND_SECONDS = 25;
const HOLD_MS = 600;
const FEEDBACK_MS = 1100;

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const multiplier = (streak: number) => 1 + Math.min(streak, 5) * 0.2;

export function Challenge({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();

  const [phase, setPhase] = useState<Phase>("menu");
  const [level, setLevel] = useState<LevelId>(1);
  const [targets, setTargets] = useState<SignClass[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [solved, setSolved] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [feedback, setFeedback] = useState<Feedback>("none");
  const [gain, setGain] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [burst, setBurst] = useState(0);
  const [showHint, setShowHint] = useState(true);
  const [bests, setBests] = useState<Record<string, number>>({});
  const [newBest, setNewBest] = useState(false);

  useEffect(() => {
    setBests(load<Record<string, number>>("challengeBest", {}));
  }, []);

  // Mutable mirror of state for callbacks invoked from the camera loop.
  const S = useRef({ phase, feedback, idx, targets, streak, timeLeft, score, solved, bestStreak, level });
  S.current = { phase, feedback, idx, targets, streak, timeLeft, score, solved, bestStreak, level };
  const lastHands = useRef<Landmark[][]>([]);
  const timeouts = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => {
    timeouts.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => () => timeouts.current.forEach(clearTimeout), []);

  const target = targets[idx];
  const mode: Mode = target?.kind === "word" ? "words" : "alphabet";
  const thresholds = useMemo(() => ({ letter: 0.55, word: 0.6 }), []);

  /* --------------------------- round flow --------------------------- */
  const finish = useCallback((finalScore: number, finalSolved: number, finalBestStreak: number) => {
    setPhase("result");
    const lvl = S.current.level;
    const prev = load<Record<string, number>>("challengeBest", {});
    if (finalScore > (prev[lvl] ?? 0)) {
      const next = { ...prev, [lvl]: finalScore };
      save("challengeBest", next);
      setBests(next);
      setNewBest(finalScore > 0);
      sfx.levelUp();
    } else {
      setNewBest(false);
    }
    void finalSolved;
    void finalBestStreak;
  }, []);

  const advance = useCallback(() => {
    const { idx: i, targets: tg, score: sc, solved: so, bestStreak: bs } = S.current;
    if (i + 1 >= tg.length) {
      finish(sc, so, bs);
      return;
    }
    setIdx(i + 1);
    setTimeLeft(ROUND_SECONDS);
    setFeedback("none");
    tracker.reset();
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
  }, [finish]);

  const onConfirm = useCallback(
    (s: SignResult) => {
      const st = S.current;
      if (st.phase !== "playing" || st.feedback !== "none") return;
      const tg = st.targets[st.idx];
      if (!tg || s.id !== tg.id) return;

      const bonus = Math.round(100 * (st.timeLeft / ROUND_SECONDS));
      const points = Math.round((100 + bonus) * multiplier(st.streak));
      const newStreak = st.streak + 1;
      setGain(points);
      setScore((v) => v + points);
      setStreak(newStreak);
      setBestStreak((v) => Math.max(v, newStreak));
      setSolved((v) => v + 1);
      setFeedback("success");
      setBurst((b) => b + 1);
      sfx.success();
      stats.noteRecognition(tg.id);
      const hint = normalizeForHint(lastHands.current);
      if (hint) saveHint(tg.id, hint);
      // keep S in sync for advance() which runs after the delay
      S.current = { ...S.current, score: st.score + points, solved: st.solved + 1, streak: newStreak, bestStreak: Math.max(st.bestStreak, newStreak), feedback: "success" };
      later(advance, FEEDBACK_MS);
    },
    [advance],
  );

  const tracker = useSignTracker({ confirmMs: HOLD_MS, onConfirm });
  const { feed, current, holdFrac } = tracker;

  const onFrame = useCallback(
    (r: FrameResult) => {
      lastHands.current = r.hands;
      if (S.current.phase === "playing" && S.current.feedback === "none") feed(r);
    },
    [feed],
  );

  const timeout = useCallback(() => {
    if (S.current.feedback !== "none") return;
    setFeedback("timeout");
    setStreak(0);
    S.current = { ...S.current, streak: 0, feedback: "timeout" };
    sfx.fail();
    later(advance, FEEDBACK_MS);
  }, [advance]);

  const skip = useCallback(() => {
    if (S.current.phase !== "playing" || S.current.feedback !== "none") return;
    setStreak(0);
    S.current = { ...S.current, streak: 0, feedback: "timeout" };
    setFeedback("timeout");
    later(advance, 500);
  }, [advance]);

  // round timer
  useEffect(() => {
    if (phase !== "playing" || feedback !== "none") return;
    const id = setInterval(() => {
      setTimeLeft((v) => {
        const next = Math.max(0, v - 0.1);
        S.current.timeLeft = next;
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [phase, feedback, idx]);

  useEffect(() => {
    if (phase === "playing" && feedback === "none" && timeLeft <= 0) timeout();
  }, [phase, feedback, timeLeft, timeout]);

  // 3-2-1 countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    setCountdown(3);
    sfx.tick();
    let n = 3;
    const id = setInterval(() => {
      n--;
      if (n <= 0) {
        clearInterval(id);
        setPhase("playing");
        sfx.success();
      } else {
        setCountdown(n);
        sfx.tick();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const startLevel = (id: LevelId) => {
    const cfg = LEVELS.find((l) => l.id === id)!;
    const picked = shuffled(cfg.pool()).slice(0, cfg.count);
    setLevel(id);
    setTargets(picked);
    setIdx(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setSolved(0);
    setTimeLeft(ROUND_SECONDS);
    setFeedback("none");
    setNewBest(false);
    tracker.reset();
    S.current = { ...S.current, idx: 0, targets: picked, score: 0, solved: 0, streak: 0, bestStreak: 0, timeLeft: ROUND_SECONDS, feedback: "none", level: id };
    setPhase("countdown");
  };

  const tone: Tone = feedback === "success" || (current && target && current.id === target.id) ? "match" : current ? "seen" : "idle";

  /* ------------------------------ menu ------------------------------ */
  if (phase === "menu") {
    return (
      <>
        <TopBar title={t("ch.title")} icon="trophy" onBack={onBack} />
        <main className="mx-auto w-full max-w-5xl px-4 py-8">
          <h2 className="mb-4 text-2xl font-black">{t("ch.pick")}</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {LEVELS.map((l, i) => (
              <button
                key={l.id}
                data-testid={`level-${l.id}`}
                onClick={() => startLevel(l.id)}
                style={{ animationDelay: `${i * 80}ms` }}
                className="glass spot animate-rise group flex flex-col items-center gap-2 p-6 text-center"
              >
                <span className={`grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br text-white shadow-[0_14px_28px_-14px_rgba(35,31,77,0.6)] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 ${l.tint}`}>
                  <Icon name={l.icon} size={36} />
                </span>
                <span className="text-xl font-black">{t(l.key)}</span>
                <span className="font-semibold text-muted">{t(`${l.key}.desc`)}</span>
                <span className="chip chip-sun mt-2">
                  <Icon name="trophy" size={14} />
                  {t("ch.best")}: <b dir="ltr">{bests[l.id] ?? 0}</b>
                </span>
                <span className="btn btn-primary btn-sm mt-1 pointer-events-none">
                  <Icon name="play" size={14} />
                  {t("common.start")}
                </span>
              </button>
            ))}
          </div>
          <div className="glass mt-8 space-y-2 p-5 font-semibold">
            <p className="flex gap-2"><Icon name="target" size={20} className="mt-0.5 shrink-0 text-violet" />{t("ch.howto")}</p>
            <p className="flex gap-2 text-muted"><Icon name="bulb" size={20} className="mt-0.5 shrink-0 text-sun-d" />{t("ch.hintnote")}</p>
          </div>
        </main>
      </>
    );
  }

  /* ----------------------------- result ----------------------------- */
  if (phase === "result") {
    const total = targets.length;
    const ratio = total ? solved / total : 0;
    const stars = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : ratio >= 0.3 ? 1 : 0;
    return (
      <>
        <TopBar title={t("ch.title")} icon="trophy" onBack={onBack} />
        <main className="mx-auto w-full max-w-2xl px-4 py-8" data-testid="challenge-result">
          <div className="glass animate-pop relative overflow-hidden p-8 text-center">
            <Confetti burstKey={stars > 0 ? 1 : 0} count={60} />
            <h2 className="text-2xl font-black">{t("ch.result")}</h2>
            <div className="my-4 flex justify-center gap-2" aria-label={`${stars}/3`}>
              {[1, 2, 3].map((n) => (
                <Icon
                  key={n}
                  name="star"
                  size={64}
                  className={`animate-pop ${n <= stars ? "fill-[#ffc83d] text-[#f5a800]" : "text-line"}`}
                  style={{ animationDelay: `${n * 150}ms` }}
                />
              ))}
            </div>
            <p className="text-6xl font-black tabular-nums text-violet-d" dir="ltr" data-testid="final-score">
              {score}
            </p>
            {newBest && <p className="mt-1 text-xl font-black text-violet">{t("ch.newbest")}</p>}
            <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
              <Stat label={t("ch.solved")} value={`${solved}/${total}`} />
              <Stat label={t("ch.accuracy")} value={`${Math.round(ratio * 100)}%`} />
              <Stat label={t("ch.bestStreak")} value={String(bestStreak)} icon="flame" />
            </dl>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button className="btn btn-primary btn-lg" onClick={() => startLevel(level)}>
                <Icon name="refresh" size={20} />
                {t("ch.again")}
              </button>
              <button className="btn btn-lg" onClick={() => setPhase("menu")}>
                <Icon name="layers" size={20} />
                {t("ch.menu")}
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  /* ----------------------- countdown + playing ----------------------- */
  const mult = multiplier(streak);
  return (
    <>
      <TopBar title={t("ch.title")} icon="trophy" onBack={() => setPhase("menu")} />
      <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[3fr_2fr]">
        <section className="flex flex-col gap-4">
          <CameraStage
            mode={mode}
            thresholds={thresholds}
            onFrame={onFrame}
            tone={tone}
            overlay={
              <>
                <Confetti burstKey={burst} />
                {phase === "countdown" && (
                  <div className="absolute inset-0 grid place-items-center bg-[#231f4d]/60 text-white backdrop-blur-sm">
                    <div className="text-center">
                      <p className="text-2xl font-black">{t("ch.get_ready")}</p>
                      <p key={countdown} className="animate-pop text-9xl font-black" dir="ltr">
                        {countdown}
                      </p>
                    </div>
                  </div>
                )}
                {feedback !== "none" && (
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className={`animate-pop rounded-3xl px-8 py-4 text-center text-white shadow-2xl ${feedback === "success" ? "bg-gradient-to-br from-[#35d4b3] to-[#14937a]" : "bg-gradient-to-br from-[#ff8a8a] to-[#e84a6f]"}`}>
                      <p className="text-4xl font-black">{feedback === "success" ? t("ch.great") : t("ch.timeup")}</p>
                      {feedback === "success" && (
                        <p className="text-2xl font-black" dir="ltr">
                          +{gain}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            }
          />
          <div className="glass flex items-center gap-4 p-4">
            <span className="text-sm font-bold text-muted">{t("ch.seeing")}</span>
            {current ? (
              <span className="chip chip-sky text-base">
                <b>{current.ar}</b>
                <span dir="ltr" className="text-sm opacity-70">
                  {current.en} · {Math.round(current.confidence * 100)}%
                </span>
              </span>
            ) : (
              <span className="text-muted">—</span>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="glass flex items-center justify-around gap-3 p-4">
            <Stat label={t("ch.roundShort")} value={`${Math.min(idx + 1, targets.length)}/${targets.length}`} compact />
            <Stat label={t("ch.score")} value={String(score)} compact testId="score" />
            <Stat label={t("ch.streak")} value={`${streak}${streak > 0 ? ` ×${mult.toFixed(1)}` : ""}`} icon="flame" compact />
          </div>

          {target && (
            <Panel title={t("ch.target")} icon="target" className={feedback === "timeout" ? "animate-shake" : ""} bodyClassName="text-center">
              <div className="my-1 flex items-center justify-center gap-5">
                <ProgressRing fraction={holdFrac} size={150} stroke={14} color="#ffc83d">
                  <span
                    key={target.id}
                    data-testid="target-sign"
                    className={`animate-pop font-black leading-none ${target.ar.length > 4 ? "text-4xl" : "text-7xl"}`}
                  >
                    {target.ar}
                  </span>
                </ProgressRing>
                <div className="text-start">
                  <p className="text-2xl font-black" dir="ltr">
                    {target.en}
                  </p>
                  <span className={`chip mt-1 ${target.kind === "letter" ? "chip-coral" : "chip-sky"}`}>
                    {target.kind === "letter" ? t("common.letter") : t("common.word")}
                  </span>
                  {holdFrac > 0 && holdFrac < 1 && <p className="mt-2 font-black text-violet">{t("ch.hold")}</p>}
                </div>
              </div>

              <div className="meter mt-4" role="timer" aria-label={`${Math.ceil(timeLeft)}s`}>
                <i
                  style={{
                    width: `${(timeLeft / ROUND_SECONDS) * 100}%`,
                    background: timeLeft < 6 ? "linear-gradient(90deg,#ff8a8a,#e84a6f)" : undefined,
                    transitionDuration: "0.1s",
                  }}
                />
              </div>
              <p className="mt-1 text-sm font-bold tabular-nums text-muted" dir="ltr">
                {Math.ceil(timeLeft)}s
              </p>
            </Panel>
          )}

          <Panel
            title={t("ch.hint")}
            icon="bulb"
            aside={
              <button className="btn btn-sm" onClick={() => setShowHint((v) => !v)} aria-pressed={showHint}>
                {showHint ? t("common.off") : t("common.on")}
              </button>
            }
          >
            {showHint && target && (
              <div className="mx-auto grid aspect-[4/3] max-h-48 place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-line bg-white/70">
                <HintView signId={target.id} />
              </div>
            )}
          </Panel>

          <button className="btn" onClick={skip} disabled={phase !== "playing" || feedback !== "none"}>
            <Icon name="skip" size={18} />
            {t("ch.skip")}
          </button>
        </section>
      </main>
    </>
  );
}

function Stat({ label, value, compact, icon, testId }: { label: string; value: string; compact?: boolean; icon?: IconName; testId?: string }) {
  return (
    <div className={compact ? "text-center" : "rounded-2xl bg-violet-l/70 p-3"}>
      <dd className={`flex items-center justify-center gap-1 font-black tabular-nums text-violet-d ${compact ? "text-xl" : "text-2xl"}`} dir="ltr" data-testid={testId}>
        {icon && <Icon name={icon} size={compact ? 18 : 22} className="text-sun-d" />}
        {value}
      </dd>
      <dt className="text-xs font-bold text-muted">{label}</dt>
    </div>
  );
}
