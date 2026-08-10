/**
 * Interactive Reading — a faithful model of the DET "Interactive Reading" task.
 *
 * One passage is answered SIX ways, in a fixed order, on a single clock:
 *   1. select the best option for each missing word   (6–10 dropdown blanks, partial credit)
 *   2. select the best sentence to complete the passage (5 options, inserted in place)
 *   3. highlight text in the passage to answer a question
 *   4. highlight again — second question
 *   5. select the idea that is expressed in the passage (5 statements)
 *   6. select the best title for the passage           (5 short phrases)
 *
 * The passage GROWS as you go: step 1 shows only the paragraphs that contain
 * blanks; step 2 adds the gap box plus the paragraph after it; from step 3 the
 * whole passage is visible with the blanks resolved to their CORRECT answers
 * (DET does this even when you answered a blank wrongly).
 *
 * Layout notes for the runner live in components/reading/InteractiveReadingRunner.tsx.
 */
import { IR_SETS } from "./interactive-reading-data";

export type IrTier = "easy" | "medium" | "advanced";

/** One inline dropdown blank. `n` matches the `{n}` marker in the paragraph text. */
export type IrBlank = {
  n: number;
  /** Exactly five single words, all the same part of speech. */
  options: string[];
  answer: string;
  /** Which sub-skill the blank tests — shown in the feedback panel. */
  skillTh: string;
  whyTh: string;
};

export type IrChoice = { text: string; correct: boolean; whyTh: string };

export type IrHighlight = {
  questionEn: string;
  questionTh: string;
  /** Exact substring of the resolved paragraph. Kept as short as the stem allows. */
  answer: string;
  /** 1-based index into `resolvedParagraphs()`. */
  paragraph: number;
  whyTh: string;
};

export type IrSet = {
  id: string;
  tier: IrTier;
  level: "B1" | "B2" | "C1";
  topicTh: string;
  blurbTh: string;
  /** Full passage. Blanks are written as `{1}`, `{2}`, … */
  paragraphs: string[];
  /** The missing sentence sits after `paragraphs[gapAfter - 1]`. */
  gapAfter: number;
  blanks: IrBlank[];
  gap: IrChoice[];
  highlights: [IrHighlight, IrHighlight];
  idea: IrChoice[];
  title: IrChoice[];
};

/**
 * DET does not use a fixed clock: sub-items = cloze blanks + 5 (one per other
 * task), and the set gets 480s at 11 or more sub-items, 420s below that.
 */
export function irSubItemCount(set: IrSet): number {
  return set.blanks.length + 5;
}

export function irSeconds(set: IrSet): number {
  return irSubItemCount(set) >= 11 ? 480 : 420;
}

export { IR_SETS };

export const IR_TIERS: {
  key: IrTier;
  th: string;
  cefr: string;
  color: string;
  soft: string;
  icon: string;
  blurbTh: string;
}[] = [
  { key: "easy", th: "ระดับต้น", cefr: "B1", color: "#1B9E54", soft: "#DCF5E6", icon: "🌱", blurbTh: "เรื่องใกล้ตัว ประโยคไม่ซับซ้อน" },
  { key: "medium", th: "ระดับกลาง", cefr: "B2", color: "#004AAD", soft: "#E7EFFF", icon: "⚡", blurbTh: "เรื่องเชิงวิชาการ มีการเปรียบเทียบและเหตุผล" },
  { key: "advanced", th: "ระดับสูง", cefr: "C1", color: "#6B45C7", soft: "#E7E0FA", icon: "👑", blurbTh: "ข้อโต้แย้งสองฝั่ง คำศัพท์ระดับสูง" },
];

export function irSetById(id: string): IrSet | undefined {
  return IR_SETS.find((s) => s.id === id);
}

/**
 * Strips the option lists a drill will never show, so a single-skill drill does not ship every
 * passage's idea/title options — and their Thai explanations — to the browser.
 *
 * The bank is ~800 KB. Importing it from a client component put the whole thing in a JS chunk, which
 * a learner on a phone paid for on every drill. Drill pages are server components now, and this
 * trims what they hand across the boundary. `blanks` and `gap` are kept whatever the step, because
 * the passage text cannot be resolved without the correct answers.
 */
