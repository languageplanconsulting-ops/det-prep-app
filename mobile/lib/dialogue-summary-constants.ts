export const DIALOGUE_SUMMARY_MAX_SCORE = 160;
export const DIALOGUE_SUMMARY_MIN_WORDS = 20;

export const DIALOGUE_SUMMARY_DIFFICULTIES = ["easy", "medium", "hard"] as const;

export const DIALOGUE_SUMMARY_MAX_SCORES: Record<
  (typeof DIALOGUE_SUMMARY_DIFFICULTIES)[number],
  number
> = {
  easy: DIALOGUE_SUMMARY_MAX_SCORE,
  medium: DIALOGUE_SUMMARY_MAX_SCORE,
  hard: DIALOGUE_SUMMARY_MAX_SCORE,
};
