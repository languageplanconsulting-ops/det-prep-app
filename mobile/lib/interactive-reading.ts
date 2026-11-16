/**
 * Interactive Reading — the DET task model, for the app.
 *
 * COPIED from the website, because the app cannot import from `src/` (separate tsconfig/bundle):
 *   - types and passage helpers   ← src/lib/interactive-reading.ts
 *   - word tokens / phrase ranges ← src/lib/passage-text.ts
 *   - highlight grading           ← the `score` memo in src/components/reading/InteractiveReadingRunner.tsx
 * Keep them in step with those files. Content itself is NOT copied: the app fetches the one set an
 * exam slot opens from /api/practice/content/interactive-reading, which picks it with the same
 * function the web exam uses.
 *
 * One passage, six steps in a fixed order on a single clock:
 *   0. select the best option for each missing word   (inline dropdown blanks, partial credit)
 *   1. select the best sentence to complete the passage (inserted in place)
 *   2. highlight text in the passage to answer a question
 *   3. highlight again — second question
 *   4. select the idea that is expressed in the passage
 *   5. select the best title for the passage
 * After step 0 the blanks are shown filled with the CORRECT words, as DET does.
 */

export type IrTier = "easy" | "medium" | "advanced";

export type IrBlank = {
  n: number;
  options: string[];
  answer: string;
  skillTh: string;
  whyTh: string;
};

export type IrChoice = { text: string; correct: boolean; whyTh: string; clueEn?: string };

