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
  playOnceTh: "ตั้งใจฟังให้ดี — เสียงเล่นได้ครั้งเดียวเท่านั้น",
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

/**
 * Grades a typed comprehension answer. The real task accepts a range of wordings — a learner who
 * types "graduate school" where the reference says "go to graduate school" has understood — so this
 * accepts an exact-ish match, any listed variant, or an answer that carries all the reference's
 * content words. Articles and copulas are ignored on both sides.
 */
export function ilGradeTyped(typed: string, q: ConversationScenarioQuestion): boolean {
  const given = normalise(typed);
  if (!given) return false;

  const candidates = [ilReferenceAnswer(q), ...(q.answerAccept ?? [])].filter(Boolean);
  for (const c of candidates) {
    const want = normalise(c);
    if (!want) continue;
    if (given === want) return true;
    if (given.includes(want) || want.includes(given)) return true;
    const wantWords = contentWords(c);
    if (!wantWords.length) continue;
    if (wantWords.every((w) => given.includes(w))) return true;
    // legacy answers are full sentences — a short typed answer that hits most of the content
    // words has understood the audio, and the real task accepts that range of wordings
    if (wantWords.length >= 4) {
      const hit = wantWords.filter((w) => given.includes(w)).length;
      if (hit / wantWords.length >= 0.6) return true;
    }
  }
  return false;
}
