/**
 * Interactive Listening — the shape and rules of the real DET task
 * (`audio-interactional-competence`), measured in
 * docs/listening/det-interactive-listening-gap-analysis.md.
 *
 * We deliberately drop one phase the real task has: the written summary. We already have a separate
 * writing surface for that, so this runs comprehension + select-response only. Everything else —
 * one clock, typed sentence frames, five options per turn, audio that plays once — matches.
 */
import type { ConversationExam, ConversationScenarioQuestion } from "@/types/conversation";

/**
 * The real task gives 390s to the conversation phases and a further 75s to the summary. We drop the
 * summary, so the clock is the conversation budget only.
 */
export const IL_CONVERSATION_SECONDS = 390;

/**
 * The real test plays every clip once and says so. For practice that is too punishing — a learner
 * who mishears one word loses the whole turn with nothing to learn from — so each clip may be
 * replayed up to three times. It is the one place we knowingly differ from the real task.
 */
export const IL_MAX_PLAYS = 3;

/** Verbatim from the real task's constants, rendered in Thai where the learner reads them. */
export const IL_COPY = {
  comprehensionTh: "ฟังสถานการณ์ แล้วตอบคำถาม",
  comprehensionEn: "Listen to the scenario and then answer questions",
  conversationTh: "คุณจะได้ร่วมสนทนาตามสถานการณ์ด้านล่าง",
  conversationEn: "You will participate in a conversation about the scenario below",
  selectStartTh: "เลือกประโยคที่ดีที่สุดเพื่อเริ่มบทสนทนา",
  selectStartEn: "Pick the best option to start the conversation",
  selectResponseTh: "เลือกคำตอบที่ดีที่สุด",
  selectResponseEn: "Select the best response",
  completeTh: "บทสนทนาจบแล้ว",
  bestAnswerTh: "คำตอบที่ดีที่สุด:",
  playOnceTh: "ตั้งใจฟังให้ดี — เสียงเล่นได้สูงสุด 3 ครั้ง (ข้อสอบจริงเล่นได้ครั้งเดียว)",
} as const;

/** Number of graded questions in a set: every comprehension question plus every conversation turn. */
export function ilQuestionCount(exam: ConversationExam): number {
  return exam.scenarioQuestions.length + exam.mainQuestions.length;
}

/** Header re-labels itself as the set shrinks, exactly as the real task does. */
export function ilRemainingLabel(answered: number, total: number): string {
  const left = total - answered;
  return left <= 1 ? "สำหรับข้อนี้" : `สำหรับ ${left} ข้อ`;
}

/**
 * Comprehension is ALWAYS typed, never multiple choice — that is the single biggest difference
 * between the real task and what we used to do. A set authored with a sentence frame gets the
 * frame; a set uploaded before the rebuild still gets a plain blank, graded against the answer it
 * already had. No content has to be rewritten for the interaction to become the real one.
 */
export function ilIsTyped(_q: ConversationScenarioQuestion): boolean {
  return true;
}

/** The reference answer, whether the set was authored with one or still carries the old options. */
export function ilReferenceAnswer(q: ConversationScenarioQuestion): string {
  if (q.answerRef?.trim()) return q.answerRef.trim();
  return (q.options?.[q.correctIndex] ?? "").trim();
}

/** Splits "After school I think I'll {}." into the text either side of the blank. */
export function ilTemplateParts(template: string): [string, string] {
  const i = template.indexOf("{}");
  if (i < 0) return [template, ""];
  return [template.slice(0, i), template.slice(i + 2)];
}

const FILLER = new Set(["a", "an", "the", "to", "of", "my", "our", "their", "his", "her", "some", "is", "are", "be"]);

/**
 * Verbs that carry the sentence frame rather than the answer. "I want to study Psychology" answers
 * the question with *Psychology*; typing "study" on its own has named nothing, so these can never be
 * the word that earns a short answer its mark.
 */