export type IrHighlight = {
  questionEn: string;
  questionTh: string;
  /** Exact substring of the resolved paragraph. */
  answer: string;
  /** Shorter sub-spans of `answer` that also count as right. */
  accept?: string[];
  /** 1-based index into `resolvedParagraphs()`. */
  paragraph: number;
  whyTh: string;
  clueEn?: string;
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

export type IrStepResult = {
  step: number;
  /** 0..1 — the word-fill step is partial credit (right blanks / all blanks). */
  score: number;
  chosen: string[];
  correct: string[];
};

export const IR_STEP_COUNT = 6;

/**
 * Display order for an option list — a stable shuffle seeded by `seed` (e.g. `${set.id}:gap`).
 *
 * The bank is authored with the key FIRST in every list (every blank, gap, idea and title option),
 * so showing lists in stored order let a learner score 100% by always tapping the top option.
 * Seeded rather than random so the server render and the client hydrate agree, and a retry of the
 * same set shows the same order. Returns indices into the original list; grading keeps using them.
 */
export function irOptionOrder(seed: string, n: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** DET's clock: 480s at 11+ sub-items (blanks + 5 other tasks), 420s below. */
export function irSeconds(set: IrSet): number {
  return set.blanks.length + 5 >= 11 ? 480 : 420;
}

const BLANK_RE = /\{(\d+)\}/g;

export function resolveParagraph(text: string, blanks: IrBlank[]): string {
  return text.replace(BLANK_RE, (_m, d: string) => {
    const b = blanks.find((x) => x.n === Number(d));
    return b ? b.answer : "___";
  });
}

/** Blanks resolved and the correct missing sentence inserted as its own paragraph. */
export function resolvedParagraphs(set: IrSet): string[] {
  const out = set.paragraphs.map((p) => resolveParagraph(p, set.blanks));
  const gap = set.gap.find((g) => g.correct);
  out.splice(set.gapAfter, 0, gap ? gap.text : "");
  return out;
}

export type IrChunk = { kind: "text"; text: string } | { kind: "blank"; n: number };

export function paragraphChunks(text: string): IrChunk[] {
  const out: IrChunk[] = [];
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

/** Step 0 shows every block up to the last one that carries a blank marker. */
export function clozeParagraphCount(set: IrSet): number {
  let lastWithBlank = set.gapAfter - 1;
  set.paragraphs.forEach((p, i) => {
    if (/\{\d+\}/.test(p)) lastWithBlank = Math.max(lastWithBlank, i);
  });
  return lastWithBlank + 1;
}

export const IR_STEP_LABELS_TH = ["เติมคำในช่องว่าง", "เติมประโยคที่หายไป", "ไฮไลต์คำตอบ (ข้อ 1)", "ไฮไลต์คำตอบ (ข้อ 2)", "แนวคิดที่กล่าวถึง", "ชื่อเรื่อง"];
export const IR_STEP_LABELS_EN = ["Missing words", "Missing sentence", "Highlight (Q1)", "Highlight (Q2)", "Idea expressed", "Best title"];

export const IR_STEP_PROMPTS_TH = [
  "เลือกคำที่เหมาะที่สุดสำหรับช่องว่างแต่ละช่อง",
  "เลือกประโยคที่เติมลงในบทอ่านได้ดีที่สุด",
  "ไฮไลต์ข้อความในบทอ่านเพื่อตอบคำถามด้านล่าง",
  "ไฮไลต์ข้อความในบทอ่านเพื่อตอบคำถามด้านล่าง",
  "เลือกแนวคิดที่บทอ่านนี้กล่าวถึง",
  "เลือกชื่อเรื่องที่เหมาะที่สุดของบทอ่านนี้",
];

export const IR_STEP_PROMPTS_EN = [
  "Select the best option for each missing word",
  "Select the best sentence to complete the passage",
  "Highlight text in the passage to answer the question below",
  "Highlight text in the passage to answer the question below",
  "Select the idea that is expressed in the passage",
  "Select the best title for the passage",
];

/** DET's header re-labels itself as the set shrinks: "for 6 questions" … "for this question". */
export function irRemainingLabel(step: number, t: (th: string, en: string) => string): string {
  const left = IR_STEP_COUNT - step;
  return left <= 1 ? t("สำหรับข้อนี้", "for this question") : t(`สำหรับ ${left} ข้อ`, `for ${left} questions`);
}

/* ── words and spans (src/lib/passage-text.ts) ─────────────────────────── */

export type PassageWordToken = { text: string; start: number; end: number };

export function wordTokens(text: string): PassageWordToken[] {
  const tokens: PassageWordToken[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) tokens.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  return tokens;
}

/** Inclusive word-index range [start,end] an exact-substring phrase occupies within text. */
export function phraseWordRange(text: string, phrase: string): [number, number] | null {
  const idx = text.indexOf(phrase);
  if (idx < 0) return null;
  const endChar = idx + phrase.length;
  const tokens = wordTokens(text);
  let start = -1;
  let end = -1;
  tokens.forEach((t, i) => {
    if (t.end > idx && t.start < endChar) {
      if (start < 0) start = i;
      end = i;
    }
  });
  return start < 0 ? null : [start, end];
}

/* ── highlight grading (InteractiveReadingRunner `score`) ──────────────── */

export type IrSelection = { para: number; start: number; end: number };

/** Every span that counts as right: the model answer plus its accepted shorter variants. */
export function highlightTargets(paragraph: string, hl: IrHighlight): [number, number][] {
  return [hl.answer, ...(hl.accept ?? [])]
    .map((phrase) => phraseWordRange(paragraph, phrase))
    .filter((r): r is [number, number] => r !== null);
}

/**
 * Right if the selection is in the answer's paragraph and covers ANY accepted span with at most two
 * spare words — exactly the web runner's tolerance.
 */
export function highlightIsCorrect(sel: IrSelection | null, hl: IrHighlight, targets: [number, number][]): boolean {
  if (!sel || sel.para !== hl.paragraph) return false;
  return targets.some(([s, e]) => sel.start <= s && sel.end >= e && sel.end - sel.start - (e - s) <= 2);
}

/** Why a highlight missed, as a short Thai tag (web: highlightMissTagTh). */
export function highlightMissTagTh(sel: IrSelection | null, hl: IrHighlight, answerRange: [number, number] | null): string {
  if (!sel) return "ยังไม่ได้เลือกข้อความ";
  if (sel.para !== hl.paragraph) return "อยู่คนละย่อหน้ากับคำตอบ";
  if (!answerRange) return "ไม่ใช่ส่วนที่ตอบคำถาม";
  const [s, e] = answerRange;
  if (sel.start <= s && sel.end >= e) return "คลุมกว้างเกินไป";
  if (sel.end < s || sel.start > e) return "ไม่ใช่ส่วนที่ตอบคำถาม";
  return "ยังไม่ครบช่วงคำตอบ";
}
