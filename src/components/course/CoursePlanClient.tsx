"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  blockForChapter,
  DEFAULT_TASK_PRIORITY,
  isRetiredChapter,
  STUDY_BLOCKS,
  studyBlock,
  TASK_BLOCK,
  levelForLessonTitle,
  taskForChapter,
  taskLabel,
  type StudyBlockKey,
} from "@/lib/course-plan/categories";
import {
  DEFAULT_PLAN_SETTINGS,
  clampMinutes,
  MAX_MINUTES_PER_DAY,
  MIN_MINUTES_PER_DAY,
  MINUTE_OPTIONS,
  OVERRIDES_STORAGE_KEY,
  PLAN_STORAGE_KEY,
  WEEKDAY_FULL_TH,
  WEEKDAY_TH,
  type PlanSettings,
} from "@/lib/course-plan/planner";
import { CourseCompletion } from "@/components/course/CourseCompletion";
import { LessonLibrary } from "@/components/course/LessonLibrary";
import { ProgramBuilder } from "@/components/course/ProgramBuilder";
import { SessionRunner } from "@/components/course/SessionRunner";
import type { StudentCourse } from "@/lib/course-student-data";
import {
  fullRungPlan,
  RUNG_TH,
  skillTargetsFor,
  type RungLevel,
} from "@/lib/course-plan/rungs";
import {
  addToCarryOver,
  buildItemStream,
  carryOverMinutes,
  CARRY_OVER_STORAGE_KEY,
  clearFromCarryOver,
  EMPTY_CARRY_OVER,
  pourIntoDays,
  projectBoth,
  splitDayByTime,
  applyCustomisation,
  applyOverrides,
  blocksInStream,
  CUSTOMISATION_STORAGE_KEY,
  EMPTY_CUSTOMISATION,
  EMPTY_PROGRESS,
  completionOf,
  markCompleted,
  PROGRESS_STORAGE_KEY,
  type Progress,
  type Customisation,
  blockFeasibility,
  blockTotals,
  moveBlockDay,
  moveBlockItem,
  type BlockDay,
  type BlockOverrides,
  type CarryOver,
  type StudyItem,
} from "@/lib/course-plan/block-planner";
import type { WeeklyScore } from "@/lib/course-plan/weekly-scores";
import type { TaskWeakness } from "@/lib/study-plan/weakness-vector";

const TONE: Record<string, { bg: string; ring: string; text: string; solid: string }> = {
  rose: { bg: "bg-rose-50", ring: "ring-rose-200", text: "text-rose-700", solid: "bg-rose-500" },
  violet: { bg: "bg-violet-50", ring: "ring-violet-200", text: "text-violet-700", solid: "bg-violet-500" },
  sky: { bg: "bg-sky-50", ring: "ring-sky-200", text: "text-sky-700", solid: "bg-sky-500" },
  emerald: { bg: "bg-emerald-50", ring: "ring-emerald-200", text: "text-emerald-700", solid: "bg-emerald-500" },
  slate: { bg: "bg-slate-50", ring: "ring-slate-200", text: "text-slate-600", solid: "bg-slate-400" },
};

const SOURCE_TH: Record<TaskWeakness["source"], string> = {
  mock: "จาก Mock Test",
  mini: "จาก Mini Diagnosis",
  attempts: "จากการฝึกล่าสุด",
};

function thaiFullDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function thaiDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function CoursePlanClient({
  course,
  weakness,
  weekly,
  hasUser,
  todayIso,
}: {
  course: StudentCourse | null;
  weakness: TaskWeakness[];
  weekly: WeeklyScore[];
  hasUser: boolean;
  todayIso: string;
}) {
  const [settings, setSettings] = useState<PlanSettings>({
    ...DEFAULT_PLAN_SETTINGS,
    startDate: todayIso,
  });
  const [overrides, setOverrides] = useState<BlockOverrides>({});
  const [loaded, setLoaded] = useState(false);
  const [plannerView, setPlannerView] = useState<"week" | "month">("week");
  const [weekIndex, setWeekIndex] = useState(0);
  const [dragFrom, setDragFrom] = useState<{ date: string; itemId?: string } | null>(null);
  const [goalScore, setGoalScore] = useState(120);
  const [minutesDraft, setMinutesDraft] = useState("20");
  const [custom, setCustom] = useState<Customisation>(EMPTY_CUSTOMISATION);
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [carryOver, setCarryOver] = useState<CarryOver>(EMPTY_CARRY_OVER);
  const [sessionOpen, setSessionOpen] = useState(false);

  // ---- persistence -------------------------------------------------------
  // localStorage first (instant, works logged-out), then the DB if migration
  // 042 is deployed. The server copy wins on load so the plan follows the user
  // across devices; a 503 means the table isn't there yet and we stay local.
  const [syncState, setSyncState] = useState<"local" | "synced" | "offline">("local");

  useEffect(() => {
    let cancelled = false;

    try {
      const s = window.localStorage.getItem(PLAN_STORAGE_KEY);
      if (s) setSettings({ ...DEFAULT_PLAN_SETTINGS, startDate: todayIso, ...JSON.parse(s) });
      const o = window.localStorage.getItem(OVERRIDES_STORAGE_KEY);
      if (o) setOverrides(JSON.parse(o));
      const c = window.localStorage.getItem(CARRY_OVER_STORAGE_KEY);
      if (c) setCarryOver(JSON.parse(c));
      const cu = window.localStorage.getItem(CUSTOMISATION_STORAGE_KEY);
      if (cu) setCustom({ ...EMPTY_CUSTOMISATION, ...JSON.parse(cu) });
      const pr = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
      if (pr) setProgress({ ...EMPTY_PROGRESS, ...JSON.parse(pr) });
    } catch {
      /* corrupt or unavailable storage — fall back to defaults */
    }

    if (!hasUser) {
      setLoaded(true);
      return;
    }

    void (async () => {
      try {
        const res = await fetch("/api/course/plan");
        if (cancelled) return;
        if (res.status === 503) {
          setSyncState("offline");
        } else if (res.ok) {
          const json = (await res.json()) as {
            settings: Partial<PlanSettings> | null;
            overrides: BlockOverrides | null;
            carryOver: CarryOver | null;
          };
          if (json.settings && Object.keys(json.settings).length > 0) {
            const { custom: savedCustom, ...planOnly } = json.settings as Partial<PlanSettings> & {
              custom?: Customisation;
            };
            setSettings({ ...DEFAULT_PLAN_SETTINGS, startDate: todayIso, ...planOnly });
            if (savedCustom) setCustom({ ...EMPTY_CUSTOMISATION, ...savedCustom });
          }
          if (json.overrides) setOverrides(json.overrides);
          if (json.carryOver) setCarryOver(json.carryOver);
          setSyncState("synced");
        }
      } catch {
        setSyncState("offline");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [todayIso, hasUser]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(settings));
      window.localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
      window.localStorage.setItem(CARRY_OVER_STORAGE_KEY, JSON.stringify(carryOver));
      window.localStorage.setItem(CUSTOMISATION_STORAGE_KEY, JSON.stringify(custom));
      window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    } catch {
      /* ignore */
    }

    if (!hasUser || syncState === "offline") return;
    // Debounced so dragging a dozen items is one write, not a dozen.
    const t = setTimeout(() => {
      void fetch("/api/course/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { ...settings, custom }, overrides, carryOver }),
      })
        .then((r) => setSyncState(r.ok ? "synced" : "offline"))
        .catch(() => setSyncState("offline"));
    }, 800);
    return () => clearTimeout(t);
  }, [settings, overrides, carryOver, custom, progress, loaded, hasUser, syncState]);

  // Keep the custom field in step when a preset is tapped or a saved plan loads.
  useEffect(() => {
    setMinutesDraft(String(settings.minutesPerDay));
  }, [settings.minutesPerDay]);

  const weakestFirst = useMemo(() => weakness.map((w) => w.taskType), [weakness]);

  /**
   * The real course lessons, ordered for teaching: study blocks in weakness
   * order (or the default task order), then chapter and lesson position.
   * Retired chapters are dropped — they teach questions Duolingo removed.
   */
  const courseVideos = useMemo(() => {
    if (!course) return [];
    const blockOrder: StudyBlockKey[] = [];
    for (const t of [...weakestFirst, ...DEFAULT_TASK_PRIORITY]) {
      const b = TASK_BLOCK[t];
      if (b && !blockOrder.includes(b)) blockOrder.push(b);
    }
    for (const b of STUDY_BLOCKS) if (!blockOrder.includes(b.key)) blockOrder.push(b.key);

    return [...course.chapters]
      .filter((c) => !isRetiredChapter(c.title, c.studyBlock))
      .sort((a, b) => {
        const ia = blockOrder.indexOf(blockForChapter(a.title, a.studyBlock));
        const ib = blockOrder.indexOf(blockForChapter(b.title, b.studyBlock));
        return ia !== ib ? ia - ib : a.position - b.position;
      })
      .flatMap((c) => {
        // The drill that reinforces this chapter, so the day's exercise
        // practises what the day's video just taught.
        const chapterTask = taskForChapter(c.title);
        return [...c.lessons]
          .sort((x, y) => x.position - y.position)
          .map((l) => ({
            key: l.id,
            titleTh: l.title,
            lessonId: l.id,
            status: "live" as const,
            taskType: l.taskType ?? chapterTask,
            level: (l.level as RungLevel | null) ?? levelForLessonTitle(l.title),
            minutes: l.durationSeconds ? Math.max(3, Math.round(l.durationSeconds / 60)) : 7,
          }));
      });
  }, [course, weakestFirst]);

  /**
   * The rungs this learner must climb. Generated from their score vector — no
   * plan is authored per student. Empty until they have been assessed, which
   * makes the planner fall back to teaching the whole course in order.
   */
  const rungSteps = useMemo(() => {
    const scores = weekly.length > 0
      ? weekly.map((w) => ({ taskType: w.taskType, score160: w.score160 }))
      : weakness.map((w) => ({ taskType: w.taskType, score160: w.score160 }));
    if (scores.length === 0) return [];
    return fullRungPlan(skillTargetsFor(scores, goalScore));
  }, [weekly, weakness, goalScore]);

  /**
   * Block-by-block schedule. The curriculum is one ordered stream (block's
   * videos → that block's exercises), poured into days by time budget — so a
   * drill never appears before the lesson that teaches it, and anything that
   * does not fit simply leads the next day.
   */
  /** The curriculum as authored — every block, before the learner rearranges. */
  const baseStream = useMemo(
    () => buildItemStream(courseVideos, undefined, rungSteps),
    [courseVideos, rungSteps],
  );
  /** What actually runs: their chosen blocks, in their chosen order. */
  const stream = useMemo(() => applyCustomisation(baseStream, custom), [baseStream, custom]);
  const allBlocks = useMemo(() => blocksInStream(baseStream), [baseStream]);
  const pourSettings = useMemo(
    () => ({
      startDate: settings.startDate,
      minutesPerDay: settings.minutesPerDay,
      studyDays: settings.studyDays,
      weeks: settings.weeks,
    }),
    [settings],
  );
  /**
   * Only what is still outstanding gets scheduled. Completing items pulls the
   * rest of the plan forward; leaving them pushes it back. That is what makes
   * "catch up" work without a second queue shadowing the calendar.
   */
  const remainingStream = useMemo(() => {
    const done = new Set(progress.completedIds);
    return stream.filter((i) => !done.has(i.id));
  }, [stream, progress]);

  const days = useMemo(
    // pourIntoDays mutates its input when it pulls a spread item forward, so
    // hand it a copy — the memoised stream must stay intact for feasibility.
    () => applyOverrides(pourIntoDays([...remainingStream], pourSettings), overrides),
    [remainingStream, pourSettings, overrides],
  );
  const totals = useMemo(() => blockTotals(days), [days]);
  const projection = useMemo(
    () => projectBoth(remainingStream, pourSettings),
    [remainingStream, pourSettings],
  );
  const feasibility = useMemo(
    () => blockFeasibility(days, pourSettings, remainingStream),
    [days, pourSettings, remainingStream],
  );
  const completion = useMemo(() => completionOf(stream, progress), [stream, progress]);

  const weeks = useMemo(() => {
    const map = new Map<number, BlockDay[]>();
    for (const d of days) {
      const list = map.get(d.weekIndex) ?? [];
      list.push(d);
      map.set(d.weekIndex, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  }, [days]);

  function toggleDay(n: number) {
    setSettings((s) => ({
      ...s,
      studyDays: s.studyDays.includes(n)
        ? s.studyDays.filter((d) => d !== n)
        : [...s.studyDays, n].sort(),
    }));
  }

  function handleDrop(toDate: string) {
    if (!dragFrom) return;
    setOverrides((o) =>
      dragFrom.itemId
        ? moveBlockItem(days, o, dragFrom.itemId, dragFrom.date, toDate)
        : moveBlockDay(days, o, dragFrom.date, toDate),
    );
    setDragFrom(null);
  }

  return (
    <main className="ep-page-shell min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="ep-stagger-in rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-500">
            Admin only · ยังไม่เปิดให้นักเรียน
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">คอร์สของฉัน</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <p className="text-sm text-slate-600">
              ตั้งแผนเอง · ดูบทเรียนตามหมวด · ปฏิทินลากวางได้
            </p>
            {hasUser && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black transition-colors duration-300 ${
                  syncState === "synced"
                    ? "bg-emerald-50 text-emerald-600"
                    : syncState === "offline"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-400"
                }`}
                title={
                  syncState === "offline"
                    ? "ยังไม่ได้ deploy migration 042 — แผนถูกเก็บในเครื่องนี้เท่านั้น"
                    : undefined
                }
              >
                {syncState === "synced"
                  ? "☁︎ ซิงก์แล้ว"
                  : syncState === "offline"
                    ? "⚠︎ เก็บในเครื่องนี้เท่านั้น"
                    : "…"}
              </span>
            )}
          </div>
        </header>

        {/* ============ CORE COMPLETE ============ */}
        {completion.isComplete && <CourseCompletion weakestFirst={weakestFirst} />}

        {/* ============ PROGRESS ============ */}
        {completion.total > 0 && !completion.isComplete && (
          <section className="ep-stagger-in rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-black text-slate-800">ความคืบหน้าหลักสูตร</h2>
              <p className="text-[12px] font-black text-slate-500">
                {completion.done} / {completion.total} รายการ
              </p>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-emerald-500 transition-[width] duration-500"
                style={{ width: `${completion.percent}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {completion.percent}% — เหลืออีก {completion.total - completion.done} รายการ
            </p>
          </section>
        )}

        {/* ============ TODAY ============ */}
        {(() => {
          const today = days.find((d) => d.date === todayIso) ?? days.find((d) => d.items.length > 0);
          if (!today) return null;
          return (
            <section className="ep-stagger-in overflow-hidden rounded-3xl bg-[#004AAD] text-white shadow-sm">
              <div className="p-5">
                <p className="text-[11px] font-black uppercase tracking-widest text-white/60">
                  วันนี้ · {thaiDate(today.date)}
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {today.blocks.length > 0 ? today.blocks.map((b) => b.titleTh).join(" → ") : "วันพัก"}
                </h2>
                <p className="mt-0.5 text-sm text-white/80">
                  {today.items.length} รายการ · {today.totalMinutes} นาที
                  {carryOver.entries.length > 0 && (
                    <span className="ml-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-amber-950">
                      ค้างอยู่ {carryOver.entries.length}
                    </span>
                  )}
                </p>
                {today.items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSessionOpen(true)}
                    className="mt-4 w-full rounded-full bg-white py-3 text-sm font-black text-[#004AAD] transition hover:bg-white/90"
                  >
                    ▶︎ เริ่มเรียนวันนี้ ({settings.minutesPerDay} นาที)
                  </button>
                )}
              </div>
            </section>
          );
        })()}

        {/* ============ BEHIND? REBALANCE ============ */}
        {(() => {
          // "Behind" means scheduled days that have already passed still hold
          // work. Comparing against today rather than counting the carry-over
          // queue catches days the learner simply never opened.
          const overdue = days.filter((d) => d.date < todayIso && d.items.length > 0);
          const overdueItems = overdue.reduce((n, d) => n + d.items.length, 0);
          const overdueMinutes = overdue.reduce((n, d) => n + d.totalMinutes, 0);
          if (overdueItems === 0) return null;
          return (
            <section className="ep-stagger-in rounded-3xl bg-amber-50 p-5 shadow-sm ring-1 ring-amber-200">
              <p className="text-[11px] font-black uppercase tracking-widest text-amber-600">
                ตามไม่ทันนิดหน่อย
              </p>
              <h2 className="mt-1 text-lg font-black text-amber-900">
                มีงานค้าง {overdueItems} รายการ · {overdueMinutes} นาที
              </h2>
              <p className="mt-1 text-[12px] text-amber-800">
                ค้างมาจาก {overdue.length} วันที่ผ่านมา — จะไล่ตามทีละวันก็ได้
                หรือกดปรับปฏิทินใหม่ให้เริ่มนับจากวันนี้
              </p>
              <button
                type="button"
                onClick={() => {
                  // Re-flow everything still outstanding from today. Nothing is
                  // deleted — the plan simply restarts from where they are.
                  setSettings((prev) => ({ ...prev, startDate: todayIso }));
                  setOverrides({});
                  setCarryOver(EMPTY_CARRY_OVER);
                }}
                className="mt-3 w-full rounded-full bg-amber-500 py-2.5 text-sm font-black text-white transition hover:bg-amber-600"
              >
                ↻ ปรับปฏิทินใหม่ให้เริ่มจากวันนี้
              </button>
              {projection.full && (
                <p className="mt-2 text-center text-[11px] font-bold text-amber-700">
                  กำหนดเรียนจบใหม่จะเป็นประมาณ {thaiFullDate(projection.full.date)}
                </p>
              )}
            </section>
          );
        })()}

        {/* ============ SCORE BREAKDOWN ============ */}
        <ScoreBreakdown weakness={weakness} weekly={weekly} hasUser={hasUser} />

        {/* ============ THE RUNG LADDER ============ */}
        {rungSteps.length > 0 && (
          <section className="ep-stagger-in rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-black text-slate-900">เส้นทางของคุณ</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              สร้างจากคะแนนของคุณเอง — ไต่ทีละระดับจนถึงเป้า {goalScore}
            </p>
            <ol className="mt-3 space-y-1.5">
              {rungSteps.slice(0, 10).map((step, i) => (
                <li
                  key={`${step.taskType}-${step.level}-${i}`}
                  className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200"
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-slate-900 text-[11px] font-black text-white">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-black text-slate-800">
                      {taskLabel(step.taskType)}{" "}
                      <span className="text-slate-400">· ระดับ{RUNG_TH[step.level]}</span>
                    </span>
                    {step.check && (
                      <span className="mt-0.5 block text-[10px] font-bold text-amber-700">
                        ⚡ {step.check.reasonTh}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-[11px] font-black tabular-nums text-slate-500">
                    {step.fromScore} → {step.goalScore}
                  </span>
                </li>
              ))}
            </ol>
            {rungSteps.length > 10 && (
              <p className="mt-2 text-[11px] text-slate-400">
                และอีก {rungSteps.length - 10} ขั้น
              </p>
            )}
            <p className="mt-3 rounded-xl bg-sky-50 p-3 text-[11px] text-sky-800 ring-1 ring-sky-200">
              ระดับที่คุณผ่านแล้วจะไม่ถูกใส่ในตาราง แต่{" "}
              <strong>ยังเปิดดูได้ทุกเลกเชอร์ตลอดเวลา</strong> — จ่ายเท่ากัน เข้าถึงเท่ากัน
              แต่แผนจะเลือกเฉพาะอันที่ทำให้คะแนนขึ้นจริง
            </p>
          </section>
        )}

        {/* ============ 1. CUSTOMIZE MY PLAN ============ */}
        <Section n={1} title="ตั้งแผนของฉัน" subtitle="เลือกเวลาและวันที่จะเรียน">
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-[11px] font-black uppercase tracking-widest text-slate-400">
                เริ่มเรียนวันไหน
              </p>
              <input
                type="date"
                value={settings.startDate}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, startDate: e.target.value || todayIso }))
                }
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200"
              />
              {settings.startDate !== todayIso && (
                <button
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, startDate: todayIso }))}
                  className="ml-2 rounded-full px-2 py-1 text-[11px] font-bold text-slate-400"
                >
                  วันนี้
                </button>
              )}
              {settings.startDate && (
                <p className="mt-1 text-[12px] font-bold text-slate-600">
                  เริ่ม {thaiFullDate(settings.startDate)}
                </p>
              )}
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-black uppercase tracking-widest text-slate-400">
                วันละกี่นาที
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {MINUTE_OPTIONS.map((m) => (
                  <Pill
                    key={m}
                    on={settings.minutesPerDay === m}
                    onClick={() => setSettings((s) => ({ ...s, minutesPerDay: m }))}
                  >
                    {m}
                  </Pill>
                ))}
                {/* Presets are shortcuts, not limits — real available time
                    rarely lands on a round number. */}
                <span className="ml-1 flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1">
                  <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                    กำหนดเอง
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={MIN_MINUTES_PER_DAY}
                    max={MAX_MINUTES_PER_DAY}
                    value={minutesDraft}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setMinutesDraft(raw);
                      const n = Number(raw);
                      if (raw !== "" && Number.isFinite(n) && n >= MIN_MINUTES_PER_DAY && n <= MAX_MINUTES_PER_DAY) {
                        setSettings((s) => ({ ...s, minutesPerDay: Math.round(n) }));
                      }
                    }}
                    onBlur={() => {
                      const next = clampMinutes(Number(minutesDraft));
                      setSettings((s) => ({ ...s, minutesPerDay: next }));
                      setMinutesDraft(String(next));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    className="w-16 rounded-full bg-white px-2 py-1 text-center text-xs font-black text-slate-800 ring-1 ring-slate-300"
                  />
                  <span className="text-[11px] font-bold text-slate-500">นาที</span>
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                ใส่กี่นาทีก็ได้ ({MIN_MINUTES_PER_DAY}–{MAX_MINUTES_PER_DAY}) — เช่น 65, 72, 92
              </p>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-black uppercase tracking-widest text-slate-400">
                เรียนวันไหนบ้าง ({settings.studyDays.length} วัน/สัปดาห์)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAY_FULL_TH.map((th, n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggleDay(n)}
                    className={`rounded-full px-3 py-2 text-xs font-black transition ${
                      settings.studyDays.includes(n)
                        ? "bg-[#004AAD] text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {th}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-black uppercase tracking-widest text-slate-400">
                เป้าคะแนน
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[100, 110, 120, 130, 140].map((g) => (
                  <Pill key={g} on={goalScore === g} onClick={() => setGoalScore(g)}>
                    {g}
                  </Pill>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-black uppercase tracking-widest text-slate-400">
                แผนกี่สัปดาห์
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[4, 8, 12, 26].map((w) => (
                  <Pill key={w} on={settings.weeks === w} onClick={() => setSettings((s) => ({ ...s, weeks: w }))}>
                    {w} สัปดาห์
                  </Pill>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat n={totals.studyDays} label="วันที่ต้องเรียน" />
              <Stat n={totals.videos} label="เลกเชอร์" />
              <Stat n={totals.exercises} label="ชุดฝึก" />
              <Stat n={totals.hours} label="ชั่วโมงรวม" />
            </div>

            {!settings.practiceOnly && courseVideos.length > 0 && projection.full && (
              <p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 ring-1 ring-emerald-200">
                ถ้าเรียนตามจังหวะนี้ — วันละ <strong>{settings.minutesPerDay} นาที</strong>{" "}
                <strong>{settings.studyDays.length} วัน/สัปดาห์</strong> — คาดว่าจะเรียนจบหลักสูตรวันที่{" "}
                <strong>{thaiFullDate(projection.full.date)}</strong>
              </p>
            )}

            {/* Finish projection — the honest answer to "how long will this take?",
                with the videos-only figure alongside because the exercises
                roughly triple the calendar. */}
            {(projection.full || projection.videosOnly) && (
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                    เรียนจบแก่นเนื้อหา
                  </p>
                  <p className="mt-0.5 text-[11px] font-bold text-emerald-800">
                    ยังไม่รวมฝึกเพิ่มเติมเพื่อเตรียมพร้อมก่อนสอบ
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-emerald-700">
                    เริ่ม {thaiFullDate(settings.startDate)}
                  </p>
                  <p className="text-xl font-black text-emerald-900">
                    ถึง {projection.full ? thaiFullDate(projection.full.date) : "—"}
                  </p>
                  {projection.full && (
                    <p className="mt-0.5 text-[11px] text-emerald-700">
                      {projection.full.studyDays} วันเรียน ·{" "}
                      {Math.ceil(projection.full.calendarDays / 7)} สัปดาห์ ·{" "}
                      {Math.round(projection.full.totalMinutes / 60)} ชั่วโมง
                    </p>
                  )}
                </div>
                <div className="rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-200">
                  <p className="text-[10px] font-black uppercase tracking-widest text-sky-600">
                    ดูเลกเชอร์ครบ
                  </p>
                  <p className="mt-0.5 text-[11px] font-bold text-sky-800">
                    เฉพาะเลกเชอร์ ไม่รวมแบบฝึกในบทเรียน
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-sky-700">
                    เริ่ม {thaiFullDate(settings.startDate)}
                  </p>
                  <p className="text-xl font-black text-sky-900">
                    ถึง {projection.videosOnly ? thaiFullDate(projection.videosOnly.date) : "—"}
                  </p>
                  {projection.videosOnly && (
                    <p className="mt-0.5 text-[11px] text-sky-700">
                      {projection.videosOnly.studyDays} วันเรียน ·{" "}
                      {Math.ceil(projection.videosOnly.calendarDays / 7)} สัปดาห์ ·{" "}
                      {Math.round(projection.videosOnly.totalMinutes / 60)} ชั่วโมง
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* The extra practice is self-directed and lives elsewhere — say so
                rather than letting "เรียนจบ" imply the work is finished. */}
            {(projection.full || projection.videosOnly) && (
              <p className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600 ring-1 ring-slate-200">
                วันที่ด้านบนคือเรียนจบ <strong>แก่นเนื้อหา</strong> เท่านั้น —
                การฝึกเพิ่มเติมก่อนสอบต้องกดเข้าไปที่{" "}
                <Link href="/practice" className="font-black text-[#004AAD] underline">
                  หน้าฝึกข้อสอบ
                </Link>{" "}
                เอง ไม่ได้นับรวมอยู่ในวันที่นี้
              </p>
            )}

            {/* practice mode */}
            <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-800">ไม่อยากดูเลกเชอร์?</p>
                  <p className="text-[11px] text-slate-500">
                    โหมดฝึกล้วน — ข้ามวิดีโอ ใช้ปฏิทินฝึกข้อสอบ/บทเรียนแบบเดิม
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, practiceOnly: !s.practiceOnly }))}
                    className={`rounded-full px-4 py-2 text-xs font-black ${
                      settings.practiceOnly ? "bg-emerald-500 text-white" : "bg-white text-slate-600 ring-1 ring-slate-300"
                    }`}
                  >
                    {settings.practiceOnly ? "✓ โหมดฝึกล้วน" : "เปิดโหมดฝึกล้วน"}
                  </button>
                  <Link
                    href="/study-plan"
                    className="rounded-full bg-[#004AAD] px-4 py-2 text-xs font-black text-white"
                  >
                    ไปปฏิทินฝึกข้อสอบ →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ============ 2. STUDY ORDER ============ */}
        {allBlocks.length > 0 && (
          <Section
            n={2}
            title="ลำดับการเรียน"
            subtitle={
              custom.mode === "guided"
                ? "เราจัดลำดับให้แล้ว — เปลี่ยนเองได้ถ้าต้องการ"
                : "คุณกำลังจัดลำดับเอง"
            }
          >
            <div className="space-y-3">
              {/* One segmented control, not two competing cards — the section
                  title used to say "จัดโปรแกรมเอง" while defaulting to the
                  opposite, which read as a contradiction. */}
              <div className="flex gap-1 rounded-full bg-slate-100 p-1">
                {(
                  [
                    ["guided", "✨ ให้เราจัดให้"],
                    ["custom", "🎛️ จัดเอง"],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCustom((c) => ({ ...c, mode }))}
                    className={`flex-1 rounded-full py-2 text-xs font-black transition ${
                      custom.mode === mode
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {custom.mode === "guided" ? (
                <GuidedOrder blocks={allBlocks} />
              ) : (
                <ProgramBuilder
                  stream={stream}
                  allBlocks={allBlocks}
                  custom={custom}
                  onChange={setCustom}
                />
              )}
            </div>
          </Section>
        )}

        {/* ============ 3. LESSON LIBRARY ============ */}
        <Section
          n={3}
          title="คลังบทเรียน"
          subtitle="แยกตามทักษะ — ค้นหาชื่อบทเรียน แล้วกดดูซ้ำได้ทุกเมื่อ"
        >
          {!course ? (
            <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
              ยังโหลดข้อมูลคอร์สไม่ได้ — ตรวจว่า migration 038 ถูก deploy แล้ว และมีคอร์ส slug{" "}
              <code>duolingo-fast-track</code>
            </p>
          ) : (
            <LessonLibrary
              course={course}
              stream={stream}
              completedIds={new Set(progress.completedIds)}
              goalScore={goalScore}
            />
          )}
        </Section>

        <Section
          n={4}
          title="ปฏิทินการเรียน"
          subtitle="ลากวันหรือรายการไปวางวันอื่นได้ ถ้าอยากสลับ"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Pill on={plannerView === "week"} onClick={() => setPlannerView("week")}>
              รายสัปดาห์
            </Pill>
            <Pill on={plannerView === "month"} onClick={() => setPlannerView("month")}>
              รายเดือน
            </Pill>
            {Object.keys(overrides).length > 0 && (
              <button
                type="button"
                onClick={() => setOverrides({})}
                className="ml-auto rounded-full bg-rose-100 px-3 py-1.5 text-xs font-black text-rose-700"
              >
                ↺ ล้างการลากวาง
              </button>
            )}
          </div>

          {plannerView === "week" ? (
            <>
              {/* Week header: range + a one-line summary, so the week reads as a
                  unit instead of seven disconnected boxes. */}
              <div className="mb-2.5 flex items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
                <button
                  type="button"
                  aria-label="สัปดาห์ก่อนหน้า"
                  disabled={weekIndex === 0}
                  onClick={() => setWeekIndex((i) => Math.max(0, i - 1))}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-sm font-black text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:opacity-30"
                >
                  ←
                </button>
                <div className="min-w-0 text-center">
                  <p className="truncate text-[13px] font-black text-slate-800">
                    {(() => {
                      const w = weeks[weekIndex] ?? [];
                      return w.length
                        ? `${thaiDate(w[0].date)} – ${thaiDate(w[w.length - 1].date)}`
                        : "—";
                    })()}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">
                    สัปดาห์ที่ {weekIndex + 1} / {weeks.length}
                    {(() => {
                      const w = weeks[weekIndex] ?? [];
                      const study = w.filter((d) => d.items.length > 0).length;
                      const mins = w.reduce((n, d) => n + d.totalMinutes, 0);
                      return study ? ` · ${study} วันเรียน · ${mins} นาที` : " · พักทั้งสัปดาห์";
                    })()}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="สัปดาห์ถัดไป"
                  disabled={weekIndex >= weeks.length - 1}
                  onClick={() => setWeekIndex((i) => Math.min(weeks.length - 1, i + 1))}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-sm font-black text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:opacity-30"
                >
                  →
                </button>
              </div>

              {/* One column, chronological. Rest days collapse to a slim row —
                  as full cards they took the same space as a study day and left
                  the grid ragged and mostly empty. */}
              <div className="space-y-1.5">
                {(weeks[weekIndex] ?? []).map((d) =>
                  d.items.length === 0 ? (
                    <RestRow key={d.date} day={d} onDrop={() => handleDrop(d.date)} />
                  ) : (
                    <DayCard
                      key={d.date}
                      day={d}
                      isToday={d.date === todayIso}
                      onStart={d.date === todayIso ? () => setSessionOpen(true) : undefined}
                      onDragStart={(itemId) => setDragFrom({ date: d.date, itemId })}
                      onDrop={() => handleDrop(d.date)}
                      dragging={dragFrom?.date === d.date}
                    />
                  ),
                )}
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              {weeks.map((w, i) => {
                const mins = w.reduce((n, d) => n + d.totalMinutes, 0);
                const study = w.filter((d) => d.items.length > 0).length;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setWeekIndex(i);
                      setPlannerView("week");
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 transition ${
                      i === weekIndex
                        ? "bg-slate-50 ring-slate-400"
                        : "bg-white ring-slate-200 hover:ring-slate-300"
                    }`}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-900 text-[11px] font-black text-white">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-black text-slate-700">
                        {thaiDate(w[0].date)} – {thaiDate(w[w.length - 1].date)}
                      </span>
                      <span className="mt-1 flex gap-0.5">
                        {w.map((d) => (
                          <span
                            key={d.date}
                            title={`${thaiDate(d.date)} · ${d.totalMinutes} นาที`}
                            className={`h-1.5 flex-1 rounded-full ${
                              d.items.length === 0
                                ? "bg-slate-150 bg-slate-100"
                                : d.items.some((it: StudyItem) => it.kind === "video")
                                  ? "bg-amber-400"
                                  : "bg-sky-400"
                            }`}
                          />
                        ))}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[11px] font-black text-slate-700">
                        {study} วัน
                      </span>
                      <span className="block text-[10px] text-slate-400">{mins} นาที</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Section>
      </div>

      {sessionOpen && (() => {
        const today = days.find((d) => d.date === todayIso) ?? days.find((d) => d.items.length > 0);
        if (!today) return null;
        return (
          <SessionRunner
            todaysItems={today.items}
            carryOver={carryOver}
            minutes={settings.minutesPerDay}
            onClose={() => setSessionOpen(false)}
            onFinish={(unfinished, completed) => {
              setProgress((p) => markCompleted(p, completed.map((i) => i.id)));
              // Finished items leave the backlog; unfinished ones join it and
              // are offered again at the start of the next session.
              setCarryOver((prev) =>
                addToCarryOver(
                  clearFromCarryOver(prev, completed.map((i) => i.id)),
                  today.date,
                  unfinished,
                ),
              );
            }}
          />
        );
      })()}
    </main>
  );
}

/* ------------------------------------------------------------------ pieces */

const BASIS_TH: Record<WeeklyScore["basis"], string> = {
  this_week: "สัปดาห์นี้",
  last_week: "สัปดาห์ที่แล้ว",
  latest: "ล่าสุด",
};

function ScoreBreakdown({
  weakness,
  weekly,
  hasUser,
}: {
  weakness: TaskWeakness[];
  weekly: WeeklyScore[];
  hasUser: boolean;
}) {
  const rows = useMemo(() => {
    const byWeek = new Map(weekly.map((w) => [w.taskType, w]));
    const byTask = new Map(weakness.map((w) => [w.taskType, w]));
    return Object.keys(TASK_BLOCK)
      .map((taskType) => ({
        taskType,
        week: byWeek.get(taskType) ?? null,
        w: byTask.get(taskType) ?? null,
      }))
      .sort(
        (a, b) =>
          (a.week?.score160 ?? a.w?.score160 ?? 999) - (b.week?.score160 ?? b.w?.score160 ?? 999),
      );
  }, [weakness, weekly]);

  const scored = rows.filter((r) => r.week || r.w);

  return (
    <section className="ep-stagger-in rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-black text-slate-900">คะแนนแยกตามโจทย์</h2>
        <p className="text-[11px] text-slate-400">
          อัปเดตทุกสัปดาห์ · ถ้าสัปดาห์นี้ยังไม่มีข้อมูล จะแสดงคะแนนล่าสุดแทน
        </p>
      </div>

      {!hasUser ? (
        <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-200">
          กำลังดูด้วยรหัสแอดมิน (ไม่มีบัญชีผู้ใช้) — จึงยังไม่มีคะแนนให้แสดง
          ล็อกอินด้วยบัญชีจริงเพื่อดูคะแนนของบัญชีนั้น
        </p>
      ) : scored.length === 0 ? (
        <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 ring-1 ring-slate-200">
          ยังไม่มีคะแนน — ทำ Mock Test หรือ Mini Diagnosis หนึ่งครั้ง
          แล้วแผนจะเรียงลำดับจุดอ่อนให้อัตโนมัติ ตอนนี้ใช้ลำดับมาตรฐานไปก่อน
        </p>
      ) : (
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {rows.map(({ taskType, week, w }) => {
            const block = studyBlock(TASK_BLOCK[taskType]);
            const t = TONE[block.tone];
            const score = week?.score160 ?? w?.score160 ?? null;
            const isWeak = score !== null && score < 128;
            const pct = score === null ? 0 : Math.round((score / 160) * 100);
            const delta = week?.deltaVsPrevWeek ?? null;

            return (
              <div key={taskType} className="rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-200">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[12px] font-black text-slate-700">
                    {taskLabel(taskType)}
                  </p>
                  {score !== null ? (
                    <p className="shrink-0 text-sm font-black">
                      <span className={isWeak ? "text-rose-600" : t.text}>{score}</span>
                      <span className="text-[10px] font-bold text-slate-400">/160</span>
                      {delta !== null && delta !== 0 && (
                        <span
                          className={`ml-1 text-[10px] font-black ${
                            delta > 0 ? "text-emerald-600" : "text-rose-500"
                          }`}
                        >
                          {delta > 0 ? "▲" : "▼"}
                          {Math.abs(delta)}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="shrink-0 text-[10px] font-bold text-slate-300">ยังไม่มีข้อมูล</p>
                  )}
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full transition-[width] duration-500 ease-out ${isWeak ? "bg-rose-400" : t.solid}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {score !== null && (
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {week
                      ? `${BASIS_TH[week.basis]}${week.attempts > 0 ? ` · ${week.attempts} ครั้ง` : ""}`
                      : w
                        ? SOURCE_TH[w.source]
                        : ""}
                    {isWeak ? " · จุดอ่อน" : ""}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** A rest day: one slim muted row, still a valid drop target. */
function RestRow({ day, onDrop }: { day: BlockDay; onDrop: () => void }) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onDrop();
      }}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] transition ${
        over
          ? "bg-sky-50 ring-1 ring-sky-400"
          : "bg-slate-50/70 ring-1 ring-transparent"
      }`}
    >
      <span className="w-16 shrink-0 font-bold text-slate-400">
        {WEEKDAY_FULL_TH[day.weekday]}
      </span>
      <span className="shrink-0 text-slate-300">·</span>
      <span className="shrink-0 font-bold text-slate-400">{thaiDate(day.date)}</span>
      <span className="ml-auto shrink-0 text-slate-300">วันพัก</span>
    </div>
  );
}

function DayCard({
  day,
  isToday,
  onStart,
  onDragStart,
  onDrop,
  dragging,
}: {
  day: BlockDay;
  isToday?: boolean;
  /** Present on today only — starts the session straight from the calendar. */
  onStart?: () => void;
  onDragStart: (itemId?: string) => void;
  onDrop: () => void;
  dragging: boolean;
}) {
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onDrop();
      }}
      className={`overflow-hidden rounded-2xl bg-white ring-1 transition ${
        over
          ? "ring-2 ring-sky-400"
          : isToday
            ? "ring-2 ring-[#004AAD]"
            : "ring-slate-200"
      } ${dragging ? "opacity-50" : ""}`}
    >
      {/* Header doubles as the drag handle for the whole day. */}
      <div
        draggable
        onDragStart={() => onDragStart(undefined)}
        className={`flex cursor-grab items-center gap-2 px-3.5 py-2.5 ${
          isToday ? "bg-[#004AAD] text-white" : "bg-slate-50"
        }`}
      >
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[13px] font-black ${
              isToday ? "text-white" : "text-slate-800"
            }`}
          >
            {WEEKDAY_FULL_TH[day.weekday]} · {thaiDate(day.date)}
            {isToday && (
              <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[9px] align-middle">
                วันนี้
              </span>
            )}
          </span>
          {day.blocks.length > 0 && (
            <span
              className={`block truncate text-[10px] ${
                isToday ? "text-white/70" : "text-slate-400"
              }`}
            >
              {day.blocks.map((b) => b.titleTh).join(" → ")}
            </span>
          )}
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
            isToday ? "bg-white/20 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"
          }`}
        >
          {day.totalMinutes} นาที
        </span>
        {onStart && (
          <button
            type="button"
            aria-label="เริ่มเรียนวันนี้"
            onClick={(e) => {
              e.stopPropagation();
              onStart();
            }}
            onDragStart={(e) => e.preventDefault()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-sm text-[#004AAD] shadow-sm transition hover:scale-105"
          >
            ▶
          </button>
        )}
      </div>

      <ul className="divide-y divide-slate-100">
        {day.items.map((it: StudyItem) => (
          <li
            key={it.id}
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              onDragStart(it.id);
            }}
            className="flex cursor-grab items-center gap-2.5 px-3.5 py-2.5 transition hover:bg-slate-50"
          >
            {/* Fixed icon column keeps every row aligned regardless of title length. */}
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[13px] ${
                it.kind === "video"
                  ? "bg-amber-50"
                  : it.kind === "lesson"
                    ? "bg-violet-50"
                    : "bg-sky-50"
              }`}
            >
              {it.kind === "video" ? "🎬" : it.kind === "lesson" ? "📘" : "🏋️"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-bold text-slate-700">
                {it.titleTh}
              </span>
              {it.gateTh && (
                <span className="block truncate text-[10px] text-slate-400">{it.gateTh}</span>
              )}
            </span>
            <span className="shrink-0 text-[10px] font-bold text-slate-400">{it.minutes}′</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Section({
  n,
  title,
  subtitle,
  children,
}: {
  n: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    // Each section rises in slightly after the one above it — the app's
    // StaggerIn cascade, so the page reveals softly instead of snapping in.
    <section
      className="ep-stagger-in rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      style={{ animationDelay: `${n * 90}ms` }}
    >
      <div className="mb-3 flex items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#004AAD] text-sm font-black text-white">
          {n}
        </span>
        <div>
          <h2 className="text-lg font-black leading-tight text-slate-900">{title}</h2>
          <p className="text-[11px] text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
        on ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
      <p className="text-xl font-black text-slate-800">{n}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

/**
 * The recommended order, summarised.
 *
 * A read-only list of all thirteen blocks was a wall of text that most learners
 * will never act on, so only the first three show until asked.
 */
function GuidedOrder({
  blocks,
}: {
  blocks: { key: string; titleTh: string; items: { minutes: number }[] }[];
}) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? blocks : blocks.slice(0, 3);
  const totalMinutes = blocks.reduce(
    (s, b) => s + b.items.reduce((n, i) => n + i.minutes, 0),
    0,
  );

  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <p className="text-[12px] font-bold text-slate-600">
        เริ่มจากพื้นฐาน แล้วไล่ทีละทักษะ — รวม{" "}
        <strong className="text-slate-800">{blocks.length} บท</strong> ·{" "}
        <strong className="text-slate-800">{Math.round(totalMinutes / 60)} ชั่วโมง</strong>
      </p>

      <ol className="mt-2.5 space-y-1">
        {shown.map((b, i) => (
          <li key={b.key} className="flex items-center gap-2.5">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-white text-[10px] font-black text-slate-500 ring-1 ring-slate-200">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-slate-700">
              {b.titleTh}
            </span>
            <span className="shrink-0 text-[10px] text-slate-400">
              {b.items.reduce((n, it) => n + it.minutes, 0)} นาที
            </span>
          </li>
        ))}
      </ol>

      {blocks.length > 3 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-2.5 text-[11px] font-black text-[#004AAD]"
        >
          {showAll ? "ย่อรายการ" : `ดูทั้งหมด (อีก ${blocks.length - 3} บท)`}
        </button>
      )}
    </div>
  );
}
