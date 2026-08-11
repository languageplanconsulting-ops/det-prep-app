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

function choices(block: ReadingMcBlock, wrongWhyTh: string) {
  const key = stripMarkers(block.correctAnswer);
  return block.options.map((o) => {
    const text = stripMarkers(o);
    const correct = text === key;
    return { text, correct, whyTh: correct ? (block.explanationThai ?? "") : wrongWhyTh };
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

  const gap = choices(
    content.missingParagraph,
    "ประโยคนี้อ่านแล้วลื่น แต่ไม่เชื่อมกับย่อหน้าถัดไป — ให้ดูว่าย่อหน้าไหนทำให้เนื้อความต่อกันได้",
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
        whyTh: content.informationLocation.explanationThai ?? "",
      },
      { questionEn: "", questionTh: "", answer: "", paragraph: 1, whyTh: "" },
    ],
    idea: choices(
      content.mainIdea,
      "ข้อนี้ไม่ใช่สิ่งที่บทอ่านกล่าวไว้ — อาจจริงบางส่วน แคบเกินไป หรือเหมารวมเกินกว่าที่เขียนไว้",
    ),
    title: choices(
      content.bestTitle,
      "ชื่อเรื่องต้องครอบคลุมทั้งบทอ่าน ข้อนี้แคบเกินไป กว้างเกินไป หรือจับผิดประเด็น",
    ),
  };

  return { set, steps };
}
