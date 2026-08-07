"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

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
import { blocksForSkillPlacement } from "@/lib/course-plan/curriculum";
import {
  DEFAULT_PLAN_SETTINGS,
  clampMinutes,
  MAX_MINUTES_PER_DAY,
  MIN_MINUTES_PER_DAY,
  MINUTE_OPTIONS,
  OVERRIDES_STORAGE_KEY,
  PLAN_STORAGE_KEY,
  WEEKDAY_FULL_TH,
  type PlanSettings,
} from "@/lib/course-plan/planner";
import { AttemptRedeemPanel } from "@/components/course/AttemptRedeemPanel";
import { CourseCompletion } from "@/components/course/CourseCompletion";
import { LessonLibrary } from "@/components/course/LessonLibrary";
import { ProgramBuilder } from "@/components/course/ProgramBuilder";
import { SessionRunner, type BonusProjection } from "@/components/course/SessionRunner";
import type { StudentCourse } from "@/lib/course-student-data";
import {
  fullRungPlan,
  RUNG_TH,
  skillTargetsFor,
  type RungLevel,
  type RungStep,
} from "@/lib/course-plan/rungs";
import {
  addToCarryOver,
  buildItemStream,
  CARRY_OVER_STORAGE_KEY,
  clearFromCarryOver,
  EMPTY_CARRY_OVER,
  pourIntoDays,
  projectBoth,
  projectFinish,
  applyCustomisation,
  applyOverrides,
  blocksInStream,
  CUSTOMISATION_STORAGE_KEY,
  EMPTY_CUSTOMISATION,
  EMPTY_PROGRESS,
  completionOf,
  markCompleted,
  markSkipped,
  videoDebt,
  VIDEO_DEBT_LIMIT_MINUTES,
  PROGRESS_STORAGE_KEY,
  type ItemScore,
  type Progress,
  type Customisation,
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

/** The three screens. A learner opening the app wants the first one. */
type Tab = "today" | "progress" | "plan";

const TABS: { key: Tab; labelTh: string; icon: string }[] = [
  { key: "today", labelTh: "วันนี้", icon: "▶" },
  { key: "progress", labelTh: "ความคืบหน้า", icon: "📈" },
  { key: "plan", labelTh: "แผน", icon: "🗓" },
];

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

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round(
    (Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000,
  );
}

export function CoursePlanClient({
  course,
  weakness,
  weekly,
  hasUser,
  todayIso,
  accessReason = "admin",
  studentCourseEnabled = false,
  syncEnabled,
}: {
  course: StudentCourse | null;
  weakness: TaskWeakness[];
  weekly: WeeklyScore[];
  hasUser: boolean;
  todayIso: string;
  accessReason?: "admin" | "vip";
  studentCourseEnabled?: boolean;
  /**
   * Whether plan + progress may round-trip to the server. Defaults to hasUser,
   * which is right everywhere except the fixture preview — there an admin with
   * a live session would otherwise write demo progress onto their real row.
   */
  syncEnabled?: boolean;
}) {
  const canSync = syncEnabled ?? hasUser;
  const [tab, setTab] = useState<Tab>("today");
  const [settings, setSettings] = useState<PlanSettings>({
    ...DEFAULT_PLAN_SETTINGS,
    startDate: todayIso,
  });
  const [overrides, setOverrides] = useState<BlockOverrides>({});
  const [loaded, setLoaded] = useState(false);
  const [plannerView, setPlannerView] = useState<"week" | "month">("week");
  const [weekIndex, setWeekIndex] = useState(0);
  const [dragFrom, setDragFrom] = useState<{ date: string; itemId?: string } | null>(null);
  /** Touch equivalent of the drag: what the move sheet is currently moving. */
  const [moveTarget, setMoveTarget] = useState<
    { date: string; itemId?: string; titleTh: string } | null
  >(null);
  const [minutesDraft, setMinutesDraft] = useState("20");
  const [custom, setCustom] = useState<Customisation>(EMPTY_CUSTOMISATION);
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [carryOver, setCarryOver] = useState<CarryOver>(EMPTY_CARRY_OVER);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  /** Soft banner after the plan auto-shifts overdue work onto today+. */
  const [adaptNotice, setAdaptNotice] = useState<{
    items: number;
    minutes: number;
    days: number;
  } | null>(null);
  const adaptingRef = useRef(false);

  function applyAdaptPlan(overdueSnapshot: { items: number; minutes: number; days: number }) {
    adaptingRef.current = true;
    setSettings((prev) => ({ ...prev, startDate: todayIso, catchUpMode: "adapt" }));
    setOverrides({});
    setCarryOver(EMPTY_CARRY_OVER);
    setAdaptNotice(overdueSnapshot);
    queueMicrotask(() => {
      adaptingRef.current = false;
    });
  }

  function applyCarryPlan(overdueDays: BlockDay[]) {
    let next = carryOver;
    for (const d of overdueDays) next = addToCarryOver(next, d.date, d.items);
    setCarryOver(next);
    setSettings((prev) => ({ ...prev, catchUpMode: "carry" }));
    setAdaptNotice(null);
  }

  // ---- persistence -------------------------------------------------------
  // localStorage first (instant, works offline), then the DB. The server copy
  // wins on load so the plan AND the completion record follow the learner
  // across devices — losing months of finished work to a cleared cache was the
  // worst failure this page had.
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

    if (!canSync) {
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
            progress: Progress | null;
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
          // Merge rather than replace: a session finished offline on this device
          // must not be erased by an older server copy.
          if (json.progress) {
            setProgress((local) =>
              markCompleted(
                { ...EMPTY_PROGRESS, ...json.progress },
                local.completedIds,
                local.accuracy,
              ),
            );
          }
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
  }, [todayIso, canSync]);

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

    if (!canSync || syncState === "offline") return;
    // Debounced so dragging a dozen items is one write, not a dozen.
    const t = setTimeout(() => {
      void fetch("/api/course/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: { ...settings, custom },
          overrides,
          carryOver,
          progress,
        }),
      })
        .then((r) => setSyncState(r.ok ? "synced" : "offline"))
        .catch(() => setSyncState("offline"));
    }, 800);
    return () => clearTimeout(t);
  }, [settings, overrides, carryOver, custom, progress, loaded, canSync, syncState]);

  // Keep the custom field in step when a preset is tapped or a saved plan loads.
  useEffect(() => {
    setMinutesDraft(String(settings.minutesPerDay));
  }, [settings.minutesPerDay]);

  const lessonVideos = useMemo(() => {
    const map: Record<
      string,
      {
        bunnyVideoGuid: string;
        title: string;
        watchedSeconds: number;
        downloads: Array<{ id: string; label: string; fileSize: number | null }>;
      }
    > = {};
    if (!course) return map;
    for (const ch of course.chapters) {
      for (const l of ch.lessons) {
        if (l.bunnyVideoGuid) {
          map[l.id] = {
            bunnyVideoGuid: l.bunnyVideoGuid,
            title: l.title,
            watchedSeconds: l.watchedSeconds ?? 0,
            downloads: l.downloads ?? [],
          };
        }
      }
    }
    return map;
  }, [course]);

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
   * plan is authored per student.
   */
  const rungSteps = useMemo(() => {
    const scores =
      weekly.length > 0
        ? weekly.map((w) => ({ taskType: w.taskType, score160: w.score160 }))
        : weakness.map((w) => ({ taskType: w.taskType, score160: w.score160 }));
    if (scores.length === 0) return [];
    return fullRungPlan(skillTargetsFor(scores, settings.goalScore));
  }, [weekly, weakness, settings.goalScore]);

  /** The curriculum as authored — every block, before the learner rearranges. */
  const baseStream = useMemo(
    () => buildItemStream(courseVideos, blocksForSkillPlacement(rungSteps), rungSteps),
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
   * both "catch up" and the bonus round work without a second queue.
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

  const overdueDays = useMemo(
    () => days.filter((d) => d.date < todayIso && d.items.length > 0),
    [days, todayIso],
  );
  const overdueStats = useMemo(() => {
    if (overdueDays.length === 0) return null;
    return {
      days: overdueDays.length,
      items: overdueDays.reduce((n, d) => n + d.items.length, 0),
      minutes: overdueDays.reduce((n, d) => n + d.totalMinutes, 0),
    };
  }, [overdueDays]);

  // Prefer saved mode: adapt reflows automatically; ask shows a chooser; carry
  // leaves overdue on the calendar and seeds the session backlog.
  const catchUpMode = settings.catchUpMode ?? "ask";

  useEffect(() => {
    if (!loaded || adaptingRef.current || !overdueStats) return;
    if (catchUpMode !== "adapt") return;

    const willBumpStart = settings.startDate < todayIso;
    const willClearOverrides = Object.keys(overrides).length > 0;
    const willClearCarry = carryOver.entries.length > 0;
    if (!willBumpStart && !willClearOverrides && !willClearCarry) return;

    applyAdaptPlan(overdueStats);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- adapt only when overdue + mode=adapt
  }, [loaded, overdueStats, catchUpMode, settings.startDate, todayIso, overrides, carryOver]);

  const totals = useMemo(() => blockTotals(days), [days]);
  const projection = useMemo(
    () => projectBoth(remainingStream, pourSettings),
    [remainingStream, pourSettings],
  );
  const completion = useMemo(() => completionOf(stream, progress), [stream, progress]);
  /**
   * Exercise time the learner has stepped past to reach lectures. Resolved
   * against the live stream so a skipped set that later leaves the programme
   * (goal changed, block excluded) stops being owed.
   */
  const debt = useMemo(() => videoDebt(stream, progress), [stream, progress]);

  const weeks = useMemo(() => {
    const map = new Map<number, BlockDay[]>();
    for (const d of days) {
      const list = map.get(d.weekIndex) ?? [];
      list.push(d);
      map.set(d.weekIndex, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  }, [days]);

  const today = useMemo(
    () => days.find((d) => d.date === todayIso) ?? days.find((d) => d.items.length > 0) ?? null,
    [days, todayIso],
  );

  /**
   * What the bonus round can offer: the next scheduled items after today.
   *
   * Capped, because the offer is one item at a time and nobody needs the whole
   * rest of the course serialised into a prop.
   */
  const upcomingItems = useMemo(() => {
    const todayIds = new Set((today?.items ?? []).map((i) => i.id));
    const out: StudyItem[] = [];
    for (const d of days) {
      if (today && d.date <= today.date) continue;
      for (const it of d.items) {
        if (!todayIds.has(it.id)) out.push(it);
        if (out.length >= 10) return out;
      }
    }
    return out;
  }, [days, today]);

  /**
   * The plan as it stood when this session opened.
   *
   * Frozen, because finishing today's work moves the projection on its own —
   * measuring "days saved" against a moving baseline would credit the bonus
   * round for work the learner was always going to do.
   */
  const sessionBaseline = useRef<{ stream: StudyItem[]; date: string | null } | null>(null);

  function openSession() {
    const done = new Set(progress.completedIds);
    const rest = stream.filter((i) => !done.has(i.id));
    sessionBaseline.current = {
      stream: rest,
      date: projectFinish(rest, pourSettings)?.date ?? null,
    };
    setSessionOpen(true);
  }

  function projectWith(extraCompletedIds: string[]): BonusProjection {
    const base = sessionBaseline.current;
    if (!base?.date) return null;
    const drop = new Set(extraCompletedIds);
    const rest = base.stream.filter((i) => !drop.has(i.id));
    const next = projectFinish(rest, pourSettings);
    if (!next) return null;
    return { date: next.date, daysSaved: Math.max(0, daysBetween(next.date, base.date)) };
  }

  function toggleDay(n: number) {
    setSettings((s) => ({
      ...s,
      studyDays: s.studyDays.includes(n)
        ? s.studyDays.filter((d) => d !== n)
        : [...s.studyDays, n].sort(),
    }));
  }

  function moveTo(fromDate: string, toDate: string, itemId?: string) {
    setOverrides((o) =>
      itemId
        ? moveBlockItem(days, o, itemId, fromDate, toDate)
        : moveBlockDay(days, o, fromDate, toDate),
    );
  }

  function handleDrop(toDate: string) {
    if (!dragFrom) return;
    moveTo(dragFrom.date, toDate, dragFrom.itemId);
    setDragFrom(null);
  }

  const goalScore = settings.goalScore;

  return (
    <main className="ep-page-shell min-h-screen bg-slate-100 pb-10">
      {/* ---------------- header + tabs ---------------- */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">คอร์สของฉัน</h1>
            <div className="flex items-center gap-2">
              <span
                className={`text-[13px] font-semibold ${
                  accessReason === "vip" ? "text-emerald-600" : "text-slate-400"
                }`}
              >
                {accessReason === "vip"
                  ? "VIP Fast Track"
                  : studentCourseEnabled
                    ? "พรีวิวแอดมิน"
                    : "แอดมินเท่านั้น"}
              </span>
              {canSync && syncState === "offline" && (
                <span
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[13px] font-semibold text-slate-500"
                  title="แผนถูกเก็บไว้ในเครื่องนี้ ยังซิงก์ขึ้นระบบไม่ได้"
                >
                  เก็บในเครื่อง
                </span>
              )}
            </div>
          </div>

          <nav className="mt-3 flex gap-1" aria-label="ส่วนของคอร์ส">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-current={tab === t.key ? "page" : undefined}
                className={`relative flex-1 rounded-t-xl px-2 py-3 text-[14px] font-bold transition ${
                  tab === t.key
                    ? "text-[#004AAD]"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <span aria-hidden className="mr-1">
                  {t.icon}
                </span>
                {t.labelTh}
                {tab === t.key && (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#004AAD]" />
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-4 px-4 pt-4">
        {!hasUser && (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[14px] font-semibold text-amber-900 ring-1 ring-amber-200">
            กำลังดูแบบยังไม่ล็อกอิน — วิดีโอ คลังข้อสอบ และคะแนนจะยังว่าง ·{" "}
            <Link href="/login?redirect=%2Fcourse" className="underline">
              เข้าสู่ระบบ
            </Link>
          </p>
        )}

        {/* ================================================== TODAY ===== */}
        {tab === "today" && (
          <>
            {completion.isComplete && <CourseCompletion weakestFirst={weakestFirst} />}

            {today && !completion.isComplete && (
              <section className="ep-stagger-in overflow-hidden rounded-3xl bg-[#004AAD] text-white shadow-sm">
                <div className="p-6">
                  <p className="text-[13px] font-semibold uppercase tracking-widest text-white/70">
                    วันนี้ · {thaiDate(today.date)}
                  </p>
                  <h2 className="mt-1 text-2xl font-extrabold tracking-tight">
                    {today.blocks.length > 0
                      ? today.blocks.map((b) => b.titleTh).join(" → ")
                      : "วันพัก"}
                  </h2>
                  <p className="mt-1 text-[15px] text-white/80">
                    {today.items.length} รายการ · {today.totalMinutes} นาที
                    {carryOver.entries.length > 0 && (
                      <span className="ml-2 rounded-full bg-amber-400 px-2.5 py-0.5 text-[13px] font-bold text-amber-950">
                        มีของค้าง {carryOver.entries.length}
                      </span>
                    )}
                  </p>

                  {/* The one start button in the whole product. */}
                  {today.items.length > 0 && (
                    <button
                      type="button"
                      onClick={openSession}
                      className="mt-5 w-full rounded-full bg-white py-4 text-base font-extrabold text-[#004AAD] transition hover:bg-white/90"
                    >
                      ▶︎ เริ่มเรียน ({settings.minutesPerDay} นาที)
                    </button>
                  )}

                  <ul className="mt-4 space-y-1.5">
                    {today.items.slice(0, 4).map((it) => (
                      <li
                        key={it.id}
                        className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3 py-2.5"
                      >
                        <span aria-hidden className="shrink-0 text-[15px]">
                          {it.kind === "video" ? "🎬" : it.kind === "lesson" ? "📘" : "🏋️"}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-white/90">
                          {it.titleTh}
                        </span>
                        <span className="shrink-0 text-[13px] text-white/60">{it.minutes}′</span>
                      </li>
                    ))}
                    {today.items.length > 4 && (
                      <li className="px-3 text-[13px] text-white/60">
                        และอีก {today.items.length - 4} รายการ
                      </li>
                    )}
                  </ul>
                </div>
              </section>
            )}

            {/* Skipped-drill debt, stated plainly outside the session so it is
                never a surprise at the moment a lecture refuses to open. */}
            {debt.items.length > 0 && (
              <section
                className={`ep-stagger-in rounded-3xl bg-white p-5 shadow-sm ring-1 ${
                  debt.locked ? "ring-amber-300" : "ring-slate-200"
                }`}
              >
                <p
                  className={`text-[13px] font-semibold uppercase tracking-widest ${
                    debt.locked ? "text-amber-600" : "text-slate-400"
                  }`}
                >
                  {debt.locked ? "วิดีโอถูกล็อกไว้ชั่วคราว" : "แบบฝึกที่ข้ามไว้"}
                </p>
                <h2 className="mt-1 text-[17px] font-bold text-slate-900">
                  ค้างอยู่ {debt.items.length} ชุด · {debt.minutes} นาที
                </h2>
                <p className="mt-1 text-[14px] text-slate-600">
                  {debt.locked
                    ? `ค้างถึง ${VIDEO_DEBT_LIMIT_MINUTES} นาทีแล้ว — เคลียร์สัก 1 ชุดก่อน แล้วดูวิดีโอต่อได้เลย`
                    : `ข้ามได้อีก ${VIDEO_DEBT_LIMIT_MINUTES - debt.minutes} นาที ก่อนที่วิดีโอจะถูกล็อกชั่วคราว`}
                </p>
                <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full transition-[width] duration-500 ${
                      debt.locked ? "bg-amber-500" : "bg-slate-400"
                    }`}
                    style={{
                      width: `${Math.min(100, Math.round((debt.minutes / VIDEO_DEBT_LIMIT_MINUTES) * 100))}%`,
                    }}
                  />
                </div>
                {today && today.items.length > 0 && (
                  <button
                    type="button"
                    onClick={openSession}
                    className={`mt-3 w-full rounded-full py-3.5 text-[15px] font-extrabold ${
                      debt.locked
                        ? "bg-[#004AAD] text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {debt.locked ? "ไปเคลียร์แบบฝึกที่ค้าง" : "ทำแบบฝึกที่ค้างต่อ"}
                  </button>
                )}
              </section>
            )}

            {loaded && overdueStats && catchUpMode === "ask" && (
              <section className="ep-stagger-in rounded-3xl bg-white p-5 shadow-sm ring-1 ring-amber-200">
                <p className="text-[13px] font-semibold uppercase tracking-widest text-amber-600">
                  ตามแผนไม่ทันนิดหน่อย
                </p>
                <h2 className="mt-1 text-[17px] font-bold text-slate-900">
                  ค้างอยู่ {overdueStats.items} รายการ · {overdueStats.minutes} นาที
                </h2>
                <p className="mt-1 text-[14px] text-slate-600">
                  ค้างมาจาก {overdueStats.days} วันที่ผ่านมา — อยากให้ทำยังไงดี?
                </p>
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => applyAdaptPlan(overdueStats)}
                    className="w-full rounded-2xl bg-[#004AAD] px-4 py-3.5 text-left text-white transition hover:brightness-110"
                  >
                    <span className="block text-[15px] font-extrabold">ปรับแผนใหม่</span>
                    <span className="mt-0.5 block text-[13px] text-white/80">
                      ย้ายของค้างมาเรียงจากวันนี้ ไม่มีอะไรค้างอีก
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyCarryPlan(overdueDays)}
                    className="w-full rounded-2xl bg-slate-50 px-4 py-3.5 text-left ring-1 ring-slate-200 transition hover:ring-slate-400"
                  >
                    <span className="block text-[15px] font-bold text-slate-800">
                      ไล่เก็บของเก่าก่อน
                    </span>
                    <span className="mt-0.5 block text-[13px] text-slate-500">
                      ของค้างจะขึ้นก่อนทุกครั้งที่เริ่มเรียน
                    </span>
                  </button>
                </div>
              </section>
            )}

            {loaded && overdueStats && catchUpMode === "carry" && (
              <section className="ep-stagger-in rounded-3xl bg-white p-5 shadow-sm ring-1 ring-amber-200">
                <p className="text-[13px] font-semibold uppercase tracking-widest text-amber-600">
                  โหมดไล่เก็บของค้าง
                </p>
                <h2 className="mt-1 text-[17px] font-bold text-slate-900">
                  ค้างอยู่ {overdueStats.items} รายการ · {overdueStats.minutes} นาที
                </h2>
                <p className="mt-1 text-[14px] text-slate-600">
                  ของค้างจะถูกใส่ไว้ต้นคิวให้อัตโนมัติทุกครั้งที่กดเริ่มเรียน
                </p>
                <button
                  type="button"
                  onClick={() => applyAdaptPlan(overdueStats)}
                  className="mt-3 w-full rounded-full bg-slate-100 py-3 text-[15px] font-semibold text-slate-700"
                >
                  เปลี่ยนเป็นปรับแผนใหม่แทน
                </button>
              </section>
            )}

            {adaptNotice && catchUpMode === "adapt" && !overdueStats && (
              <section className="ep-stagger-in rounded-3xl bg-white p-5 shadow-sm ring-1 ring-emerald-200">
                <p className="text-[13px] font-semibold uppercase tracking-widest text-emerald-600">
                  ปรับแผนใหม่แล้ว
                </p>
                <h2 className="mt-1 text-[17px] font-bold text-slate-900">
                  ย้ายของค้าง {adaptNotice.items} รายการมาเริ่มจากวันนี้
                </h2>
                <p className="mt-1 text-[14px] text-slate-600">
                  ปฏิทินถูกจัดใหม่ให้ไล่จากวันนี้ต่อ
                  {projection.full ? ` · เรียนจบประมาณ ${thaiFullDate(projection.full.date)}` : ""}
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setAdaptNotice(null)}
                    className="flex-1 rounded-full bg-emerald-600 py-3 text-[15px] font-extrabold text-white"
                  >
                    เข้าใจแล้ว
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdaptNotice(null);
                      setSettings((s) => ({ ...s, catchUpMode: "ask" }));
                    }}
                    className="flex-1 rounded-full bg-slate-100 py-3 text-[15px] font-semibold text-slate-700"
                  >
                    ถามใหม่ครั้งหน้า
                  </button>
                </div>
              </section>
            )}

            {/* Where the plan is heading — one date, not three cards of them. */}
            {projection.full && !completion.isComplete && (
              <section className="ep-stagger-in rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold uppercase tracking-widest text-slate-400">
                      ถ้าเรียนตามจังหวะนี้
                    </p>
                    <p className="mt-0.5 text-[17px] font-bold text-slate-900">
                      เรียนจบ {thaiFullDate(projection.full.date)}
                    </p>
                    <p className="mt-0.5 text-[13px] text-slate-500">
                      {settings.minutesPerDay} นาที · {settings.studyDays.length} วัน/สัปดาห์ ·
                      อีก {projection.full.studyDays} วันเรียน
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTab("plan");
                      setSetupOpen(true);
                    }}
                    className="shrink-0 rounded-full bg-slate-100 px-3.5 py-2 text-[13px] font-semibold text-slate-600"
                  >
                    ปรับ
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {/* =============================================== PROGRESS ===== */}
        {tab === "progress" && (
          <>
            {completion.total > 0 && (
              <section className="ep-stagger-in rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-[17px] font-bold text-slate-900">ความคืบหน้าหลักสูตร</h2>
                  <p className="text-[14px] font-bold text-slate-600">
                    {completion.done} / {completion.total}
                  </p>
                </div>
                <div className="mt-2.5 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-emerald-500 transition-[width] duration-500"
                    style={{ width: `${completion.percent}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[13px] text-slate-500">
                  {completion.percent}% — เหลืออีก {completion.total - completion.done} รายการ
                </p>
              </section>
            )}

            <ScoreBreakdown
              weakness={weakness}
              weekly={weekly}
              hasUser={hasUser}
              goalScore={goalScore}
            />

            {rungSteps.length > 0 && (
              <RungLadder steps={rungSteps} goalScore={goalScore} />
            )}

            <AttemptRedeemPanel hasUser={hasUser} defaultCollapsed={!hasUser} />
          </>
        )}

        {/* =================================================== PLAN ===== */}
        {tab === "plan" && (
          <>
            <Panel title="ตั้งแผนของฉัน">
              <button
                type="button"
                onClick={() => setSetupOpen((o) => !o)}
                className="flex w-full items-center gap-3 text-left"
              >
                <span className="min-w-0 flex-1 text-[14px] text-slate-600">
                  {settings.minutesPerDay} นาที · {settings.studyDays.length} วัน/สัปดาห์ · เป้า{" "}
                  {goalScore}
                </span>
                <span className="shrink-0 text-[14px] font-bold text-slate-400">
                  {setupOpen ? "▲" : "▼"}
                </span>
              </button>

              {setupOpen && (
                <div className="mt-4 space-y-5">
                  <Field label="เริ่มเรียนวันไหน">
                    <input
                      type="date"
                      value={settings.startDate}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, startDate: e.target.value || todayIso }))
                      }
                      className="rounded-xl bg-slate-100 px-3.5 py-2.5 text-[15px] font-semibold text-slate-700 ring-1 ring-slate-200"
                    />
                    {settings.startDate !== todayIso && (
                      <button
                        type="button"
                        onClick={() => setSettings((s) => ({ ...s, startDate: todayIso }))}
                        className="ml-2 rounded-full bg-slate-100 px-3 py-1.5 text-[13px] font-semibold text-slate-600"
                      >
                        วันนี้
                      </button>
                    )}
                  </Field>

                  <Field label="วันละกี่นาที">
                    <div className="flex flex-wrap items-center gap-2">
                      {MINUTE_OPTIONS.map((m) => (
                        <Pill
                          key={m}
                          on={settings.minutesPerDay === m}
                          onClick={() => setSettings((s) => ({ ...s, minutesPerDay: m }))}
                        >
                          {m}
                        </Pill>
                      ))}
                      <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1.5">
                        <span className="text-[13px] font-semibold text-slate-500">กำหนดเอง</span>
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
                            if (
                              raw !== "" &&
                              Number.isFinite(n) &&
                              n >= MIN_MINUTES_PER_DAY &&
                              n <= MAX_MINUTES_PER_DAY
                            ) {
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
                          className="w-16 rounded-full bg-white px-2 py-1 text-center text-[14px] font-bold text-slate-800 ring-1 ring-slate-300"
                        />
                      </span>
                    </div>
                  </Field>

                  <Field label={`เรียนวันไหนบ้าง (${settings.studyDays.length} วัน/สัปดาห์)`}>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAY_FULL_TH.map((th, n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => toggleDay(n)}
                          className={`rounded-full px-3.5 py-2.5 text-[14px] font-semibold transition ${
                            settings.studyDays.includes(n)
                              ? "bg-[#004AAD] text-white"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {th}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field label="เป้าคะแนน">
                    <div className="flex flex-wrap gap-2">
                      {[100, 110, 120, 130, 140].map((g) => (
                        <Pill
                          key={g}
                          on={goalScore === g}
                          onClick={() => setSettings((prev) => ({ ...prev, goalScore: g }))}
                        >
                          {g}
                        </Pill>
                      ))}
                    </div>
                  </Field>

                  <Field label="เมื่อตามแผนไม่ทัน">
                    <div className="flex flex-col gap-2">
                      {(
                        [
                          { mode: "ask" as const, label: "ถามทุกครั้ง", hint: "เลือกเองแต่ละรอบ" },
                          {
                            mode: "adapt" as const,
                            label: "ปรับแผนใหม่",
                            hint: "ย้ายของค้างมาเรียงจากวันนี้",
                          },
                          {
                            mode: "carry" as const,
                            label: "ไล่เก็บของเก่าก่อน",
                            hint: "ของค้างขึ้นก่อนเสมอ",
                          },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.mode}
                          type="button"
                          onClick={() => setSettings((s) => ({ ...s, catchUpMode: opt.mode }))}
                          className={`rounded-2xl px-4 py-3 text-left ring-1 transition ${
                            catchUpMode === opt.mode
                              ? "bg-[#004AAD] text-white ring-[#004AAD]"
                              : "bg-slate-50 text-slate-800 ring-slate-200 hover:ring-slate-400"
                          }`}
                        >
                          <span className="block text-[15px] font-bold">{opt.label}</span>
                          <span
                            className={`mt-0.5 block text-[13px] ${
                              catchUpMode === opt.mode ? "text-white/80" : "text-slate-500"
                            }`}
                          >
                            {opt.hint}
                          </span>
                        </button>
                      ))}
                    </div>
                  </Field>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Stat n={totals.studyDays} label="วันที่ต้องเรียน" />
                    <Stat n={totals.videos} label="เลกเชอร์" />
                    <Stat n={totals.exercises} label="ชุดฝึก" />
                    <Stat n={totals.hours} label="ชั่วโมงรวม" />
                  </div>

                  {projection.full && (
                    <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                      <p className="text-[13px] font-semibold uppercase tracking-widest text-emerald-600">
                        เรียนจบแก่นเนื้อหา
                      </p>
                      <p className="mt-0.5 text-xl font-extrabold text-emerald-900">
                        {thaiFullDate(projection.full.date)}
                      </p>
                      <p className="mt-1 text-[13px] text-emerald-800">
                        {projection.full.studyDays} วันเรียน ·{" "}
                        {Math.ceil(projection.full.calendarDays / 7)} สัปดาห์ ·{" "}
                        {Math.round(projection.full.totalMinutes / 60)} ชั่วโมง · ยังไม่รวมการฝึกเพิ่มเองที่{" "}
                        <Link href="/practice" className="font-bold text-emerald-900 underline">
                          หน้าฝึกข้อสอบ
                        </Link>
                      </p>
                    </div>
                  )}

                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[15px] font-bold text-slate-800">ไม่อยากดูเลกเชอร์?</p>
                        <p className="text-[13px] text-slate-500">
                          โหมดฝึกล้วน — ข้ามวิดีโอ เหลือแต่แบบฝึก
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSettings((s) => ({ ...s, practiceOnly: !s.practiceOnly }))
                        }
                        className={`rounded-full px-4 py-2.5 text-[14px] font-bold ${
                          settings.practiceOnly
                            ? "bg-emerald-500 text-white"
                            : "bg-white text-slate-600 ring-1 ring-slate-300"
                        }`}
                      >
                        {settings.practiceOnly ? "✓ เปิดอยู่" : "เปิดโหมดฝึกล้วน"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </Panel>

            {allBlocks.length > 0 && (
              <Panel
                title="ลำดับการเรียน"
                subtitle={
                  custom.mode === "guided"
                    ? "เราจัดลำดับให้แล้ว — เปลี่ยนเองได้"
                    : "คุณกำลังจัดลำดับเอง"
                }
              >
                <div className="space-y-3">
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
                        className={`flex-1 rounded-full py-2.5 text-[14px] font-bold transition ${
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
              </Panel>
            )}

            <Panel title="ปฏิทินการเรียน" subtitle="แตะ ⇄ เพื่อย้ายวัน (บนคอมลากวางได้)">
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
                    className="ml-auto rounded-full bg-slate-100 px-3.5 py-2 text-[13px] font-semibold text-slate-600"
                  >
                    ↺ ล้างการย้าย
                  </button>
                )}
              </div>

              {plannerView === "week" ? (
                <>
                  <div className="mb-2.5 flex items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
                    <button
                      type="button"
                      aria-label="สัปดาห์ก่อนหน้า"
                      disabled={weekIndex === 0}
                      onClick={() => setWeekIndex((i) => Math.max(0, i - 1))}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[15px] font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:opacity-30"
                    >
                      ←
                    </button>
                    <div className="min-w-0 text-center">
                      <p className="truncate text-[14px] font-bold text-slate-800">
                        {(() => {
                          const w = weeks[weekIndex] ?? [];
                          return w.length
                            ? `${thaiDate(w[0].date)} – ${thaiDate(w[w.length - 1].date)}`
                            : "—";
                        })()}
                      </p>
                      <p className="text-[13px] text-slate-500">
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
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[15px] font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:opacity-30"
                    >
                      →
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {(weeks[weekIndex] ?? []).map((d) =>
                      d.items.length === 0 ? (
                        <RestRow key={d.date} day={d} onDrop={() => handleDrop(d.date)} />
                      ) : (
                        <DayCard
                          key={d.date}
                          day={d}
                          isToday={d.date === todayIso}
                          onStart={d.date === todayIso ? openSession : undefined}
                          onDragStart={(itemId) => setDragFrom({ date: d.date, itemId })}
                          onDrop={() => handleDrop(d.date)}
                          dragging={dragFrom?.date === d.date}
                          onRequestMove={(itemId, titleTh) =>
                            setMoveTarget({ date: d.date, itemId, titleTh })
                          }
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
                        className={`flex w-full items-center gap-3 rounded-2xl p-3.5 text-left ring-1 transition ${
                          i === weekIndex
                            ? "bg-slate-50 ring-slate-400"
                            : "bg-white ring-slate-200 hover:ring-slate-300"
                        }`}
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900 text-[13px] font-bold text-white">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold text-slate-700">
                            {thaiDate(w[0].date)} – {thaiDate(w[w.length - 1].date)}
                          </span>
                          <span className="mt-1 flex gap-0.5">
                            {w.map((d) => (
                              <span
                                key={d.date}
                                title={`${thaiDate(d.date)} · ${d.totalMinutes} นาที`}
                                className={`h-1.5 flex-1 rounded-full ${
                                  d.items.length === 0
                                    ? "bg-slate-100"
                                    : d.items.some((it: StudyItem) => it.kind === "video")
                                      ? "bg-amber-400"
                                      : "bg-sky-400"
                                }`}
                              />
                            ))}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-[14px] font-bold text-slate-700">
                            {study} วัน
                          </span>
                          <span className="block text-[13px] text-slate-500">{mins} นาที</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </Panel>

            <Panel title="คลังบทเรียน" subtitle="แยกตามทักษะ — ค้นหาแล้วเปิดคลิปได้ทุกเมื่อ">
              {!course ? (
                <p className="rounded-2xl bg-amber-50 p-4 text-[14px] text-amber-900 ring-1 ring-amber-200">
                  ยังโหลดบทเรียนไม่ได้ตอนนี้ — ลองรีเฟรชหน้าอีกครั้ง ถ้ายังไม่ขึ้น ทักแอดมินได้เลย
                </p>
              ) : (
                <LessonLibrary
                  course={course}
                  stream={stream}
                  completedIds={new Set(progress.completedIds)}
                  goalScore={goalScore}
                />
              )}
            </Panel>
          </>
        )}
      </div>

      {/* ---------------- move sheet (touch) ---------------- */}
      {moveTarget && (
        <MoveSheet
          target={moveTarget}
          days={days}
          todayIso={todayIso}
          onClose={() => setMoveTarget(null)}
          onPick={(toDate) => {
            moveTo(moveTarget.date, toDate, moveTarget.itemId);
            setMoveTarget(null);
          }}
        />
      )}

      {sessionOpen &&
        (() => {
          const todaysItems = today?.items ?? [];
          if (todaysItems.length === 0 && carryOver.entries.length === 0) return null;
          const finishDate = today?.date ?? todayIso;
          return (
            <SessionRunner
              todaysItems={todaysItems}
              carryOver={carryOver}
              minutes={settings.minutesPerDay}
              lessonVideos={lessonVideos}
              upcomingItems={upcomingItems}
              projectWith={projectWith}
              debt={debt}
              onSkipExercise={(item) => setProgress((p) => markSkipped(p, item.id))}
              onClose={() => setSessionOpen(false)}
              onFinish={(unfinished, completed, scores: Record<string, ItemScore>) => {
                setProgress((p) =>
                  markCompleted(
                    p,
                    completed.map((i) => i.id),
                    scores,
                  ),
                );
                // Finished items leave the backlog; unfinished ones join it and
                // lead the queue next session.
                setCarryOver((prev) =>
                  addToCarryOver(
                    clearFromCarryOver(
                      prev,
                      completed.map((i) => i.id),
                    ),
                    finishDate,
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
  placement: "จากแบบวัดระดับ",
};

/**
 * Per-skill scores, measured against the learner's OWN target.
 *
 * The bar used to fill against a fixed 160 and flag "weak" below a hardcoded
 * 128, so someone aiming for 110 saw a 75%-full bar and no credit for a skill
 * that had already passed their goal — while someone aiming for 140 was told
 * 130 was fine. The goal the learner chose is the only denominator that means
 * anything here.
 */
function ScoreBreakdown({
  weakness,
  weekly,
  hasUser,
  goalScore,
}: {
  weakness: TaskWeakness[];
  weekly: WeeklyScore[];
  hasUser: boolean;
  goalScore: number;
}) {
  const rows = useMemo(() => {
    const byWeek = new Map(weekly.map((w) => [w.taskType, w]));
    const byTask = new Map(weakness.map((w) => [w.taskType, w]));
    // DEFAULT_TASK_PRIORITY, not TASK_BLOCK: the block map carries three legacy
    // aliases (interactive_listening, conversation_summary,
    // summarize_conversation) that no scorer ever writes, so keying off it
    // rendered three phantom skills permanently stuck on "ยังไม่มีข้อมูล".
    return DEFAULT_TASK_PRIORITY.map((taskType) => ({
      taskType,
      week: byWeek.get(taskType) ?? null,
      w: byTask.get(taskType) ?? null,
    })).sort(
      (a, b) =>
        (a.week?.score160 ?? a.w?.score160 ?? 999) - (b.week?.score160 ?? b.w?.score160 ?? 999),
    );
  }, [weakness, weekly]);

  const scored = rows.filter((r) => r.week || r.w);
  const hasScores = hasUser && scored.length > 0;
  const atGoal = rows.filter((r) => (r.week?.score160 ?? r.w?.score160 ?? -1) >= goalScore).length;

  return (
    <section className="ep-stagger-in rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[17px] font-bold text-slate-900">คะแนนแยกตามโจทย์</h2>
        {hasScores && (
          <p className="text-[14px] font-semibold text-slate-600">
            ถึงเป้าแล้ว {atGoal} / {rows.length} ทักษะ
          </p>
        )}
      </div>
      <p className="mt-0.5 text-[13px] text-slate-500">
        วัดเทียบเป้าของคุณที่ {goalScore} คะแนน · อัปเดตทุกสัปดาห์
      </p>

      {!hasUser ? (
        <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-[14px] text-slate-600 ring-1 ring-slate-200">
          กำลังดูแบบยังไม่ล็อกอิน จึงยังไม่มีคะแนนให้แสดง
        </p>
      ) : scored.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-[14px] text-slate-600 ring-1 ring-slate-200">
          ยังไม่มีคะแนน — ทำ Mock Test หรือ Mini Diagnosis หนึ่งครั้ง แล้วแผนจะเรียงจุดอ่อนให้อัตโนมัติ
        </p>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {rows.map(({ taskType, week, w }) => {
            const block = studyBlock(TASK_BLOCK[taskType]);
            const t = TONE[block.tone];
            const score = week?.score160 ?? w?.score160 ?? null;
            const belowGoal = score !== null && score < goalScore;
            // Against the learner's goal, not the 160 ceiling.
            const pct = score === null ? 0 : Math.min(100, Math.round((score / goalScore) * 100));
            const delta = week?.deltaVsPrevWeek ?? null;

            return (
              <div key={taskType} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[14px] font-semibold text-slate-700">
                    {taskLabel(taskType)}
                  </p>
                  {score !== null ? (
                    <p className="shrink-0 text-[15px] font-bold">
                      <span className={belowGoal ? "text-amber-700" : t.text}>{score}</span>
                      <span className="text-[13px] font-semibold text-slate-400">/{goalScore}</span>
                      {delta !== null && delta !== 0 && (
                        <span
                          className={`ml-1 text-[13px] font-bold ${
                            delta > 0 ? "text-emerald-600" : "text-rose-500"
                          }`}
                        >
                          {delta > 0 ? "▲" : "▼"}
                          {Math.abs(delta)}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="shrink-0 text-[13px] font-semibold text-slate-400">
                      ยังไม่มีข้อมูล
                    </p>
                  )}
                </div>
                <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full transition-[width] duration-500 ease-out ${
                      belowGoal ? "bg-amber-400" : t.solid
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {score !== null && (
                  <p className="mt-1 text-[13px] text-slate-500">
                    {week
                      ? `${BASIS_TH[week.basis]}${week.attempts > 0 ? ` · ${week.attempts} ครั้ง` : ""}`
                      : w
                        ? SOURCE_TH[w.source]
                        : ""}
                    {belowGoal ? ` · อีก ${goalScore - score} ถึงเป้า` : " · ถึงเป้าแล้ว ✓"}
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

/**
 * The path from here to the goal.
 *
 * Open by default and complete: this is the most motivating artifact the course
 * has, and it used to sit collapsed behind a chevron and then truncate at ten
 * with "และอีก N ขั้น".
 */
function RungLadder({ steps, goalScore }: { steps: RungStep[]; goalScore: number }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? steps : steps.slice(0, 6);

  return (
    <section className="ep-stagger-in rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-[17px] font-bold text-slate-900">เส้นทางไป {goalScore}</h2>
      <p className="mt-0.5 text-[13px] text-slate-500">
        {steps.length} ขั้น — ระดับที่ผ่านแล้วไม่ถูกใส่ในตาราง แต่ยังเปิดดูเลกเชอร์ได้ทุกอัน
      </p>

      <ol className="mt-3 space-y-1.5">
        {shown.map((step, i) => (
          <li
            key={`${step.taskType}-${step.level}-${i}`}
            className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-200"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-900 text-[13px] font-bold text-white">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-slate-800">
                {taskLabel(step.taskType)}{" "}
                <span className="text-slate-400">· ระดับ{RUNG_TH[step.level]}</span>
              </span>
              {step.check && (
                <span className="mt-0.5 block text-[13px] text-amber-700">
                  ⚡ {step.check.reasonTh}
                </span>
              )}
            </span>
            <span className="shrink-0 text-[13px] font-bold tabular-nums text-slate-500">
              {step.fromScore} → {step.goalScore}
            </span>
          </li>
        ))}
      </ol>

      {steps.length > 6 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 w-full rounded-full bg-slate-100 py-3 text-[14px] font-semibold text-slate-700"
        >
          {showAll ? "ย่อรายการ" : `ดูครบทั้ง ${steps.length} ขั้น`}
        </button>
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
      className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px] transition ${
        over ? "bg-sky-50 ring-1 ring-sky-400" : "bg-slate-50/70 ring-1 ring-transparent"
      }`}
    >
      <span className="w-20 shrink-0 font-semibold text-slate-500">
        {WEEKDAY_FULL_TH[day.weekday]}
      </span>
      <span className="shrink-0 font-semibold text-slate-400">{thaiDate(day.date)}</span>
      <span className="ml-auto shrink-0 text-slate-400">วันพัก</span>
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
  onRequestMove,
}: {
  day: BlockDay;
  isToday?: boolean;
  /** Present on today only — starts the session straight from the calendar. */
  onStart?: () => void;
  onDragStart: (itemId?: string) => void;
  onDrop: () => void;
  dragging: boolean;
  /** Touch path: open the move sheet instead of dragging. */
  onRequestMove: (itemId: string | undefined, titleTh: string) => void;
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
        over ? "ring-2 ring-sky-400" : isToday ? "ring-2 ring-[#004AAD]" : "ring-slate-200"
      } ${dragging ? "opacity-50" : ""}`}
    >
      <div
        draggable
        onDragStart={() => onDragStart(undefined)}
        className={`flex items-center gap-2 px-3.5 py-3 sm:cursor-grab ${
          isToday ? "bg-[#004AAD] text-white" : "bg-slate-50"
        }`}
      >
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[14px] font-bold ${
              isToday ? "text-white" : "text-slate-800"
            }`}
          >
            {WEEKDAY_FULL_TH[day.weekday]} · {thaiDate(day.date)}
            {isToday && (
              <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 align-middle text-[12px]">
                วันนี้
              </span>
            )}
          </span>
          {day.blocks.length > 0 && (
            <span
              className={`block truncate text-[13px] ${
                isToday ? "text-white/70" : "text-slate-500"
              }`}
            >
              {day.blocks.map((b) => b.titleTh).join(" → ")}
            </span>
          )}
        </span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[13px] font-bold ${
            isToday ? "bg-white/20 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
          }`}
        >
          {day.totalMinutes}′
        </span>
        {/* Touch move — HTML5 drag never fires on a phone, which is where most
            of these learners are. */}
        <button
          type="button"
          aria-label={`ย้ายงานของ ${thaiDate(day.date)} ไปวันอื่น`}
          onClick={(e) => {
            e.stopPropagation();
            onRequestMove(undefined, `ทั้งวัน · ${thaiDate(day.date)}`);
          }}
          onDragStart={(e) => e.preventDefault()}
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[15px] ${
            isToday ? "bg-white/20 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"
          }`}
        >
          ⇄
        </button>
        {onStart && (
          <button
            type="button"
            aria-label="เริ่มเรียนวันนี้"
            onClick={(e) => {
              e.stopPropagation();
              onStart();
            }}
            onDragStart={(e) => e.preventDefault()}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[15px] text-[#004AAD] shadow-sm transition hover:scale-105"
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
            className={`flex items-center gap-2.5 px-3.5 py-3 transition hover:bg-slate-50/80 sm:cursor-grab ${
              it.kind === "video"
                ? "border-l-4 border-amber-400 bg-amber-50/40"
                : it.kind === "lesson"
                  ? "border-l-4 border-violet-400 bg-violet-50/40"
                  : "border-l-4 border-sky-400 bg-sky-50/40"
            }`}
          >
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[15px] ${
                it.kind === "video"
                  ? "bg-amber-100"
                  : it.kind === "lesson"
                    ? "bg-violet-100"
                    : "bg-sky-100"
              }`}
            >
              {it.kind === "video" ? "🎬" : it.kind === "lesson" ? "📘" : "🏋️"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold text-slate-700">
                {it.titleTh}
              </span>
            </span>
            <span className="shrink-0 text-[13px] font-semibold text-slate-500">
              {it.minutes}′
            </span>
            <button
              type="button"
              aria-label={`ย้าย ${it.titleTh} ไปวันอื่น`}
              onClick={(e) => {
                e.stopPropagation();
                onRequestMove(it.id, it.titleTh);
              }}
              onDragStart={(e) => e.preventDefault()}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[14px] text-slate-400 ring-1 ring-slate-200"
            >
              ⇄
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Move an item or a whole day without dragging.
 *
 * The calendar advertised drag-and-drop as its headline feature while
 * implementing it with HTML5 dragstart/drop, which never fires on touch — so on
 * the phones most of these learners use, the feature simply did not exist.
 */
function MoveSheet({
  target,
  days,
  todayIso,
  onClose,
  onPick,
}: {
  target: { date: string; itemId?: string; titleTh: string };
  days: BlockDay[];
  todayIso: string;
  onClose: () => void;
  onPick: (toDate: string) => void;
}) {
  const options = useMemo(
    () =>
      days
        .filter((d) => d.date >= todayIso && d.date !== target.date)
        .slice(0, 21),
    [days, todayIso, target.date],
  );

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[13px] font-semibold uppercase tracking-widest text-slate-400">
          ย้ายไปวันไหน
        </p>
        <h2 className="mt-1 truncate text-[17px] font-bold text-slate-900">{target.titleTh}</h2>
        <p className="mt-0.5 text-[13px] text-slate-500">
          ตอนนี้อยู่วันที่ {thaiDate(target.date)}
        </p>

        <ul className="mt-4 space-y-1.5">
          {options.map((d) => (
            <li key={d.date}>
              <button
                type="button"
                onClick={() => onPick(d.date)}
                className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3.5 text-left ring-1 ring-slate-200 transition hover:ring-slate-400"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-slate-800">
                    {WEEKDAY_FULL_TH[d.weekday]} · {thaiDate(d.date)}
                    {d.date === todayIso && (
                      <span className="ml-2 rounded-full bg-[#004AAD] px-2 py-0.5 text-[12px] font-bold text-white">
                        วันนี้
                      </span>
                    )}
                  </span>
                  <span className="block text-[13px] text-slate-500">
                    {d.items.length === 0
                      ? "ว่าง — วันพัก"
                      : `มีอยู่แล้ว ${d.items.length} รายการ · ${d.totalMinutes} นาที`}
                  </span>
                </span>
                <span className="shrink-0 text-[15px] text-slate-300">→</span>
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-full bg-slate-100 py-3.5 text-[15px] font-semibold text-slate-600"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="ep-stagger-in rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-[17px] font-bold leading-tight text-slate-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>}
      <div className={subtitle ? "mt-3" : "mt-2"}>{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      {children}
    </div>
  );
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2.5 text-[14px] font-semibold transition ${
        on ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-200">
      <p className="text-xl font-extrabold text-slate-800">{n}</p>
      <p className="text-[13px] text-slate-500">{label}</p>
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
  const totalMinutes = blocks.reduce((s, b) => s + b.items.reduce((n, i) => n + i.minutes, 0), 0);

  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <p className="text-[14px] text-slate-600">
        เริ่มจากพื้นฐาน แล้วไล่ทีละทักษะ — รวม{" "}
        <strong className="text-slate-800">{blocks.length} บท</strong> ·{" "}
        <strong className="text-slate-800">{Math.round(totalMinutes / 60)} ชั่วโมง</strong>
      </p>

      <ol className="mt-3 space-y-1.5">
        {shown.map((b, i) => (
          <li key={b.key} className="flex items-center gap-2.5">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white text-[13px] font-bold text-slate-500 ring-1 ring-slate-200">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-slate-700">
              {b.titleTh}
            </span>
            <span className="shrink-0 text-[13px] text-slate-500">
              {b.items.reduce((n, it) => n + it.minutes, 0)} นาที
            </span>
          </li>
        ))}
      </ol>

      {blocks.length > 3 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 text-[14px] font-bold text-[#004AAD]"
        >
          {showAll ? "ย่อรายการ" : `ดูทั้งหมด (อีก ${blocks.length - 3} บท)`}
        </button>
      )}
    </div>
  );
}
