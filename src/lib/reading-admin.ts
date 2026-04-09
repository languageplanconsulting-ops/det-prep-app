import type {
  ReadingDifficulty,
  ReadingExamUnit,
  ReadingMcBlock,
  ReadingPassage,
  ReadingSet,
  ReadingVocabItem,
} from "@/types/reading";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function expectString(o: Record<string, unknown>, key: string, ctx: string): string {
  const v = o[key];
  if (typeof v !== "string" || !v.trim()) {
    throw new Error(`${ctx}: missing or invalid string "${key}"`);
  }
  return v;
}

function expectStringOpt(o: Record<string, unknown>, key: string): string | undefined {
  const v = o[key];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string") return undefined;
  return v.trim() || undefined;
}

function parseVocabItem(raw: unknown, i: number, ctx: string): ReadingVocabItem {
  if (!isRecord(raw)) throw new Error(`${ctx} highlightedVocab[${i}] must be an object`);
  return {
    word: expectString(raw, "word", `${ctx}[${i}]`),
    meaningEn: expectString(raw, "meaningEn", `${ctx}[${i}]`),
    meaningTh: expectString(raw, "meaningTh", `${ctx}[${i}]`),
    example: expectString(raw, "example", `${ctx}[${i}]`),
  };
}

function parseMcBlock(raw: unknown, name: string): ReadingMcBlock {
  if (!isRecord(raw)) throw new Error(`${name} must be an object`);
  const options = raw.options;
  if (!Array.isArray(options) || options.length < 2) {
    throw new Error(`${name}.options must be an array with at least 2 strings`);
  }
  const opts = options.map((o, j) => {
    if (typeof o !== "string" || !o.trim()) {
      throw new Error(`${name}.options[${j}] must be a non-empty string`);
    }
    return o;
  });
  const ca = raw.correctAnswer;
  const cs = raw.correctSentence;
  let correctAnswer: string;
  if (typeof ca === "string" && ca.trim()) correctAnswer = ca.trim();
  else if (typeof cs === "string" && cs.trim()) correctAnswer = cs.trim();
  else {
    throw new Error(`${name}: provide correctAnswer or correctSentence`);
  }
  const rawQuestion = raw.question;
  const fallbackQuestion =
    /informationLocation/i.test(name)
      ? "Which part of the passage supports this answer?"
      : /bestTitle/i.test(name)
        ? "What is the best title for this passage?"
        : /mainIdea/i.test(name)
          ? "What is the main idea of this passage?"
          : "Choose the best answer.";
  const question =
    typeof rawQuestion === "string" && rawQuestion.trim()
      ? rawQuestion.trim()
      : fallbackQuestion;
  return {
    question,
    correctAnswer,
    options: opts,
    explanationThai: expectStringOpt(raw, "explanationThai"),
  };
}

function parsePassage(raw: unknown, ctx: string): ReadingPassage {
  if (!isRecord(raw)) throw new Error(`${ctx}: passage must be an object`);
  return {
    p1: expectString(raw, "p1", `${ctx}.passage`),
    p2: expectString(raw, "p2", `${ctx}.passage`),
    p3: expectString(raw, "p3", `${ctx}.passage`),
  };
}

const DEFAULT_MISSING_Q =
  "Choose the sentence or paragraph that best fills the gap between paragraph 1 and paragraph 3.";

function parseMissingSentenceBlock(raw: unknown, ctx: string): ReadingMcBlock {
  if (!isRecord(raw)) throw new Error(`${ctx}: missingSentence must be an object`);
  const options = raw.options;
  if (!Array.isArray(options) || options.length < 2) {
    throw new Error(`${ctx}: missingSentence.options must have at least 2 strings`);
  }
  const opts = options.map((o, j) => {
    if (typeof o !== "string" || !o.trim()) {
      throw new Error(`${ctx}: missingSentence.options[${j}] invalid`);
    }
    return o;
  });
  const ca = raw.correctAnswer;
  const cs = raw.correctSentence;
  let correctAnswer: string;
  if (typeof ca === "string" && ca.trim()) correctAnswer = ca.trim();
  else if (typeof cs === "string" && cs.trim()) correctAnswer = cs.trim();
  else {
    throw new Error(`${ctx}: missingSentence needs correctAnswer or correctSentence`);
  }
  const q = raw.question;
  const question =
    typeof q === "string" && q.trim() ? q.trim() : DEFAULT_MISSING_Q;
  return {
    question,
    correctAnswer,
    options: opts,
    explanationThai: expectStringOpt(raw, "explanationThai"),
  };
}

