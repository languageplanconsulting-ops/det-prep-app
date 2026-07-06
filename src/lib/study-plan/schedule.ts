/**
 * Pure calendar generator for the exam-date study plan.
 *
 * Kept identical (by hand) in the mobile app at
 * det-mobile/src/lib/study-plan-schedule.ts so both apps render the same
 * calendar from the same `study_plan_schedules` row. No I/O, no Date.now() —
 * everything is driven by the ISO date strings passed in.
 */

export type TierOrMock = 5 | 10 | 20 | 30 | 60;

export type ScheduleInput = {
  /** ISO "YYYY-MM-DD", inclusive. Usually today. */
  startDate: string;
  /** ISO "YYYY-MM-DD", inclusive. */
  examDate: string;
  /** 1 = every day, 2 = every 2 days, 3 = every 3 days, etc. */
  cadenceDays: number;
  /** The user's usual session length; used on non-mock study days. */
  defaultDurationMinutes: Exclude<TierOrMock, 60>;
};

export type CalendarDay = {
  date: string;
  isStudyDay: boolean;
  /** null on non-study days. 60 means "recommended: full mock test". */
  recommendedTier: TierOrMock | null;
  isMockTestDay: boolean;
  daysUntilExam: number;
};

/** Inside this many days of the exam, the plan starts recommending mock tests. */
const FINAL_STRETCH_DAYS = 14;
/** How many mock-test days to place per 7-day window once in the final stretch. */
const MOCK_TESTS_PER_WEEK = 2;

function toUtcDay(iso: string): number {
  return Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);
}

function fromUtcDay(day: number): string {
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Build the full day-by-day calendar from `startDate` to `examDate` (inclusive).
 * Deterministic and pure — safe to call from a Server Component or a script.
 */
export function generateCalendar(input: ScheduleInput): CalendarDay[] {
  const cadence = Math.max(1, Math.round(input.cadenceDays));
  const startDay = toUtcDay(input.startDate);
  const examDay = toUtcDay(input.examDate);
  if (examDay < startDay) return [];

  const days: CalendarDay[] = [];
  let stretchStudyDayIndex = 0;

  for (let d = startDay; d <= examDay; d++) {
    const offset = d - startDay;
    const isStudyDay = offset % cadence === 0;
    const daysUntilExam = examDay - d;
    const inFinalStretch = daysUntilExam <= FINAL_STRETCH_DAYS && daysUntilExam >= 0;

    let isMockTestDay = false;
    if (isStudyDay && inFinalStretch) {
      isMockTestDay = stretchStudyDayIndex % 7 < MOCK_TESTS_PER_WEEK;
      stretchStudyDayIndex++;
    }

    days.push({
      date: fromUtcDay(d),
      isStudyDay,
      recommendedTier: !isStudyDay ? null : isMockTestDay ? 60 : input.defaultDurationMinutes,
      isMockTestDay,
      daysUntilExam,
    });
  }

  return days;
}

/** Convenience: just today's entry (or null if today is outside the plan window). */
export function todaysCalendarEntry(input: ScheduleInput, todayIso: string): CalendarDay | null {
  return generateCalendar(input).find((d) => d.date === todayIso) ?? null;
}
