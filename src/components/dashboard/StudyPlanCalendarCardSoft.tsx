"use client";

/**
 * Admin/preview rewrite of the study-plan calendar — Duolingo-style month grid + inline
 * per-day detail panel, wired to the real per-skill-group progress endpoints
 * (/api/study-plan/daily, /api/study-plan/daily/range, /api/study-plan/skill-trends).
 *
 * This is the fix for the "any single exercise turns the whole day green" bug: a day only
 * shows as done (teal) when EVERY skill group in that day's fixed plan is complete. Partial
 * days show their honest fraction (amber). See public/calendar-duolingo-preview.html for the
 * founder-approved visual reference this file ports into real Tailwind v4 tokens.
 *
 * Rendered by StudyPlanCalendarCard.tsx for all users (promoted from an isAdmin ||
 * previewEligible preview) — the old horizontal-strip calendar is kept in that file,
 * unreachable, for quick rollback.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CelebrateMascot } from "@/components/ui/CelebrateMascot";
import { sfxCelebrate, sfxTap, sfxTransition } from "@/lib/exam-sfx";
import { LESSON_TOPICS, lessonTopicHref } from "@/lib/lessons/topics";
import { setActiveDailyQueue } from "@/lib/daily-queue-session";
import {
  buildRandomLessonQueue,
  lessonPlanForDuration,
  lessonPlanTotalRounds,
  type LessonDuration,
} from "@/lib/lessons/random-lesson-queue";
import {
  buildDailyPlanItems,
  DAILY_SKILL_META,
  planTotalCount,
  type DailyPlanItem,
  type DailyPlanSkill,
  type DailyTier,
  type DailyTrack,
} from "@/lib/study-plan/daily-plan";
import type { DayProgress, SkillTrend } from "@/lib/study-plan/daily-progress";
import { generateCalendar, type CalendarDay } from "@/lib/study-plan/schedule";
import {
  fetchPracticeMinutes,
  TIMED_SKILL_META,
  type PracticeMinutesRow,
} from "@/lib/practice-timed-random";

type ScheduleInfo = {
  exam_date: string;
  cadence_days: number;
  default_duration_minutes: 5 | 10 | 20 | 30;
  is_freeform: boolean;
};

type WeakSkillEntry = { taskType: string; difficulty: string; avgScorePct: number };
type WeakestDimension = { dimension: string; avgScorePercent: number } | null;
type TopImprovement = {
  taskLabel: string;
  difficultyLabel: string;
  deltaPoints: number;
  beforeAvgScorePct: number;
  afterAvgScorePct: number;
  message: string;
} | null;

type RangeDaySummary = {
  date: string;
  persisted: boolean;
  track: DailyTrack;
  tier: DailyTier;
  items: DailyPlanItem[];
  total: number;
  totalDone: number;
  complete: boolean;
};

type DailyDetailResponse = {
  plan: { date: string; track: DailyTrack; tier: DailyTier; items: DailyPlanItem[]; total: number; persisted: boolean };
  progress: DayProgress;
};

const DURATION_OPTIONS: DailyTier[] = [5, 10, 20, 30];
const TRACK_OPTIONS: { value: DailyTrack; th: string }[] = [
  { value: "exam", th: "ข้อสอบจริง" },
  { value: "lesson", th: "บทเรียน" },
];
const WEEKDAY_LABELS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function toUtcDay(iso: string): number {
  return Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);
}
function fromUtcDay(day: number): string {
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}
/**
 * "Today" as a Bangkok (+07:00, no DST) calendar date — NOT the UTC date. The backend
 * (computeDayProgress, the /range route) buckets every day on this same Bangkok offset, so
 * using the raw UTC date here would show YESTERDAY as "today" for ~7 hours every night
 * (UTC 17:00–23:59 = Bangkok 00:00–06:59), loading the wrong day's plan and looking stuck
 * at 0% progress even though the learner's attempts are logged correctly.
 */
function todayIso(): string {
  return new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
}

type GridCell = { date: string; inMonth: boolean };

