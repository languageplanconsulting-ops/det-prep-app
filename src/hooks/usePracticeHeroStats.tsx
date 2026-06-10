"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";

const EXAM_DATE_KEY = "ep-exam-date";

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
  /** User-set exam date (ISO yyyy-mm-dd) from localStorage, or null. */
  examDate: string | null;
};

function readExamDate(): string | null {
  try {
    return window.localStorage.getItem(EXAM_DATE_KEY);
  } catch {
    return null;
  }
}

export function setExamDate(iso: string | null): void {
  try {
    if (iso) window.localStorage.setItem(EXAM_DATE_KEY, iso);
    else window.localStorage.removeItem(EXAM_DATE_KEY);
    window.dispatchEvent(new Event("ep-exam-date-change"));
  } catch {
    /* ignore */
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

    const examDate = readExamDate();
    const onExamChange = () =>
      setState((s) => ({ ...s, examDate: readExamDate() }));
    window.addEventListener("ep-exam-date-change", onExamChange);

    void (async () => {
      let lastScore: number | null = null;
      let targetScore: number | null = null;
      let delta: number | null = null;
      let attempts = 0;
      let weeklyMinutes: number | null = null;
      let streakDays: number | null = null;

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
      window.removeEventListener("ep-exam-date-change", onExamChange);
    };
  }, []);

  return state;
}
