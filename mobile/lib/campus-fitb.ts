export function normWord(v: string): string {
  return v.trim().toLowerCase();
}

/** Combine typed suffix with given prefix to form the full answer. */
export function combineFitbAnswer(
  typed: string,
  correctWord: string,
  prefixLength: number,
): string {
  const cleaned = (typed ?? "").trim();
  const correct = (correctWord ?? "").trim();
  if (!cleaned) return "";
  const lowered = cleaned.toLowerCase();
  if (lowered === correct.toLowerCase()) return correct.toLowerCase();
  const prefixLen = Math.max(0, prefixLength);
  const prefix = correct.slice(0, prefixLen);
  return `${prefix}${cleaned}`.toLowerCase();
}

export function gradeFitbAnswer(
  typed: string,
  correctWord: string,
  prefixLength: number,
): boolean {
  const combined = combineFitbAnswer(typed, correctWord, prefixLength);
  return combined === normWord(correctWord);
}

export function fitbPrefix(correctWord: string, prefixLength: number): {
  prefix: string;
  remainingLength: number;
} {
  const word = correctWord.trim();
  const prefixLen = Math.min(
    Math.max(1, Math.floor(prefixLength || 1)),
    5,
    word.length,
  );
  return {
    prefix: word.slice(0, prefixLen),
    remainingLength: Math.max(0, word.length - prefixLen),
  };
}
