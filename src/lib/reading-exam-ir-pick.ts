/**
 * Which Interactive Reading passage a reading-EXAM slot opens.
 *
 * The exam (/practice/comprehension/reading/round/…) and the mobile app's exam screen both run the
 * bank in `interactive-reading-data.ts`, not the exam's own uploaded content (see
 * ReadingSessionGate for why). They must open the SAME passage for the same round/difficulty/set/
 * exam, or a score synced from the phone would belong to a different text than the one the web
 * shows. So the selection lives here and both the web page and /api/practice/content/interactive-reading
 * call it — never copy the formula.
 *
 * Server-only in practice: importing this pulls in the whole bank (~550 KB), so call it from a
 * server component or route and hand the one picked set to the client.
 */
import { irSetsByTier, type IrSet, type IrTier } from "@/lib/interactive-reading";
import type { ReadingDifficulty } from "@/types/reading";

export function readingDifficultyToIrTier(difficulty: ReadingDifficulty): IrTier {
  return difficulty === "easy" ? "easy" : difficulty === "hard" ? "advanced" : "medium";
}

/** Deterministic: the same round/set/exam always opens the same passage of the tier's pool. */
export function readingExamIrIndex(round: number, setNumber: number, examNumber: number, poolLength: number): number {
  if (poolLength <= 0) return -1;
  const raw = (round - 1) * 97 + (setNumber - 1) * 13 + (examNumber - 1);
  return ((raw % poolLength) + poolLength) % poolLength;
}

export function pickReadingExamIrSet(args: {
  round: number;
  difficulty: ReadingDifficulty;
  setNumber: number;
  examNumber: number;
}): IrSet | null {
  const pool = irSetsByTier(readingDifficultyToIrTier(args.difficulty));
  const idx = readingExamIrIndex(args.round, args.setNumber, args.examNumber, pool.length);
  return idx >= 0 ? (pool[idx] ?? null) : null;
}
