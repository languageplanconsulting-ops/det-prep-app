import { DICTATION_SET_COUNT } from "@/lib/dictation-constants";
import type { DictationDifficulty, DictationItem, DictationRoundNum } from "@/types/dictation";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Map admin JSON difficulty strings to app levels. */
export function mapAdminDifficulty(raw: string): DictationDifficulty | null {
  const s = raw.trim().toLowerCase();
  if (s === "easy" || s === "foundational" || s === "beginner") return "easy";
  if (s === "medium" || s === "intermediate") return "medium";
  if (s === "hard" || s === "advanced") return "hard";
  return null;
}

export interface DictationAdminRow {
  difficulty: string;
  correctText: string;
  hintText?: string;
  setNumber?: number;
}

export function parseDictationBankJson(text: string): DictationAdminRow[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Invalid JSON");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("JSON must be a non-empty array");
  }
  const rows: DictationAdminRow[] = [];
  parsed.forEach((raw, i) => {
    if (!isRecord(raw)) throw new Error(`Row ${i + 1}: must be an object`);
    const difficulty = raw.difficulty;
    const correctText = raw.correctText;
    if (typeof difficulty !== "string" || !difficulty.trim()) {
      throw new Error(`Row ${i + 1}: missing difficulty`);
    }
    if (typeof correctText !== "string" || !correctText.trim()) {
      throw new Error(`Row ${i + 1}: missing correctText`);
    }
    const hintText =
      typeof raw.hintText === "string" && raw.hintText.trim() ? raw.hintText.trim() : undefined;
    const setNumber =
      typeof raw.setNumber === "number" && Number.isInteger(raw.setNumber)
        ? raw.setNumber
        : undefined;
    rows.push({ difficulty: difficulty.trim(), correctText: correctText.trim(), hintText, setNumber });
  });
  return rows;
}

/**
 * Assign pasted rows to set numbers 1…20 per difficulty in array order.
 * Returns patches: difficulty + setNumber + transcript (+ hint).
 */
export function dictationRowsToPatches(rows: DictationAdminRow[]): DictationItem[] {
  const counters: Record<DictationDifficulty, number> = {
    easy: 0,
    medium: 0,
    hard: 0,
  };
  const out: DictationItem[] = [];

  for (const row of rows) {
    const level = mapAdminDifficulty(row.difficulty);
    if (!level) {
      throw new Error(`Unknown difficulty "${row.difficulty}" (use foundational/medium/advanced or easy/medium/hard)`);
    }
    let setNumber = row.setNumber;
    if (setNumber == null) {
      counters[level] += 1;
      setNumber = counters[level];
    }
    if (!Number.isInteger(setNumber) || setNumber < 1) {
      throw new Error(`Invalid setNumber for ${level}.`);
    }
    if (setNumber > DICTATION_SET_COUNT) {
      throw new Error(
        `Set number ${setNumber} exceeds ${DICTATION_SET_COUNT} for ${level}.`,
      );
    }
    const hintText =
      row.hintText?.trim() ||
      `Listen carefully; punctuation and spacing must match the answer key.`;
    out.push({
      id: `dictation-${level}-${setNumber}-admin`,
      round: 1 as DictationRoundNum,
      difficulty: level,
      setNumber,
      audioPath: `/audio/dictation/${level}-${setNumber}.mp3`,
      transcript: row.correctText,
      hintText,
    });
  }
  return out;
}
