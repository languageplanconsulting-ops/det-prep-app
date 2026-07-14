"use client";

/**
 * Same-tab session state for "today's assigned practice queue" — set once when the user
 * picks a duration from the study-plan calendar card, then read by DailyQueueBanner on every
 * subsequent exercise page so finishing one item can hand off to the next without touching any
 * of the individual skill runner pages themselves.
 */
export type DailyQueueState = {
  hrefs: string[];
  index: number;
  /** The tier this queue was built for — recorded as tier_completed on the completions row. */
  tierMinutes: 5 | 10 | 20 | 30;
  /** ISO "YYYY-MM-DD" the queue was started on (today), used as completion_date. */
  dateIso: string;
  /** epoch ms when the run started — powers the "minutes practised" stat on the finish report. */
  startedAt?: number;
  /** per-step emoji + label, for the "topics covered" list on the finish report. */
  items?: { emoji: string; label: string }[];
};

const STORAGE_KEY = "ep-daily-queue";

export function getActiveDailyQueue(): DailyQueueState | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DailyQueueState) : null;
  } catch {
    return null;
  }
}

export function setActiveDailyQueue(state: DailyQueueState): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function clearActiveDailyQueue(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** True if `pathname` (no query string, as returned by next/navigation's usePathname) is the
 * href the queue currently expects the learner to be on. */
export function isOnCurrentQueueStep(state: DailyQueueState, pathname: string): boolean {
  return state.hrefs[state.index] === pathname;
}
