/**
 * Timings follow the real Duolingo English Test; minimum word counts are the
 * grading routes' own limits (src/app/api/photo-speak-report, writing-report).
 */
export const PRODUCTION_MAX_SCORE = 160;

/** Write About the Photo: 1 minute to write. */
export const WRITE_PHOTO_SECONDS = 60;
/** Speak About the Photo: 20 s to prepare, then 30–90 s of speaking. */
export const SPEAK_PHOTO_PREP_SECONDS = 20;
export const SPEAK_PHOTO_MIN_SECONDS = 30;
export const SPEAK_PHOTO_MAX_SECONDS = 90;
/** Both photo tasks: the grader rejects fewer than 15 words. */
export const PHOTO_MIN_WORDS = 15;

/** Read, Then Write: 5 minutes, at least 50 words. */
export const ESSAY_WRITE_SECONDS = 5 * 60;
export const ESSAY_MIN_WORDS = 50;

/** The website groups photo items into rounds of 10 by sort_order. */
export const PHOTO_ITEMS_PER_ROUND = 10;

export function photoRoundNumber(sortOrder: number): number {
  return Math.floor(sortOrder / PHOTO_ITEMS_PER_ROUND) + 1;
}

/**
 * practice_attempts task types — the names the website's study plan and
 * weakness scoring read (src/lib/study-plan/weakness-vector.ts).
 */
export const PRODUCTION_TASK_TYPE = {
  writePhoto: "write_about_photo",
  speakPhoto: "speak_about_photo",
  essay: "read_and_write",
} as const;

/** Same `<task>:<id>` shape the interactive-speaking route writes. */
export function productionContentKey(taskType: string, id: string): string {
  return `${taskType}:${id}`;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** 65 → "1:05". */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function randomAttemptId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