const FRAME_VERBS = new Set([
  "i", "you", "your", "we", "me", "my", "want", "wants", "wanted", "study", "studying", "think",
  "thinking", "like", "likes", "go", "going", "get", "getting", "need", "needs", "do", "does",
  "have", "has", "am", "will", "would", "could", "may", "might", "should", "ask", "asking",
  "know", "find", "out", "interested", "about", "in", "at", "for", "on", "it", "that", "this",
  "there", "here", "and", "or", "not", "so", "because", "whether", "if", "still", "really",
  "just", "one", "kind", "kinds", "sort", "thing", "things",
]);

function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contentWords(s: string): string[] {
  return normalise(s)
    .split(" ")
    .filter((w) => w && !FILLER.has(w));
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 3;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j]! + 1,
        cur[j - 1]! + 1,
        prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[n]!;
}

/**
 * A learner who types "phychology" heard the word. Spelling is not what this task measures — the
 * writing surfaces do that — so a word counts as matched when it is one slip away (two on a long
 * word). Short words stay strict, otherwise "job" would match "jog".
 */
function wordMatches(given: string, want: string): boolean {
  if (given === want) return true;
  if (want.length < 4) return false;
  return editDistance(given, want) <= (want.length >= 8 ? 2 : 1);
}

function coversWord(givenWords: string[], want: string): boolean {
  return givenWords.some((g) => wordMatches(g, want));
}

/**
 * Grades a typed comprehension answer. The real task accepts a range of wordings — a learner who
 * types "graduate school" where the reference says "go to graduate school" has understood — so this
 * accepts an exact-ish match, any listed variant, an answer that carries the reference's content
 * words, or a bare short answer that names the thing the question asked for. Articles, copulas and
 * spelling slips are ignored on both sides.
 */
export function ilGradeTyped(typed: string, q: ConversationScenarioQuestion): boolean {
  const given = normalise(typed);
  if (!given) return false;
  const givenWords = contentWords(typed);

  // Words the question already hands over cannot be what makes a short answer right.
  const asked = new Set(contentWords(q.question ?? ""));

  const candidates = [ilReferenceAnswer(q), ...(q.answerAccept ?? [])].filter(Boolean);
  for (const c of candidates) {
    const want = normalise(c);
    if (!want) continue;
    if (given === want) return true;
    if (given.includes(want)) return true;
    const wantWords = contentWords(c);
    if (!wantWords.length) continue;
    if (wantWords.every((w) => coversWord(givenWords, w))) return true;
    // A short answer is complete when it accounts for everything the reference actually names.
    // "Psychology" leaves only *want* and *study* uncovered in "I want to study Psychology", and
    // those carry the frame, not the answer — so it passes. "Abroad" against "a scholarship to
    // study abroad" leaves *scholarship* uncovered, and that is the thing being asked about, so it
    // does not. Words the question already gave away cannot make an answer right either.
    const informativeGap = wantWords.some(
      (w) => !coversWord(givenWords, w) && !FRAME_VERBS.has(w) && !asked.has(w),
    );
    const namesSomething = givenWords.some(
      (g) => !asked.has(g) && !FRAME_VERBS.has(g) && wantWords.some((w) => wordMatches(g, w)),
    );
    if (!informativeGap && namesSomething) return true;
    // Last resort for a set nobody has authored wordings for: a long sentence reference that the
    // answer mostly hits. Once a question carries its own accepted wordings this is off, because
    // guessing at meaning from word overlap is exactly what those wordings replace.
    if (!q.answerAccept?.length && wantWords.length >= 4) {
      const hit = wantWords.filter((w) => coversWord(givenWords, w)).length;
      if (hit / wantWords.length >= 0.6) return true;
    }
  }
  return false;
}

/*
 * Explanations authored as multiple choice used to be suppressed wholesale under a typed blank,
 * because they argue about "ข้อ 1 / ข้อ 2" the learner never saw — which left them with a bare
 * answer and no reason. IlExplanationBlock now takes them apart instead, keeping the key's own
 * reasoning and dropping only the rebuttals, so no explanation has to be withheld.
 */
