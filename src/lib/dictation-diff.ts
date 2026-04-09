/**
 * Character-level alignment for report coloring + scoring.
 * Token-level alignment for Fix Mistakes (redeem) slots.
 */

export type CharDisplayKind = "match" | "wrong" | "missing";

export interface CharDisplaySegment {
  kind: CharDisplayKind;
  /** User character (wrong/extra) or matched character */
  ch?: string;
  /** Expected character when kind === missing */
  expectedCh?: string;
}

export interface CharDiffResult {
  segments: CharDisplaySegment[];
  correctChars: number;
  totalChars: number;
}

type Trace = "diag" | "up" | "left";

function normalizeDictationCompareText(s: string): string {
  // Dictation policy: ignore case and full stops, but keep commas and other punctuation.
  return s.replace(/\./g, "").toLowerCase();
}

/**
 * Levenshtein backtrace from expected → user; build user-ordered display with missing markers.
 */
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
  return {
    segments,
    correctChars,
    totalChars: n,
  };
}

export function dictationScoreFromDiff(correctChars: number, totalChars: number, maxScore: number): number {
  if (totalChars <= 0) return 0;
  const raw = (correctChars / totalChars) * maxScore;
  return Math.round(raw * 100) / 100;
}

/** Split into words, whitespace, and single punctuation marks for alignment. */
export function segmentDictationTokens(s: string): string[] {
  const parts: string[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      let j = i + 1;
      while (j < s.length && /\s/.test(s[j])) j += 1;
      parts.push(s.slice(i, j));
      i = j;
      continue;
    }
    if (/[A-Za-z0-9']/.test(c)) {
      let j = i + 1;
      while (j < s.length && /[A-Za-z0-9']/.test(s[j])) j += 1;
      parts.push(s.slice(i, j));
      i = j;
      continue;
    }
    parts.push(c);
    i += 1;
  }
  return parts;
}

export type RedeemSlot =
  | { type: "locked"; text: string }
  | {
      type: "input";
      expected: string;
      isPunctuation: boolean;
      isWhitespace: boolean;
      hintLetter: string | null;
    };

export interface TokenDiffResult {
  slots: RedeemSlot[];
}

function isPunctuationToken(t: string): boolean {
  if (!t || t.length !== 1) return false;
  return /[.,!?;:'"—–\-]/.test(t);
}

function isWhitespaceToken(t: string): boolean {
  return t.length > 0 && /^\s+$/.test(t);
}

function firstHintLetter(token: string): string | null {
  const m = token.match(/[A-Za-z]/);
  return m ? m[0]!.toUpperCase() : null;
}

/** Token-level Levenshtein backtrace → locked vs input slots for redeem UI. */
export function buildRedeemSlots(expected: string, user: string): TokenDiffResult {
  const eTok = segmentDictationTokens(normalizeDictationCompareText(expected));
  const uTok = segmentDictationTokens(normalizeDictationCompareText(user));
  const n = eTok.length;
  const m = uTok.length;
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
      const subCost = eTok[i - 1] === uTok[j - 1] ? 0 : 1;
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

  type Step =
    | { kind: "match"; et: string }
    | { kind: "sub"; et: string; ut: string }
    | { kind: "del"; et: string }
    | { kind: "ins"; ut: string };

  const steps: Step[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const tr = parent[i][j];
      if (tr === "diag") {
        if (eTok[i - 1] === uTok[j - 1]) steps.push({ kind: "match", et: eTok[i - 1]! });
        else steps.push({ kind: "sub", et: eTok[i - 1]!, ut: uTok[j - 1]! });
        i -= 1;
        j -= 1;
        continue;
      }
      if (tr === "up") {
        steps.push({ kind: "del", et: eTok[i - 1]! });
        i -= 1;
        continue;
      }
      steps.push({ kind: "ins", ut: uTok[j - 1]! });
      j -= 1;
      continue;
    }
    if (i > 0) {
      steps.push({ kind: "del", et: eTok[i - 1]! });
      i -= 1;
    } else {
      steps.push({ kind: "ins", ut: uTok[j - 1]! });
      j -= 1;
    }
  }
  steps.reverse();

  const slots: RedeemSlot[] = [];
  for (const st of steps) {
    if (st.kind === "match") {
      slots.push({ type: "locked", text: st.et });
    } else if (st.kind === "sub" || st.kind === "del") {
      const et = st.et;
      const punct = isPunctuationToken(et);
      const ws = isWhitespaceToken(et);
      slots.push({
        type: "input",
        expected: et,
        isPunctuation: punct,
        isWhitespace: ws,
        hintLetter: punct || ws ? null : firstHintLetter(et),
      });
    } else {
      /* insertion in user — no expected token; skip creating a slot (user extra) */
    }
  }

  return { slots };
}

/** Merge locked + fix values in input-slot order (re-check with char diff). */
export function mergeRedeemAnswers(slots: RedeemSlot[], fixes: string[]): string {
  let out = "";
  let k = 0;
  for (const slot of slots) {
    if (slot.type === "locked") out += slot.text;
    else {
      out += fixes[k] ?? "";
      k += 1;
    }
  }
  return out;
}
