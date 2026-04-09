import type { DictationDifficulty, DictationRoundNum } from "@/types/dictation";

export const DICTATION_SET_COUNT = 40;

export const DICTATION_DIFFICULTY_LABEL: Record<DictationDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const DICTATION_MAX_SCORE: Record<DictationDifficulty, number> = {
  easy: 85,
  medium: 125,
  hard: 160,
};

export const DICTATION_DIFFICULTIES: DictationDifficulty[] = ["easy", "medium", "hard"];

export const DICTATION_ROUND_NUMBERS: DictationRoundNum[] = [1, 2, 3, 4, 5];
