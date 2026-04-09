import type { RealWordDifficulty, RealWordRoundNum } from "@/types/realword";

export const REALWORD_SET_COUNT = 20;
export const REALWORD_ROUND_COUNT = 5;

export const REALWORD_ROUND_NUMBERS: RealWordRoundNum[] = [1, 2, 3, 4, 5];

export const REALWORD_MAX_SCORE: Record<RealWordDifficulty, number> = {
  easy: 85,
  medium: 130,
  hard: 160,
};

export const REALWORD_DIFFICULTY_LABEL: Record<RealWordDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const REALWORD_DIFFICULTIES: RealWordDifficulty[] = ["easy", "medium", "hard"];