export function irProjectForSteps(set: IrSet, steps: number[]): IrSet {
  const keep = new Set(steps);
  return {
    ...set,
    highlights: (keep.has(2) || keep.has(3) ? set.highlights : [set.highlights[0], set.highlights[1]].map(() => EMPTY_HIGHLIGHT)) as IrSet["highlights"],
    idea: keep.has(4) ? set.idea : [],
    title: keep.has(5) ? set.title : [],
  };
}

const EMPTY_HIGHLIGHT: IrHighlight = { questionEn: "", questionTh: "", answer: "", paragraph: 1, whyTh: "" };

export function irSetsByTier(tier: IrTier): IrSet[] {
  return IR_SETS.filter((s) => s.tier === tier);
}

const BLANK_RE = /\{(\d+)\}/g;

/** Paragraph text with every `{n}` replaced by that blank's correct answer. */
export function resolveParagraph(text: string, blanks: IrBlank[]): string {
  return text.replace(BLANK_RE, (_m, d: string) => {
    const b = blanks.find((x) => x.n === Number(d));
    return b ? b.answer : "___";
  });
}

/**
 * The passage as the learner sees it from step 3 onwards: blanks resolved and
 * the correct missing sentence inserted as its own paragraph. Highlight answers
 * are indexed against this list (1-based).
 */
export function resolvedParagraphs(set: IrSet): string[] {
  const out = set.paragraphs.map((p) => resolveParagraph(p, set.blanks));
  const gap = set.gap.find((g) => g.correct);
  out.splice(set.gapAfter, 0, gap ? gap.text : "");
  return out;
}

/** Splits a paragraph into `{n}` markers and plain text, in order. */
export function paragraphChunks(text: string): ({ kind: "text"; text: string } | { kind: "blank"; n: number })[] {
  const out: ({ kind: "text"; text: string } | { kind: "blank"; n: number })[] = [];
  let last = 0;
  for (const m of text.matchAll(BLANK_RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ kind: "text", text: text.slice(last, i) });
    out.push({ kind: "blank", n: Number(m[1]) });
    last = i + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

export const IR_STEP_COUNT = 6;

/** Short Thai names for the six steps — used in the report and in the drill hub. */
export const IR_STEP_LABELS_TH = ["เติมคำในช่องว่าง", "เติมประโยคที่หายไป", "ไฮไลต์คำตอบ (ข้อ 1)", "ไฮไลต์คำตอบ (ข้อ 2)", "แนวคิดที่กล่าวถึง", "ชื่อเรื่อง"];

/** DET's header re-labels itself as the set shrinks. */
export function irRemainingLabel(step: number): string {
  const left = IR_STEP_COUNT - step;
  return left <= 1 ? "สำหรับข้อนี้" : `สำหรับ ${left} ข้อ`;
}

export function irStepPromptTh(step: number): string {
  return [
    "เลือกคำที่เหมาะที่สุดสำหรับช่องว่างแต่ละช่อง",
    "เลือกประโยคที่เติมลงในบทอ่านได้ดีที่สุด",
    "ไฮไลต์ข้อความในบทอ่านเพื่อตอบคำถามด้านล่าง",
    "ไฮไลต์ข้อความในบทอ่านเพื่อตอบคำถามด้านล่าง",
    "เลือกแนวคิดที่บทอ่านนี้กล่าวถึง",
    "เลือกชื่อเรื่องที่เหมาะที่สุดของบทอ่านนี้",
  ][step]!;
}

export function irStepPromptEn(step: number): string {
  return [
    "Select the best option for each missing word",
    "Select the best sentence to complete the passage",
    "Highlight text in the passage to answer the question below",
    "Highlight text in the passage to answer the question below",
    "Select the idea that is expressed in the passage",
    "Select the best title for the passage",
  ][step]!;
}
