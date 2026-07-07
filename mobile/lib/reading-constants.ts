import type { ReadingDifficulty } from "./types";

export const READING_DIFFICULTY_MAX: Record<ReadingDifficulty, number> = {
  easy: 85,
  medium: 120,
  hard: 140,
};

export const READING_DIFFICULTIES: ReadingDifficulty[] = ["easy", "medium", "hard"];
