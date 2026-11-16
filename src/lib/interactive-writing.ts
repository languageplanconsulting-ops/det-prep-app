/**
 * DET "Interactive Writing" — the format the real test has used since 2 April 2024, when it replaced
 * Read, Then Write. Timings were checked on the real DET practice test (Nov 2026): 30 s to read the
 * prompt, 5 min for the main response, then ONE follow-up question that appears only after the main
 * response is submitted, answered in 3 min. Both parts are scored together.
 *
 * Mobile keeps its own copy in mobile/lib/interactive-writing.ts (separate tsconfig).
 */
export const IW_PREP_SECONDS = 30;
export const IW_MAIN_SECONDS = 5 * 60;
export const IW_FOLLOW_SECONDS = 3 * 60;
/** The grader needs this much text across both parts. */
export const IW_MIN_TOTAL_WORDS = 50;

export const IW_LAUNCH_TH = "2 เมษายน 2024";
export const IW_LAUNCH_EN = "2 April 2024";

export type WritingPracticeMode = "interactive" | "standard";
