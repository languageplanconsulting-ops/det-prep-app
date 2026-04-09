import type { ExamDifficulty } from "@/types/exams";

/** Perfect dictation score caps by difficulty (your spec). */
export const DICTATION_MAX: Record<ExamDifficulty, number> = {
  easy: 85,
  medium: 120,
  hard: 155,
};

/** Multiple-choice style: map correct count → 0–160 scale for a fixed total question count. */
export function mcqScoreTo160(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 160);
}

export function dictationScoreFromAccuracy(
  accuracy01: number,
  difficulty: ExamDifficulty,
): number {
  const cap = DICTATION_MAX[difficulty];
  const a = Math.max(0, Math.min(1, accuracy01));
  return Math.round(a * cap);
}
