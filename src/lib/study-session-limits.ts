/**
 * Ceiling for a single study session's recorded time-on-task, in seconds.
 *
 * Time is accumulated client-side as *visible tab* seconds, so a tab left open
 * and idle (or a device that never sleeps) can inflate one session to many
 * hours — real data has held sessions of 62h and even ~1019h, enough to make a
 * day total exceed 24h. 90 minutes comfortably covers any legitimate single
 * exercise (including a full mock test) while discarding runaway idle time.
 *
 * Enforced in three places, all using this constant:
 *   - write time:      /api/study/session PATCH & PUT clamp before storing
 *   - client tracker:  StudyTracker pauses its clock after inactivity
 *   - read/aggregation: admin user-journey (and the backfill) clamp on the way out
 */
export const MAX_STUDY_SESSION_SECONDS = 90 * 60;

/**
 * How long (ms) the client tracker keeps counting with zero user interaction
 * before it pauses the visible-time clock. Longer than any single reading or
 * dictation task, so genuine study time is never undercounted, but short enough
 * that an abandoned open tab stops accruing time quickly.
 */
export const STUDY_IDLE_PAUSE_MS = 10 * 60 * 1000;
