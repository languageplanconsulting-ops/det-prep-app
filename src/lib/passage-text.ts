/**
 * Word-level tokenizing helpers shared by the reading-skill lesson runners
 * (missing-paragraph, find-info, main-idea) — ported verbatim from
 * det-mobile/src/lib/passage-text.ts (pure, no RN dependency).
 */

export type PassageWordToken = { text: string; start: number; end: number };

export function wordTokens(text: string): PassageWordToken[] {
  const tokens: PassageWordToken[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) tokens.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  return tokens;
}

/** The inclusive word-index range [start,end] that an exact-substring phrase occupies within text, or null if not found. */
export function phraseWordRange(text: string, phrase: string): [number, number] | null {
  const idx = text.indexOf(phrase);
  if (idx < 0) return null;
  const endChar = idx + phrase.length;
  const tokens = wordTokens(text);
  let start = -1;
  let end = -1;
  tokens.forEach((t, i) => {
    if (t.end > idx && t.start < endChar) {
      if (start < 0) start = i;
      end = i;
    }
  });
  return start < 0 ? null : [start, end];
}
