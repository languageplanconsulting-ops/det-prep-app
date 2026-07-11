"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Tier } from "@/lib/access-control";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { setActiveDailyQueue } from "@/lib/daily-queue-session";
import { buildRandomQueue, defaultDifficultyFor } from "@/lib/practice-queue-builder";
import {
  bumpTierForCatchUp, computeMissedRecent, computeStreak, generateCalendar,
  type CalendarDay,
} from "@/lib/study-plan/schedule";
import { EXAM_DATE_CHANGE_EVENT } from "@/hooks/usePracticeHeroStats";
import { CelebrateMascot } from "@/components/ui/CelebrateMascot";
import { StudyPlanCalendarCardSoft } from "@/components/dashboard/StudyPlanCalendarCardSoft";

type ScheduleRow = {
  exam_date: string;
  cadence_days: number;
  default_duration_minutes: 5 | 10 | 20 | 30;
  reminder_time: string;
  is_freeform: boolean;
};

type WeaknessReport = {
  autoGraded: { taskType: string; difficulty: string; attempts: number; avgScorePct: number; isWeak: boolean }[];
  weakestDimension: { dimension: string; avgScorePercent: number } | null;
  latestPrediction: { target: number; predicted: number } | null;
};

type DayActivity = { date: string; attempts: number; avgScorePct: number; vocabSaved: number };

type ImprovementCohort = {
  taskType: string;
  taskLabel: string;
  difficulty: string;
  difficultyLabel: string;
  attempts: number;
  beforeAvgScorePct: number;
  afterAvgScorePct: number;
  deltaPoints: number;
  message: string;
};
type ImprovementReport = { cohorts: ImprovementCohort[] };

