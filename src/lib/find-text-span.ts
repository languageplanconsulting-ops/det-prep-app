/** Locate a contiguous substring in text for highlight spans (NBSP-normalized). */
export function findTextSpan(fullText: string, quote: string): { start: number; end: number } | null {
  const q = quote.trim();
  if (!q) return null;
  let i = fullText.indexOf(q);
  if (i >= 0) return { start: i, end: i + q.length };
  const e2 = fullText.replace(/\u00a0/g, " ");
  const q2 = q.replace(/\u00a0/g, " ");
  i = e2.indexOf(q2);
  if (i >= 0) return { start: i, end: i + q2.length };
  return null;
}