/** One exam object: passage, vocab, four MC blocks (and optional titleEn). */
export function parseReadingExamUnit(raw: unknown, ctx: string): ReadingExamUnit {
  if (!isRecord(raw)) throw new Error(`${ctx} must be an object`);
  const titleEn = expectStringOpt(raw, "titleEn");
  const passage = parsePassage(raw.passage, ctx);
  const hv = raw.highlightedVocab;
  const highlightedVocab = Array.isArray(hv) ? hv : [];
  return {
    ...(titleEn ? { titleEn } : {}),
    passage,
    highlightedVocab: highlightedVocab.map((v, i) => parseVocabItem(v, i, ctx)),
    missingSentence: parseMissingSentenceBlock(raw.missingSentence, ctx),
    informationLocation: parseMcBlock(raw.informationLocation, `${ctx} informationLocation`),
    bestTitle: parseMcBlock(raw.bestTitle, `${ctx} bestTitle`),
    mainIdea: parseMcBlock(raw.mainIdea, `${ctx} mainIdea`),
  };
}

function parseReadingSet(raw: unknown, index: number): ReadingSet {
  if (!isRecord(raw)) throw new Error(`Item ${index} must be an object`);
  const setNumber = raw.setNumber;
  if (typeof setNumber !== "number" || !Number.isInteger(setNumber) || setNumber < 1) {
    throw new Error(`Item ${index}: setNumber must be a positive integer`);
  }
  const rawDifficulty = raw.difficulty;
  let difficulty: ReadingDifficulty | undefined;
  if (rawDifficulty !== undefined) {
    if (rawDifficulty === "easy" || rawDifficulty === "medium" || rawDifficulty === "hard") {
      difficulty = rawDifficulty;
    } else {
      throw new Error(`Item ${index}: difficulty must be easy | medium | hard`);
    }
  }
  const examsRaw = raw.exams;
  if (Array.isArray(examsRaw)) {
    if (examsRaw.length === 0) {
      throw new Error(`Set ${setNumber}: exams must be a non-empty array`);
    }
    const exams = examsRaw.map((e, i) =>
      parseReadingExamUnit(e, `Set ${setNumber} exam ${i + 1}`),
    );
    return { setNumber, ...(difficulty ? { difficulty } : {}), exams };
  }
  const exam = parseReadingExamUnit(raw, `Set ${setNumber}`);
  return { setNumber, ...(difficulty ? { difficulty } : {}), exams: [exam] };
}

/**
 * Merge rows that share the same setNumber into one set (concat exams).
 * Use after parse so multiple legacy rows `{ setNumber:1, passage… }` become one set.
 */
export function normalizeReadingSetsIncoming(items: ReadingSet[]): ReadingSet[] {
  const m = new Map<string, { setNumber: number; difficulty?: ReadingDifficulty; exams: ReadingExamUnit[] }>();
  for (const item of items) {
    const key = `${item.difficulty ?? "legacy"}:${item.setNumber}`;
    const cur = m.get(key)?.exams ?? [];
    cur.push(...item.exams);
    m.set(key, { setNumber: item.setNumber, difficulty: item.difficulty, exams: cur });
  }
  return [...m.values()]
    .sort((a, b) => a.setNumber - b.setNumber)
    .map((row) => ({ setNumber: row.setNumber, ...(row.difficulty ? { difficulty: row.difficulty } : {}), exams: row.exams }));
}

/** Parse admin JSON: array of sets (each set may list `exams` or one legacy exam at top level). */
export function parseReadingSetsJson(text: string): ReadingSet[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON");
  }
  if (isRecord(data)) {
    return [parseReadingSet(data, 0)];
  }
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("JSON must be a non-empty array of sets (or one set object)");
  }
  return data.map((item, i) => parseReadingSet(item, i));
}

/** Parse + group same setNumber (for admin paste of many exams as separate objects). */
export function parseAndNormalizeReadingSetsJson(text: string): ReadingSet[] {
  return normalizeReadingSetsIncoming(parseReadingSetsJson(text.trim()));
}
