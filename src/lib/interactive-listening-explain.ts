/**
 * Interactive Listening — turning one wall of Thai into something a learner can read.
 *
 * Every explanation in the bank is authored to one shape:
 *
 *   Keyword = major in (เรียนเอก) ข้อ 2 ถูก เพราะ … ข้อ 1 ผิดเพราะ … ข้อ 3 ผิดเพราะ …
 *
 * On screen that arrives as a single 400-character paragraph: the keyword, the reason the answer is
 * right, and three rebuttals of options the learner may not even have picked, all at the same size
 * and weight. Nothing tells them what to read first. This splits it into the parts it already is —
 * keyword, why the answer wins, one line per option — so the runner can rank them: the learner's own
 * mistake first, everything else demoted.
 *
 * Nothing is rewritten and nothing is dropped; only the ordering and the emphasis change.
 */

export interface IlOptionNote {
  /** 1-based option number as authored ("ข้อ 2"). */
  index: number;
  /** True when this line is the one explaining the right answer. */
  correct: boolean;
  /** The reason, with the "ข้อ N ถูก เพราะ / ผิดเพราะ" stem removed. */
  text: string;
}

export interface IlExplanation {
  /** English keyword the question hangs on, e.g. "major in". */
  keywordEn?: string;
  /** Its Thai gloss, e.g. "เรียนเอก". */
  keywordTh?: string;
  notes: IlOptionNote[];
  /** Anything the shape above did not account for — shown verbatim so nothing is ever lost. */
  rest?: string;
}

const KEYWORD_RE = /^\s*keyword\s*[=:]\s*(.+?)\s*(?=ข้อ\s*\d|$)/i;
/** "ข้อ 2 ถูก เพราะ", "ข้อ 1 ผิดเพราะ", and the shared form "ข้อ 2 และ 4 หยิบวลี…". */
const OPTION_HEAD_RE = /^ข้อ\s*(\d+)((?:\s*(?:และ|กับ|,)\s*\d+)*)\s*(ถูก|ผิด)?\s*(?:เพราะ|ที่ว่า)?\s*/;

/** "major in (เรียนเอก)" → { en: "major in", th: "เรียนเอก" } */
function splitKeyword(raw: string): { en?: string; th?: string } {
  const m = raw.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (m) return { en: m[1]!.trim() || undefined, th: m[2]!.trim() || undefined };
  return { en: raw.trim() || undefined };
}

export function ilParseExplanation(raw: string | undefined): IlExplanation | null {
  const text = (raw ?? "").trim();
  if (!text) return null;

  let head = "";
  const kw = text.match(KEYWORD_RE);
  if (kw) head = kw[1]!.trim();

  const body = kw ? text.slice(kw[0].length) : text;
  // Segment on "ข้อ <digit>" only — "ข้อความ" / "ข้อมูล" / "ข้อสอบ" never match.
  const chunks = body.split(/(?=ข้อ\s*\d)/).map((c) => c.trim()).filter(Boolean);

  const notes: IlOptionNote[] = [];
  const leftovers: string[] = [];
  for (const chunk of chunks) {
    const m = chunk.match(OPTION_HEAD_RE);
    if (!m) {
      leftovers.push(chunk);
      continue;
    }
    const reason = chunk.slice(m[0].length).trim();
    // "ข้อ 2 และ 4 หยิบวลี …" is one sentence covering two options — give each its own row so the
    // learner's option always has a line of its own to be pulled to the top.
    const indexes = [Number(m[1]), ...(m[2]?.match(/\d+/g) ?? []).map(Number)];
    for (const index of indexes) {
      notes.push({
        index,
        // "ข้อ 2 ถูก เพราะ …" marks the key; "ข้อ 1 หยิบคำว่า …" (no verdict word) is a distractor.
        correct: m[3] === "ถูก",
        text: reason || chunk,
      });
    }
  }

  const keyword = head ? splitKeyword(head) : {};
  const rest = leftovers.join(" ").trim();
  if (!notes.length && !keyword.en && !rest) return null;

  return {
    keywordEn: keyword.en,
    keywordTh: keyword.th,
    notes,
    rest: rest || undefined,
  };
}

/* ── the grammar of the reply ────────────────────────────────────────────── */

/**
 * Half the wrong answers in the bank fail on FORM, not meaning: "Have you finished…?" answered with
 * "I am", "Are you…?" answered with "I do". The authored explanation says so in passing, buried at
 * the end of a paragraph. This states it up front and in the learner's own terms — the auxiliary the
 * question opened with decides the auxiliary the answer must echo — and it is derived from the
 * question text, so every set gets it without a single word of content being rewritten.
 */
export interface IlFormRule {
  /** The word the question opened with, e.g. "Have". */
  trigger: string;
  /** Openers a correct short answer may use, e.g. ["Yes, I have", "No, I haven't"]. */
  expected: string[];
  /** Thai line naming the rule. */
  ruleTh: string;
  /** Set when the learner's answer opened with the wrong auxiliary. */
  mismatchTh?: string;
}

