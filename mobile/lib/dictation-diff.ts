/** Same grading logic as web src/lib/dictation-diff.ts */

export type CharDisplayKind = "match" | "wrong" | "missing";

export interface CharDisplaySegment {
  kind: CharDisplayKind;
  ch?: string;
  expectedCh?: string;
}

export interface CharDiffResult {
  segments: CharDisplaySegment[];
  correctChars: number;
  totalChars: number;
}

type Trace = "diag" | "up" | "left";

function normalizeDictationCompareText(s: string): string {
  return s.replace(/\./g, "").toLowerCase();
}

export function diffDictationChars(expected: string, user: string): CharDiffResult {
  const e = normalizeDictationCompareText(expected);
  const u = normalizeDictationCompareText(user);
  const n = e.length;
  const m = u.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array.from({ length: m + 1 }, () => 0),
  );
  const parent: Trace[][] = Array.from({ length: n + 1 }, () =>
    Array.from({ length: m + 1 }, () => "diag"),
  );

  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const subCost = e[i - 1] === u[j - 1] ? 0 : 1;
      const diag = dp[i - 1][j - 1] + subCost;
      const up = dp[i - 1][j] + 1;
      const left = dp[i][j - 1] + 1;
      let best = diag;
      let tr: Trace = "diag";
      if (up < best) {
        best = up;
        tr = "up";
      }
      if (left < best) {
        best = left;
        tr = "left";
      }
      dp[i][j] = best;
      parent[i][j] = tr;
    }
  }

  const segments: CharDisplaySegment[] = [];
  let correctChars = 0;
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const tr = parent[i][j];
      if (tr === "diag") {
        if (e[i - 1] === u[j - 1]) {
          segments.push({ kind: "match", ch: u[j - 1] });
          correctChars += 1;
        } else {
          segments.push({ kind: "wrong", ch: u[j - 1] });
        }
        i -= 1;
        j -= 1;
        continue;
      }
      if (tr === "up") {
        segments.push({ kind: "missing", expectedCh: e[i - 1] });
        i -= 1;
        continue;
      }
      segments.push({ kind: "wrong", ch: u[j - 1] });
      j -= 1;
      continue;
    }
    if (i > 0) {
      segments.push({ kind: "missing", expectedCh: e[i - 1] });
      i -= 1;
    } else {
      segments.push({ kind: "wrong", ch: u[j - 1] });
      j -= 1;
    }
  }

  segments.reverse();
  return { segments, correctChars, totalChars: n };
}

export function dictationScoreFromDiff(
  correctChars: number,
  totalChars: number,
  maxScore: number,
): number {
  if (totalChars <= 0) return 0;
  const raw = (correctChars / totalChars) * maxScore;
  return Math.round(raw * 100) / 100;
}
