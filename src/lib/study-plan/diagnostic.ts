// Personalized diagnostic scoring engine.
// Pure functions implementing docs/study-plan/diagnostic-spec.md.
// One rule everywhere: the LOWEST band wins.

export type SkillKey = "reading" | "listening" | "speaking" | "writing";

export type SkillReason =
  | { kind: "reading"; foundationScore: number; comprehensionScore: number; foundationLow: boolean }
  | { kind: "listening"; binding: 1 | 2 | 3 | null; acc: [number, number, number] }
  | { kind: "speaking"; code: "present" | "past" | "article" | "short" | "basicvocab" | "collocations" | "ok" }
  | { kind: "writing"; brokenTier: "verb" | "article" | "punctuation" | null };

export type SkillResult = {
  skill: SkillKey;
  band: string;
  score: number;
  notes: string[];
  reason: SkillReason;
};

// ── Band → representative number (from the spec table) ──
const N = {
  below80: 75,
  below90: 85,
  below95: 90, // also "80–100"
  below100: 95,
  below110: 105, // also "100–110"
  below115: 108,
  below120: 115, // also "110–120"
  band110to130: 120,
  at120: 120,
  above130: 132,
  above120: 125, // "120+" all-correct cases
} as const;

// ════════════════════════ READING ════════════════════════

// Part A — "The Little Bakery" fill-in-blank (9 answers, 3 tiers)
const BAKERY_KEY = [
  "mixes", "bakes", "decorating",   // T1 present
  "studied", "worked", "saved",     // T2 past
  "crafted", "flourished", "disclosed", // T3 advanced
];

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/[.,;:!?]/g, "");
}

export function scoreReadingFillIn(answers: string[]): { score: number; band: string; firstError: number | null } {
  const wrong = (i: number) => norm(answers[i] ?? "") !== BAKERY_KEY[i];
  const tier1 = [0, 1, 2].some(wrong);
  const tier2 = [3, 4, 5].some(wrong);
  const tier3 = [6, 7, 8].some(wrong);
  const firstError = BAKERY_KEY.findIndex((_, i) => wrong(i));
  if (tier1) return { score: N.below80, band: "below 80", firstError };
  if (tier2) return { score: N.below110, band: "below 110", firstError };
  if (tier3) return { score: N.below120, band: "below 120", firstError };
  return { score: N.above120, band: "120+", firstError: null };
}

// Part B — "Greenwashing" passage (Q1, Q2 highlight, Q3, Q4)
export type PassageAnswers = { q1: boolean; q2: boolean; q3: boolean; q4: boolean };

export function scoreReadingPassage(a: PassageAnswers): { score: number; band: string } {
  if (!a.q3 && !a.q4) return { score: N.below100, band: "below 100" };
  if (!a.q1 || !a.q3 || !a.q4) return { score: N.below110, band: "below 110" };
  if (!a.q2) return { score: N.below115, band: "below 115" };
  return { score: N.above130, band: "above 130" };
}

export function scoreReading(fillIn: string[], passage: PassageAnswers): SkillResult {
  const a = scoreReadingFillIn(fillIn);
  const b = scoreReadingPassage(passage);
  const score = Math.min(a.score, b.score);
  // The "guesses from context but grammar drags reading" story only holds when the
  // passage was genuinely understood (strong comprehension) AND the grammar foundation
  // sits clearly below it — not for a tiny gap at the top, nor when both are low.
  const foundationLow = b.score >= 130 && b.score - a.score >= 15;
  const notes: string[] = [`Foundation (fill-in): ${a.band}`, `Comprehension (passage): ${b.band}`];
  if (foundationLow) notes.push("Strong comprehension, weak grammar foundation → focus vocabulary-reading + fill-in-blank.");
  return {
    skill: "reading", band: a.score <= b.score ? a.band : b.band, score, notes,
    reason: { kind: "reading", foundationScore: a.score, comprehensionScore: b.score, foundationLow },
  };
}

