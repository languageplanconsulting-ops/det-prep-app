import type { DictationDifficulty } from "./types";

export const DICTATION_MAX_SCORE: Record<DictationDifficulty, number> = {
  easy: 85,
  medium: 125,
  hard: 160,
};

export const DICTATION_DIFFICULTIES: DictationDifficulty[] = ["easy", "medium", "hard"];

export const DICTATION_ROUNDS = [1, 2, 3, 4, 5] as const;
