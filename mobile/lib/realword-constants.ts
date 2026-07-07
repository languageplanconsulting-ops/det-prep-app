import type { RealWordDifficulty } from "./types";

export const REALWORD_MAX_SCORE: Record<RealWordDifficulty, number> = {
  easy: 85,
  medium: 130,
  hard: 160,
};

export const REALWORD_DIFFICULTIES: RealWordDifficulty[] = ["easy", "medium", "hard"];
