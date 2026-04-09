import type { FitbDifficulty, FitbRoundNum } from "@/types/fitb";

// Raised to support larger admin imports (e.g. set_med_41 ... set_med_50).
export const FITB_SET_COUNT = 60;
export const FITB_MAX_BLANKS = 50;

/** DET caps by difficulty (spec). */
export const FITB_MAX_SCORE: Record<FitbDifficulty, number> = {
  easy: 80,
  medium: 115,
  hard: 140,
};

export function fitbMaxScore(d: FitbDifficulty): number {
  return FITB_MAX_SCORE[d];
}

export const FITB_DIFFICULTY_LABEL: Record<FitbDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const FITB_DIFFICULTIES: FitbDifficulty[] = ["easy", "medium", "hard"];

export const FITB_ROUND_NUMBERS: FitbRoundNum[] = [1, 2, 3, 4, 5];
