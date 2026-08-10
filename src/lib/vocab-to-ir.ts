/**
 * Runs the VOCABULARY comprehension exercise on the Interactive Reading engine.
 *
 * This is the real test's first Interactive Reading step — "select the best option for each missing
 * word" — and our vocabulary content already has exactly its shape: a passage with numbered gaps,
 * and per-gap options with one correct answer and a Thai explanation. Only the markup differs, so
 * nothing has to be re-authored.
 *
 * The reading exam deliberately does NOT run this step; it belongs here.
 */
import type { IrSet } from "@/lib/interactive-reading";
import type { VocabPassageUnit } from "@/types/vocab";

const LEVEL: Record<string, { tier: IrSet["tier"]; level: IrSet["level"] }> = {
  easy: { tier: "easy", level: "B1" },
  medium: { tier: "medium", level: "B2" },
  hard: { tier: "advanced", level: "C1" },
};

/**
 * Rewrites `[BLANK]` / `[BLANK 3]` markers as the engine's `{n}`, numbered in reading order.
 * Admin content uses both forms, and older sets mix them within one passage.
 */
function markPassage(text: string, count: number): string {
  let n = 0;
  const out = text.replace(/\[\s*BLANK(?:\s*\d+)?\s*\]/gi, () => {
    n += 1;
    return `{${n}}`;
  });
  return n === count ? out : out;
}

export function vocabToIrSet(passage: VocabPassageUnit, id: string): { set: IrSet; steps: number[] } {
  const blanks = passage.blanks.map((b, i) => ({
    n: i + 1,
    options: b.options.slice(),
    answer: b.correctAnswer,
    skillTh: "คำศัพท์ในบริบท",
    whyTh: b.explanationThai ?? "",
  }));

  const marked = markPassage(passage.passageText, blanks.length);
  const lvl = LEVEL[passage.contentLevel] ?? LEVEL.medium!;

  // The engine shows paragraphs[0..gapAfter-1] during the word-fill step, so the whole passage is
  // one block and the trailing block exists only to satisfy the gap-position contract.
  const set: IrSet = {
    id,
    tier: lvl.tier,
    level: lvl.level,
    topicTh: passage.titleEn ?? "คำศัพท์ในบทอ่าน",
    blurbTh: "",
    paragraphs: [marked, ""],
    gapAfter: 1,
    blanks,
    gap: [{ text: "", correct: true, whyTh: "" }],
    highlights: [
      { questionEn: "", questionTh: "", answer: "", paragraph: 1, whyTh: "" },
      { questionEn: "", questionTh: "", answer: "", paragraph: 1, whyTh: "" },
    ],
    idea: [],
    title: [],
  };

  return { set, steps: [0] };
}
