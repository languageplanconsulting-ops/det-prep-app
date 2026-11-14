/**
 * Conversation explanations are one dense Thai paragraph in a fixed shape:
 *   "Keyword = major in (เรียนเอก) ข้อ 2 ถูก เพราะ … ข้อ 1 ผิดเพราะ … ข้อ 3 …"
 * Split into the keyword and one reason per option so they can be shown as a highlighted
 * keyword + bullets, and so a wrong pick can show just *its own* reason as a hint.
 */
export type ParsedExplanation = {
  keyword: string | null;
  /** Reason per option, keyed by 1-based option number. */
  reasons: Map<number, string>;
  /** Anything that didn't fit the pattern (shown as-is). */
  rest: string | null;
};

export function parseExplanation(text: string | null | undefined): ParsedExplanation {
  const src = (text ?? "").replace(/\s+/g, " ").trim();
  const reasons = new Map<number, string>();
  if (!src) return { keyword: null, reasons, rest: null };

  const firstItem = src.search(/ข้อ\s*\d+/);
  const head = firstItem >= 0 ? src.slice(0, firstItem).trim() : src;
  const keywordMatch = head.match(/^Keyword\s*[=:]\s*(.+)$/i);
  const keyword = keywordMatch ? keywordMatch[1]!.trim() : null;

  if (firstItem >= 0) {
    const body = src.slice(firstItem);
    const re = /ข้อ\s*(\d+)\s*/g;
    const marks: { n: number; start: number; end: number }[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(body))) marks.push({ n: Number(m[1]), start: m.index, end: re.lastIndex });
    marks.forEach((mk, i) => {
      const chunk = body.slice(mk.end, i + 1 < marks.length ? marks[i + 1]!.start : body.length).trim();
      if (chunk && !reasons.has(mk.n)) reasons.set(mk.n, tidyReason(chunk));
    });
  }

  const rest = !keyword && reasons.size === 0 ? src : !keyword && head ? head : null;
  return { keyword, reasons, rest };
}

/** "ถูก เพราะ X" / "ผิดเพราะ X" → "X" (the ✓/✗ icon already says right or wrong). */
function tidyReason(s: string): string {
  return s.replace(/^(ถูก|ผิด)\s*(เพราะ)?\s*/, "").trim();
}
