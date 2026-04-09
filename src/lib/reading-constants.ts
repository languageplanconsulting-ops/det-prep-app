import type { ReadingDifficulty, ReadingRoundNum } from "@/types/reading";

export const READING_HUB_SET_COUNT = 8;

export const READING_DIFFICULTIES: ReadingDifficulty[] = ["easy", "medium", "hard"];

export const READING_ROUND_NUMBERS: ReadingRoundNum[] = [1, 2, 3, 4, 5];

/** Target number of exams per set (content guideline). */
export const READING_RECOMMENDED_EXAMS_PER_SET = 10;

export const READING_DIFFICULTY_MAX: Record<ReadingDifficulty, number> = {
  easy: 85,
  medium: 120,
  hard: 140,
};

export const READING_DIFFICULTY_LABEL: Record<ReadingDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export function parseDifficultyParam(s: string): ReadingDifficulty | null {
  if (s === "easy" || s === "medium" || s === "hard") return s;
  return null;
}

export function parseExamNumberParam(s: string): number | null {
  const n = Number.parseInt(s, 10);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}
