/**
 * Hints for a vocabulary-passage blank, built from data every passage already has — nothing
 * here reveals the answer word itself:
 *  - meaning: the Thai meaning (+ English synonyms) of the missing word
 *  - context: the sentence around the blank and the one after it
 *  - grammar: shown only when the blank is a grammar item (relative pronoun, preposition,
 *    linking word, comparative, word form, verb after "to"/a modal …)
 */
type T = (th: string, en: string) => string;

const BLANK_RE = /\[BLANK(?:\s*\d+)?\]/g;
/** Internal marker for the target blank — no punctuation, so sentence splitting can't cut it. */
const MARK = "\u2063TARGET\u2063";
/** What the hint shows in place of the target blank (AnswerSheet highlights it). */
export const GAP_MARK = "【 ? 】";

/** Passage text with every blank replaced: the target as "【 ? 】", answered ones by their word. */
function fillPassage(passageText: string, target: number, filled: (string | undefined)[]): string {
  let i = -1;
  return passageText.replace(BLANK_RE, () => {
    i += 1;
    if (i === target) return MARK;
    return filled[i] ?? "_____";
  });
}

/** The sentence holding the blank plus the next sentence (the usual place a clue sits). */
export function contextHint(passageText: string, target: number, filled: (string | undefined)[]): string {
  const text = fillPassage(passageText, target, filled).replace(/\s+/g, " ").trim();
  const sentences = text.match(/[^.!?]+[.!?]+["”’)]*|[^.!?]+$/g)?.map((s) => s.trim()) ?? [text];
  const at = sentences.findIndex((s) => s.includes(MARK));
  if (at < 0) return text.replace(MARK, GAP_MARK);
  const picked = [sentences[at]!];
  // a blank at the very start of a sentence is usually explained by what came before
  if (sentences[at]!.startsWith(MARK) && at > 0) picked.unshift(sentences[at - 1]!);
  if (at + 1 < sentences.length) picked.push(sentences[at + 1]!);
  return picked.join(" ").replace(MARK, GAP_MARK);
}

/** The word right before the blank in the passage (lower-case), for "after to / after a modal". */
function wordBefore(passageText: string, target: number): string {
  let i = -1;
  let before = "";
  passageText.replace(BLANK_RE, (m, offset: number) => {
    i += 1;
    if (i === target) before = passageText.slice(Math.max(0, offset - 40), offset);
    return m;
  });
  return (before.trim().split(/\s+/).pop() ?? "").toLowerCase().replace(/[^a-z']/g, "");
}

const REL = new Set(["which", "who", "whom", "whose", "that", "where", "when", "why"]);
const PREP = new Set([
  "in", "on", "at", "for", "of", "with", "by", "from", "to", "into", "onto", "about", "over", "under",
  "between", "among", "through", "during", "without", "within", "against", "toward", "towards", "upon",
  "across", "behind", "beyond", "despite", "throughout", "along", "around",
]);
const LINK = new Set([
  "however", "therefore", "moreover", "furthermore", "meanwhile", "otherwise", "nevertheless", "consequently",
  "fortunately", "unfortunately", "although", "though", "because", "since", "unless", "while", "whereas",
  "but", "and", "so", "yet", "or", "nor", "instead", "finally", "additionally", "similarly", "besides",
  "hence", "thus", "indeed", "eventually", "luckily", "surprisingly", "still", "also", "then",
]);
const DET = new Set(["a", "an", "the", "this", "these", "those", "some", "any", "each", "every", "much", "many", "few", "little"]);
const COMPARE = new Set(["more", "most", "less", "least", "better", "best", "worse", "worst", "fewer", "fewest"]);
const MODAL = new Set(["can", "could", "will", "would", "shall", "should", "may", "might", "must"]);
const AUX = new Set(["do", "does", "did", "have", "has", "had", "be", "is", "are", "was", "were", "been", "being"]);

/** True when most options are forms of one word (make / made / making / makes). */
function sameStem(options: string[]): boolean {
  const words = options.map((o) => o.toLowerCase().trim()).filter((o) => /^[a-z]+$/.test(o));
  if (words.length < 3) return false;
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w.slice(0, 4), (counts.get(w.slice(0, 4)) ?? 0) + 1);
  return Math.max(...counts.values()) >= 3;
}

/** A Thai/English grammar tip, or null when the blank is a plain vocabulary choice. */
export function grammarHint(
  passageText: string,
  target: number,
  correctAnswer: string,
  options: string[],
  t: T,
): string | null {
  const key = correctAnswer.toLowerCase().trim();
  const opts = options.map((o) => o.toLowerCase().trim());
  const share = (set: Set<string>) => opts.filter((o) => set.has(o)).length >= 3 || set.has(key);
  const before = wordBefore(passageText, target);

  if (share(REL) && opts.filter((o) => REL.has(o)).length >= 3) {
    return t(
      "ข้อนี้เป็นไวยากรณ์: คำเชื่อมขยายคำนาม (relative pronoun) — ดูว่าคำนามข้างหน้าเป็น ‘คน’ หรือ ‘สิ่งของ/สถานที่’ และช่องว่างทำหน้าที่เป็นประธาน กรรม หรือแสดงความเป็นเจ้าของ",
      "Grammar: a relative pronoun — check whether the noun before is a person or a thing/place, and whether the blank is the subject, object or possessive.",
    );
  }
  if (opts.filter((o) => PREP.has(o)).length >= 3) {
    return t(
      "ข้อนี้เป็นไวยากรณ์: คำบุพบท (preposition) — ดูคำกริยาหรือคำนามที่อยู่ติดช่องว่าง ว่ามักใช้คู่กับบุพบทตัวไหน",
      "Grammar: a preposition — look at the verb or noun next to the blank and which preposition it usually pairs with.",
    );
  }
  if (opts.filter((o) => LINK.has(o)).length >= 3) {
    return t(
      "ข้อนี้เป็นคำเชื่อม — อ่านประโยคก่อนและหลังช่องว่าง แล้วดูว่าความสัมพันธ์เป็นแบบ ขัดแย้ง / เหตุผล / ผลลัพธ์ / เพิ่มเติม / โชคดี-โชคร้าย",
      "Linking word — read the sentences before and after: is the link contrast, reason, result, addition, or good/bad luck?",
    );
  }
  if (opts.filter((o) => COMPARE.has(o)).length >= 2 || (COMPARE.has(key) && /\bthan\b/i.test(contextHint(passageText, target, [])))) {
    return t(
      "ข้อนี้เป็นการเปรียบเทียบ — ถ้ามีคำว่า ‘than’ ตามหลัง มักใช้ขั้นกว่า (more / -er) ถ้ามี ‘the’ นำหน้ามักใช้ขั้นสุด (most / -est)",
      "Comparison — with ‘than’ after the blank use the comparative (more / -er); with ‘the’ before it, the superlative (most / -est).",
    );
  }
  if (opts.filter((o) => DET.has(o)).length >= 3) {
    return t(
      "ข้อนี้เป็นคำนำหน้านาม — ดูว่าคำนามที่ตามมาเป็นเอกพจน์หรือพหูพจน์ นับได้หรือนับไม่ได้ และพูดถึงครั้งแรกหรือรู้กันอยู่แล้ว",
      "Determiner — is the next noun singular or plural, countable or not, new or already known?",
    );
  }
  if (opts.filter((o) => MODAL.has(o) || AUX.has(o)).length >= 3) {
    return t(
      "ข้อนี้เป็นกริยาช่วย — ดูกาลของประโยค (อดีต/ปัจจุบัน) และรูปกริยาที่ตามหลังช่องว่าง",
      "Helping verb — check the tense of the sentence and the verb form after the blank.",
    );
  }
  if (before === "to" || MODAL.has(before)) {
    return t(
      `ช่องนี้อยู่หลัง ‘${before}’ — ถ้าเป็นกริยา มักใช้รูปพื้นฐาน (V1) ไม่เติม -s / -ed / -ing`,
      `This blank comes after ‘${before}’ — a verb here is usually the base form (no -s / -ed / -ing).`,
    );
  }
  if (sameStem(options)) {
    return t(
      "ตัวเลือกเป็นคำเดียวกันคนละรูป — ดูว่าตำแหน่งนี้ต้องการ คำนาม / กริยา / คุณศัพท์ / กริยาวิเศษณ์ และกาลของประโยค",
      "The options are forms of one word — decide whether this spot needs a noun, verb, adjective or adverb, and the tense.",
    );
  }
  if (AUX.has(before) && ["was", "were", "is", "are", "be", "been", "being"].includes(before)) {
    return t(
      `ช่องนี้อยู่หลัง ‘${before}’ — มักตามด้วยคุณศัพท์, กริยา -ing หรือกริยาช่อง 3`,
      `After ‘${before}’ you usually need an adjective, an -ing verb, or a past participle.`,
    );
  }
  return null;
}

/** Thai meaning (plus synonyms) of the missing word — shown as the "meaning" hint. */
export function meaningHint(entry: { meaningTh?: string; synonyms?: string[] } | undefined, t: T): string | null {
  if (!entry) return null;
  const th = entry.meaningTh?.trim();
  const syn = (entry.synonyms ?? []).filter(Boolean).slice(0, 3);
  if (!th && !syn.length) return null;
  const parts: string[] = [];
  if (th) parts.push(t(`คำที่หายไปแปลว่า “${th}”`, `The missing word means “${th}”`));
  if (syn.length) parts.push(t(`ความหมายใกล้เคียง: ${syn.join(", ")}`, `Similar to: ${syn.join(", ")}`));
  return parts.join("\n");
}
