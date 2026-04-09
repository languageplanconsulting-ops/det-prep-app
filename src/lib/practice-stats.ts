/** Placeholder aggregates — wire to backend / local storage later. */

export interface PracticeDay {
  date: string;
  minutes: number;
}

export const MOCK_PRACTICE_SERIES: PracticeDay[] = [
  { date: "2026-03-29", minutes: 12 },
  { date: "2026-03-30", minutes: 0 },
  { date: "2026-03-31", minutes: 25 },
  { date: "2026-04-01", minutes: 18 },
  { date: "2026-04-02", minutes: 40 },
  { date: "2026-04-03", minutes: 8 },
  { date: "2026-04-04", minutes: 15 },
];

export function sumMinutes(days: PracticeDay[]): number {
  return days.reduce((a, d) => a + d.minutes, 0);
}

export interface PracticePulseChartPoint {
  label: string;
  value: number;
}

/**
 * Derives daily / weekly / total minutes and chart points from a date-ordered series
 * (typically last 7 local calendar days, oldest → newest).
 * Pass `totalMinutesAllTime` so Total matches all recorded sessions, not only the chart window.
 */
export function buildPracticePulseStats(
  series: PracticeDay[],
  totalMinutesAllTime?: number,
): {
  today: number;
  weekly: number;
  total: number;
  chartData: PracticePulseChartPoint[];
} {
  const last7 = series.slice(-7);
  const weekly = sumMinutes(last7);
  const today = last7[last7.length - 1]?.minutes ?? 0;
  const total =
    totalMinutesAllTime !== undefined ? totalMinutesAllTime : sumMinutes(series);
  const chartData = last7.map((d) => ({
    label: d.date.slice(5).replace("-", " "),
    value: d.minutes,
  }));
  return { today, weekly, total, chartData };
}

/** Last N local calendar days as YYYY-MM-DD (oldest first), using the browser calendar. */
export function lastNLocalDayKeys(n: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    keys.push(`${y}-${m}-${day}`);
  }
  return keys;
}
