import type {
  VocabBlankQuestion,
  VocabCorrectWordEntry,
  VocabPassageUnit,
  VocabPassageContentLevel,
  VocabSet,
} from "@/types/vocab";
import { VOCAB_MAX_PASSAGES_PER_SET } from "@/lib/vocab-constants";

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

function parseContentLevel(raw: unknown, ctx: string): VocabPassageContentLevel {
  if (raw === "easy" || raw === "medium" || raw === "hard") return raw;
  throw new Error(`${ctx}: contentLevel must be easy | medium | hard`);
}

function parseBlank(raw: unknown, ctx: string): VocabBlankQuestion {
  if (!isRecord(raw)) throw new Error(`${ctx} must be an object`);
  const options = raw.options;
  if (!Array.isArray(options) || options.length < 2) {
    throw new Error(`${ctx}.options must be an array with at least 2 strings`);
  }
  const opts = options.map((o, j) => {
    if (typeof o !== "string" || !o.trim()) {
      throw new Error(`${ctx}.options[${j}] invalid`);
    }
    return o;
  });
  return {
    question: expectString(raw, "question", ctx),
    correctAnswer: expectString(raw, "correctAnswer", ctx),
    options: opts,
    explanationThai: expectString(raw, "explanationThai", ctx),
  };
}

function parseCorrectWord(raw: unknown, ctx: string): VocabCorrectWordEntry {
  if (!isRecord(raw)) throw new Error(`${ctx} must be an object`);
  const syns = raw.synonyms;
  const synonyms = Array.isArray(syns)
    ? syns.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
  return {
    word: expectString(raw, "word", ctx),
    synonyms,
  };
}

/** Converts `[BLANK 1]`, `[BLANK 2]`, `[BLANK1]`, etc. to canonical `[BLANK]` (matches VocabExam). */
export function normalizeVocabPassageBlanks(passageText: string): string {
  return passageText.replace(/\[\s*BLANK\s*\d+\s*\]/gi, "[BLANK]");
}

function countBlanks(text: string): number {
  const m = text.match(/\[BLANK\]/g);
  return m ? m.length : 0;
}

function parsePassageUnit(raw: unknown, ctx: string): VocabPassageUnit {
  if (!isRecord(raw)) throw new Error(`${ctx} must be an object`);
  const passageNumber = raw.passageNumber;
  if (typeof passageNumber !== "number" || !Number.isInteger(passageNumber) || passageNumber < 1) {
    throw new Error(`${ctx}: passageNumber must be a positive integer`);
  }
  const passageTextRaw = expectString(raw, "passageText", ctx);
  const passageText = normalizeVocabPassageBlanks(passageTextRaw);
  const blanksInText = countBlanks(passageText);
  if (blanksInText < 1) {
    throw new Error(
      `${ctx}: passageText must contain at least 1 [BLANK] or [BLANK 1]…[BLANK N] placeholder (found ${blanksInText})`,
    );
  }
  const blanksRaw = raw.blanks;
  if (!Array.isArray(blanksRaw) || blanksRaw.length !== blanksInText) {
    throw new Error(`${ctx}: blanks must be an array of length ${blanksInText}`);
  }
  const cwRaw = raw.correctWords;
  if (!Array.isArray(cwRaw) || cwRaw.length !== blanksInText) {
    throw new Error(`${ctx}: correctWords must be an array of length ${blanksInText}`);
  }
  return {
    passageNumber,
    contentLevel: parseContentLevel(raw.contentLevel, ctx),
    titleEn: expectStringOpt(raw, "titleEn"),
    passageText,
    blanks: blanksRaw.map((b, i) => parseBlank(b, `${ctx} blanks[${i}]`)),
    correctWords: cwRaw.map((c, i) => parseCorrectWord(c, `${ctx} correctWords[${i}]`)),
  };
}

function parseVocabSet(raw: unknown, index: number): VocabSet {
  if (!isRecord(raw)) throw new Error(`Item ${index} must be an object`);
  const setNumber = raw.setNumber;
  if (typeof setNumber !== "number" || !Number.isInteger(setNumber) || setNumber < 1) {
    throw new Error(`Item ${index}: setNumber must be a positive integer`);
  }
  const passagesRaw = raw.passages;
  if (Array.isArray(passagesRaw)) {
    if (passagesRaw.length === 0) {
      throw new Error(`Set ${setNumber}: passages must be non-empty`);
    }
    if (passagesRaw.length > VOCAB_MAX_PASSAGES_PER_SET) {
      throw new Error(
        `Set ${setNumber}: at most ${VOCAB_MAX_PASSAGES_PER_SET} passages per set (found ${passagesRaw.length})`,
      );
    }
    const passages = passagesRaw.map((p, i) =>
      parsePassageUnit(p, `Set ${setNumber} passage ${i + 1}`),
    );
    return { setNumber, passages };
  }
  const single = parsePassageUnit(raw, `Set ${setNumber}`);
  return { setNumber, passages: [single] };
}

export function normalizeVocabSetsIncoming(items: VocabSet[]): VocabSet[] {
  const m = new Map<number, VocabPassageUnit[]>();
  for (const item of items) {
    const cur = m.get(item.setNumber) ?? [];
    cur.push(...item.passages);
    m.set(item.setNumber, cur);
  }
  return [...m.entries()]
    .sort(([a], [b]) => a - b)
    .map(([setNumber, passages]) => {
      const sorted = [...passages].sort((x, y) => x.passageNumber - y.passageNumber);
      if (sorted.length > VOCAB_MAX_PASSAGES_PER_SET) {
        throw new Error(
          `Set ${setNumber}: merged passages exceed ${VOCAB_MAX_PASSAGES_PER_SET}. Split across imports.`,
        );
      }
      return { setNumber, passages: sorted };
    });
}

export function parseVocabSetsJson(text: string): VocabSet[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON");
  }
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("JSON must be a non-empty array");
  }
  return data.map((item, i) => parseVocabSet(item, i));
}
