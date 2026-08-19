/**
 * Runs the mock test's reading step on the Interactive Reading engine.
 *
 * Step 8 of the fixed mock (`vocabulary_reading`) already holds a complete real task: vocabulary
 * gaps spread through the passage, the missing paragraph, an information-location question, the
 * best title and the main idea. It was rendered as ten multiple-choice cards in a row; this maps it
 * onto the real screen without touching the content or the score payload.
 *
 * Three shapes differ from a practice set and are handled here:
 *   · the blanks sit either side of the gap ([BLANK 1..3] in p1, [BLANK 4..6] in p3), so the cloze
 *     step has to show both blocks — the runner walks to the last block carrying a marker
 *   · the older sets carry more blanks than the mock grades (up to ten). Only the first `vocabCount`
 *     become slots; the rest are written back into the passage as the word itself, because a marker
 *     with no question behind it renders as a slot the learner can never fill
 *   · the information-location answer is only usable as a highlight when it is a verbatim span of
 *     the passage AND the upload actually carries the question; when either is missing that step is
 *     dropped rather than shown as something it isn't — half the sets have no `question` field, and
 *     a highlight prompt with nothing to answer is the one screen a learner cannot get past
 */
import type { IrSet } from "@/lib/interactive-reading";
import { derivedWrongWhyTh } from "@/lib/interactive-reading-explain";
import type { VocabularyReadingMockContent } from "@/lib/mock-test/vocabulary-reading-mock";
import type { ReadingMcBlock } from "@/types/reading";

function stripMarkers(s: string): string {
  return s.replace(/\*\*\s*(.*?)\s*\*\*/g, "$1");
}

const BLANK_MARKER = /\[\s*BLANK(?:\s*\d+)?\s*\]/gi;

function countBlanks(text: string): number {
  return (text.match(BLANK_MARKER) ?? []).length;
}

/**
 * `[BLANK 1]` → `{1}`, renumbered in reading order across the whole passage.
 *
 * Markers past `limit` are not slots: they are replaced by `fill`, the word that belongs there.
 * The runner looks every `{n}` up in `blanks`, so an unmatched marker is a dead slot on the one
 * screen the learner cannot skip.
 */
function markPassage(
  text: string,
  startAt: number,
  limit: number,
  fill: (n: number) => string,
): { text: string; used: number } {
  let n = startAt;
  const out = stripMarkers(text).replace(BLANK_MARKER, () => {
    n += 1;
    return n <= limit ? `{${n}}` : fill(n);
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
  const authored = content.vocabularyQuestions ?? [];
  // A blank only exists when BOTH a marker and a question back it: older sets carry ten markers for
  // six graded questions, and one set carries fewer markers than questions.
  const markers = countBlanks(content.passage.p1) + countBlanks(content.passage.p3);
  const graded = Math.min(vocabCount, authored.length, markers);
  const fill = (n: number) => stripMarkers(authored[n - 1]?.correctAnswer ?? "");

  const a = markPassage(content.passage.p1, 0, graded, fill);
  const b = markPassage(content.passage.p3, a.used, graded, fill);
  const paragraphs = [a.text, b.text];

  const vocab = authored.slice(0, graded);
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
  // Match against the passage the learner will actually be dragging over — blanks filled in. The
  // runner resolves `{n}` before it looks the span up, so testing the marked text here rejected
  // every answer that happens to contain a cloze word ("fall asleep in one city and {4} in
  // another") and silently dropped the step from most of the sets.
  const paraIndex = resolved.map(filled).findIndex((p) => p.includes(answer));
  const hlQuestion = (content.informationLocation.question ?? "").trim();

  const steps: number[] = [];
  if (blanks.length) steps.push(0);
  steps.push(1);
  if (hlQuestion && paraIndex >= 0 && answer.length >= 3) steps.push(2);
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
        questionEn: hlQuestion,
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
