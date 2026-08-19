/**
 * Evidence-finding for the Interactive Reading feedback bar.
 *
 * The old feedback showed one Thai sentence and stopped. A learner who picked the wrong option
 * was told why the KEY was right, never why the thing they actually chose was wrong, and never
 * where in the passage the proof sits — which is the whole skill the task tests.
 *
 * Everything here is derived from text the learner can see: which content words of an option (or
 * of the question stem) literally occur in the passage, and in which sentence. Nothing is invented
 * — a claim only appears when the words back it up, otherwise the clue line is simply dropped.
 * Authored content can override the derivation with `clueEn` on any option or highlight.
 */
import { IR_GLOSS_TH } from "./interactive-reading-gloss-data";

const STOP = new Set([
  "a", "an", "the", "and", "or", "but", "if", "of", "to", "in", "on", "at", "by", "for", "with", "from", "as", "than",
  "then", "that", "this", "these", "those", "it", "its", "is", "are", "was", "were", "be", "been", "being", "am",
  "do", "does", "did", "has", "have", "had", "will", "would", "can", "could", "shall", "should", "may", "might", "must",
  "not", "no", "so", "up", "out", "about", "into", "over", "after", "before", "when", "while", "who", "whom", "whose",
  "which", "what", "where", "why", "how", "there", "here", "he", "she", "they", "them", "his", "her", "their", "our",
  "we", "you", "your", "i", "me", "my", "him", "us", "one", "also", "more", "most", "some", "any", "all", "both",
  "each", "other", "such", "only", "own", "same", "too", "very", "just", "because", "between", "through", "during",
  "author", "passage", "text", "paragraph", "mention", "mentions", "say", "says", "said", "according",
  // generic fillers: true of half the passage, so useless as the word that makes an option wrong
  "now", "thing", "things", "way", "ways", "lot", "lots", "really", "actually", "maybe", "new", "old",
]);

/** Crude stem so "cyclist"/"cycling", "discount"/"discounts" count as the same word. */
export function wordKey(w: string): string {
  let s = w.toLowerCase().replace(/[^a-z']/g, "").replace(/'s$/, "");
  if (s.length > 5 && s.endsWith("ies")) return `${s.slice(0, -3)}y`;
  for (const suf of ["ing", "ed", "es", "s"]) {
    if (s.length > suf.length + 3 && s.endsWith(suf)) {
      s = s.slice(0, -suf.length);
      break;
    }
  }
  return s;
}

/** Content words of a phrase, as {surface, key} pairs, stopwords and short tokens dropped. */
export function contentWords(s: string): { surface: string; key: string }[] {
  const out: { surface: string; key: string }[] = [];
  const seen = new Set<string>();
  // Uploaded content is not always complete — an absent question must read as "no words", never
  // take down the screen it was going to be explained on.
  if (typeof s !== "string" || !s) return out;
  for (const raw of s.split(/\s+/)) {
    const surface = raw.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, "");
    if (surface.length < 3) continue;
    const lower = surface.toLowerCase();
    if (STOP.has(lower)) continue;
    const key = wordKey(surface);
    if (key.length < 3 || seen.has(key)) continue;
    seen.add(key);
    out.push({ surface, key });
  }
  return out;
}

/** Sentence split that keeps the terminator, so a clue reads as a whole sentence. */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z"“'])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export type Clue = {
  /** The one-line header, already composed — e.g. `keeps = keep (ยังคง) ในประโยคนี้`. Empty hides it. */
  headTh: string;
  /** The passage sentence itself, verbatim. */
  sentence: string;
  /** Stems of the words to mark inside `sentence`. */
  hits: string[];
};

/**
 * Thai glosses for the words this feature actually points at.
 *
 * There is no EN→TH dictionary in the app, so the meanings come from two places: a passage's own
 * `highlightedVocab` (exam and mock content ship it) and this list, which covers the function words
 * and light verbs the cloze step tests — exactly the words a Thai learner most often misses and the
 * ones no glossary bothers to include. Unknown words simply render without a gloss.
 */
