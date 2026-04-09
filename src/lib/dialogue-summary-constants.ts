import type { DialogueSummaryDifficulty, DialogueSummaryRoundNum } from "@/types/dialogue-summary";

export const DIALOGUE_SUMMARY_SET_COUNT = 40;
export const DIALOGUE_SUMMARY_ROUND_COUNT = 5;

export const DIALOGUE_SUMMARY_ROUND_NUMBERS: DialogueSummaryRoundNum[] = [1, 2, 3, 4, 5];

export const DIALOGUE_SUMMARY_MAX_SCORE = 160;

export const DIALOGUE_SUMMARY_DIFFICULTY_LABEL: Record<DialogueSummaryDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const DIALOGUE_SUMMARY_DIFFICULTIES: DialogueSummaryDifficulty[] = ["easy", "medium", "hard"];

/** Rubric weights (must sum to 1.0). Used with 0–100 subscores → ×1.6 → /160. */
export const DIALOGUE_SUMMARY_RUBRIC_WEIGHTS = {
  relevancy: 0.25,
  grammar: 0.3,
  flow: 0.2,
  vocabulary: 0.25,
} as const;

export const DIALOGUE_SUMMARY_MIN_WORDS = 20;
