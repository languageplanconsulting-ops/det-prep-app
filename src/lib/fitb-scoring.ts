import type { FitbBlankGrade, FitbDifficulty, FitbMissingWord } from "@/types/fitb";
import { fitbMaxScore } from "@/lib/fitb-constants";

/** Penalty multiplier when learner used the clue for that blank. */
export const FITB_CLUE_SCORE_FACTOR = 0.85;

export function clampFitbPrefixLength(raw: number, wordLen: number): number {
  const n = Math.floor(Number.isFinite(raw) ? raw : 1);
  const clamped = Math.min(5, Math.max(1, n));
  return Math.min(clamped, Math.max(0, wordLen));
}

export function fitbExpectedPrefix(mw: FitbMissingWord): string {
  const w = mw.correctWord.trim();
  const pl = clampFitbPrefixLength(mw.prefix_length, w.length);
  return w.slice(0, pl);
}

export function fitbRemainderLength(mw: FitbMissingWord): number {
  const w = mw.correctWord.trim();
  const pl = clampFitbPrefixLength(mw.prefix_length, w.length);
  return Math.max(0, w.length - pl);
}

export function normalizeFitbCompare(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j]!;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[n]!;
}

/** User types only the part after the fixed prefix. */
export function assembleFitbAttempt(mw: FitbMissingWord, remainderTyped: string): string {
  return fitbExpectedPrefix(mw) + remainderTyped.trim();
}

export function gradeFitbBlank(mw: FitbMissingWord, remainderTyped: string): FitbBlankGrade {
  const correct = normalizeFitbCompare(mw.correctWord);
  const attempt = normalizeFitbCompare(assembleFitbAttempt(mw, remainderTyped));
  if (attempt === correct) return "exact";
  const d = levenshtein(attempt, correct);
  if (d >= 1 && d <= 2) return "close";
  return "wrong";
}

export function blankPointsForGrade(grade: FitbBlankGrade): number {
  if (grade === "exact") return 1;
  if (grade === "close") return 0.5;
  return 0;
}

/**
 * DET score: each blank has equal weight toward level max.
 * Exact = full weight, close = half, wrong = 0; clue multiplies that blank's earned points.
 */
export function calculateFitbDetScore(args: {
  grades: FitbBlankGrade[];
  clueUsed: boolean[];
  difficulty: FitbDifficulty;
}): number {
  const { grades, clueUsed, difficulty } = args;
  const n = grades.length;
  if (n === 0) return 0;
  const max = fitbMaxScore(difficulty);
  const per = max / n;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const g = grades[i]!;
    const base = per * blankPointsForGrade(g);
    const factor = clueUsed[i] ? FITB_CLUE_SCORE_FACTOR : 1;
    sum += base * factor;
  }
  return Math.round(sum * 100) / 100;
}

/** Redeem / lock: only exact counts as “correct” for keeping filled. */
export function gradesToExactLocks(grades: FitbBlankGrade[]): boolean[] {
  return grades.map((g) => g === "exact");
}
