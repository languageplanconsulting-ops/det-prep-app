import { DIALOGUE_SUMMARY_SET_COUNT } from "@/lib/dialogue-summary-constants";
import type {
  DialogueSummaryDifficulty,
  DialogueSummaryExam,
  DialogueSummaryRoundNum,
  DialogueTurn,
} from "@/types/dialogue-summary";

function isRecord(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

export function mapDialogueSummaryDifficulty(raw: string): DialogueSummaryDifficulty | null {
  const s = raw.trim().toLowerCase();
  if (s === "easy" || s === "medium" || s === "hard") return s;
  return null;
}

function parseTurn(raw: unknown, idx: number): DialogueTurn {
  if (!isRecord(raw)) throw new Error(`Dialogue turn ${idx + 1}: must be an object`);
  const speaker = raw.speaker;
  const text = raw.text;
  if (typeof speaker !== "string" || !speaker.trim()) {
    throw new Error(`Dialogue turn ${idx + 1}: "speaker" must be a non-empty string`);
  }
  if (typeof text !== "string" || !text.trim()) {
    throw new Error(`Dialogue turn ${idx + 1}: "text" must be a non-empty string`);
  }
  return { speaker: speaker.trim(), text: text.trim() };
}

/**
 * Parse one exam object from admin JSON.
 */
export function parseDialogueSummaryExam(raw: unknown, idx: number): DialogueSummaryExam {
  if (!isRecord(raw)) throw new Error(`Item ${idx + 1}: must be an object`);
  const roundRaw = raw.round;
  const difficultyRaw = raw.difficulty;
  const setNumberRaw = raw.setNumber;
  const titleEn = raw.titleEn;
  const titleTh = raw.titleTh;
  const scenarioSentences = raw.scenarioSentences;
  const dialogue = raw.dialogue;

  const round = Number(roundRaw);
  if (round !== 1 && round !== 2 && round !== 3 && round !== 4 && round !== 5) {
    throw new Error(`Item ${idx + 1}: round must be 1–5`);
  }
  const difficulty = typeof difficultyRaw === "string" ? mapDialogueSummaryDifficulty(difficultyRaw) : null;
  if (!difficulty) throw new Error(`Item ${idx + 1}: difficulty must be easy|medium|hard`);
  const setNumber = Number(setNumberRaw);
  if (!Number.isFinite(setNumber) || setNumber < 1 || setNumber > DIALOGUE_SUMMARY_SET_COUNT) {
    throw new Error(`Item ${idx + 1}: setNumber must be 1–${DIALOGUE_SUMMARY_SET_COUNT}`);
  }
  if (typeof titleEn !== "string" || !titleEn.trim()) throw new Error(`Item ${idx + 1}: titleEn required`);
  if (typeof titleTh !== "string" || !titleTh.trim()) throw new Error(`Item ${idx + 1}: titleTh required`);
  if (!Array.isArray(scenarioSentences) || scenarioSentences.length !== 5) {
    throw new Error(`Item ${idx + 1}: scenarioSentences must be an array of exactly 5 strings`);
  }
  const scenario = scenarioSentences.map((s, i) => {
    if (typeof s !== "string" || !s.trim()) throw new Error(`Item ${idx + 1}: scenario sentence ${i + 1} invalid`);
    return s.trim();
  });
  if (!Array.isArray(dialogue) || dialogue.length < 8) {
    throw new Error(`Item ${idx + 1}: dialogue must be an array with at least 8 turns`);
  }
  const turns = dialogue.map((t, i) => parseTurn(t, i));
  const r = round as DialogueSummaryRoundNum;
  const id = `ds-r${r}-${difficulty}-s${String(setNumber).padStart(2, "0")}`;
  return {
    id,
    round: r,
    difficulty,
    setNumber,
    titleEn: titleEn.trim(),
    titleTh: titleTh.trim(),
    scenarioSentences: scenario,
    dialogue: turns,
  };
}

export function parseDialogueSummaryBankJson(text: string): DialogueSummaryExam[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("JSON must be a non-empty array of exam objects");
  }
  return parsed.map((row, i) => parseDialogueSummaryExam(row, i));
}
