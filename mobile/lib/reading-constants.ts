import type { ReadingDifficulty } from "./types";

export const READING_DIFFICULTY_MAX: Record<ReadingDifficulty, number> = {
  easy: 85,
  medium: 120,
  hard: 140,
};

export const READING_DIFFICULTIES: ReadingDifficulty[] = ["easy", "medium", "hard"];

/** Round 5 was retired for reading; it is hidden on mobile just as on the web. */
export const READING_ROUNDS = [1, 2, 3, 4] as const;
