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
  /** No real deadline — just log practice on the chosen cadence, no mock-test escalation. */
  isFreeform?: boolean;
};

export type CalendarDay = {
  date: string;
  isStudyDay: boolean;
  /** null on non-study days. 60 means "recommended: full mock test". */
  recommendedTier: TierOrMock | null;
  isMockTestDay: boolean;
  daysUntilExam: number;
  /** One-line Thai explanation of why this day is what it is — shown in the UI, not left implicit. */
  reason: string | null;
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
    const inFinalStretch = !input.isFreeform && daysUntilExam <= FINAL_STRETCH_DAYS && daysUntilExam >= 0;

    let isMockTestDay = false;
    if (isStudyDay && inFinalStretch) {
      isMockTestDay = stretchStudyDayIndex % 7 < MOCK_TESTS_PER_WEEK;
      stretchStudyDayIndex++;
    }

    let reason: string | null = null;
    if (input.isFreeform) {
      reason = isStudyDay ? "วันฝึกตามความถี่ที่ตั้งไว้ — ไม่ผูกกับวันสอบ ฝึกเมื่อไหร่ก็นับ" : null;
    } else if (isMockTestDay) {
      reason = `เหลือ ${daysUntilExam} วันก่อนสอบ — ช่วงนี้ควรฝึกทำข้อสอบจำลองให้ชินกับรูปแบบจริง`;
    } else if (isStudyDay) {
      reason = "วันฝึกตามแผนที่ตั้งไว้";
    }

    days.push({
      date: fromUtcDay(d),
      isStudyDay,
      recommendedTier: !isStudyDay ? null : isMockTestDay ? 60 : input.defaultDurationMinutes,
      isMockTestDay,
      daysUntilExam,
      reason,
    });
  }

  return days;
}

/** Convenience: just today's entry (or null if today is outside the plan window). */
export function todaysCalendarEntry(input: ScheduleInput, todayIso: string): CalendarDay | null {
  return generateCalendar(input).find((d) => d.date === todayIso) ?? null;
}

/**
 * Current consecutive-day streak ending today. If today has no activity yet,
 * counts from yesterday backwards so the streak doesn't drop to zero before
 * the day is even over — the whole point is "protect this," not punish early.
 */
export function computeStreak(activityDates: Set<string>, todayIso: string): number {
  const todayDay = toUtcDay(todayIso);
  let cursor = activityDates.has(todayIso) ? todayDay : todayDay - 1;
  let streak = 0;
  while (activityDates.has(fromUtcDay(cursor))) {
    streak++;
    cursor--;
  }
  return streak;
}

/** How many scheduled study days were missed (no activity) in the trailing window before today — used to bias today's recommendation up, not to punish. */
export function computeMissedRecent(
  days: CalendarDay[],
  activityDates: Set<string>,
  todayIso: string,
  windowDays = 7,
): number {
  const todayDay = toUtcDay(todayIso);
  let missed = 0;
  for (const d of days) {
    const dDay = toUtcDay(d.date);
    if (dDay >= todayDay || dDay < todayDay - windowDays) continue;
    if (d.isStudyDay && !activityDates.has(d.date)) missed++;
  }
  return missed;
}

/** Bump a tier up one notch for a gentle catch-up nudge (never past 30 — mock-test days are left alone). */
export function bumpTierForCatchUp(tier: Exclude<TierOrMock, 60>): Exclude<TierOrMock, 60> {
  if (tier === 5) return 10;
  if (tier === 10) return 20;
  return 30;
}
