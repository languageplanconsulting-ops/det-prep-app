/** A highlighted word/phrase from a reading exam's vocabulary list. */
export type HighlightVocab = {
  word: string;
  meaningEn: string;
  meaningTh: string;
  example: string;
};

const STAR_RE = /\*\*([^*]+)\*\*/g;

/** Remove `**` highlight markers, keeping the words (for options, questions, report rows). */
export function stripStars(text: string | null | undefined): string {
  return (text ?? "").replace(STAR_RE, "$1");
}

export type StarSegment = { text: string; highlight: boolean };

/** Split passage text into plain and `**highlighted**` segments. */
export function splitStars(text: string | null | undefined): StarSegment[] {
  const src = text ?? "";
  const out: StarSegment[] = [];
  let last = 0;
  for (const m of src.matchAll(STAR_RE)) {
    const start = m.index ?? 0;
    if (start > last) out.push({ text: src.slice(last, start), highlight: false });
    out.push({ text: m[1]!, highlight: true });
    last = start + m[0].length;
  }
  if (last < src.length) out.push({ text: src.slice(last), highlight: false });
  return out;
}

/**
 * Rough root of an English word so inflected phrasal verbs in the passage
 * ("dying out", "ironing out", "hinges on") match their dictionary form
 * ("die out", "iron out", "hinge on").
 */
function stem(token: string): string {
  let w = token.toLowerCase().replace(/[^a-z'-]/g, "");
  if (w.endsWith("ying") && w.length >= 5) w = `${w.slice(0, -4)}ie`;
  else if (w.endsWith("ing") && w.length > 5) w = w.slice(0, -3);
  else if (w.endsWith("ed") && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith("es") && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith("s") && w.length > 3) w = w.slice(0, -1);
  if (w.endsWith("e") && w.length > 2) w = w.slice(0, -1);
  return w;
}

function tokens(phrase: string): string[] {
  return phrase.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/** The vocabulary entry for a highlighted phrase: exact match first, then by word roots. */
export function findVocab(
  phrase: string,
  vocab: HighlightVocab[] | null | undefined,
): HighlightVocab | null {
  const list = vocab ?? [];
  const key = phrase.trim().toLowerCase();
  const exact = list.find((v) => v.word.trim().toLowerCase() === key);
  if (exact) return exact;
  const want = tokens(phrase).map(stem);
  return (
    list.find((v) => {
      const have = tokens(v.word).map(stem);
      return have.length === want.length && have.every((h, i) => h === want[i]);
    }) ?? null
  );
}
