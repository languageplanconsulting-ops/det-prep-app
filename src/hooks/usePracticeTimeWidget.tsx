"use client";

import { useEffect, useState } from "react";

export type TimeWindow = "day" | "week" | "month" | "year";

const WINDOW_DAYS: Record<TimeWindow, number> = {
  day: 1,
  week: 7,
  month: 30,
  year: 365,
};

export type SkillTimeRow = {
  skill: string;
  label: string;
  minutes: number;
  seconds: number;
};

export type PracticeTimeWidgetState = {
  loading: boolean;
  /** Total minutes practiced within the selected window. */
  totalMinutes: number | null;
  /** Per-skill minutes within the selected window, in a fixed display order. */
  skills: SkillTimeRow[];
  /** Minutes per local day within the window, oldest first (for the sparkline). */
  minutesByDay: number[];
};

/** Builds `count` local-date (YYYY-MM-DD) strings ending today, oldest first. */
function buildLocalDayList(count: number): string[] {
  const days: string[] = [];
  const base = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

/**
 * Fetches real per-window practice time for the "⏱ เวลาฝึก" widget:
 * total + per-day minutes from /api/study/pulse-stats, and the per-skill
 * breakdown from /api/study/time-by-skill (scoped via `since`).
 */
export function usePracticeTimeWidget(window: TimeWindow): PracticeTimeWidgetState {
  const [state, setState] = useState<PracticeTimeWidgetState>({
    loading: true,
    totalMinutes: null,
    skills: [],
    minutesByDay: [],
  });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));

    void (async () => {
      let totalMinutes: number | null = null;
      let minutesByDay: number[] = [];
      let skills: SkillTimeRow[] = [];

      const dayCount = WINDOW_DAYS[window];
      const days = buildLocalDayList(dayCount);

      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const res = await fetch(
          `/api/study/pulse-stats?timeZone=${encodeURIComponent(tz)}&days=${encodeURIComponent(days.join(","))}`,
          { credentials: "same-origin" },
        );
        if (res.ok) {
          const json = (await res.json()) as { minutesPerDay?: Record<string, number> };
          const mpd = json.minutesPerDay ?? {};
          minutesByDay = days.map((d) => mpd[d] ?? 0);
          totalMinutes = minutesByDay.reduce((sum, m) => sum + m, 0);
        }
      } catch {
        /* leave nulls */
      }

      try {
        const since = new Date();
        since.setHours(0, 0, 0, 0);
        since.setDate(since.getDate() - (dayCount - 1));
        const res = await fetch(
          `/api/study/time-by-skill?since=${encodeURIComponent(since.toISOString())}`,
          { credentials: "same-origin" },
        );
        if (res.ok) {
          const json = (await res.json()) as { skills?: SkillTimeRow[] };
          skills = json.skills ?? [];
        }
      } catch {
        /* leave empty */
      }

      if (!cancelled) {
        setState({ loading: false, totalMinutes, skills, minutesByDay });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [window]);

  return state;
}
