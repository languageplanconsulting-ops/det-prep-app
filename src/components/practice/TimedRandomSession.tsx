"use client";

/**
 * TIMED RANDOM SESSION — the "big randomize button" engine.
 *
 * The learner picks how many minutes they have; we play random sets ACROSS LEVELS
 * (every round, and every difficulty when "any") back-to-back with a live countdown.
 * When time runs out we DON'T yank them mid-question — they finish the current set,
 * and the next "ต่อไป" ends the session with a mascot congrats ("you spent XX minutes
 * practising real word today and learned XX new words"). Minutes are logged to the
 * calendar (037_practice_minutes.sql) so off-plan study still shows up.
 *
 * Reuses the exact same Runner*Item adapters the study-plan daily runner uses
 * (via RunnerSlotItem), so scoring / reports / notebook flow are identical.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { CelebrateMascot } from "@/components/ui/CelebrateMascot";
import { CoachBubble } from "@/components/ui/CoachBubble";
import { RunnerSlotItem } from "@/components/practice/daily-runner/RunnerSlotItem";
import { sfxCelebrate, sfxTransition } from "@/lib/exam-sfx";
import { pickOne, type RandomDifficulty } from "@/lib/practice-random";
import { pickRunnerContent, type RunnerContentPick } from "@/lib/study-plan/daily-runner-content";
import type { DailyPlanSkill } from "@/lib/study-plan/daily-plan";
import {
  NOTEBOOK_ADDED_EVENT,
  TIMED_SKILL_META,
  localDateKey,
  logPracticeMinutes,
  type TimedDifficulty,
} from "@/lib/practice-timed-random";

type PickState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; pick: RunnerContentPick };

const ALL_DIFFICULTIES: RandomDifficulty[] = ["easy", "medium", "hard"];

function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function TimedRandomSession({
  skill,
  difficulty,
  durationMin,
  hubHref,
}: {
  skill: DailyPlanSkill;
  difficulty: TimedDifficulty;
  durationMin: number;
  hubHref: string;
}) {
  const router = useRouter();
  const meta = TIMED_SKILL_META[skill];

  const [phase, setPhase] = useState<"running" | "finishing" | "done">("running");
  const [pickState, setPickState] = useState<PickState>({ status: "loading" });
  const [showContinue, setShowContinue] = useState(false);
  const [setsDone, setSetsDone] = useState(0);
  const [wordsLearned, setWordsLearned] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(durationMin * 60);
  const [timeUp, setTimeUp] = useState(false);
  const [elapsedMin, setElapsedMin] = useState(0);

  // Bumped on every advance to force the content-resolving effect to re-run.
  const [bumpState, setBumpState] = useState(0);

  const usedKeysRef = useRef<Set<string>>(new Set());
  const startAtRef = useRef<number>(Date.now());
  const bumpRef = useRef(0); // forces a fresh pick when advancing

  // Count vocab words saved to the notebook DURING this session.
  useEffect(() => {
    const onAdd = () => setWordsLearned((n) => n + 1);
    window.addEventListener(NOTEBOOK_ADDED_EVENT, onAdd);
    return () => window.removeEventListener(NOTEBOOK_ADDED_EVENT, onAdd);
  }, []);

  // Single countdown clock, derived from a fixed start time so it can't drift.
  useEffect(() => {
    if (phase !== "running") return;
    const tick = () => {
      const elapsedSec = Math.floor((Date.now() - startAtRef.current) / 1000);
      const left = durationMin * 60 - elapsedSec;
      setSecondsLeft(left);
      if (left <= 0) setTimeUp(true);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [phase, durationMin]);

  const resolveDiff = useCallback((): RandomDifficulty => {
    return difficulty === "any" ? pickOne(ALL_DIFFICULTIES) : difficulty;
  }, [difficulty]);

  // Resolve content for the current set whenever we advance.
  useEffect(() => {
    if (phase !== "running") return;
    let alive = true;
    setPickState({ status: "loading" });
    (async () => {
      // Try a few difficulty rolls so "any" still finds content if one level is locked/empty.
      let picked: RunnerContentPick | null = null;
      for (let i = 0; i < 3 && !picked; i++) {
        picked = await pickRunnerContent(skill, resolveDiff(), usedKeysRef.current);
      }
      if (!alive) return;
      if (picked) {
        usedKeysRef.current.add(picked.contentKey);
        setPickState({ status: "ready", pick: picked });
      } else {
        setPickState({ status: "error" });
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, skill, resolveDiff, bumpState]);

  const finishRun = useCallback(async () => {
    setPhase("finishing");
    const mins = Math.max(1, Math.round((Date.now() - startAtRef.current) / 60000));
    setElapsedMin(mins);
    sfxCelebrate("lg");
    await logPracticeMinutes({
      practiceDate: localDateKey(),
      skill,
      minutes: mins,
      setsDone,
      wordsLearned,
    });
    setPhase("done");
  }, [skill, setsDone, wordsLearned]);

  const rollNext = useCallback(() => {
    bumpRef.current += 1;
    setBumpState(bumpRef.current);
  }, []);

  const advance = useCallback(() => {
    setShowContinue(false);
    if (timeUp) {
      void finishRun();
      return;
    }
    rollNext();
  }, [timeUp, finishRun, rollNext]);

  const handleSlotComplete = useCallback(() => {
    sfxTransition();
    setSetsDone((n) => n + 1);
    window.setTimeout(() => setShowContinue(true), 700);
  }, []);

  // ── DONE ──────────────────────────────────────────────────────────────────
  if (phase === "done" || phase === "finishing") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-12 text-center">
        <CelebrateMascot title="ยินดีด้วย! 🎉" />
        <CoachBubble>
          {phase === "finishing"
            ? "กำลังบันทึกผลการฝึกของวันนี้…"
            : `วันนี้คุณฝึก ${meta.th} (${meta.en}) ไป ${elapsedMin} นาที และเก็บคำใหม่ลง Notebook ได้ ${wordsLearned} คำ — เยี่ยมมากเลยครับ! 💪`}
        </CoachBubble>

        <div className="mt-6 grid w-full grid-cols-3 gap-2.5">
          <StatTile emoji="⏱️" value={`${elapsedMin}`} label="นาที" />
          <StatTile emoji={meta.emoji} value={`${setsDone}`} label="ชุดที่ทำ" />
          <StatTile emoji="📓" value={`${wordsLearned}`} label="คำใหม่" />
        </div>

        <p className="mt-5 rounded-2xl bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
          บันทึกลงปฏิทินแล้ว — วันนี้คุณฝึกอิสระ {elapsedMin} นาที ✓
        </p>

        <div className="mt-6 flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              sfxTransition();
              router.push("/study-plan");
            }}
            className="rounded-2xl bg-ep-yellow px-6 py-3 font-display text-sm font-extrabold text-slate-900 shadow-md transition hover:shadow-lg active:scale-[0.98]"
          >
            ดูปฏิทินของฉัน →
          </button>
          <Link
            href={hubHref}
            onClick={() => sfxTransition()}
            className="text-xs font-bold text-neutral-400 transition-colors hover:text-ep-blue"
          >
            กลับไปหน้ารอบฝึก
          </Link>
        </div>
      </div>
    );
  }

  // ── RUNNING ─────────────────────────────────────────────────────────────────
  const lowTime = secondsLeft <= 30;
  return (
    <div className="pb-28">
      {/* Countdown header */}
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href={hubHref} className="shrink-0 text-xs font-bold text-neutral-400 transition-colors hover:text-ep-blue">
            ออก
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-bold text-neutral-600">
                {meta.emoji} {meta.th} · สุ่มทุกด่าน
              </span>
              <span className="font-bold text-neutral-500">ทำแล้ว {setsDone} ชุด</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-100">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-linear ${timeUp ? "bg-amber-500" : "bg-ep-blue"}`}
                style={{ width: `${Math.max(0, Math.min(100, (secondsLeft / (durationMin * 60)) * 100))}%` }}
              />
            </div>
          </div>
          <div
            className={`shrink-0 rounded-xl px-3 py-1.5 font-mono text-sm font-black tabular-nums transition-colors ${
              timeUp
                ? "bg-amber-100 text-amber-700"
                : lowTime
                  ? "animate-pulse bg-rose-100 text-rose-700"
                  : "bg-indigo-100 text-indigo-700"
            }`}
          >
            {timeUp ? "หมดเวลา" : fmtClock(secondsLeft)}
          </div>
        </div>
      </div>

      {timeUp && (
        <div className="mx-auto mt-3 max-w-2xl px-4">
          <div className="ep-step-slide-in rounded-2xl bg-amber-50 px-4 py-3 text-center text-sm font-bold text-amber-800 ring-1 ring-amber-200">
            ⏰ หมดเวลาแล้ว! ทำข้อนี้ให้จบก่อน แล้วกด “จบการฝึก” ได้เลยครับ
          </div>
        </div>
      )}

      <div key={bumpState} className="ep-step-slide-in mx-auto max-w-2xl px-4 py-6">
        {pickState.status === "loading" ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-neutral-400">กำลังสุ่มข้อสอบให้…</p>
          </div>
        ) : pickState.status === "error" ? (
          <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-neutral-200">
            <p className="text-sm font-bold text-neutral-500">ยังไม่มีข้อสอบสำหรับระดับนี้</p>
            <button
              type="button"
              onClick={() => (timeUp ? void finishRun() : rollNext())}
              className="mt-3 rounded-xl bg-ep-blue px-5 py-2.5 text-xs font-bold text-white transition hover:opacity-90"
            >
              {timeUp ? "จบการฝึก" : "สุ่มใหม่ →"}
            </button>
          </div>
        ) : (
          <RunnerSlotItem
            skill={skill}
            round={pickState.pick.round}
            difficulty={pickState.pick.difficulty}
            setNumber={pickState.pick.setNumber}
            onComplete={handleSlotComplete}
          />
        )}
      </div>

      {showContinue && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur ep-step-slide-in">
          <div className="mx-auto max-w-2xl">
            <button
              type="button"
              onClick={advance}
              className={`w-full rounded-2xl px-6 py-3 font-display text-sm font-extrabold shadow-md transition hover:shadow-lg active:scale-[0.98] ${
                timeUp ? "bg-emerald-500 text-white" : "bg-ep-yellow text-slate-900"
              }`}
            >
              {timeUp ? "จบการฝึก 🎉" : "ต่อไป →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-neutral-200">
      <p className="text-xl">{emoji}</p>
      <p className="mt-0.5 text-2xl font-black tabular-nums text-slate-900">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">{label}</p>
    </div>
  );
}
