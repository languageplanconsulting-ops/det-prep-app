import type { FitbDifficulty } from "./types";

export const FITB_MAX_SCORE: Record<FitbDifficulty, number> = {
  easy: 80,
  medium: 115,
  hard: 140,
};

export function fitbMaxScore(d: FitbDifficulty): number {
  return FITB_MAX_SCORE[d];
}

export const FITB_DIFFICULTIES: FitbDifficulty[] = ["easy", "medium", "hard"];
export const PRACTICE_ROUNDS = [1, 2, 3, 4, 5] as const;