function buildMonthGrid(year: number, month: number): GridCell[] {
  const firstIso = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const firstDay = toUtcDay(firstIso);
  const firstDow = new Date(`${firstIso}T00:00:00Z`).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: GridCell[] = [];
  for (let i = 0; i < firstDow; i++) cells.push({ date: fromUtcDay(firstDay - firstDow + i), inMonth: false });
  for (let d = 0; d < daysInMonth; d++) cells.push({ date: fromUtcDay(firstDay + d), inMonth: true });
  while (cells.length % 7 !== 0) cells.push({ date: fromUtcDay(firstDay + cells.length - firstDow), inMonth: false });
  return cells;
}

type DayKind = "complete" | "partial" | "mock" | "upcoming" | "plain";

function classifyDay(
  cellDate: string,
  today: string,
  rangeInfo: RangeDaySummary | undefined,
  schedInfo: CalendarDay | undefined,
): DayKind {
  if (rangeInfo?.complete) return "complete";
  if (rangeInfo && rangeInfo.totalDone > 0) return "partial";
  if (schedInfo?.isMockTestDay) return "mock";
  if (schedInfo?.isStudyDay && cellDate > today) return "upcoming";
  return "plain";
}

function dayHeaderLabel(date: string, today: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const wd = d.toLocaleDateString("th-TH", { weekday: "short", timeZone: "UTC" });
  const md = d.toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "UTC" });
  return date === today ? `วันนี้ · ${wd} ${md}` : `${wd} ${md}`;
}

