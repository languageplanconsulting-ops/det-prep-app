/** AI-generated follow-up questions after the admin opening question. */
export const INTERACTIVE_SPEAKING_FOLLOWUP_COUNT = 5;

/** Opening question + follow-ups (admin provides turn 1 only). */
export const INTERACTIVE_SPEAKING_TURN_COUNT = 1 + INTERACTIVE_SPEAKING_FOLLOWUP_COUNT;

/** Gemini model for generating follow-up questions only (grading uses admin-selected model). */
export const INTERACTIVE_SPEAKING_NEXT_QUESTION_GEMINI_MODEL = "gemini-2.5-flash-lite";

/** Countdown before recording starts (after the question is shown / audio plays). */
export const INTERACTIVE_SPEAKING_PREP_SECONDS = 3;

/** Max speaking time per turn (seconds). */
export const INTERACTIVE_SPEAKING_MAX_SPEAK_SECONDS = 35;

export const INTERACTIVE_SPEAKING_STORAGE_KEY = "ep-interactive-speaking-scenarios-v1";
export const INTERACTIVE_SPEAKING_REPORT_PREFIX = "ep-interactive-speaking-report:";
