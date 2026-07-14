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
import { CelebrateMascot } from "@/components/ui/CelebrateMascot";
import { CoachBubble } from "@/components/ui/CoachBubble";
import { sfxCelebrate, sfxTransition } from "@/lib/exam-sfx";
import { defaultDifficultyFor } from "@/lib/practice-queue-builder";
import type { RandomDifficulty } from "@/lib/practice-random";
import { pickRunnerContent, type RunnerContentPick } from "@/lib/study-plan/daily-runner-content";
import { DAILY_SKILL_META, type DailyPlanSkill, type DailyTier } from "@/lib/study-plan/daily-plan";

import { RunnerSlotItem } from "@/components/practice/daily-runner/RunnerSlotItem";

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
  // Session stats for the end-of-run summary report.
  const startAtRef = useRef<number>(0);
  const scoresRef = useRef<number[]>([]);
  const [doneSummary, setDoneSummary] = useState<{
    groups: ApiGroupProgress[];
    totalDone: number;
    total: number;
    avgScore: number | null;
    minutes: number;
  } | null>(null);

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
        startAtRef.current = Date.now();
        scoresRef.current = [];
        if (slots.length === 0) {
          // Day already complete before they started — show the summary from what's on record.
          const groups = onlySkill
            ? json.progress.groups.filter((g) => g.skill === onlySkill)
            : json.progress.groups;
          setDoneSummary({
            groups,
            totalDone: groups.reduce((s, g) => s + g.done, 0),
            total: groups.reduce((s, g) => s + g.count, 0),
            avgScore: null,
            minutes: 0,
          });
        }
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
    sfxCelebrate("lg");
    try {
      const res = await fetch(`/api/study-plan/daily?date=${date}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (res.ok) {
        const json = (await res.json()) as ApiDailyResponse;
        const groups = onlySkill
          ? json.progress.groups.filter((g) => g.skill === onlySkill)
          : json.progress.groups;
        const scores = scoresRef.current;
        const avgScore = scores.length
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : null;
        const minutes = startAtRef.current
          ? Math.max(1, Math.round((Date.now() - startAtRef.current) / 60000))
          : 0;
        setDoneSummary({
          groups,
          totalDone: groups.reduce((s, g) => s + g.done, 0),
          total: groups.reduce((s, g) => s + g.count, 0),
          avgScore,
          minutes,
        });
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
  }, [date, onlySkill]);

  const advance = useCallback(() => {
    setShowContinue(false);
    const next = currentIndex + 1;
    if (next >= flatSlots.length) {
      void finishRun();
    } else {
      setCurrentIndex(next);
    }
  }, [currentIndex, flatSlots.length, finishRun]);

  const handleSlotComplete = useCallback((scorePct: number, _maxScore: number) => {
    sfxTransition();
    if (Number.isFinite(scorePct)) scoresRef.current.push(Math.round(scorePct));
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
    const s = doneSummary;
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-12 text-center">
        <CelebrateMascot title="เยี่ยมมาก! ทำครบแล้ว 🎉" />
        <CoachBubble>
          {onlySkill
            ? "สุดยอดไปเลยครับ! คุณฝึกครบตามที่ตั้งใจไว้แล้ว ความสม่ำเสมอแบบนี้แหละที่ทำให้คะแนนขึ้นจริง — พรุ่งนี้มาลุยต่อกันนะ! 💪"
            : "สุดยอดไปเลยครับ! คุณฝึกครบทุกทักษะตามแผนของวันนี้แล้ว เก่งมากที่ทำจนจบ — ความสม่ำเสมอแบบนี้แหละที่พาคะแนนขึ้น เจอกันใหม่พรุ่งนี้นะ! 🌟"}
        </CoachBubble>

        {s && (
          <div className="mt-6 w-full">
            {/* headline stats */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-neutral-200">
                <p className="text-xl">✅</p>
                <p className="mt-0.5 text-2xl font-black tabular-nums text-slate-900">{s.totalDone}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">ข้อที่ทำ</p>
              </div>
              <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-neutral-200">
                <p className="text-xl">🎯</p>
                <p className="mt-0.5 text-2xl font-black tabular-nums text-slate-900">
                  {s.avgScore != null ? `${s.avgScore}%` : "—"}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">คะแนนเฉลี่ย</p>
              </div>
              <div className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-neutral-200">
                <p className="text-xl">⏱️</p>
                <p className="mt-0.5 text-2xl font-black tabular-nums text-slate-900">
                  {s.minutes > 0 ? s.minutes : "—"}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">นาที</p>
              </div>
            </div>

            {/* per-skill breakdown */}
            <div className="mt-3 space-y-1.5 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-neutral-200">
              {s.groups.map((g) => {
                const gm = DAILY_SKILL_META[g.skill];
                return (
                  <div key={g.skill} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-bold text-slate-700">
                      {gm.emoji} {gm.th}
                    </span>
                    <span
                      className={`font-mono text-xs font-bold ${g.complete ? "text-emerald-600" : "text-amber-600"}`}
                    >
                      {g.complete ? "✓ " : ""}
                      {g.done}/{g.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
            round={pickState.pick.round}
            difficulty={pickState.pick.difficulty}
            setNumber={pickState.pick.setNumber}
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
