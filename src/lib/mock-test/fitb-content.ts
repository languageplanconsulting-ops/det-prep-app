/**
 * Fill-in-the-blank content helpers (mock test: fill_in_blanks, real_english_word).
 *
 * Legacy: `sentence` + `options` (4).
 * Prefix mode: `blank_prefix` (or `prefix`), 1–6 chars + optional `sentence_before` / `sentence_after` / `blank_hint`.
 */

const PREFIX_LEN = { min: 1, max: 6 } as const;

export function parseFitbBlankPrefix(content: Record<string, unknown>): string | null {
  const raw = content.blank_prefix ?? content.prefix;
  if (raw == null || raw === "") return null;
  if (typeof raw !== "string") return null;
  const p = raw.trim();
  if (p.length < PREFIX_LEN.min || p.length > PREFIX_LEN.max) return null;
  return p;
}

/** Max suffix length after prefix across options (for underscore run). */
export function fitbMaxGapLetters(options: string[], prefix: string): number {
  const pl = prefix.length;
  let m = 1;
  for (const o of options) {
    if (o.length > pl) m = Math.max(m, o.length - pl);
  }
  return m;
}