const TH_GLOSS: Record<string, string> = {
  in: "ใน", on: "บน", at: "ที่", by: "โดย", for: "สำหรับ", with: "กับ", without: "โดยไม่มี", from: "จาก",
  into: "เข้าไปใน", onto: "ขึ้นไปบน", through: "ผ่าน", across: "ข้าม", between: "ระหว่าง สองสิ่ง",
  among: "ท่ามกลาง หลายสิ่ง", during: "ระหว่างช่วงเวลา", within: "ภายใน", toward: "ไปทาง", towards: "ไปทาง",
  above: "เหนือ", below: "ใต้", before: "ก่อน", after: "หลัง", since: "ตั้งแต่", until: "จนกระทั่ง",
  but: "แต่", and: "และ", or: "หรือ", so: "ดังนั้น", because: "เพราะ", although: "แม้ว่า", though: "แม้ว่า",
  however: "อย่างไรก็ตาม", therefore: "ดังนั้น", while: "ในขณะที่", when: "เมื่อ", if: "ถ้า", unless: "เว้นแต่ว่า",
  instead: "แทนที่จะ", despite: "ทั้งที่มี", whereas: "ในทางกลับกัน",
  that: "ที่ ขยายนาม", which: "ซึ่ง", who: "ผู้ซึ่ง", whose: "ของผู้ซึ่ง", why: "เหตุผลที่", how: "วิธีที่",
  where: "ที่ซึ่ง", what: "สิ่งที่",
  still: "ยังคง", already: "แล้ว", yet: "ยัง ในประโยคปฏิเสธ", never: "ไม่เคย", always: "เสมอ", often: "บ่อย ๆ",
  rarely: "แทบไม่", hardly: "แทบจะไม่", seldom: "นาน ๆ ครั้ง", once: "ครั้งเดียว", twice: "สองครั้ง",
  again: "อีกครั้ง", also: "ด้วย", even: "แม้แต่", only: "เพียงแค่", just: "เพิ่งจะ / แค่", almost: "เกือบ",
  nearly: "เกือบ", quite: "ค่อนข้าง", rather: "ค่อนข้าง", enough: "เพียงพอ", too: "เกินไป", very: "มาก",
  more: "มากกว่า", most: "มากที่สุด", less: "น้อยกว่า", least: "น้อยที่สุด", many: "จำนวนมาก นับได้",
  much: "จำนวนมาก นับไม่ได้", few: "น้อย นับได้", several: "หลาย", both: "ทั้งสอง", either: "อย่างใดอย่างหนึ่ง",
  neither: "ไม่ทั้งสอง", each: "แต่ละ", every: "ทุก", another: "อีกอันหนึ่ง", other: "อื่น ๆ",
  is: "เป็น/อยู่/คือ", are: "เป็น/อยู่/คือ", was: "เป็น/อยู่/คือ ในอดีต", were: "เป็น/อยู่/คือ ในอดีต",
  be: "เป็น", been: "เคยเป็น", being: "กำลังเป็น", has: "ได้…แล้ว", have: "ได้…แล้ว", had: "ได้…แล้ว ในอดีต",
  do: "ทำ", does: "ทำ", did: "ทำ ในอดีต", will: "จะ", would: "คงจะ", can: "สามารถ", could: "อาจจะ / สามารถ ในอดีต",
  should: "ควรจะ", must: "ต้อง", might: "อาจจะ", may: "อาจจะ",
  keep: "ยังคง ทำต่อไป", make: "ทำให้", take: "ใช้เวลา / เอา", give: "ให้", become: "กลายเป็น", seem: "ดูเหมือนว่า",
  remain: "ยังคงอยู่", allow: "ทำให้สามารถ", cause: "ก่อให้เกิด", reduce: "ลดลง", increase: "เพิ่มขึ้น",
  suggest: "ชี้ให้เห็นว่า", require: "ต้องใช้", provide: "จัดหาให้", prevent: "ป้องกัน", improve: "ทำให้ดีขึ้น",
};

/**
 * Thai meaning for a word: the passage's own glossary first (it knows the sense in context), then
 * the function-word list above, then the generated bank glosses.
 *
 * `IR_GLOSS_TH` is built once by scripts/build-interactive-reading-gloss.ts over exactly the words
 * the panel can point at — nothing is translated at runtime.
 */