// ════════════════════════ LISTENING ════════════════════════
// 3 dictation sentences, each an accuracy fraction 0..1
export function scoreListening(acc: [number, number, number]): SkillResult {
  const [s1, s2, s3] = acc;
  const ceilings: { score: number; band: string; sentence: 1 | 2 | 3 }[] = [];
  if (s1 < 0.9) ceilings.push({ score: N.below80, band: "below 80", sentence: 1 });
  if (s2 < 1.0) ceilings.push({ score: N.below95, band: "80–100", sentence: 2 });
  if (s3 < 0.9) ceilings.push({ score: N.band110to130, band: "110–130", sentence: 3 });
  const notes = [`accuracy: ${Math.round(s1 * 100)}% / ${Math.round(s2 * 100)}% / ${Math.round(s3 * 100)}%`];
  if (ceilings.length === 0) {
    return { skill: "listening", band: "130+", score: N.above130, notes, reason: { kind: "listening", binding: null, acc } };
  }
  const lowest = ceilings.reduce((m, c) => (c.score < m.score ? c : m));
  return { skill: "listening", band: lowest.band, score: lowest.score, notes, reason: { kind: "listening", binding: lowest.sentence, acc } };
}

// ════════════════════════ SPEAKING ════════════════════════
// Assessment object as returned by Gemini-lite over the RAW (uncorrected) transcript.
export type SpeakingAssessment = {
  wordCount: number;
  presentTenseError: boolean;
  pastTenseError: boolean;
  articleError: boolean;
  basicVocabError: boolean; // a B1-level word used wrong
  usesB2Vocab: boolean;
  b1CollocationCount: number;
  b2CollocationCount: number;
};

export function scoreSpeaking(a: SpeakingAssessment): SkillResult {
  const notes: string[] = [`${a.wordCount} words · ${a.b1CollocationCount} B1 + ${a.b2CollocationCount} B2 collocations`];
  if (a.presentTenseError) return mk("below 80", N.below80, "present-tense mistake", "present");
  if (a.pastTenseError) return mk("below 90", N.below90, "past-tense mistake", "past");
  if (a.wordCount < 100) return mk("below 95", N.below95, "under 100 words (idea development)", "short");
  if (a.articleError) return mk("below 95", N.below95, "article mistake", "article");
  if (a.basicVocabError) return mk("below 95", N.below95, "basic-vocabulary mistake", "basicvocab");
  // No grammar mistakes:
  if (a.b1CollocationCount >= 4 && a.b2CollocationCount >= 1) return mk("130", N.above130, "clean + 4–5 B1 and a B2 collocation", "ok");
  if (a.b1CollocationCount >= 4) return mk("120", N.at120, "clean + 4–5 B1 collocations", "ok");
  return mk("110", N.below120, "clean but few collocations / B2 vocab only", "collocations");
  function mk(band: string, score: number, why: string, code: "present" | "past" | "article" | "short" | "basicvocab" | "collocations" | "ok"): SkillResult {
    return { skill: "speaking", band, score, notes: [...notes, why], reason: { kind: "speaking", code } };
  }
}

// ════════════════════════ WRITING ════════════════════════
// Each exercise = 6 answers tagged by category. Categories that matter:
export type WriteCategory = "verb" | "article" | "punctuation"; // preposition folded into "verb"
export type WriteItem = { correct: boolean; category: WriteCategory };

function scoreWriteExercise(items: WriteItem[]): { score: number; band: string; brokenTier: "verb" | "article" | "punctuation" | null } {
  const wrong = (c: WriteCategory) => items.some((it) => it.category === c && !it.correct);
  if (wrong("verb")) return { score: N.below80, band: "below 80", brokenTier: "verb" };
  if (wrong("article")) return { score: N.below110, band: "below 110", brokenTier: "article" };
  if (wrong("punctuation")) return { score: N.below120, band: "110–120", brokenTier: "punctuation" };
  return { score: N.above120, band: "120+", brokenTier: null };
}

export function scoreWriting(ex1: WriteItem[], ex2: WriteItem[]): SkillResult {
  const a = scoreWriteExercise(ex1);
  const b = scoreWriteExercise(ex2);
  const lower = a.score <= b.score ? a : b;
  return {
    skill: "writing", band: lower.band, score: lower.score, notes: [`Ex1: ${a.band}`, `Ex2: ${b.band}`],
    reason: { kind: "writing", brokenTier: lower.brokenTier },
  };
}

// ════════════════════════ REPORT ════════════════════════
export type Report = {
  predicted: number;
  target: number;
  gap: number;
  skills: SkillResult[];
  fixFirst: SkillResult;
  planSkills: SkillResult[]; // below target → enter the plan
};

export function buildReport(skills: SkillResult[], target: number): Report {
  const predicted = Math.round(skills.reduce((s, r) => s + r.score, 0) / skills.length);
  const fixFirst = skills.reduce((m, r) => (r.score < m.score ? r : m));
  const planSkills = skills.filter((r) => r.score < target).sort((x, y) => x.score - y.score);
  return { predicted, target, gap: Math.max(0, target - predicted), skills, fixFirst, planSkills };
}
