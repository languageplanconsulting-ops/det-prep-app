import type { FitbDifficulty } from "@/types/fitb";
import { fitbMaxScore } from "@/lib/fitb-constants";

/** Split passage on [BLANK n] markers (flexible spacing). */
export function splitFitbPassage(passage: string): { type: "text" | "blank"; value: string; blankIndex: number }[] {
  const re = /\[BLANK\s*(\d+)\]/gi;
  const parts: { type: "text" | "blank"; value: string; blankIndex: number }[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(passage)) !== null) {
    if (m.index > last) {
      parts.push({ type: "text", value: passage.slice(last, m.index), blankIndex: -1 });
    }
    const n = Number.parseInt(m[1]!, 10);
    parts.push({ type: "blank", value: m[0], blankIndex: Number.isFinite(n) ? n - 1 : -1 });
    last = m.index + m[0].length;
  }
  if (last < passage.length) {
    parts.push({ type: "text", value: passage.slice(last), blankIndex: -1 });
  }
  return parts;
}

export function countBlanksInPassage(passage: string): number {
  const re = /\[BLANK\s*\d+\]/gi;
  const matches = passage.match(re);
  return matches?.length ?? 0;
}

/** @deprecated Use calculateFitbDetScore from fitb-scoring for graded attempts. */
export function scoreForBlanks(
  correctCount: number,
  total: number,
  difficulty: FitbDifficulty = "hard",
): number {
  if (total <= 0) return 0;
  const max = fitbMaxScore(difficulty);
  return Math.round((correctCount / total) * max * 100) / 100;
}
