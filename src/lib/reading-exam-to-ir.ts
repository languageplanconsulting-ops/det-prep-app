/**
 * Runs the reading EXAM on the Interactive Reading engine.
 *
 * The exam surface (/practice/comprehension/reading) was left on the old in-house format when the
 * lessons were rebuilt: a yellow "[MISSING PARAGRAPH]" block, three or four options, prompts like
 * "the gap between paragraph 1 and paragraph 3", and a passage that showed literal `**` markers.
 * None of that is what the real test does.
 *
 * The exam's own content maps onto the real task almost one-to-one, so nothing has to be
 * re-authored and no uploaded content is discarded:
 *
 *   missingSentence      → step 2, select the best sentence to complete the passage
 *   informationLocation  → step 3, highlight text to answer the question
 *                          (its `correctAnswer` is already a verbatim span of the passage)
 *   mainIdea             → step 5, select the idea that is expressed
 *   bestTitle            → step 6, select the best title
 *
 * There is no cloze data in an exam unit, and only one highlight question rather than two, so a
 * converted exam runs four of the six steps. The engine already takes a `steps` filter for exactly
 * this reason.
 */
import type { IrChoice, IrSet } from "@/lib/interactive-reading";
import { derivedWrongWhyTh } from "@/lib/interactive-reading-explain";
import type { ReadingExamUnit, ReadingMcBlock } from "@/types/reading";

/** Admin content marks clickable vocab with markdown bold; the old renderer leaked the asterisks. */
export function stripVocabMarkers(s: string): string {
  return s.replace(/\*\*\s*(.*?)\s*\*\*/g, "$1").replace(/\s{2,}/g, " ").trim();
}

const PLACEHOLDER = /^\s*\[?\s*missing paragraph\s*\]?\s*$/i;

/**
 * Exam content explains the KEY only, so every distractor used to carry one identical sentence —
 * which reads as filler once the feedback bar lists them side by side. Each wrong option gets its
 * own line instead, built from a fact about that option: which of its content words the passage
 * never uses. The shared string stays as the tail, because it still names the trap the task sets.
 */
function choices(block: ReadingMcBlock, passage: string, ruleTh: string): IrChoice[] {
  const key = stripVocabMarkers(block.correctAnswer);
  return block.options.map((o) => {
    const text = stripVocabMarkers(o);
    const correct = text === key;
    return {
      text,
      correct,
      // uploads often explain nothing; the rule the task tests is a better ✓ line than a blank one
      whyTh: correct ? (block.explanationThai?.trim() || ruleTh) : derivedWrongWhyTh(text, passage, ruleTh),
    };
  });
}

/**
 * Converts one exam unit. Returns the set plus the steps it can actually run — a caller should
 * pass both straight into InteractiveReadingRunner.
 */
export function readingExamToIrSet(
  exam: ReadingExamUnit,
  id: string,
): { set: IrSet; steps: number[] } {
  const p1 = stripVocabMarkers(exam.passage.p1);
  const p3 = stripVocabMarkers(exam.passage.p3);
  // p2 is the gap itself in this format — usually the literal "[MISSING PARAGRAPH]" placeholder,
  // but older uploads sometimes put the answer text there.
  const p2 = stripVocabMarkers(exam.passage.p2 ?? "");
  const middleIsPlaceholder = !p2 || PLACEHOLDER.test(p2);

  const paragraphs = middleIsPlaceholder ? [p1, p3] : [p1, p2, p3];
  const gapAfter = 1;

  const passageText = paragraphs.join(" ");

  const gap = choices(
    exam.missingSentence,
    passageText,
    "ต้องเลือกประโยคที่ทำให้ย่อหน้าหลังช่องว่างมีที่มา",
  );

  // the resolved passage the runner will render: paragraphs with the key sentence inserted
  const resolved = [...paragraphs];
  resolved.splice(gapAfter, 0, gap.find((g) => g.correct)?.text ?? "");

  const answer = stripVocabMarkers(exam.informationLocation.correctAnswer);
  const paraIndex = resolved.findIndex((p) => p.includes(answer));

  const steps: number[] = [1];
  const highlights: IrSet["highlights"] = [
    {
      questionEn: exam.informationLocation.question,
      questionTh: "",
      answer,
      paragraph: paraIndex >= 0 ? paraIndex + 1 : 1,
      whyTh: exam.informationLocation.explanationThai?.trim() || "คำตอบคือช่วงข้อความที่ตอบคำถามโดยตรง ไม่ใช่ทั้งประโยคที่มันอยู่",
    },
    { questionEn: "", questionTh: "", answer: "", paragraph: 1, whyTh: "" },
  ];
  // only offer the highlight step when the answer really is findable in the passage
  if (paraIndex >= 0 && answer.length >= 3) steps.push(2);
  steps.push(4, 5);

  const set: IrSet = {
    id,
    tier: "medium",
    level: "B2",
    topicTh: exam.titleEn ?? "บทอ่าน",
    blurbTh: "",
    paragraphs,
    gapAfter,
    blanks: [],
    gap,
    highlights,
    // idea and title are judged against the passage the learner ends up reading — gap sentence included
    idea: choices(
      exam.mainIdea,
      resolved.join(" "),
      "ต้องเป็นสิ่งที่บทอ่านกล่าวไว้จริง",
    ),
    title: choices(
      exam.bestTitle,
      resolved.join(" "),
      "ชื่อเรื่องต้องครอบคลุมทั้งบทอ่าน",
    ),
  };

  return { set, steps };
}