const EXAM_PRESETS = [
  { label: "1 เดือน", days: 30 },
  { label: "2 เดือน", days: 60 },
  { label: "3 เดือน", days: 90 },
  { label: "6 เดือน", days: 180 },
];
const CADENCE_OPTIONS = [
  { days: 1, th: "ทุกวัน" },
  { days: 2, th: "ทุก 2 วัน" },
  { days: 3, th: "ทุก 3 วัน" },
];
const DURATION_OPTIONS: (5 | 10 | 20 | 30)[] = [5, 10, 20, 30];
const FREEFORM_PLACEHOLDER_DAYS = 365 * 3;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function dayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** Soft pill button used throughout the setup form — active = filled blue, idle = white/70. */
function PillOption({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-2 text-xs font-bold transition-colors duration-200 ${
        active ? "bg-[#004AAD] text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function CardShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      className={`rounded-2xl bg-white p-5 ring-1 ring-slate-200 transition-all duration-500 ease-out ${
        mounted ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      {children}
    </div>
  );
}

export function StudyPlanCalendarCard({ effectiveTier }: { effectiveTier: Tier }) {
  const router = useRouter();
  const { isAdmin, previewEligible } = useEffectiveTier();
  const soft = isAdmin || previewEligible;
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<ScheduleRow | null>(null);
  const [completions, setCompletions] = useState<{ completion_date: string }[]>([]);
  const [activity, setActivity] = useState<DayActivity[]>([]);
  const [weakness, setWeakness] = useState<WeaknessReport | null>(null);
  const [improvement, setImprovement] = useState<ImprovementReport | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [examDate, setExamDate] = useState<string | null>(null);
  const [cadenceDays, setCadenceDays] = useState(1);
  const [duration, setDuration] = useState<5 | 10 | 20 | 30>(10);
  const [isFreeformDraft, setIsFreeformDraft] = useState(false);

  const [pickingStart, setPickingStart] = useState(false);
  const [startDuration, setStartDuration] = useState<5 | 10 | 20 | 30>(10);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/study-plan/schedule", { credentials: "same-origin", cache: "no-store" });
    if (!res.ok) { setLoading(false); return; }
    const json = (await res.json()) as { schedule: ScheduleRow | null };
    setSchedule(json.schedule);
    if (json.schedule) {
      const since = addDaysIso(todayIso(), -14);
      const [compRes, weakRes, improvementRes] = await Promise.all([
        fetch(`/api/study-plan/completions?since=${since}`, { credentials: "same-origin", cache: "no-store" }),
        fetch("/api/study-plan/weakness", { credentials: "same-origin", cache: "no-store" }),
        fetch("/api/study-plan/improvement", { credentials: "same-origin", cache: "no-store" }),
      ]);
      if (compRes.ok) {
        const compJson = (await compRes.json()) as { completions: { completion_date: string }[]; activity: DayActivity[] };
        setCompletions(compJson.completions);
        setActivity(compJson.activity ?? []);
      }
      if (weakRes.ok) setWeakness((await weakRes.json()) as WeaknessReport);
      if (improvementRes.ok) setImprovement((await improvementRes.json()) as ImprovementReport);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onExamDateChange = () => void load();
    window.addEventListener(EXAM_DATE_CHANGE_EVENT, onExamDateChange);
    return () => window.removeEventListener(EXAM_DATE_CHANGE_EVENT, onExamDateChange);
  }, [load]);

  async function submitPlan() {
    if (!isFreeformDraft && !examDate) return;
    setSaving(true);
    try {
      const res = await fetch("/api/study-plan/schedule", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examDate: isFreeformDraft ? addDaysIso(todayIso(), FREEFORM_PLACEHOLDER_DAYS) : examDate,
          cadenceDays, defaultDurationMinutes: duration, isFreeform: isFreeformDraft,
        }),
      });
      if (res.ok) {
        setEditing(false);
        await load();
        window.dispatchEvent(new Event(EXAM_DATE_CHANGE_EVENT));
      }
    } finally {
      setSaving(false);
    }
  }

  function openEdit() {
    if (schedule) {
      setIsFreeformDraft(schedule.is_freeform);
      setExamDate(schedule.is_freeform ? null : schedule.exam_date);
      setCadenceDays(schedule.cadence_days);
      setDuration(schedule.default_duration_minutes);
    }
    setEditing(true);
  }

  const days: CalendarDay[] = useMemo(() => {
    if (!schedule) return [];
    return generateCalendar({
      startDate: addDaysIso(todayIso(), -3),
      examDate: schedule.exam_date,
      cadenceDays: schedule.cadence_days,
      defaultDurationMinutes: schedule.default_duration_minutes,
      isFreeform: schedule.is_freeform,
    }).slice(0, 21);
  }, [schedule]);

  const doneDates = useMemo(() => new Set(completions.map((c) => c.completion_date)), [completions]);
  const activityByDate = useMemo(() => new Map(activity.map((a) => [a.date, a])), [activity]);
  const activityDates = useMemo(() => new Set(activity.map((a) => a.date)), [activity]);
  const today = todayIso();
  const todayEntry = days.find((d) => d.date === today) ?? null;
  const todaysActivity = activityByDate.get(today) ?? null;
  const weakSkills = (weakness?.autoGraded ?? []).filter((s) => s.isWeak && s.attempts >= 3);
  const topImprovement = improvement?.cohorts?.[0] ?? null;
  const streak = computeStreak(activityDates, today);
  const missedRecent = computeMissedRecent(days, activityDates, today);
  const isCatchUp = missedRecent >= 2 && !!todayEntry?.isStudyDay && !todayEntry.isMockTestDay;
  const catchUpTier = isCatchUp && todayEntry?.recommendedTier && todayEntry.recommendedTier !== 60
    ? bumpTierForCatchUp(todayEntry.recommendedTier) : null;
  const catchUpWeakSpot = weakSkills[0] ?? null;
  const catchUpWeakLabel = catchUpWeakSpot
    ? `${catchUpWeakSpot.taskType} ระดับ${catchUpWeakSpot.difficulty} (${catchUpWeakSpot.avgScorePct}%)`
    : weakness?.weakestDimension
      ? `${weakness.weakestDimension.dimension} (${weakness.weakestDimension.avgScorePercent}%)`
      : null;
  const suggestedDuration: 5 | 10 | 20 | 30 =
    catchUpTier ??
    (todayEntry?.recommendedTier && todayEntry.recommendedTier !== 60 ? todayEntry.recommendedTier : null) ??
    schedule?.default_duration_minutes ??
    10;

  function openStartPicker() {
    setStartDuration(suggestedDuration);
    setPickingStart(true);
  }

  async function startTodaySession() {
    setStarting(true);
    try {
      const queue = await buildRandomQueue(defaultDifficultyFor(effectiveTier), startDuration);
      if (queue.length === 0) {
        router.push("/practice");
        return;
      }
      setActiveDailyQueue({
        hrefs: queue.map((q) => q.href),
        index: 0,
        tierMinutes: startDuration,
        dateIso: today,
      });
      router.push(queue[0].href);
    } finally {
      setStarting(false);
      setPickingStart(false);
    }
  }

  const weekDates = Array.from({ length: 7 }, (_, i) => addDaysIso(today, -i));
  const weekActs = weekDates.map((d) => activityByDate.get(d)).filter((a): a is DayActivity => !!a);
  const weekDaysStudied = weekActs.length;
  const weekAttempts = weekActs.reduce((s, a) => s + a.attempts, 0);
  const weekVocab = weekActs.reduce((s, a) => s + a.vocabSaved, 0);
  const weekAvgScore = weekAttempts > 0
    ? Math.round(weekActs.reduce((s, a) => s + a.avgScorePct * a.attempts, 0) / weekAttempts) : 0;

  const selectedEntry = selectedDay ? days.find((d) => d.date === selectedDay) ?? null : null;
  const selectedActivity = selectedDay ? activityByDate.get(selectedDay) ?? null : null;

  if (soft && schedule && !editing && !loading) {
    return (
      <StudyPlanCalendarCardSoft
        schedule={schedule}
        streak={streak}
        weakSkills={weakSkills}
        weakestDimension={weakness?.weakestDimension ?? null}
        topImprovement={topImprovement}
        onEditPlan={openEdit}
      />
    );
  }

  if (loading) {
    return (
      <CardShell>
        <p className="text-sm text-slate-400">กำลังโหลดแผนการเรียน…</p>
      </CardShell>
    );
  }

  if (!schedule || editing) {
    if (soft) {
      return (
        <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200 sm:p-7">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ep-blue">Study plan</p>
          <h3 className="mb-1 mt-1 font-display text-xl font-extrabold text-slate-900">
            {editing ? "แก้ไขแผน" : "สร้างแผนการเรียนถึงวันสอบ"}
          </h3>
          {!editing && <p className="mb-4 text-sm text-slate-500">สอบวันไหน? เดี๋ยวจัดปฏิทินฝึกให้ถึงวันสอบเลย</p>}

          <p className="mb-1.5 mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">รูปแบบการฝึก</p>
          <div className="mb-4 flex flex-wrap gap-1.5">
            <PillOption active={!isFreeformDraft} onClick={() => setIsFreeformDraft(false)}>
              มีวันสอบแน่นอน
            </PillOption>
            <PillOption active={isFreeformDraft} onClick={() => setIsFreeformDraft(true)}>
              ฝึกอิสระ — ไม่ตั้งวันสอบ
            </PillOption>
          </div>

          {!isFreeformDraft && (
            <>
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">วันสอบ</p>
              <div className="mb-4 flex flex-wrap gap-1.5">
                {EXAM_PRESETS.map((p) => {
                  const value = addDaysIso(todayIso(), p.days);
                  return (
                    <PillOption key={p.label} active={examDate === value} onClick={() => setExamDate(value)}>
                      {p.label}
                    </PillOption>
                  );
                })}
              </div>
            </>
          )}

          <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">ความถี่</p>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {CADENCE_OPTIONS.map((c) => (
              <PillOption key={c.days} active={cadenceDays === c.days} onClick={() => setCadenceDays(c.days)}>
                {c.th}
              </PillOption>
            ))}
          </div>

          <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">เวลาต่อวันตามปกติ</p>
          <div className="mb-5 flex flex-wrap gap-1.5">
            {DURATION_OPTIONS.map((m) => (
              <PillOption key={m} active={duration === m} onClick={() => setDuration(m)}>
                {m} นาที
              </PillOption>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={(!isFreeformDraft && !examDate) || saving}
              onClick={submitPlan}
              className="rounded-2xl bg-ep-yellow px-6 py-3 font-display text-sm font-extrabold text-slate-900 shadow-md transition hover:shadow-lg active:scale-[0.98] disabled:opacity-40"
            >
              {saving ? "กำลังบันทึก…" : editing ? "บันทึกการแก้ไข" : "สร้างแผนการเรียน"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-2xl bg-slate-50 px-6 py-3 font-display text-sm font-bold text-slate-600 transition hover:bg-slate-100"
              >
                ยกเลิก
              </button>
            )}
          </div>
        </div>
      );
    }
    return (
      <CardShell>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#004AAD]">Study plan</p>
        <h3 className="mb-1 mt-1 text-lg font-bold text-slate-900">
          {editing ? "แก้ไขแผน" : "สร้างแผนการเรียนถึงวันสอบ"}
        </h3>
        {!editing && <p className="mb-3 text-sm text-slate-500">สอบวันไหน? เดี๋ยวจัดปฏิทินฝึกให้ถึงวันสอบเลย</p>}

        <p className="mb-1.5 mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">รูปแบบการฝึก</p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <PillOption active={!isFreeformDraft} onClick={() => setIsFreeformDraft(false)}>
            มีวันสอบแน่นอน
          </PillOption>
          <PillOption active={isFreeformDraft} onClick={() => setIsFreeformDraft(true)}>
            ฝึกอิสระ — ไม่ตั้งวันสอบ
          </PillOption>
        </div>

        {!isFreeformDraft && (
          <>
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">วันสอบ</p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {EXAM_PRESETS.map((p) => {
                const value = addDaysIso(todayIso(), p.days);
                return (
                  <PillOption key={p.label} active={examDate === value} onClick={() => setExamDate(value)}>
                    {p.label}
                  </PillOption>
                );
              })}
            </div>
          </>
        )}

        <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">ความถี่</p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {CADENCE_OPTIONS.map((c) => (
            <PillOption key={c.days} active={cadenceDays === c.days} onClick={() => setCadenceDays(c.days)}>
              {c.th}
            </PillOption>
          ))}
        </div>

        <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">เวลาต่อวันตามปกติ</p>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {DURATION_OPTIONS.map((m) => (
            <PillOption key={m} active={duration === m} onClick={() => setDuration(m)}>
              {m} นาที
            </PillOption>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={(!isFreeformDraft && !examDate) || saving}
            onClick={submitPlan}
            className="rounded-xl bg-[#004AAD] px-5 py-2.5 text-xs font-bold text-[#FFCC00] shadow-sm transition-all duration-200 hover:opacity-90 hover:shadow-md active:scale-[0.98] disabled:opacity-40"
          >
            {saving ? "กำลังบันทึก…" : editing ? "บันทึกการแก้ไข" : "สร้างแผนการเรียน"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-xl bg-slate-50 px-5 py-2.5 text-xs font-bold text-slate-600 transition-colors duration-200 hover:bg-slate-100"
            >
              ยกเลิก
            </button>
          )}
        </div>
      </CardShell>
    );
  }

  return (
    <CardShell>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#004AAD]">Study plan</p>
        <button
          type="button"
          onClick={openEdit}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#004AAD] px-3.5 py-1.5 text-xs font-extrabold text-white shadow-sm transition hover:shadow-md active:scale-[0.97]"
        >
          <span>⚙️</span> แก้ไขแผน
        </button>
      </div>
      <h3 className="mb-3 text-lg font-bold text-slate-900">แผนการเรียนของฉัน</h3>

      <div className="mb-4 flex gap-3">
        <div className="flex flex-1 items-baseline gap-2 rounded-xl bg-blue-50 px-3 py-2.5">
          {schedule.is_freeform ? (
            <>
              <span className="text-2xl">🌱</span>
              <span className="text-xs font-bold text-slate-600">โหมดฝึกอิสระ</span>
            </>
          ) : (
            <>
              <span className="text-2xl font-black text-[#004AAD]">
                {Math.max(0, Math.round((Date.parse(schedule.exam_date) - Date.parse(today)) / 86_400_000))}
              </span>
              <span className="text-xs font-bold text-slate-600">วันก่อนสอบ</span>
            </>
          )}
        </div>
        <div className="flex flex-1 items-baseline gap-2 rounded-xl bg-amber-50 px-3 py-2.5">
          <span className="text-xl font-black text-amber-600">🔥 {streak}</span>
          <span className="text-xs font-bold text-slate-600">วันติดต่อกัน</span>
        </div>
      </div>

      {!schedule.is_freeform && weakness?.latestPrediction && (
        <p className="mb-3 text-sm font-semibold text-slate-700">
          ตอนนี้ {weakness.latestPrediction.predicted} → เป้าหมาย {weakness.latestPrediction.target}
        </p>
      )}
      {!schedule.is_freeform && !weakness?.latestPrediction && (
        <p className="mb-3 text-sm text-slate-400">ยังไม่เคยวัดระดับ — ลองทำ Mini Diagnosis เพื่อดูคะแนนที่คาดการณ์</p>
      )}

      {topImprovement && (
        <div className="mb-3 rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
          <CelebrateMascot
            title={`${topImprovement.taskLabel} (ระดับ${topImprovement.difficultyLabel}) ดีขึ้น +${topImprovement.deltaPoints} แต้ม!`}
            subtitle={`${topImprovement.beforeAvgScorePct}% → ${topImprovement.afterAvgScorePct}% · ${topImprovement.message}`}
          />
        </div>
      )}

      {isCatchUp && (
        <div className="mb-3 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-900 ring-1 ring-amber-200">
          💪 พลาดไป {missedRecent} วันในสัปดาห์นี้ — ไม่เป็นไร วันนี้แนะนำเพิ่มเป็น {catchUpTier ?? schedule.default_duration_minutes} นาที
          {catchUpWeakLabel
            ? ` และจุดที่ยังอ่อนคือ ${catchUpWeakLabel} — วันนี้แนะนำโฟกัสตรงนี้เพิ่มเติมเพื่อตามให้ทัน`
            : " เพื่อตามให้ทัน"}
        </div>
      )}

      <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
        ปฏิทินฝึก · แตะดูรายละเอียด
      </p>
      <div className="mb-2 flex gap-1.5 overflow-x-auto pb-2">
        {days.map((d) => {
          const isToday = d.date === today;
          const dayAct = activityByDate.get(d.date);
          const isDone = doneDates.has(d.date) || !!dayAct;
          const isSelected = selectedDay === d.date;
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => setSelectedDay(isSelected ? null : d.date)}
              className={`flex w-14 shrink-0 flex-col items-center gap-1 rounded-2xl py-2 text-center transition-all duration-150 ease-out hover:scale-105 active:scale-95 ${
                isDone
                  ? "bg-emerald-100"
                  : d.isMockTestDay
                    ? "bg-amber-100"
                    : "bg-slate-50"
              } ${isToday ? "ring-2 ring-[#004AAD]" : ""} ${isSelected ? "ring-2 ring-indigo-400" : ""}`}
            >
              <span className="text-[10px] font-bold text-slate-500">{dayLabel(d.date)}</span>
              <span className="text-base">{isDone ? "✅" : d.isMockTestDay ? "🎯" : d.isStudyDay ? "📖" : "·"}</span>
            </button>
          );
        })}
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          selectedEntry ? "mb-3 max-h-40 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {selectedEntry && (
          <div className="rounded-xl bg-indigo-50 p-3 text-xs text-indigo-900">
            <p className="mb-1 font-bold">{dayLabel(selectedEntry.date)}</p>
            {selectedActivity ? (
              <p className="font-medium">
                📝 ทำไป {selectedActivity.attempts} ข้อ · 📊 เฉลี่ย {selectedActivity.avgScorePct}% · 📚 เก็บคำศัพท์ {selectedActivity.vocabSaved} คำ
              </p>
            ) : (
              <p className="text-indigo-500">ยังไม่มีการฝึกในวันนี้</p>
            )}
            {selectedEntry.reason && <p className="mt-1 text-indigo-500">{selectedEntry.reason}</p>}
          </div>
        )}
      </div>

      {todayEntry?.reason && !selectedEntry && <p className="mb-3 text-xs text-slate-400">{todayEntry.reason}</p>}

      {todayEntry?.isMockTestDay ? (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link
            href="/mock-test"
            className="inline-block rounded-xl bg-[#004AAD] px-5 py-2.5 text-xs font-bold text-[#FFCC00] shadow-sm transition-all duration-200 hover:opacity-90 hover:shadow-md active:scale-[0.98]"
          >
            ลองข้อสอบจำลองวันนี้ →
          </Link>
          <Link
            href="/practice"
            className="text-xs font-bold text-slate-400 transition-colors duration-150 hover:text-[#004AAD]"
          >
            เลือกฝึกเอง ไม่ต้องพึ่งแผน →
          </Link>
        </div>
      ) : pickingStart ? (
        <div className="mb-4">
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
            มีเวลากี่นาที
          </p>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {DURATION_OPTIONS.map((m) => (
              <PillOption key={m} active={startDuration === m} onClick={() => setStartDuration(m)}>
                {m} นาที
              </PillOption>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={starting}
              onClick={() => void startTodaySession()}
              className="rounded-xl bg-[#004AAD] px-5 py-2.5 text-xs font-bold text-[#FFCC00] shadow-sm transition-all duration-200 hover:opacity-90 hover:shadow-md active:scale-[0.98] disabled:opacity-40"
            >
              {starting ? "กำลังเตรียมชุดฝึก…" : "เริ่มเลย →"}
            </button>
            <button
              type="button"
              onClick={() => setPickingStart(false)}
              className="rounded-xl bg-slate-50 px-5 py-2.5 text-xs font-bold text-slate-600 transition-colors duration-200 hover:bg-slate-100"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={openStartPicker}
            className="inline-block rounded-xl bg-[#004AAD] px-5 py-2.5 text-xs font-bold text-[#FFCC00] shadow-sm transition-all duration-200 hover:opacity-90 hover:shadow-md active:scale-[0.98]"
          >
            {todayEntry?.isStudyDay ? "เริ่มฝึกวันนี้ →" : "ไปหน้าฝึกซ้อม →"}
          </button>
          <Link
            href="/practice"
            className="text-xs font-bold text-slate-400 transition-colors duration-150 hover:text-[#004AAD]"
          >
            เลือกฝึกเอง ไม่ต้องพึ่งแผน →
          </Link>
        </div>
      )}

      <div className="mb-4 rounded-xl bg-slate-50 p-3">
        <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">วันนี้ทำอะไรไปบ้าง</p>
        {todaysActivity ? (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-slate-700">
            <span>📝 {todaysActivity.attempts} ข้อ</span>
            <span>📊 เฉลี่ย {todaysActivity.avgScorePct}%</span>
            <span>📚 {todaysActivity.vocabSaved} คำศัพท์</span>
          </div>
        ) : (
          <p className="text-xs text-slate-400">ยังไม่มีการฝึกวันนี้ — ฝึกตามแผนหรือทำเองก็นับหมด</p>
        )}
      </div>

      <div className="mb-4 rounded-xl bg-slate-50 p-3">
        <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">สรุปสัปดาห์นี้</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-slate-700">
          <span>📅 {weekDaysStudied}/7 วัน</span>
          <span>📊 เฉลี่ย {weekAvgScore}%</span>
          <span>📚 {weekVocab} คำศัพท์ใหม่</span>
        </div>
      </div>

      {(weakSkills.length > 0 || weakness?.weakestDimension) && (
        <div className="rounded-xl bg-rose-50 p-3">
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-rose-400">จุดที่ควรกลับมาทบทวน</p>
          <ul className="space-y-1 text-xs font-semibold text-rose-800">
            {weakSkills.map((s) => (
              <li key={`${s.taskType}:${s.difficulty}`}>⚠️ {s.taskType} ระดับ {s.difficulty} — เฉลี่ย {s.avgScorePct}%</li>
            ))}
            {weakness?.weakestDimension && (
              <li>⚠️ งานเขียน/พูด: {weakness.weakestDimension.dimension} เฉลี่ย {weakness.weakestDimension.avgScorePercent}%</li>
            )}
          </ul>
        </div>
      )}
    </CardShell>
  );
}
