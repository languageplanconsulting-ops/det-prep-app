// Canonical diagnostic CONTENT + adapters that turn UI answers into engine inputs.
// Pure data — no React, no server deps. The answer keys for fill-in live in diagnostic.ts.

import type { PassageAnswers, WriteItem, WriteCategory } from "./diagnostic.ts";

// ── Goal ranges (questionnaire) → a representative target number for gap/lock logic ──
export const TARGET_OPTIONS = [
  { label: "ต่ำกว่า 90", target: 90 },
  { label: "90–105", target: 105 },
  { label: "105–125", target: 120 },
  { label: "125–135", target: 130 },
];

// ── Reading A: "The Little Bakery" (cue = base verb; student types the conjugated word) ──
export type BakerySeg = string | { blank: number; cue: string };
export const BAKERY_SEGMENTS: BakerySeg[] = [
  "Anna owns a small bakery in the centre of town. Every morning, she ",
  { blank: 0, cue: "mix" }, " the flour and water, and then she ",
  { blank: 1, cue: "bake" }, " fresh bread for her customers. At the moment, she is ",
  { blank: 2, cue: "decorate" }, " a beautiful cake for a special birthday order. Anna did not always own a shop. Ten years ago, she ",
  { blank: 3, cue: "study" }, " cooking at a small college in France. After she finished her course, she ",
  { blank: 4, cue: "work" }, " in a famous restaurant for two years. Then she ",
  { blank: 5, cue: "save" }, " enough money and returned home to open her own bakery. Today, her artisan loaves are renowned throughout the region. Each cake is meticulously ",
  { blank: 6, cue: "craft" }, " by hand from locally sourced ingredients. Anna often reflects that, had she not taken such a risk, her business would never have ",
  { blank: 7, cue: "flourish" }, ". She remains convinced that if her closely guarded recipes were ever ",
  { blank: 8, cue: "disclose" }, ", the bakery's reputation would be irreparably damaged.",
];

// Letter-box format (matches the practice FITB UI): a fixed prefix is shown, the student
// types only the remaining letters into one box per letter. assembleBakery() rebuilds the
// full word (prefix + typed remainder) for grading against the answer key in diagnostic.ts.
export const BAKERY_BLANKS = [
  { word: "mixes", prefix: "mix" },
  { word: "bakes", prefix: "bak" },
  { word: "decorating", prefix: "dec" },
  { word: "studied", prefix: "stu" },
  { word: "worked", prefix: "wor" },
  { word: "saved", prefix: "sav" },
  { word: "crafted", prefix: "cra" },
  { word: "flourished", prefix: "flo" },
  { word: "disclosed", prefix: "dis" },
];

export const bakeryRemLen = (i: number) => BAKERY_BLANKS[i].word.length - BAKERY_BLANKS[i].prefix.length;

export function assembleBakery(remainders: string[]): string[] {
  return BAKERY_BLANKS.map((b, i) => b.prefix + (remainders[i] ?? "").trim());
}

// ── Reading B: "Greenwashing" passage ──
export const PASSAGE_P1 =
  "Greenwashing is when a company pretends to be more environmentally friendly than it really is. In the United Kingdom, this has become a common problem. Many businesses use words like “green,” “natural,” or “eco-friendly” on their products because they know that shoppers care about the planet. However, these claims are not always true, and customers can easily be misled.";
export const PASSAGE_P3 =
  "To deal with this problem, the UK government has introduced new rules. The Competition and Markets Authority now checks that environmental claims are honest and clear. Companies that break the rules can be fined or forced to change their advertising. Experts also advise shoppers to look for real evidence, such as official labels, instead of trusting vague words on a package.";
export const PASSAGE_Q2_TARGET = "because they know that shoppers care about the planet";
// Q2 is a PARAPHRASE probe: the asked concept uses NONE of the answer span's words
// ("consumers' concern for the environment" vs "shoppers care about the planet"), so the
// student must understand the meaning rather than keyword-match.
export const PASSAGE_Q2_PROMPT = "ไฮไลต์ส่วนของบทความที่สื่อถึง “ความกังวลของผู้บริโภคต่อสิ่งแวดล้อม” (consumers’ concern for the environment)";
// The span the selection MUST cover. Up to 4 extra words on either side is still correct.
export const PASSAGE_Q2_CORE = "shoppers care about the planet";

