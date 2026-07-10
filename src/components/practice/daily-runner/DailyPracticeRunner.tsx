"use client";

/**
 * Daily-practice RUNNER SHELL — plays a day's (or one skill group's) remaining exercises
 * inline in one flowing screen, mobile-app parity, replacing the old page-navigation queue.
 *
 * Orchestrates the 5 Runner*Item adapters (src/components/practice/daily-runner/*RunnerItem.tsx)
 * which each wrap a real, unchanged SessionClient. Progress is derived server-side from
 * practice_attempts (GET /api/study-plan/daily) — this component never stores its own
 * progress, it only decides what to play next and reflects what the server reports.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Tier } from "@/lib/access-control";
import { sfxCelebrate, sfxTransition } from "@/lib/exam-sfx";
import { defaultDifficultyFor } from "@/lib/practice-queue-builder";
import type { RandomDifficulty } from "@/lib/practice-random";
import { pickRunnerContent, type RunnerContentPick } from "@/lib/study-plan/daily-runner-content";
import { DAILY_SKILL_META, type DailyPlanSkill, type DailyTier } from "@/lib/study-plan/daily-plan";

import { DictationRunnerItem } from "@/components/practice/daily-runner/DictationRunnerItem";
import { FitbRunnerItem } from "@/components/practice/daily-runner/FitbRunnerItem";
import { VocabRunnerItem } from "@/components/practice/daily-runner/VocabRunnerItem";
import { ReadingRunnerItem } from "@/components/practice/daily-runner/ReadingRunnerItem";
import { RealWordRunnerItem } from "@/components/practice/daily-runner/RealWordRunnerItem";

type ApiGroupProgress = { skill: DailyPlanSkill; count: number; done: number; complete: boolean };
type ApiProgress = { groups: ApiGroupProgress[]; total: number; totalDone: number; complete: boolean };
type ApiPlan = { date: string; track: "exam" | "lesson"; tier: DailyTier; items: unknown; total: number; persisted: boolean };
type ApiDailyResponse = { plan: ApiPlan; progress: ApiProgress };

type Slot = { skill: DailyPlanSkill };

type Phase = "loading" | "load-error" | "running" | "done";

type PickState = { status: "loading" } | { status: "error" } | { status: "ready"; pick: RunnerContentPick };

/** Remaining work only — done groups (or groups outside `onlySkill`) contribute no slots. */
function computeFlatSlots(progress: ApiProgress, onlySkill: DailyPlanSkill | undefined): Slot[] {
  const groups = onlySkill ? progress.groups.filter((g) => g.skill === onlySkill) : progress.groups;
  const slots: Slot[] = [];
  for (const g of groups) {
    const remaining = g.count - g.done;
    for (let i = 0; i < remaining; i++) slots.push({ skill: g.skill });
  }
  return slots;
}

