/**
 * R = count of real words in set
 * UR = user selected words that are real
 * M = user selected words that are fake (mistakes)
 * Score = max(0, ((UR - M) / R) * levelMax)
 */
export function realWordRunScore(UR: number, M: number, R: number, levelMax: number): number {
  if (R <= 0) return 0;
  const raw = ((UR - M) / R) * levelMax;
  const rounded = Math.round(raw * 100) / 100;
  return Math.max(0, rounded);
}

export function realWordCounts(args: {
  words: { is_real: boolean }[];
  selectedIndices: Set<number>;
}): { R: number; UR: number; M: number } {
  const { words, selectedIndices } = args;
  let R = 0;
  let UR = 0;
  let M = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i]!;
    if (w.is_real) R += 1;
    if (!selectedIndices.has(i)) continue;
    if (w.is_real) UR += 1;
    else M += 1;
  }
  return { R, UR, M };
}