function LegendItem({ swatch, icon, label }: { swatch: string; icon?: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-md border-2 text-[8px] ${swatch}`}>
        {icon}
      </span>
      {label}
    </div>
  );
}

export function StudyPlanCalendarCardSoft({
  schedule,
  streak,
  weakSkills,
  weakestDimension,
  topImprovement,
  onEditPlan,
}: {
  schedule: ScheduleInfo;
  streak: number;
  weakSkills: WeakSkillEntry[];
  weakestDimension: WeakestDimension;
  topImprovement: TopImprovement;
  onEditPlan: () => void;
}) {
  const router = useRouter();
  const today = todayIso();
  const todayD = new Date(`${today}T00:00:00Z`);

  const [viewYear, setViewYear] = useState(todayD.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(todayD.getUTCMonth());
  const [selectedDate, setSelectedDate] = useState(today);

  const [rangeDays, setRangeDays] = useState<RangeDaySummary[]>([]);
  const [rangeLoading, setRangeLoading] = useState(true);

  const [dayDetail, setDayDetail] = useState<DailyDetailResponse | null>(null);
  const [dayLoading, setDayLoading] = useState(true);
  const [savingDayPlan, setSavingDayPlan] = useState(false);
  const [dayPlanError, setDayPlanError] = useState<string | null>(null);

  const [trends, setTrends] = useState<SkillTrend[]>([]);
  const [lessonsOpen, setLessonsOpen] = useState(false);

  const firedCompletionRef = useRef<Set<string>>(new Set());
  const lastKnownCompleteRef = useRef<Map<string, boolean>>(new Map());

  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const gridStart = grid[0].date;
  const gridEnd = grid[grid.length - 1].date;

  const scheduleCalendar = useMemo(() => {
    if (toUtcDay(gridStart) > toUtcDay(schedule.exam_date)) return [];
    return generateCalendar({
      startDate: gridStart,
      examDate: schedule.exam_date,
      cadenceDays: schedule.cadence_days,
      defaultDurationMinutes: schedule.default_duration_minutes,
      isFreeform: schedule.is_freeform,
    });
  }, [gridStart, schedule]);
  const scheduleByDate = useMemo(() => new Map(scheduleCalendar.map((d) => [d.date, d])), [scheduleCalendar]);

  const loadRange = useCallback(async () => {
    setRangeLoading(true);
    try {
      const res = await fetch(`/api/study-plan/daily/range?start=${gridStart}&end=${gridEnd}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (res.ok) {
        const json = (await res.json()) as { days: RangeDaySummary[] };
        setRangeDays(json.days);
      }
    } finally {
      setRangeLoading(false);
    }
  }, [gridStart, gridEnd]);

  useEffect(() => {
    void loadRange();
  }, [loadRange]);

  const rangeByDate = useMemo(() => new Map(rangeDays.map((d) => [d.date, d])), [rangeDays]);

  // Freeform "🎲 timed random practice" minutes (037_practice_minutes.sql), so an
  // off-plan study day still shows the honest "you practised XX minutes" note.
  const [freeformMinutes, setFreeformMinutes] = useState<PracticeMinutesRow[]>([]);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const rows = await fetchPracticeMinutes(gridStart);
      if (alive) setFreeformMinutes(rows);
    })();
    return () => {
      alive = false;
    };
  }, [gridStart]);

  const freeformByDate = useMemo(() => {
    const m = new Map<string, { minutes: number; sets: number; words: number; skills: Set<string> }>();
    for (const r of freeformMinutes) {
      const e = m.get(r.practice_date) ?? { minutes: 0, sets: 0, words: 0, skills: new Set<string>() };
      e.minutes += r.minutes;
      e.sets += r.sets_done;
      e.words += r.words_learned;
      e.skills.add(r.skill);
      m.set(r.practice_date, e);
    }
    return m;
  }, [freeformMinutes]);

  const loadDayDetail = useCallback(async (date: string) => {
    setDayLoading(true);
    setDayPlanError(null);
    try {
      const res = await fetch(`/api/study-plan/daily?date=${date}`, { credentials: "same-origin", cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as DailyDetailResponse;
        setDayDetail(json);
        const wasComplete = lastKnownCompleteRef.current.get(date);
        if (json.progress.complete && wasComplete === false) sfxCelebrate("md");
        lastKnownCompleteRef.current.set(date, json.progress.complete);
        // Best-effort mirror into the legacy completions table so the old (non-admin)
        // calendar UI a free/non-preview user might still see stays correct. Never blocks
        // or surfaces errors — this endpoint is just a compatibility side-channel.
        if (json.progress.complete && !firedCompletionRef.current.has(date)) {
          firedCompletionRef.current.add(date);
          void fetch("/api/study-plan/completions", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completionDate: date, tierCompleted: json.plan.tier, sessionRef: `daily:${date}` }),
          }).catch(() => {});
        }
      }
    } finally {
      setDayLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDayDetail(selectedDate);
  }, [selectedDate, loadDayDetail]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/study-plan/skill-trends", { credentials: "same-origin", cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as { trends: SkillTrend[] };
        setTrends(json.trends);
      }
    })();
  }, []);

  function goPrevMonth() {
    sfxTap();
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }
  function goNextMonth() {
    sfxTap();
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function selectDay(date: string) {
    if (date === selectedDate) return;
    sfxTap();
    const [y, m] = date.split("-").map(Number);
    if (y !== viewYear || m - 1 !== viewMonth) {
      setViewYear(y);
      setViewMonth(m - 1);
    }
    setSelectedDate(date);
  }

  async function updateDayPlan(track: DailyTrack, durationMinutes: DailyTier) {
    sfxTransition();
    setSavingDayPlan(true);
    setDayPlanError(null);

    // Optimistically switch the view right away. Plan items are deterministic from tier+track
    // (buildDailyPlanItems), and progress is always re-derived server-side from the day's real
    // practice_attempts — so changing track/duration mid-day never deletes logged work, it just
    // re-buckets it against the new plan. We carry the learner's existing per-skill `done` counts
    // over to the new plan (clamped to each new required count) so the panel doesn't flash to 0%
    // before the authoritative server progress arrives.
    const optimisticItems = buildDailyPlanItems(durationMinutes, track);
    const prevDoneBySkill = new Map(
      (dayDetail?.progress.groups ?? []).map((g) => [g.skill, g.done]),
    );
    const optimisticGroups = optimisticItems.map((it) => {
      const done = Math.min(it.count, prevDoneBySkill.get(it.skill) ?? 0);
      return { skill: it.skill, count: it.count, done, complete: done >= it.count };
    });
    const optimisticTotal = planTotalCount(optimisticItems);
    const optimisticDone = optimisticGroups.reduce((s, g) => s + g.done, 0);
    const optimisticProgress: DayProgress = {
      groups: optimisticGroups,
      total: optimisticTotal,
      totalDone: optimisticDone,
      complete: optimisticTotal > 0 && optimisticGroups.every((g) => g.complete),
    };
    setDayDetail({
      plan: {
        date: selectedDate,
        track,
        tier: durationMinutes,
        items: optimisticItems,
        total: optimisticProgress.total,
        persisted: false,
      },
      progress: optimisticProgress,
    });

    try {
      const res = await fetch("/api/study-plan/daily", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, track, durationMinutes }),
      });
      if (res.ok) {
        const json = (await res.json()) as DailyDetailResponse;
        setDayDetail(json);
        setRangeDays((prev) =>
          prev.map((d) =>
            d.date === selectedDate
              ? {
                  ...d,
                  persisted: true,
                  track,
                  tier: durationMinutes,
                  items: json.plan.items,
                  total: json.plan.total,
                  totalDone: json.progress.totalDone,
                  complete: json.progress.complete,
                }
              : d,
          ),
        );
      } else {
        // The view already switched (optimistic), so this is not a hard failure — only the
        // *pinning* of the choice failed (e.g. the backing table not yet deployed), meaning it
        // won't be remembered after a reload. Say exactly that instead of a scary "failed".
        setDayPlanError("เลือกได้เลย แต่ตอนนี้ยังจำค่าไว้ข้ามรอบไม่ได้");
      }
    } catch {
      setDayPlanError("เลือกได้เลย แต่ยังบันทึกค่าไว้ไม่ได้ — เช็คการเชื่อมต่ออินเทอร์เน็ต");
    } finally {
      setSavingDayPlan(false);
    }
  }

  const monthLabel = new Date(Date.UTC(viewYear, viewMonth, 1)).toLocaleDateString("th-TH-u-ca-gregory", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const daysUntilExam = Math.max(0, Math.round((Date.parse(schedule.exam_date) - Date.parse(today)) / 86_400_000));

  const pct =
    dayDetail && dayDetail.progress.total > 0
      ? Math.round((dayDetail.progress.totalDone / dayDetail.progress.total) * 100)
      : 0;
  const visibleTrends = trends.filter((t) => t.attempts > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-ep-blue">Study plan</p>
          <h2 className="mt-0.5 font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
            ปฏิทินการเรียนของฉัน
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ep-yellow/90 px-3 py-1.5 shadow-sm">
              <span>🔥</span>
              <span className="font-display text-xs font-extrabold text-slate-900">
                ซ้อมต่อเนื่อง <span className="font-mono">{streak}</span> วัน
              </span>
            </span>
            {schedule.is_freeform ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5">
                <span>🌱</span>
                <span className="text-xs font-bold text-slate-600">โหมดฝึกอิสระ</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5">
                <span className="font-mono text-xs font-extrabold text-ep-blue">{daysUntilExam}</span>
                <span className="text-xs font-bold text-slate-600">วันก่อนสอบ</span>
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onEditPlan}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ep-blue px-4 py-2 font-display text-xs font-extrabold text-white shadow-sm transition hover:shadow-md active:scale-[0.97] sm:text-sm"
        >
          <span>⚙️</span> แก้ไขแผน
        </button>
      </div>

      {topImprovement && (
        <div className="rounded-2xl bg-ep-green/5 p-4 ring-1 ring-ep-green/20">
          <CelebrateMascot
            title={`${topImprovement.taskLabel} (ระดับ${topImprovement.difficultyLabel}) ดีขึ้น +${topImprovement.deltaPoints} แต้ม!`}
            subtitle={`${topImprovement.beforeAvgScorePct}% → ${topImprovement.afterAvgScorePct}% · ${topImprovement.message}`}
          />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr] lg:items-start">
        {/* ============ CALENDAR ============ */}
        <section className="rounded-3xl bg-white p-4 ring-1 ring-slate-200 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={goPrevMonth}
              className="grid h-9 w-9 place-items-center rounded-xl bg-ep-blue/5 font-bold text-ep-blue transition hover:bg-ep-blue/10"
            >
              ‹
            </button>
            <h3 className="font-display text-lg font-extrabold text-slate-900 sm:text-xl">{monthLabel}</h3>
            <button
              type="button"
              onClick={goNextMonth}
              className="grid h-9 w-9 place-items-center rounded-xl bg-ep-blue/5 font-bold text-ep-blue transition hover:bg-ep-blue/10"
            >
              ›
            </button>
          </div>

          <div className="mb-1.5 grid grid-cols-7 gap-1 sm:gap-2">
            {WEEKDAY_LABELS_TH.map((w) => (
              <div key={w} className="py-1 text-center text-[10px] font-bold text-slate-400 sm:text-[11px]">
                {w}
              </div>
            ))}
          </div>

          <div className={`grid grid-cols-7 gap-1 transition-opacity sm:gap-2 ${rangeLoading ? "opacity-70" : ""}`}>
            {grid.map((cell) => {
              const rangeInfo = rangeByDate.get(cell.date);
              const schedInfo = scheduleByDate.get(cell.date);
              const kind = classifyDay(cell.date, today, rangeInfo, schedInfo);
              const isToday = cell.date === today;
              const isSelected = cell.date === selectedDate;
              const dayNum = Number(cell.date.slice(8, 10));

              let container = "bg-slate-50 border-slate-100";
              let numClass = "text-slate-400";
              if (kind === "complete") {
                container = "bg-ep-green/10 border-ep-green/40";
                numClass = "font-bold text-ep-green-dark";
              } else if (kind === "partial") {
                container = "bg-amber-50 border-amber-300";
                numClass = "font-bold text-amber-700";
              } else if (kind === "mock") {
                container = "bg-amber-100/70 border-amber-300";
                numClass = "font-bold text-amber-700";
              } else if (kind === "upcoming") {
                container = "bg-ep-soft/60 border-ep-soft";
                numClass = "font-semibold text-ep-blue/70";
              }
              if (!cell.inMonth) numClass = "text-slate-300";
              if (isToday) {
                container = "bg-ep-yellow/25 border-ep-yellow border-[3px]";
                numClass = "font-extrabold text-slate-900";
              }

              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => selectDay(cell.date)}
                  className={`relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl border-2 transition hover:brightness-95 sm:rounded-2xl ${container} ${
                    !cell.inMonth ? "opacity-50" : ""
                  } ${isSelected && !isToday ? "ring-2 ring-ep-blue" : ""}`}
                >
                  {isToday && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ep-yellow px-1.5 font-display text-[8px] font-extrabold text-slate-900 sm:text-[9px]">
                      วันนี้
                    </span>
                  )}
                  {/* Number + status badge stack in normal flex flow (not absolute-over-centered)
                      so a 2-digit day + a badge (fraction/emoji) never render on top of each other. */}
                  <span className={`font-mono text-[11px] leading-none sm:text-sm ${numClass}`}>{dayNum}</span>
                  {kind === "complete" && (
                    <span className="text-[9px] leading-none text-ep-green sm:text-[11px]">✓</span>
                  )}
                  {kind === "partial" && rangeInfo && (
                    <span className="font-mono text-[7px] font-bold leading-none text-amber-600 sm:text-[8px]">
                      {rangeInfo.totalDone}/{rangeInfo.total}
                    </span>
                  )}
                  {kind === "mock" && <span className="text-[8px] leading-none sm:text-[10px]">📝</span>}
                  {kind === "upcoming" && <span className="h-1.5 w-1.5 rounded-full bg-ep-blue/50" />}
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-slate-100 pt-4 text-[11px] text-slate-600 sm:grid-cols-3">
            <LegendItem swatch="bg-ep-green/15 border-ep-green/50 text-ep-green" icon="✓" label="ครบแล้ว" />
            <LegendItem swatch="bg-amber-50 border-amber-300" label="ทำค้างไว้" />
            <LegendItem swatch="bg-ep-yellow/25 border-ep-yellow" label="วันนี้" />
            <LegendItem swatch="bg-ep-soft border-ep-soft" label="วันฝึกที่จะถึง" />
            <LegendItem swatch="bg-amber-100 border-amber-300" icon="📝" label="วัน Mock" />
          </div>
        </section>

        {/* ============ SELECTED-DAY DETAIL ============ */}
        <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200 sm:p-7">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="font-display text-lg font-extrabold text-slate-900 sm:text-xl">
              {dayHeaderLabel(selectedDate, today)}
            </p>
            {dayDetail && (
              <span className="whitespace-nowrap rounded-full bg-ep-soft px-3 py-1 text-[11px] font-bold text-ep-blue">
                {dayDetail.plan.tier} นาที
              </span>
            )}
          </div>

          {(() => {
            const ff = freeformByDate.get(selectedDate);
            if (!ff || ff.minutes <= 0) return null;
            const skillLabels = Array.from(ff.skills)
              .map((s) => TIMED_SKILL_META[s as keyof typeof TIMED_SKILL_META]?.th ?? s)
              .join(" · ");
            return (
              <div className="mt-2 flex items-start gap-2 rounded-2xl bg-indigo-50 px-3.5 py-2.5 text-xs font-semibold text-indigo-800 ring-1 ring-indigo-100">
                <span className="text-sm">🎲</span>
                <span>
                  วันนี้ฝึกอิสระ <strong>{ff.minutes} นาที</strong>
                  {skillLabels ? ` · ${skillLabels}` : ""}
                  {ff.words > 0 ? ` · เก็บคำใหม่ ${ff.words} คำ` : ""}
                </span>
              </div>
            );
          })()}

          {dayLoading && !dayDetail ? (
            <p className="py-10 text-center text-sm text-slate-400">กำลังโหลด…</p>
          ) : dayDetail ? (
            <>
              {/* Always-editable day plan — the learner can switch track / duration on the go for
                  ANY date. Progress is re-derived server-side from real attempts, so changing this
                  never discards completed work; it just re-buckets it against the new plan. */}
              <div className="mt-4 space-y-3 rounded-2xl bg-slate-50/70 p-3.5 ring-1 ring-slate-100 sm:p-4">
                <div>
                  <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    วันนี้อยากทำอะไร
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {TRACK_OPTIONS.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        disabled={savingDayPlan}
                        onClick={() => void updateDayPlan(t.value, dayDetail.plan.tier)}
                        className={`rounded-full px-3.5 py-2 text-xs font-bold transition-colors disabled:opacity-50 ${
                          dayDetail.plan.track === t.value
                            ? "bg-ep-blue text-white shadow-sm"
                            : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {t.value === "exam" ? "🎯 " : "📘 "}
                        {t.th}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">มีเวลากี่นาที</p>
                  <div className="flex flex-wrap gap-1.5">
                    {DURATION_OPTIONS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        disabled={savingDayPlan}
                        onClick={() => void updateDayPlan(dayDetail.plan.track, m)}
                        className={`rounded-full px-3.5 py-2 text-xs font-bold transition-colors disabled:opacity-50 ${
                          dayDetail.plan.tier === m
                            ? "bg-ep-blue text-white shadow-sm"
                            : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {m} นาที
                      </button>
                    ))}
                  </div>
                </div>
                {dayDetail.progress.totalDone > 0 && (
                  <p className="text-[11px] font-semibold text-slate-500">
                    ✅ เปลี่ยนได้ทุกเมื่อ — งานที่ทำไปแล้ววันนี้ยังถูกนับอยู่
                  </p>
                )}
                {savingDayPlan && <p className="text-[11px] font-semibold text-ep-blue">กำลังอัปเดตแผน…</p>}
                {dayPlanError && <p className="text-xs font-bold text-rose-500">⚠️ {dayPlanError}</p>}
              </div>

              {dayDetail.plan.track === "lesson" ? (
                (() => {
                  const lessonTier = dayDetail.plan.tier as LessonDuration;
                  const plan = lessonPlanForDuration(lessonTier);
                  const totalRounds = lessonPlanTotalRounds(lessonTier);
                  const startLessonRun = () => {
                    const queue = buildRandomLessonQueue("easy", lessonTier);
                    if (queue.length === 0) return;
                    sfxTransition();
                    setActiveDailyQueue({
                      hrefs: queue.map((q) => q.href),
                      index: 0,
                      tierMinutes: lessonTier,
                      dateIso: selectedDate,
                    });
                    router.push(queue[0].href);
                  };
                  return (
                    <div className="mt-5">
                      <p className="mt-4 text-sm leading-relaxed text-slate-700 sm:text-[15px]">
                        ชุดบทเรียนวันนี้{" "}
                        <span className="font-mono font-extrabold text-ep-blue">{totalRounds}</span> รอบ ·{" "}
                        {lessonTier} นาที
                      </p>

                      <button
                        type="button"
                        onClick={startLessonRun}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-ep-yellow px-6 py-4 font-display text-base font-extrabold text-slate-900 shadow-md transition hover:shadow-lg active:scale-[0.98] sm:text-lg"
                      >
                        ▶ ทำทั้งหมด (สุ่มบทเรียน)
                      </button>

                      <p className="mt-4 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        หรือเลือกทำทีละหมวด
                      </p>
                      <div className="space-y-2.5">
                        {plan.map((g) => (
                          <Link
                            key={g.slug}
                            href={g.href}
                            onClick={() => sfxTransition()}
                            className="flex items-center gap-3 rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-ep-blue/40 hover:bg-white active:scale-[0.99]"
                          >
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl">
                              {g.emoji}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-display text-sm font-bold leading-tight text-slate-900 sm:text-base">
                                {g.th} <span className="font-mono text-xs text-slate-400">×{g.rounds}</span>
                              </p>
                            </div>
                            <span className="shrink-0 text-lg text-slate-300">→</span>
                          </Link>
                        ))}
                      </div>
                      <p className="mt-3 text-[11px] text-slate-400">
                        เวลามากขึ้น = บทเรียนมากขึ้น (อ้างอิงลำดับจากแอปมือถือ) · เนื้อหาซิงก์กับแอปมือถือ
                      </p>
                    </div>
                  );
                })()
              ) : (
                <>
                  <p className="mt-4 text-sm leading-relaxed text-slate-700 sm:text-[15px]">
                    ทำไปแล้ว{" "}
                    <span className="font-mono font-extrabold text-ep-blue">
                      {dayDetail.progress.totalDone}/{dayDetail.progress.total}
                    </span>{" "}
                    ข้อ
                  </p>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-ep-blue transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-right font-mono text-[11px] font-bold text-ep-blue">{pct}%</p>

                  <Link
                    href={`/practice/daily/run?date=${selectedDate}`}
                    onClick={() => sfxTransition()}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-ep-yellow px-6 py-4 font-display text-base font-extrabold text-slate-900 shadow-md transition hover:shadow-lg active:scale-[0.98] sm:text-lg"
                  >
                    {dayDetail.progress.complete ? "▶ ทบทวนทั้งหมดเลย" : "▶ ทำทั้งหมดเลย"}
                  </Link>

                  <p className="mt-4 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    หรือเลือกทำทีละหมวด
                  </p>
                  <div className="space-y-2.5">
                    {dayDetail.progress.groups.map((g) => {
                      const meta = DAILY_SKILL_META[g.skill as DailyPlanSkill];
                      const status = g.complete ? "complete" : g.done > 0 ? "partial" : "none";
                      return (
                        <div
                          key={g.skill}
                          className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 ${
                            status === "complete"
                              ? "border-ep-green/30 bg-ep-green/5"
                              : status === "partial"
                                ? "border-amber-300 bg-amber-50"
                                : "border-slate-100 bg-slate-50"
                          }`}
                        >
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${
                              status === "complete" ? "bg-ep-green/15" : status === "partial" ? "bg-amber-100" : "bg-white"
                            }`}
                          >
                            {meta.emoji}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-display text-sm font-bold leading-tight text-slate-900 sm:text-base">
                              {meta.th} <span className="font-mono text-xs text-slate-400">×{g.count}</span>
                            </p>
                            <p
                              className={`mt-0.5 text-[12px] font-bold ${
                                status === "complete"
                                  ? "text-ep-green-dark"
                                  : status === "partial"
                                    ? "text-amber-700"
                                    : "text-slate-400"
                              }`}
                            >
                              {status === "complete" ? "✓ เสร็จแล้ว" : status === "partial" ? `◐ ${g.done}/${g.count} ทำต่อ` : "ยังไม่ทำ"}
                            </p>
                          </div>
                          <Link
                            href={`/practice/daily/run?date=${selectedDate}&skill=${g.skill}`}
                            onClick={() => sfxTransition()}
                            className={`shrink-0 rounded-xl px-3.5 py-2.5 font-display text-xs font-bold sm:text-sm ${
                              status === "complete"
                                ? "border-2 border-ep-soft bg-white text-ep-blue"
                                : "bg-ep-blue text-white"
                            }`}
                          >
                            {status === "complete" ? "ทบทวน" : status === "partial" ? "ทำต่อ →" : "เริ่ม"}
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          ) : null}
        </section>
      </div>

      {/* ============ SKILL-IMPROVEMENT PANEL ============ */}
      {visibleTrends.length > 0 && (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
            ความก้าวหน้าของแต่ละทักษะ
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {visibleTrends.map((t) => (
              <div key={t.skill} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                <span className="text-xl">{t.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-700">{t.th}</p>
                  {t.recentAvgPct != null && (
                    <p className="font-mono text-[11px] text-slate-500">เฉลี่ยล่าสุด {t.recentAvgPct}%</p>
                  )}
                </div>
                {t.improved && t.deltaPoints != null && (
                  <span className="shrink-0 rounded-full bg-ep-green/10 px-2 py-1 text-[10px] font-bold text-ep-green-dark">
                    🎉 ดีขึ้น +{t.deltaPoints}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {(weakSkills.length > 0 || weakestDimension) && (
        <div className="rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-100">
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-rose-400">จุดที่ควรกลับมาทบทวน</p>
          <ul className="space-y-1 text-xs font-semibold text-rose-800">
            {weakSkills.map((s) => (
              <li key={`${s.taskType}:${s.difficulty}`}>
                ⚠️ {s.taskType} ระดับ {s.difficulty} — เฉลี่ย {s.avgScorePct}%
              </li>
            ))}
            {weakestDimension && (
              <li>
                ⚠️ งานเขียน/พูด: {weakestDimension.dimension} เฉลี่ย {weakestDimension.avgScorePercent}%
              </li>
            )}
          </ul>
        </div>
      )}

      {/* ============ LESSONS FOR LOW-BASELINE LEARNERS (collapsible) ============ */}
      <div className="rounded-2xl bg-white ring-1 ring-slate-200">
        <button
          type="button"
          onClick={() => {
            sfxTap();
            setLessonsOpen((v) => !v);
          }}
          aria-expanded={lessonsOpen}
          className="flex w-full items-center gap-3 px-4 py-4 text-left sm:px-5"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ep-blue/5 text-xl">📘</span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-sm font-extrabold text-slate-900 sm:text-base">
              บทเรียนสำหรับคนพื้นฐานน้อย
            </span>
            <span className="mt-0.5 block text-[12px] text-slate-500">
              เนื้อหา + ความคืบหน้าซิงก์กับแอปมือถือ · แตะเพื่อดูบทเรียน
            </span>
          </span>
          <span
            className={`shrink-0 text-lg text-slate-400 transition-transform duration-200 ${
              lessonsOpen ? "rotate-180" : ""
            }`}
          >
            ⌄
          </span>
        </button>
        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            lessonsOpen ? "max-h-[720px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="space-y-2 px-4 pb-4 sm:px-5">
            {LESSON_TOPICS.map((t) => (
              <Link
                key={t.slug}
                href={lessonTopicHref(t.slug)}
                onClick={() => sfxTransition()}
                className="flex items-center gap-3 rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-ep-blue/40 hover:bg-white active:scale-[0.99]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl">
                  {t.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-bold leading-tight text-slate-900 sm:text-base">
                    {t.th}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-slate-500">{t.descTh}</p>
                </div>
                <span className="shrink-0 text-lg text-slate-300">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
