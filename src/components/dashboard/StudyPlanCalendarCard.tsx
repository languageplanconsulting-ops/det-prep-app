"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { BrutalPanel } from "@/components/ui/BrutalPanel";
import {
  bumpTierForCatchUp, computeMissedRecent, computeStreak, generateCalendar,
  type CalendarDay,
} from "@/lib/study-plan/schedule";

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

export function StudyPlanCalendarCard() {
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<ScheduleRow | null>(null);
  const [completions, setCompletions] = useState<{ completion_date: string }[]>([]);
  const [activity, setActivity] = useState<DayActivity[]>([]);
  const [weakness, setWeakness] = useState<WeaknessReport | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const [examDate, setExamDate] = useState<string | null>(null);
  const [cadenceDays, setCadenceDays] = useState(1);
  const [duration, setDuration] = useState<5 | 10 | 20 | 30>(10);
  const [isFreeformDraft, setIsFreeformDraft] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/study-plan/schedule", { credentials: "same-origin", cache: "no-store" });
    if (!res.ok) { setLoading(false); return; }
    const json = (await res.json()) as { schedule: ScheduleRow | null };
    setSchedule(json.schedule);
    if (json.schedule) {
      const since = addDaysIso(todayIso(), -14);
      const [compRes, weakRes] = await Promise.all([
        fetch(`/api/study-plan/completions?since=${since}`, { credentials: "same-origin", cache: "no-store" }),
        fetch("/api/study-plan/weakness", { credentials: "same-origin", cache: "no-store" }),
      ]);
      if (compRes.ok) {
        const compJson = (await compRes.json()) as { completions: { completion_date: string }[]; activity: DayActivity[] };
        setCompletions(compJson.completions);
        setActivity(compJson.activity ?? []);
      }
      if (weakRes.ok) setWeakness((await weakRes.json()) as WeaknessReport);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
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
      if (res.ok) { setEditing(false); await load(); }
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
  const streak = computeStreak(activityDates, today);
  const missedRecent = computeMissedRecent(days, activityDates, today);
  const isCatchUp = missedRecent >= 2 && !!todayEntry?.isStudyDay && !todayEntry.isMockTestDay;
  const catchUpTier = isCatchUp && todayEntry?.recommendedTier && todayEntry.recommendedTier !== 60
    ? bumpTierForCatchUp(todayEntry.recommendedTier) : null;

  const weekDates = Array.from({ length: 7 }, (_, i) => addDaysIso(today, -i));
  const weekActs = weekDates.map((d) => activityByDate.get(d)).filter((a): a is DayActivity => !!a);
  const weekDaysStudied = weekActs.length;
  const weekAttempts = weekActs.reduce((s, a) => s + a.attempts, 0);
  const weekVocab = weekActs.reduce((s, a) => s + a.vocabSaved, 0);
  const weekAvgScore = weekAttempts > 0
    ? Math.round(weekActs.reduce((s, a) => s + a.avgScorePct * a.attempts, 0) / weekAttempts) : 0;

  if (loading) {
    return (
      <BrutalPanel eyebrow="Study plan" title="แผนการเรียน">
        <p className="text-sm text-neutral-500">Loading…</p>
      </BrutalPanel>
    );
  }

  if (!schedule || editing) {
    return (
      <BrutalPanel eyebrow="Study plan" title={editing ? "แก้ไขแผน" : "สร้างแผนการเรียนถึงวันสอบ"}>
        {!editing && <p className="mb-3 text-sm font-semibold text-neutral-700">สอบวันไหน? เดี๋ยวจัดปฏิทินฝึกให้ถึงวันสอบเลย</p>}

        <p className="mb-1 text-xs font-black uppercase tracking-widest text-[#004AAD]">รูปแบบการฝึก</p>
        <div className="mb-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setIsFreeformDraft(false)} className={`border-2 border-black px-3 py-2 text-xs font-bold ${!isFreeformDraft ? "bg-[#004AAD] text-white" : "bg-white text-black"}`}>
            มีวันสอบแน่นอน
          </button>
          <button type="button" onClick={() => setIsFreeformDraft(true)} className={`border-2 border-black px-3 py-2 text-xs font-bold ${isFreeformDraft ? "bg-[#004AAD] text-white" : "bg-white text-black"}`}>
            ฝึกอิสระ — ไม่ตั้งวันสอบ
          </button>
        </div>

        {!isFreeformDraft && (
          <>
            <p className="mb-1 text-xs font-black uppercase tracking-widest text-[#004AAD]">วันสอบ</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {EXAM_PRESETS.map((p) => {
                const value = addDaysIso(todayIso(), p.days);
                const active = examDate === value;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setExamDate(value)}
                    className={`border-2 border-black px-3 py-2 text-xs font-bold ${active ? "bg-[#004AAD] text-white" : "bg-white text-black"}`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <p className="mb-1 text-xs font-black uppercase tracking-widest text-[#004AAD]">ความถี่</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {CADENCE_OPTIONS.map((c) => (
            <button
              key={c.days}
              type="button"
              onClick={() => setCadenceDays(c.days)}
              className={`border-2 border-black px-3 py-2 text-xs font-bold ${cadenceDays === c.days ? "bg-[#004AAD] text-white" : "bg-white text-black"}`}
            >
              {c.th}
            </button>
          ))}
        </div>

        <p className="mb-1 text-xs font-black uppercase tracking-widest text-[#004AAD]">เวลาต่อวันตามปกติ</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setDuration(m)}
              className={`border-2 border-black px-3 py-2 text-xs font-bold ${duration === m ? "bg-[#004AAD] text-white" : "bg-white text-black"}`}
            >
              {m} นาที
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={(!isFreeformDraft && !examDate) || saving}
            onClick={submitPlan}
            className="border-[3px] border-black bg-[#FFCC00] px-4 py-3 text-xs font-black uppercase shadow-[4px_4px_0_0_#111] disabled:opacity-40"
          >
            {saving ? "กำลังบันทึก…" : editing ? "บันทึกการแก้ไข" : "สร้างแผนการเรียน"}
          </button>
          {editing && (
            <button type="button" onClick={() => setEditing(false)} className="border-2 border-black bg-white px-4 py-3 text-xs font-black uppercase">
              ยกเลิก
            </button>
          )}
        </div>
      </BrutalPanel>
    );
  }

  return (
    <BrutalPanel eyebrow="Study plan" title="แผนการเรียนของฉัน">
      <div className="mb-1 flex justify-end">
        <button type="button" onClick={openEdit} className="text-xs font-black uppercase text-[#004AAD]">แก้ไขแผน</button>
      </div>

      <div className="mb-4 flex gap-3">
        <div className="flex flex-1 items-baseline gap-2">
          {schedule.is_freeform ? (
            <>
              <span className="text-3xl">🌱</span>
              <span className="text-sm font-bold text-neutral-600">โหมดฝึกอิสระ</span>
            </>
          ) : (
            <>
              <span className="text-3xl font-black text-[#004AAD]">
                {Math.max(0, Math.round((Date.parse(schedule.exam_date) - Date.parse(today)) / 86_400_000))}
              </span>
              <span className="text-sm font-bold text-neutral-600">วันก่อนสอบ</span>
            </>
          )}
        </div>
        <div className="flex flex-1 items-baseline gap-2">
          <span className="text-2xl font-black text-orange-600">🔥 {streak}</span>
          <span className="text-sm font-bold text-neutral-600">วันติดต่อกัน</span>
        </div>
      </div>

      {!schedule.is_freeform && weakness?.latestPrediction && (
        <p className="mb-3 text-sm font-bold text-neutral-800">
          ตอนนี้ {weakness.latestPrediction.predicted} → เป้าหมาย {weakness.latestPrediction.target}
        </p>
      )}
      {!schedule.is_freeform && !weakness?.latestPrediction && (
        <p className="mb-3 text-sm text-neutral-500">ยังไม่เคยวัดระดับ — ลองทำ Mini Diagnosis เพื่อดูคะแนนที่คาดการณ์</p>
      )}
      {isCatchUp && (
        <div className="mb-3 border-2 border-[#FFCC00] bg-yellow-50 p-3 text-sm font-semibold text-neutral-800">
          💪 พลาดไป {missedRecent} วันในสัปดาห์นี้ — ไม่เป็นไร วันนี้แนะนำเพิ่มเป็น {catchUpTier ?? schedule.default_duration_minutes} นาทีเพื่อตามให้ทัน
        </div>
      )}

      <div className="mb-2 flex gap-2 overflow-x-auto pb-2">
        {days.map((d) => {
          const isToday = d.date === today;
          const dayAct = activityByDate.get(d.date);
          // Any real activity that day counts as done — following the plan
          // isn't required, doing SOMETHING that day is what shows up here.
          const isDone = doneDates.has(d.date) || !!dayAct;
          return (
            <div
              key={d.date}
              className={`flex w-16 shrink-0 flex-col items-center rounded-sm border-2 py-2 text-center ${
                isDone ? "border-green-600 bg-green-50" : d.isMockTestDay ? "border-[#FFCC00] bg-yellow-50" : "border-black bg-white"
              } ${isToday ? "ring-2 ring-[#004AAD]" : ""}`}
            >
              <span className="text-[10px] font-bold text-neutral-500">{dayLabel(d.date)}</span>
              <span className="mt-1 text-lg">{isDone ? "✅" : d.isMockTestDay ? "🎯" : d.isStudyDay ? "📖" : "—"}</span>
              {dayAct ? <span className="text-[9px] font-bold text-neutral-500">{dayAct.attempts} ข้อ</span> : null}
            </div>
          );
        })}
      </div>
      {todayEntry?.reason && <p className="mb-3 text-xs text-neutral-500">{todayEntry.reason}</p>}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link
          href={todayEntry?.isMockTestDay ? "/mock-test" : "/practice"}
          className="inline-block border-[3px] border-black bg-[#FFCC00] px-4 py-3 text-xs font-black uppercase shadow-[4px_4px_0_0_#111]"
        >
          {todayEntry?.isMockTestDay ? "ลองข้อสอบจำลองวันนี้ →" : todayEntry?.isStudyDay ? "เริ่มฝึกวันนี้ →" : "ไปหน้าฝึกซ้อม →"}
        </Link>
        <Link href="/practice" className="text-xs font-black uppercase text-[#004AAD]">เลือกฝึกเอง ไม่ต้องพึ่งแผน →</Link>
      </div>

      <div className="mb-4 border-t-2 border-dashed border-black pt-3">
        <p className="mb-2 text-xs font-black uppercase tracking-widest text-[#004AAD]">วันนี้ทำอะไรไปบ้าง</p>
        {todaysActivity ? (
          <div className="flex gap-3 text-sm font-semibold text-neutral-800">
            <span>📝 {todaysActivity.attempts} ข้อ</span>
            <span>📊 เฉลี่ย {todaysActivity.avgScorePct}%</span>
            <span>📚 {todaysActivity.vocabSaved} คำศัพท์</span>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">ยังไม่มีการฝึกวันนี้ — ฝึกตามแผนหรือทำเองก็นับหมด</p>
        )}
      </div>

      <div className="mb-4 border-t-2 border-dashed border-black pt-3">
        <p className="mb-2 text-xs font-black uppercase tracking-widest text-[#004AAD]">สรุปสัปดาห์นี้</p>
        <div className="flex gap-3 text-sm font-semibold text-neutral-800">
          <span>📅 {weekDaysStudied}/7 วัน</span>
          <span>📊 เฉลี่ย {weekAvgScore}%</span>
          <span>📚 {weekVocab} คำศัพท์ใหม่</span>
        </div>
      </div>

      {(weakSkills.length > 0 || weakness?.weakestDimension) && (
        <div className="border-t-2 border-dashed border-black pt-3">
          <p className="mb-2 text-xs font-black uppercase tracking-widest text-[#004AAD]">จุดที่ควรกลับมาทบทวน</p>
          <ul className="space-y-1 text-sm font-semibold text-neutral-800">
            {weakSkills.map((s) => (
              <li key={`${s.taskType}:${s.difficulty}`}>⚠️ {s.taskType} ระดับ {s.difficulty} — เฉลี่ย {s.avgScorePct}%</li>
            ))}
            {weakness?.weakestDimension && (
              <li>⚠️ งานเขียน/พูด: {weakness.weakestDimension.dimension} เฉลี่ย {weakness.weakestDimension.avgScorePercent}%</li>
            )}
          </ul>
        </div>
      )}
    </BrutalPanel>
  );
}
