/**
 * Pronunciation matching for the speak lessons — ported from
 * det-mobile/src/lib/readspeak.ts. Order-preserving word match (LCS),
 * robust to extra/missing words in the transcript. Punctuation/case ignored.
 */

export const PRONUNCIATION_PASS = 90;

export function normalizeWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

function lcsMatchedTargetIndices(target: string[], spoken: string[]): Set<number> {
  const n = target.length;
  const m = spoken.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i]![j] = target[i - 1] === spoken[j - 1] ? dp[i - 1]![j - 1]! + 1 : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
    }
  }
  const matched = new Set<number>();
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (target[i - 1] === spoken[j - 1]) {
      matched.add(i - 1);
      i--;
      j--;
    } else if (dp[i - 1]![j]! >= dp[i]![j - 1]!) {
      i--;
    } else {
      j--;
    }
  }
  return matched;
}

export type PronunciationResult = {
  pct: number;
  words: string[];
  missedIdx: number[];
};

/** Score a spoken transcript against the target answer (0–100, punctuation ignored). */
export function pronunciationScore(target: string, spoken: string): PronunciationResult {
  const words = normalizeWords(target);
  const sp = normalizeWords(spoken);
  if (words.length === 0) return { pct: 0, words, missedIdx: [] };
  const matched = lcsMatchedTargetIndices(words, sp);
  const pct = Math.round((matched.size / words.length) * 100);
  const missedIdx = words.map((_, i) => i).filter((i) => !matched.has(i));
  return { pct, words, missedIdx };
}
