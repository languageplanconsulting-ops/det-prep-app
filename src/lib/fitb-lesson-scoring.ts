/**
 * Fill-in-blanks scoring for lesson "fill" mode — ported from
 * det-mobile/src/lib/fitb-scoring.ts. Typed answer = prefix + remainder,
 * compared to correctWord (case/space/punct-insensitive). Exact = full
 * credit, 1–2 letters off = "close" (half credit), else wrong.
 */

export function normalizeWord(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

export type MissingWord = {
  correctWord: string;
  clue?: string;
  synonyms?: string[];
  prefix_length?: number;
  explanationThai?: string;
};

export type FitbGrade = "exact" | "close" | "wrong";

export type FitbMark = {
  input: string;
  correctWord: string;
  explanationThai: string;
  grade: FitbGrade;
  ok: boolean;
};

export type FitbScore = {
  pct: number;
  correct: number;
  total: number;
  marks: FitbMark[];
};

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  return dp[m]![n]!;
}

export function fitbPrefixLength(w: MissingWord): number {
  const raw = w.prefix_length ?? 1;
  return Math.max(1, Math.min(5, Math.min(raw, w.correctWord.length)));
}
export function fitbPrefix(w: MissingWord): string {
  return w.correctWord.slice(0, fitbPrefixLength(w));
}
export function fitbRemainderLength(w: MissingWord): number {
  return Math.max(0, w.correctWord.length - fitbPrefixLength(w));
}

/** `answers[i]` is the FULL assembled word (prefix + typed remainder). */
export function scoreFitb(answers: string[], words: MissingWord[]): FitbScore {
  const marks: FitbMark[] = words.map((w, i) => {
    const input = answers[i] ?? "";
    const norm = normalizeWord(input);
    const target = normalizeWord(w.correctWord);
    let grade: FitbGrade = "wrong";
    if (norm.length > 0) {
      if (norm === target) grade = "exact";
      else {
        const d = levenshtein(norm, target);
        if (d >= 1 && d <= 2) grade = "close";
      }
    }
    return {
      input,
      correctWord: w.correctWord,
      explanationThai: w.explanationThai ?? "",
      grade,
      ok: grade === "exact",
    };
  });
  const points = marks.reduce((s, m) => s + (m.grade === "exact" ? 1 : m.grade === "close" ? 0.5 : 0), 0);
  return {
    pct: words.length ? Math.round((points / words.length) * 100) : 0,
    correct: marks.filter((m) => m.grade === "exact").length,
    total: words.length,
    marks,
  };
}