interface AuxSpec {
  words: string[];
  label: string;
  /** Thai name of the verb family. */
  familyTh: string;
  expected: (subject: string) => string[];
}

const AUX: AuxSpec[] = [
  {
    words: ["are", "is", "am", "was", "were"],
    label: "be",
    familyTh: "verb to be",
    expected: () => ["Yes, I am", "No, I'm not"],
  },
  {
    words: ["do", "does", "did"],
    label: "do",
    familyTh: "verb to do",
    expected: () => ["Yes, I do", "No, I don't"],
  },
  {
    words: ["have", "has", "had"],
    label: "have",
    familyTh: "verb to have",
    expected: () => ["Yes, I have", "No, I haven't"],
  },
  {
    words: ["can", "could"],
    label: "can",
    familyTh: "modal verb",
    expected: () => ["Yes, I can", "No, I can't"],
  },
  {
    words: ["will", "would"],
    label: "will",
    familyTh: "modal verb",
    expected: () => ["Yes, I will", "No, I won't"],
  },
  {
    words: ["should", "shall"],
    label: "should",
    familyTh: "modal verb",
    expected: () => ["Yes, I should", "No, I shouldn't"],
  },
];

const WH = ["what", "where", "when", "who", "whose", "which", "why", "how"];

/**
 * A spoken turn is usually more than one sentence — "That makes sense. Have you done anything that
 * shows initiative?" — and only the last question in it is what the reply has to match.
 */
function questionSentence(line: string): string {
  const sentences = (line ?? "").split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  if (!sentences.length) return "";
  const asked = sentences.filter((s) => s.endsWith("?"));
  return (asked.length ? asked[asked.length - 1] : sentences[sentences.length - 1])!;
}

function firstWord(s: string): string {
  return (s.trim().match(/[a-z']+/i)?.[0] ?? "").toLowerCase();
}

function auxFor(word: string): AuxSpec | undefined {
  return AUX.find((a) => a.words.includes(word));
}

/**
 * The auxiliary an answer opens a SHORT ANSWER with — "I have. I finished it last night." → "have".
 * A main verb in a full sentence is not one: "I have a tight deadline" is answering with content,
 * not echoing an auxiliary, and calling that a tense error would be wrong. So the auxiliary only
 * counts when the clause stops right after it, negates, or the answer opened with Yes/No.
 */
function shortAnswerAux(answer: string): string | null {
  const m = answer
    .trim()
    .match(/^(?:(yes|no)\s*[,.]?\s*)?i\s+([a-z']+)(n't)?\s*(?=[.,!?;]|$)/i);
  if (!m) return null;
  const aux = m[2]!.toLowerCase();
  return auxFor(aux) ? aux : null;
}

/**
 * Reads the question's opening word and, when the learner's answer opened with a clashing
 * auxiliary, says which one it should have been. Returns null when the question is not a yes/no
 * question, or when the answer already opens correctly — a rule the learner just followed is noise.
 */
export function ilFormRule(spokenLine: string, chosen?: string): IlFormRule | null {
  const question = questionSentence(spokenLine);
  if (!question) return null;
  const q = firstWord(question);
  if (!q) return null;

  const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

  if (WH.includes(q)) {
    // A wh- question wants information. Only worth saying when the learner answered it yes/no-style.
    if (!chosen) return null;
    const opener = firstWord(chosen);
    const aux = shortAnswerAux(chosen);
    if (opener !== "yes" && opener !== "no" && !aux) return null;
    return {
      trigger: cap(q),
      expected: [],
      ruleTh: `${cap(q)} เป็นคำถามที่ถามหา "เนื้อหา" ไม่ใช่คำถาม yes/no`,
      mismatchTh:
        opener === "yes" || opener === "no"
          ? `คำตอบที่เลือกขึ้นต้นด้วย "${cap(opener)}," ซึ่งใช้กับคำถาม yes/no เท่านั้น คำถาม ${cap(q)} ต้องตอบด้วยข้อมูล`
          : `คำตอบที่เลือกขึ้นต้นด้วย "I ${aux}." ซึ่งเป็นรูปตอบคำถาม yes/no คำถาม ${cap(q)} ต้องตอบด้วยข้อมูล`,
    };
  }

  const spec = auxFor(q);
  if (!spec) return null;

  const expected = spec.expected("I");
  const rule: IlFormRule = {
    trigger: cap(q),
    expected,
    ruleTh: `คำถามขึ้นต้นด้วย ${cap(q)} (${spec.familyTh}) คำตอบสั้นต้องใช้ ${spec.label} ตามกลับไป`,
  };

  if (!chosen) return rule;

  const auxWord = shortAnswerAux(chosen);
  const used = auxWord ? auxFor(auxWord) : undefined;
  if (auxWord && used && used.label !== spec.label) {
    rule.mismatchTh = `คำตอบที่เลือกตอบว่า "I ${auxWord}." ซึ่งเป็น ${used.familyTh} คนละตัวกับ ${cap(q)} ที่คำถามใช้ — ต้องตอบว่า "${expected[0]}."`;
  }
  return rule;
}
