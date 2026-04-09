import type { FitbMissingWord } from "@/types/fitb";

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

const FALLBACK_DISTRACTORS = ["context", "structure", "analysis", "framework", "capacity", "evidence"];

/** Four choices: correct + distractors from other blanks, synonyms, or fallbacks. */
export function buildFitbMcqOptions(
  blankIndex: number,
  missingWords: FitbMissingWord[],
): string[] {
  const mw = missingWords[blankIndex];
  if (!mw) return ["—", "—", "—", "—"];
  const correct = mw.correctWord.trim();
  const pool = new Set<string>();
  missingWords.forEach((w, i) => {
    if (i === blankIndex) return;
    const t = w.correctWord.trim();
    if (t && t.toLowerCase() !== correct.toLowerCase()) pool.add(t);
  });
  mw.synonyms?.forEach((s) => {
    const t = s.trim();
    if (t && t.toLowerCase() !== correct.toLowerCase()) pool.add(t);
  });
  pool.delete(correct);
  const fromSet = [...pool].filter(Boolean);
  shuffleInPlace(fromSet);
  const picks: string[] = [];
  for (const p of fromSet) {
    if (picks.length >= 3) break;
    if (!picks.includes(p)) picks.push(p);
  }
  let f = 0;
  while (picks.length < 3) {
    const d = FALLBACK_DISTRACTORS[f % FALLBACK_DISTRACTORS.length]!;
    f += 1;
    if (!picks.includes(d) && d !== correct) picks.push(d);
  }
  return shuffleInPlace([correct, ...picks.slice(0, 3)]);
}

export function prefixHint(word: string, prefixLen: number): string {
  const w = word.trim();
  if (!w) return "____";
  const n = Math.min(Math.max(0, prefixLen), w.length);
  const head = w.slice(0, n);
  return `${head}${"_".repeat(Math.max(4, w.length - n))}`;
}