export function DailyPracticeRunner({
  date,
  onlySkill,
  effectiveTier,
}: {
  date: string;
  onlySkill?: DailyPlanSkill;
  effectiveTier: Tier;
}) {
  const router = useRouter();
  const difficulty: RandomDifficulty = defaultDifficultyFor(effectiveTier);

  const [phase, setPhase] = useState<Phase>("loading");
  const [flatSlots, setFlatSlots] = useState<Slot[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pickState, setPickState] = useState<PickState>({ status: "loading" });
  const [showContinue, setShowContinue] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const planTierRef = useRef<DailyTier>(10);
  const usedKeysRef = useRef<Set<string>>(new Set());

  // Initial load: figure out the remaining flat slot list for this run.
  useEffect(() => {
    let alive = true;
    setPhase("loading");
    (async () => {
      try {
        const res = await fetch(`/api/study-plan/daily?date=${date}`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok) {
          if (alive) setPhase("load-error");
          return;
        }
        const json = (await res.json()) as ApiDailyResponse;
        if (!alive) return;
        planTierRef.current = json.plan.tier;
        const slots = computeFlatSlots(json.progress, onlySkill);
        setFlatSlots(slots);
        setCurrentIndex(0);
        usedKeysRef.current = new Set();
        setPhase(slots.length === 0 ? "done" : "running");
      } catch {
        if (alive) setPhase("load-error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [date, onlySkill]);

  // Resolve content for the current slot lazily, whenever the index moves.
  useEffect(() => {
    if (phase !== "running") return;
    const slot = flatSlots[currentIndex];
    if (!slot) return;
    let alive = true;
    setPickState({ status: "loading" });
    (async () => {
      const picked = await pickRunnerContent(slot.skill, difficulty, usedKeysRef.current);
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
  }, [phase, currentIndex, flatSlots, difficulty]);

  const finishRun = useCallback(async () => {
    setFinishing(true);
    sfxCelebrate("md");
    try {
      const res = await fetch(`/api/study-plan/daily?date=${date}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (res.ok) {
        const json = (await res.json()) as ApiDailyResponse;
        if (json.progress.complete) {
          try {
            await fetch("/api/study-plan/completions", {
              method: "POST",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                completionDate: date,
                tierCompleted: json.plan.tier,
                sessionRef: "daily-runner",
              }),
            });
          } catch {
            /* legacy binary-completion mirror is best-effort only — ignore failures */
          }
        }
      }
    } catch {
      /* best-effort re-check — ignore failures, still show the done screen */
    }
    setFinishing(false);
    setPhase("done");
  }, [date]);

  const advance = useCallback(() => {
    setShowContinue(false);
    const next = currentIndex + 1;
    if (next >= flatSlots.length) {
      void finishRun();
    } else {
      setCurrentIndex(next);
    }
  }, [currentIndex, flatSlots.length, finishRun]);

  const handleSlotComplete = useCallback((_scorePct: number, _maxScore: number) => {
    sfxTransition();
    window.setTimeout(() => setShowContinue(true), 900);
  }, []);

  if (phase === "loading") {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-16 text-center">
        <p className="text-sm text-neutral-400">กำลังเตรียมชุดฝึก…</p>
      </div>
    );
  }

  if (phase === "load-error") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
        <p className="text-2xl">😕</p>
        <h1 className="mt-2 font-display text-lg font-bold text-slate-900">โหลดแผนฝึกไม่สำเร็จ</h1>
        <p className="mt-1 text-sm text-neutral-500">ลองใหม่อีกครั้ง หรือกลับไปที่ปฏิทิน</p>
        <Link
          href="/study-plan"
          className="mt-4 inline-block rounded-xl bg-ep-blue px-5 py-2.5 text-xs font-bold text-white transition hover:opacity-90"
        >
          กลับไปปฏิทิน
        </Link>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
        <p className="text-5xl">🎉</p>
        <h1 className="mt-3 font-display text-2xl font-extrabold text-slate-900">เยี่ยมมาก! ทำครบแล้ว</h1>
        <p className="mt-2 text-sm text-neutral-500">
          {onlySkill ? "ฝึกครบตามที่ตั้งใจไว้แล้ว ทำได้ดีมาก!" : "ฝึกครบตามแผนของวันนี้แล้ว ทำได้ดีมาก!"}
        </p>
        <div className="mt-6 flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={() => router.push("/study-plan")}
            className="rounded-2xl bg-ep-yellow px-6 py-3 font-display text-sm font-extrabold text-slate-900 shadow-md transition hover:shadow-lg active:scale-[0.98]"
          >
            กลับไปปฏิทิน
          </button>
          {!onlySkill && (
            <Link
              href="/practice"
              className="text-xs font-bold text-neutral-400 transition-colors hover:text-ep-blue"
            >
              ไปหน้าฝึกซ้อมเพิ่มเติม →
            </Link>
          )}
        </div>
      </div>
    );
  }

  const slot = flatSlots[currentIndex];
  const total = flatSlots.length;
  const pct = total > 0 ? Math.round(((currentIndex + (showContinue ? 1 : 0)) / total) * 100) : 0;
  const meta = slot ? DAILY_SKILL_META[slot.skill] : null;

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            href="/study-plan"
            className="shrink-0 text-xs font-bold text-neutral-400 transition-colors hover:text-ep-blue"
          >
            ออก
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="ep-stat font-mono text-neutral-500">
                ข้อที่ {Math.min(currentIndex + 1, total)}/{total}
              </span>
              {meta && (
                <span className="truncate font-bold text-neutral-600">
                  {meta.emoji} {meta.th}
                </span>
              )}
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-ep-blue transition-all duration-500 ease-out motion-reduce:transition-none"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div key={currentIndex} className="ep-step-slide-in mx-auto max-w-2xl px-4 py-6">
        {finishing ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-neutral-400">กำลังบันทึกผล…</p>
          </div>
        ) : slot && pickState.status === "loading" ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-neutral-400">กำลังโหลด…</p>
          </div>
        ) : slot && pickState.status === "error" ? (
          <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-neutral-200">
            <p className="text-sm font-bold text-neutral-500">ไม่พบข้อสอบสำหรับข้อนี้</p>
            <button
              type="button"
              onClick={advance}
              className="mt-3 rounded-xl bg-ep-blue px-5 py-2.5 text-xs font-bold text-white transition hover:opacity-90"
            >
              ข้ามข้อนี้ →
            </button>
          </div>
        ) : slot && pickState.status === "ready" ? (
          <RunnerSlotItem
            skill={slot.skill}
            pick={pickState.pick}
            onComplete={handleSlotComplete}
          />
        ) : null}
      </div>

      {showContinue && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur ep-step-slide-in">
          <div className="mx-auto max-w-2xl">
            <button
              type="button"
              onClick={advance}
              className="w-full rounded-2xl bg-ep-yellow px-6 py-3 font-display text-sm font-extrabold text-slate-900 shadow-md transition hover:shadow-lg active:scale-[0.98]"
            >
              ทำต่อ →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RunnerSlotItem({
  skill,
  pick,
  onComplete,
}: {
  skill: DailyPlanSkill;
  pick: RunnerContentPick;
  onComplete: (scorePct: number, maxScore: number) => void;
}) {
  switch (skill) {
    case "dictation":
      return (
        <DictationRunnerItem
          round={pick.round}
          difficulty={pick.difficulty}
          setNumber={pick.setNumber}
          onComplete={onComplete}
        />
      );
    case "fitb":
      return (
        <FitbRunnerItem
          round={pick.round}
          difficulty={pick.difficulty}
          setNumber={pick.setNumber}
          onComplete={onComplete}
        />
      );
    case "vocab":
      return (
        <VocabRunnerItem
          round={pick.round}
          difficulty={pick.difficulty}
          setNumber={pick.setNumber}
          onComplete={onComplete}
        />
      );
    case "reading":
      return (
        <ReadingRunnerItem
          round={pick.round}
          difficulty={pick.difficulty}
          setNumber={pick.setNumber}
          onComplete={onComplete}
        />
      );
    case "realword":
      return (
        <RealWordRunnerItem
          round={pick.round}
          difficulty={pick.difficulty}
          setNumber={pick.setNumber}
          onComplete={onComplete}
        />
      );
    default:
      return null;
  }
}
