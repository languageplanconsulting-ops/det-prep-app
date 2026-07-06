/** AI-generated follow-up questions after the learner's own free-topic opener. */
export const SPEAKING_PARTNER_FOLLOWUP_COUNT = 5;

/** Opener (learner's own topic) + follow-ups. */
export const SPEAKING_PARTNER_TURN_COUNT = 1 + SPEAKING_PARTNER_FOLLOWUP_COUNT;

/** Gemini model for generating follow-up questions only (grading uses admin-selected model). */
export const SPEAKING_PARTNER_NEXT_QUESTION_GEMINI_MODEL = "gemini-2.5-flash-lite";

/** Countdown before recording starts (after the question is shown / audio plays). */
export const SPEAKING_PARTNER_PREP_SECONDS = 2;

/** Max speaking time per turn (seconds) — learner can also tap "finish answer" early. */
export const SPEAKING_PARTNER_MAX_SPEAK_SECONDS = 60;

/** Max findings surfaced per report section. */
export const SPEAKING_PARTNER_GRAMMAR_MAX_ITEMS = 20;
export const SPEAKING_PARTNER_VOCAB_MAX_ITEMS = 20;
export const SPEAKING_PARTNER_TRANSITION_MAX_ITEMS = 20;

/** How many recurring topics are tracked/shown per user. */
export const SPEAKING_PARTNER_WEAKNESS_TOP_N = 5;
