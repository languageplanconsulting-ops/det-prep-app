"use client";

import { useEffect } from "react";
import { usePracticeHeroStats, daysUntil } from "@/hooks/usePracticeHeroStats";
import { sfxCelebrate } from "@/lib/exam-sfx";

const STREAK_SEEN_KEY = "ep-streak-seen";

/** Celebrate the first time a fresh, higher streak count is seen (once per increase, not every page view). */
function useStreakCelebration(streak: number) {
  useEffect(() => {
    if (streak <= 0) return;
    try {
      const seen = Number(window.localStorage.getItem(STREAK_SEEN_KEY) ?? "0");
      if (streak > seen) {
        sfxCelebrate(streak % 7 === 0 ? "lg" : "md");
        window.localStorage.setItem(STREAK_SEEN_KEY, String(streak));
      }
    } catch {
      /* ignore */
    }
  }, [streak]);
}

/**
 * HubMomentumStrip — compact "behavioural hooks" bar shown above the round
 * grid on every exam-bank hub. Pulls from the same `usePracticeHeroStats`
 * source the main Practice Hub uses, so streak/minutes stay in sync.
 *
 * Three signals, all hidden gracefully when data is missing:
 *  - 🔥 Streak (consecutive days with practice). Variable reward + endowed
 *    progress: students return to keep the number climbing.
 *  - ⏱ Minutes this week. Habit reinforcement at session scale, not the
 *    intimidating 120-set total.
 *  - 📅 Days to exam (only when the learner has set an exam date).
 *    Zeigarnik / time-pressure — keeps urgency present without nagging.
 *
 * Sized to be one row on desktop and wrap cleanly on phones. Never blocks
 * the hub; if pulse-stats fail it just renders nothing.
 */
export function HubMomentumStrip() {
  const stats = usePracticeHeroStats();
  useStreakCelebration(stats.streakDays ?? 0);

  if (stats.loading) {
    return (
      <div
        aria-hidden
        className="h-12 animate-pulse rounded-2xl bg-slate-100 ring-1 ring-slate-200"
      />
    );
  }

  const streak = stats.streakDays ?? 0;
  const mins = stats.weeklyMinutes ?? 0;
  const examDays = daysUntil(stats.examDate);

  // If we have nothing useful to report yet, render nothing (no empty box).
  if (streak === 0 && mins === 0 && examDays == null) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-2.5 ring-1 ring-slate-200 sm:gap-3 sm:p-3">
      {streak > 0 ? (
        <Pill
          icon="🔥"
          label="Streak"
          value={`${streak} วัน`}
          accent="amber"
          title={`ทำติดต่อกัน ${streak} วันแล้ว — รักษาไว้นะครับ`}
        />
      ) : null}
      {mins > 0 ? (
        <Pill
          icon="⏱"
          label="สัปดาห์นี้"
          value={`${mins} นาที`}
          accent="blue"
          title="เวลาฝึกในรอบ 7 วันล่าสุด"
        />
      ) : null}
      {examDays != null ? (
        <Pill
          icon="📅"
          label="ก่อนสอบ"
          value={examDays >= 0 ? `${examDays} วัน` : `${Math.abs(examDays)} วันที่แล้ว`}
          accent={examDays >= 0 && examDays <= 14 ? "rose" : "slate"}
          title={
            examDays >= 0
              ? "วันที่นักเรียนตั้งไว้สำหรับสอบ"
              : "วันสอบผ่านไปแล้ว — ตั้งใหม่ได้ในหน้าหลัก"
          }
        />
      ) : null}
    </div>
  );
}

function Pill({
  icon,
  label,
  value,
  accent,
  title,
}: {
  icon: string;
  label: string;
  value: string;
  accent: "amber" | "blue" | "rose" | "slate";
  title?: string;
}) {
  const map = {
    amber: "bg-amber-50 text-amber-900 ring-amber-200",
    blue: "bg-blue-50 text-blue-900 ring-blue-200",
    rose: "bg-rose-50 text-rose-900 ring-rose-200",
    slate: "bg-slate-50 text-slate-700 ring-slate-200",
  } as const;
  return (
    <div
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs ring-1 ${map[accent]}`}
    >
      <span className="text-base leading-none">{icon}</span>
      <span className="font-semibold opacity-70">{label}</span>
      <span className="font-extrabold">{value}</span>
    </div>
  );
}