/** Selection [a..b] (word indices) is correct if it covers the core span with ≤4 extra words. */
export function highlightRangeOk(words: string[], a: number | null, b: number | null): boolean {
  if (a === null || b === null) return false;
  const norm = (s: string) => s.toLowerCase().replace(/[“”".,!?;:]/g, "");
  const wn = words.map(norm);
  const core = PASSAGE_Q2_CORE.toLowerCase().split(/\s+/);
  let t = -1;
  for (let i = 0; i + core.length <= wn.length; i++) {
    if (core.every((c, k) => wn[i + k] === c)) { t = i; break; }
  }
  if (t < 0) return false;
  const tEnd = t + core.length - 1;
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const covers = lo <= t && hi >= tEnd;
  const over = hi - lo + 1 - core.length; // extra words beyond the core span
  return covers && over >= 0 && over <= 4;
}

type Mcq = { id: number; prompt: string; options: string[]; correct: number };
export const PASSAGE_Q1: Mcq = {
  id: 1,
  prompt: "ย่อหน้าใดเติมช่องว่าง (P2) ได้ดีที่สุด?",
  options: [
    "A) Climate change is one of the biggest challenges in the world today. Temperatures are rising, ice is melting, and many animals are losing their homes…",
    "B) Greenwashing is a word that many people in Britain have started to hear. It describes companies that want to seem kind to the environment…",
    "C) There are several ways that companies do this. Some put pictures of leaves or green colours on their packaging to look natural, even when the product is harmful. Others say a product is “recyclable” when very few people can actually recycle it…",
    "D) Fortunately, the government has decided to act against dishonest companies. New laws now force businesses to prove their claims…",
  ],
  correct: 2,
};
export const PASSAGE_Q3: Mcq = {
  id: 3,
  prompt: "ใจความหลักของบทความคืออะไร?",
  options: [
    "A) Climate change is the most serious environmental problem facing the UK and the world today.",
    "B) False environmental claims mislead UK shoppers, but action is being taken.",
    "C) The Competition and Markets Authority is the only organisation that protects the environment in Britain.",
    "D) Most British companies have stopped using green advertising.",
  ],
  correct: 1,
};
export const PASSAGE_Q4: Mcq = {
  id: 4,
  prompt: "ชื่อเรื่องที่ดีที่สุดคือ?",
  options: [
    "A) Climate Change and the Future of Our Planet",
    "B) The History of Advertising Laws in the United Kingdom",
    "C) Save the Planet",
    "D) Greenwashing: Fake Green Claims in Britain",
  ],
  correct: 3,
};

export function passageAnswersFrom(
  sel: { q1: number | null; q3: number | null; q4: number | null },
  highlightOk: boolean,
): PassageAnswers {
  return {
    q1: sel.q1 === PASSAGE_Q1.correct,
    q2: highlightOk,
    q3: sel.q3 === PASSAGE_Q3.correct,
    q4: sel.q4 === PASSAGE_Q4.correct,
  };
}

// ── Listening: 3 dictation sentences ──
export const DICTATION = [
  "I really enjoyed my trip to Japan because we ate traditional food every single day.",
  "After we spent the afternoon wandering the cobblestone streets, we sat at a small café to soak up the atmosphere.",
  "Eager to escape the limits of the metropolis, I embarked on a journey to immerse myself in the wilderness.",
];

export function dictationAccuracy(typed: string, target: string): number {
  const norm = (s: string) => s.toLowerCase().replace(/[.,!?;:]/g, "").split(/\s+/).filter(Boolean);
  const t = norm(target);
  const u = norm(typed);
  if (t.length === 0) return 0;
  // Longest common subsequence of words / target length — robust to a dropped or
  // inserted word (a positional compare craters the whole rest of the sentence).
  const dp: number[][] = Array.from({ length: t.length + 1 }, () => new Array(u.length + 1).fill(0));
  for (let i = 1; i <= t.length; i++) {
    for (let j = 1; j <= u.length; j++) {
      dp[i][j] = t[i - 1] === u[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[t.length][u.length] / t.length;
}

// ── Writing: 2 multiple-choice error-correction exercises ──
type WriteQ = { n: number; options: string[]; correct: number; category: WriteCategory };
type WriteExercise = { title: string; passage: string; questions: WriteQ[] };

export const WRITING_EX1: WriteExercise = {
  title: "Exercise 1 — บรรยายภาพ",
  passage:
    "In this photo, a family is having picnic (1) at the park on a sunny day. They are sitting on a blanket on the grass, and behind them there are many trees. The two children are playing with a ball while (2) their parents are eating sandwiches. The mother seems very happy and she (3) gives a sandwich for (4) her son. Overall (5) I think they are really enjoying the day because everyone are (6) smiling in the picture.",
  questions: [
    { n: 1, options: ["NO CHANGE", "a picnic", "the picnic", "picnics"], correct: 1, category: "article" },
    { n: 2, options: ["NO CHANGE", "ball. while", "ball; while", "ball: while"], correct: 0, category: "punctuation" },
    { n: 3, options: ["NO CHANGE", "happy and, she", "happy; and she", "happy, and she"], correct: 3, category: "punctuation" },
    { n: 4, options: ["NO CHANGE", "with", "to", "at"], correct: 2, category: "verb" },
    { n: 5, options: ["NO CHANGE", "Overall,", "Overall;", "Overall:"], correct: 1, category: "punctuation" },
    { n: 6, options: ["NO CHANGE", "were", "is", "was"], correct: 2, category: "verb" },
  ],
};

export const WRITING_EX2: WriteExercise = {
  title: "Exercise 2 — เรียงความ",
  passage:
    "Nowadays, many people decides (1) to treat their health problems at home instead of going to see doctor (2). In my opinion this (3) is mostly a negative development. For small problems like a cold or a headache, rest and simple medicine is (4) usually enough. By waiting too long they (5) may make the situation worse. I believe it is negative trend (6) overall.",
  questions: [
    { n: 1, options: ["NO CHANGE", "decide", "deciding", "is decide"], correct: 1, category: "verb" },
    { n: 2, options: ["NO CHANGE", "going to see a doctor", "going to see an doctor", "going to see the doctors"], correct: 1, category: "article" },
    { n: 3, options: ["NO CHANGE", "In my opinion, this", "In my opinion; this", "In, my opinion this"], correct: 1, category: "punctuation" },
    { n: 4, options: ["NO CHANGE", "are", "were", "being"], correct: 1, category: "verb" },
    { n: 5, options: ["NO CHANGE", "By waiting too long, they", "By waiting too long they,", "By waiting, too long they"], correct: 1, category: "punctuation" },
    { n: 6, options: ["NO CHANGE", "a negative trend", "an negative trend", "the negative trends"], correct: 1, category: "article" },
  ],
};

export function writeItemsFrom(ex: WriteExercise, selections: (number | null)[]): WriteItem[] {
  return ex.questions.map((q, i) => ({ correct: selections[i] === q.correct, category: q.category }));
}
