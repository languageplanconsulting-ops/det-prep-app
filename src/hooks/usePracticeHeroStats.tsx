"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";

const EXAM_DATE_KEY = "ep-exam-date";
export const EXAM_DATE_CHANGE_EVENT = "ep-exam-date-change";
const DEFAULT_CADENCE_DAYS = 1;
const DEFAULT_DURATION_MINUTES = 10;

export type PracticeHeroStats = {
  loading: boolean;
  /** Most recent full Mock score, or null if never taken. */
  lastScore: number | null;
  /** Target total from the latest Mock (user set it there), or null. */
  targetScore: number | null;
  /** Change vs the previous Mock attempt, or null if <2 attempts. */
  delta: number | null;
  attempts: number;
  /** Practice minutes in the last 7 days. */
  weeklyMinutes: number | null;
  /** Consecutive days (incl. today) with any practice. */
  streakDays: number | null;
  /** Exam date (ISO yyyy-mm-dd) — from the same study_plan_schedules row the Study Plan card uses, or null. */
  examDate: string | null;
};

type ScheduleRow = {
  exam_date: string;
  cadence_days: number;
  default_duration_minutes: 5 | 10 | 20 | 30;
  is_freeform: boolean;
};

function readLocalExamDate(): string | null {
  try {
    return window.localStorage.getItem(EXAM_DATE_KEY);
  } catch {
    return null;
  }
}

function writeLocalExamDate(iso: string | null): void {
  try {
    if (iso) window.localStorage.setItem(EXAM_DATE_KEY, iso);
    else window.localStorage.removeItem(EXAM_DATE_KEY);
  } catch {
    /* ignore */
  }
}

async function fetchSchedule(): Promise<ScheduleRow | null> {
  try {
    const res = await fetch("/api/study-plan/schedule", { credentials: "same-origin", cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { schedule: ScheduleRow | null };
    return json.schedule ?? null;
  } catch {
    return null;
  }
}

function examDateFromSchedule(schedule: ScheduleRow | null): string | null {
  if (!schedule) return readLocalExamDate();
  return schedule.is_freeform ? null : schedule.exam_date;
}

/**
 * Persists the exam date to the same study_plan_schedules row the Study Plan
 * calendar card reads/writes, so the hero countdown and the calendar always
 * agree (incl. an exam date already set from the mobile app). Preserves the
 * existing cadence/duration when a schedule row exists; otherwise creates one
 * with sane defaults.
 */
export async function setExamDate(iso: string | null): Promise<void> {
  writeLocalExamDate(iso);
  try {
    if (iso) {
      const existing = await fetchSchedule();
      await fetch("/api/study-plan/schedule", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examDate: iso,
          cadenceDays: existing?.cadence_days ?? DEFAULT_CADENCE_DAYS,
          defaultDurationMinutes: existing?.default_duration_minutes ?? DEFAULT_DURATION_MINUTES,
          isFreeform: false,
        }),
      });
    }
  } finally {
    window.dispatchEvent(new Event(EXAM_DATE_CHANGE_EVENT));
  }
}

/** Days from today until the exam date (null if unset; negative if past). */
export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam = new Date(iso);
    exam.setHours(0, 0, 0, 0);
    return Math.round((exam.getTime() - today.getTime()) / 86400000);
  } catch {
    return null;
  }
}

export function usePracticeHeroStats(): PracticeHeroStats {
  const [state, setState] = useState<PracticeHeroStats>({
    loading: true,
    lastScore: null,
    targetScore: null,
    delta: null,
    attempts: 0,
    weeklyMinutes: null,
    streakDays: null,
    examDate: null,
  });

  useEffect(() => {
    let cancelled = false;

    const onExamChange = () => {
      void fetchSchedule().then((schedule) => {
        if (!cancelled) setState((s) => ({ ...s, examDate: examDateFromSchedule(schedule) }));
      });
    };
    window.addEventListener(EXAM_DATE_CHANGE_EVENT, onExamChange);

    void (async () => {
      let lastScore: number | null = null;
      let targetScore: number | null = null;
      let delta: number | null = null;
      let attempts = 0;
      let weeklyMinutes: number | null = null;
      let streakDays: number | null = null;
      let examDate: string | null = null;

      // --- Mock scores ---
      try {
        const supabase = getBrowserSupabase();
        if (supabase) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            const { data } = await supabase
              .from("mock_fixed_results")
              .select("actual_total, target_total, created_at")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(50);
            const rows = (data ?? []) as Array<{
              actual_total: number | null;
              target_total: number | null;
            }>;
            attempts = rows.length;
            if (rows[0]) {
              lastScore = Math.round(Number(rows[0].actual_total ?? 0));
              const t = Number(rows[0].target_total ?? 0);
              targetScore = t > 0 ? Math.round(t) : null;
            }
            if (rows[1]) {
              delta = lastScore! - Math.round(Number(rows[1].actual_total ?? 0));
            }
          }
        }
      } catch {
        /* leave nulls */
      }

      // --- Practice minutes + streak (last 30 local days) ---
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const days: string[] = [];
        const base = new Date();
        for (let i = 0; i < 30; i++) {
          const d = new Date(base);
          d.setDate(base.getDate() - i);
          days.push(d.toISOString().slice(0, 10));
        }
        const res = await fetch(
          `/api/study/pulse-stats?timeZone=${encodeURIComponent(tz)}&days=${encodeURIComponent(days.join(","))}`,
          { credentials: "same-origin" },
        );
        if (res.ok) {
          const json = (await res.json()) as { minutesPerDay?: Record<string, number> };
          const mpd = json.minutesPerDay ?? {};
          weeklyMinutes = days.slice(0, 7).reduce((sum, d) => sum + (mpd[d] ?? 0), 0);
          let streak = 0;
          for (const d of days) {
            if ((mpd[d] ?? 0) > 0) streak += 1;
            else break;
          }
          streakDays = streak;
        }
      } catch {
        /* leave nulls */
      }

      // --- Exam date (Supabase study_plan_schedules, same row the calendar card uses) ---
      try {
        examDate = examDateFromSchedule(await fetchSchedule());
      } catch {
        examDate = readLocalExamDate();
      }

      if (!cancelled) {
        setState({
          loading: false,
          lastScore,
          targetScore,
          delta,
          attempts,
          weeklyMinutes,
          streakDays,
          examDate,
        });
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener(EXAM_DATE_CHANGE_EVENT, onExamChange);
    };
  }, []);

  return state;
}
