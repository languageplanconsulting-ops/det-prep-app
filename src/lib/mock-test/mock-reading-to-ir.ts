/**
 * Runs the mock test's reading step on the Interactive Reading engine.
 *
 * Step 8 of the fixed mock (`vocabulary_reading`) already holds a complete real task: vocabulary
 * gaps spread through the passage, the missing paragraph, an information-location question, the
 * best title and the main idea. It was rendered as ten multiple-choice cards in a row; this maps it
 * onto the real screen without touching the content or the score payload.
 *
 * Two shapes differ from a practice set and are handled here:
 *   · the blanks sit either side of the gap ([BLANK 1..3] in p1, [BLANK 4..6] in p3), so the cloze
 *     step has to show both blocks — the runner walks to the last block carrying a marker
 *   · the information-location answer is only usable as a highlight when it is a verbatim span of
 *     the passage; when it is not, that step is dropped rather than shown as something it isn't
 */
import type { IrSet } from "@/lib/interactive-reading";
import { derivedWrongWhyTh } from "@/lib/interactive-reading-explain";
import type { VocabularyReadingMockContent } from "@/lib/mock-test/vocabulary-reading-mock";
import type { ReadingMcBlock } from "@/types/reading";

function stripMarkers(s: string): string {
  return s.replace(/\*\*\s*(.*?)\s*\*\*/g, "$1");
}

/** `[BLANK 1]` → `{1}`, renumbered in reading order across the whole passage. */
function markPassage(text: string, startAt: number): { text: string; used: number } {
  let n = startAt;
  const out = stripMarkers(text).replace(/\[\s*BLANK(?:\s*\d+)?\s*\]/gi, () => {
    n += 1;
    return `{${n}}`;
  });
  return { text: out, used: n - startAt };
}

/**
 * Mock content explains the key only, so each distractor is given its own line the same way the
 * exam converter does: name the content words this option uses that the passage never does, then
 * fall through to the trap the task sets. Identical sentences under every ✕ read as filler.
 */
function choices(block: ReadingMcBlock, passage: string, ruleTh: string) {
  const key = stripMarkers(block.correctAnswer);
  return block.options.map((o) => {
    const text = stripMarkers(o);
    const correct = text === key;
    // uploads often explain nothing; the rule the task tests is a better ✓ line than a blank one
    return { text, correct, whyTh: correct ? (block.explanationThai?.trim() || ruleTh) : derivedWrongWhyTh(text, passage, ruleTh) };
  });
}

export function mockReadingToIrSet(
  content: VocabularyReadingMockContent,
  id: string,
  vocabCount: number,
): { set: IrSet; steps: number[] } {
  const a = markPassage(content.passage.p1, 0);
  const b = markPassage(content.passage.p3, a.used);
  const paragraphs = [a.text, b.text];

  const vocab = content.vocabularyQuestions.slice(0, vocabCount);
  const blanks = vocab.map((q, i) => ({
    n: i + 1,
    options: q.options.slice(),
    answer: stripMarkers(q.correctAnswer),
    skillTh: "คำศัพท์ในบริบท",
    whyTh: q.explanationThai ?? "",
  }));

  // `{n}` markers have to be filled in before an option's words are checked against the passage,
  // or every cloze answer would look like a word the passage never uses
  const filled = (t: string) => t.replace(/\{(\d+)\}/g, (_m, d: string) => blanks.find((b) => b.n === Number(d))?.answer ?? "");

  const gap = choices(
    content.missingParagraph,
    paragraphs.map(filled).join(" "),
    "ต้องเลือกย่อหน้าที่ทำให้เนื้อความก่อนและหลังช่องว่างต่อกันได้",
  );

  const resolved = [...paragraphs];
  resolved.splice(1, 0, gap.find((g) => g.correct)?.text ?? "");

  const answer = stripMarkers(content.informationLocation.correctAnswer);
  const paraIndex = resolved.findIndex((p) => p.includes(answer));

  const steps: number[] = [];
  if (blanks.length) steps.push(0);
  steps.push(1);
  if (paraIndex >= 0 && answer.length >= 3) steps.push(2);
  steps.push(4, 5);

  const set: IrSet = {
    id,
    tier: "medium",
    level: "B2",
    topicTh: content.titleEn ?? "บทอ่าน",
    blurbTh: "",
    paragraphs,
    gapAfter: 1,
    blanks,
    gap,
    highlights: [
      {
        questionEn: content.informationLocation.question,
        questionTh: "",
        answer,
        paragraph: paraIndex >= 0 ? paraIndex + 1 : 1,
        whyTh: content.informationLocation.explanationThai?.trim() || "คำตอบคือช่วงข้อความที่ตอบคำถามโดยตรง ไม่ใช่ทั้งประโยคที่มันอยู่",
      },
      { questionEn: "", questionTh: "", answer: "", paragraph: 1, whyTh: "" },
    ],
    // idea and title are judged against the passage the learner ends up reading — gap sentence included
    idea: choices(
      content.mainIdea,
      resolved.map(filled).join(" "),
      "ต้องเป็นสิ่งที่บทอ่านกล่าวไว้จริง",
    ),
    title: choices(
      content.bestTitle,
      resolved.map(filled).join(" "),
      "ชื่อเรื่องต้องครอบคลุมทั้งบทอ่าน",
    ),
  };

  return { set, steps };
}