export function glossTh(word: string, glossary?: { word: string; meaningTh: string }[]): string | null {
  const plain = word.replace(/[^A-Za-z']/g, "");
  if (!plain) return null;
  const lower = plain.toLowerCase();
  const key = wordKey(plain);
  const fromSet = glossary?.find((g) => g.word.toLowerCase() === lower || wordKey(g.word) === key);
  if (fromSet?.meaningTh) return fromSet.meaningTh;
  return TH_GLOSS[lower] ?? TH_GLOSS[key] ?? IR_GLOSS_TH[lower] ?? IR_GLOSS_TH[key] ?? null;
}

/** `keeps = keep (ยังคง)` — the keyword mapping line, with either half's gloss when we have one. */
export function keywordPairTh(fromEn: string, toEn: string, glossary?: { word: string; meaningTh: string }[]): string {
  const gloss = glossTh(toEn, glossary) ?? glossTh(fromEn, glossary);
  const pair = wordKey(fromEn) === wordKey(toEn) ? toEn : `${fromEn} = ${toEn}`;
  return gloss ? `${pair} (${gloss})` : pair;
}

/**
 * The passage sentence that shares the most content words with `claim`.
 * Returns null below `minHits` — a one-word coincidence is not evidence.
 *
 * Matches are weighted by how rare the word is in the passage: a topic word repeated in every
 * paragraph ("cycling") says nothing about WHICH sentence a claim restates, while a word used once
 * points straight at it.
 */
export function findEvidence(paragraphs: string[], claim: string, minHits = 2): { sentence: string; hits: string[]; words: string[] } | null {
  const want = contentWords(claim);
  if (!want.length) return null;
  const wantKeys = new Map(want.map((w) => [w.key, w.surface]));

  const freq = new Map<string, number>();
  for (const p of paragraphs) for (const { key } of contentWords(p)) freq.set(key, (freq.get(key) ?? 0) + 1);

  let best: { sentence: string; hits: string[]; words: string[]; weight: number } | null = null;
  for (const p of paragraphs) {
    for (const sentence of splitSentences(p)) {
      const hits: string[] = [];
      const words: string[] = [];
      let weight = 0;
      for (const { key } of contentWords(sentence)) {
        if (wantKeys.has(key)) {
          hits.push(key);
          words.push(wantKeys.get(key)!);
          weight += 1 / (freq.get(key) ?? 1);
        }
      }
      if (weight > (best?.weight ?? 0)) best = { sentence, hits, words, weight };
    }
  }
  return best && best.hits.length >= minHits ? { sentence: best.sentence, hits: best.hits, words: best.words } : null;
}

/**
 * The passage sentence an authored explanation already quotes.
 *
 * The bank writes its idea/title reasons as «restates “…”», which is better evidence than anything
 * word overlap can find — an option that paraphrases well shares few words with its source.
 */
export function quotedEvidence(whyTh: string, paragraphs: string[]): string | null {
  const quotes = [...whyTh.matchAll(/[“"']([^”"']{15,})[”"']/g)].map((m) => m[1]!.trim());
  for (const q of quotes) {
    for (const p of paragraphs) {
      const sentence = splitSentences(p).find((s) => s.toLowerCase().includes(q.toLowerCase().replace(/[.!?]+$/, "")));
      if (sentence) return sentence;
    }
  }
  return null;
}

/** Which words of the question stem literally occur in the sentence holding the answer. */
export function stemMatches(question: string, sentence: string): { hits: string[]; words: string[] } {
  const inSentence = new Set(contentWords(sentence).map((w) => w.key));
  const hits: string[] = [];
  const words: string[] = [];
  for (const { key, surface } of contentWords(question)) {
    if (inSentence.has(key)) {
      hits.push(key);
      words.push(surface);
    }
  }
  return { hits, words };
}

/**
 * The sentence of `paragraph` that contains `phrase` (falls back to the whole paragraph).
 *
 * Matching is word-bounded first: a cloze answer is often a two- or three-letter function word, and
 * a plain substring search hands back the sentence that happens to spell "in" inside "minutes".
 */
export function sentenceContaining(paragraph: string, phrase: string): string {
  const needle = phrase.trim();
  if (!needle) return paragraph;
  const sentences = splitSentences(paragraph);
  const bounded = new RegExp(`(^|\\W)${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\W|$)`, "i");
  return sentences.find((s) => bounded.test(s)) ?? sentences.find((s) => s.toLowerCase().includes(needle.toLowerCase())) ?? paragraph;
}

/** Content words of `option` that appear nowhere in the passage — what makes a distractor unsupported. */
export function absentWords(option: string, passage: string): string[] {
  const inPassage = new Set(contentWords(passage).map((w) => w.key));
  return contentWords(option)
    .filter((w) => !inPassage.has(w.key))
    .map((w) => w.surface);
}

/**
 * Turns a wrong option into `keyword = category` — the one line a learner can actually scan.
 *
 * The category is read off the signal words the Thai explanation already uses («ขัดกับ», «ไม่เคย»,
 * «เหมารวม», «คนละประเด็น»), so authored content keeps its judgement; only its phrasing is
 * standardised. With no signal to read, the option's own words decide: vocabulary the passage never
 * uses means the option is not mentioned there. Whatever is left of the explanation rides along as
 * a short parenthetical, and is dropped when it will not fit on the line.
 */
const SIGNALS: { re: RegExp; tagTh: string }[] = [
  { re: /ขัดกับ|กลับทิศ|ตรงข้าม|สวนทาง/, tagTh: "ขัดกับบทอ่าน" },
  { re: /ไม่เคย(บอก|พูด)?|ไม่ได้พูดถึง|ไม่ได้บอก|ไม่ได้กล่าว|ไม่มีในบทอ่าน|บทอ่านไม่ได้/, tagTh: "ไม่ได้กล่าวถึงในบทอ่าน" },
  { re: /เหมารวม|เกินกว่าที่|เกินจริง|กว้างเกิน(ไป)?/, tagTh: "พูดเกินกว่าที่บทอ่านบอก" },
  { re: /แคบเกิน(ไป)?/, tagTh: "แคบเกินไป ไม่ครอบคลุมทั้งเรื่อง" },
  { re: /คนละประเด็น|ใกล้เคียง|มาล่อ|ล่อด้วย|นอกเรื่อง|ฉากหลัง|ไม่ใช่ประเด็น|ไม่ได้ต่อกับ|ขาดที่มา|ไม่เชื่อม/, tagTh: "นอกเรื่อง" },
];

const DETAIL_MAX = 46;

export function classifyWrong(
  whyTh: string,
  option: string,
  passage: string,
): { keywordEn: string; tagTh: string; detailTh?: string } {
  const absent = absentWords(option, passage);
  // whichever verdict the author states FIRST is the one they lead with — "แคบเกินและบทอ่านไม่ได้
  // พูดถึง…" is a too-narrow option, not an unmentioned one
  const signal = SIGNALS.map((s) => ({ s, at: whyTh.search(s.re) }))
    .filter((x) => x.at >= 0)
    .sort((a, b) => a.at - b.at)[0]?.s;

  // the words that make it wrong come first; otherwise the option's rarest word carries its claim
  const freq = new Map<string, number>();
  for (const { key } of contentWords(passage)) freq.set(key, (freq.get(key) ?? 0) + 1);
  const rarest = contentWords(option).sort((a, b) => (freq.get(a.key) ?? 0) - (freq.get(b.key) ?? 0) || b.surface.length - a.surface.length)[0];
  // the longest unsupported words carry the most meaning — "commuter / calories", not "now / way"
  const keywordEn = absent.length
    ? [...absent].sort((a, b) => b.length - a.length).slice(0, 2).join(" / ")
    : (rarest?.surface ?? option.split(/\s+/)[0] ?? "");

  const tagTh = signal?.tagTh ?? (absent.length ? "ไม่ได้กล่าวถึงในบทอ่าน" : "ไม่ตรงกับที่โจทย์ถาม");

  // A signal is only stripped when it OPENS the sentence. Cutting it out of the middle
  // ("ที่บทความ[ไม่เคยพูด]ถึงเลย") leaves a mangled clause that reads as a typo.
  let rest = whyTh.trim();
  const at = signal ? rest.match(signal.re) : null;
  if (at && at.index === 0) rest = rest.slice(at[0].length);
  rest = rest
    .replace(/^[\s—·,\-]+/, "")
    .replace(/^(ไป|และ|แต่|จึง|ซึ่ง)\s*/, "")
    .replace(/^(บทอ่าน|ข้อนี้|ชื่อเรื่อง)?\s*(ที่บอกว่า|ที่ว่า|ที่|ว่า)\s*/, "")
    .trim();
  if (rest.length > DETAIL_MAX) {
    // authors separate the rule from the concrete half with an em dash; anything else stays whole
    const parts = rest.split(/\s*[—·]\s*/);
    const tail = parts.length > 1 ? parts[parts.length - 1]! : "";
    rest = tail.length <= DETAIL_MAX ? tail : "";
  }
  return { keywordEn, tagTh, detailTh: rest && rest.length <= DETAIL_MAX ? rest : undefined };
}

/**
 * The reason line for content that ships without one (the exam and mock banks explain the key only).
 *
 * It is just the rule the task tests: `classifyWrong` already derives the verdict and the offending
 * keyword from the option's own words, so composing prose here would only give it something to
 * re-parse. Rule strings must avoid the words in SIGNALS, or they would be read as a verdict.
 */
export function derivedWrongWhyTh(_option: string, _passage: string, ruleTh: string): string {
  return ruleTh;
}
