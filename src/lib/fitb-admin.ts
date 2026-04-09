import { countBlanksInPassage } from "@/lib/fitb-passage";
import { FITB_MAX_BLANKS, FITB_SET_COUNT } from "@/lib/fitb-constants";
import type { FitbDifficulty, FitbMissingWord, FitbRoundNum, FitbSet } from "@/types/fitb";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function mapFitbAdminDifficulty(raw: string): FitbDifficulty | null {
  const s = raw.trim().toLowerCase();
  if (s === "easy" || s === "foundational") return "easy";
  if (s === "medium" || s === "intermediate") return "medium";
  if (s === "hard" || s === "advanced") return "hard";
  return null;
}

function parseSetNumberFromId(setId: string): number | null {
  const m = setId.match(/(\d+)\s*$/);
  if (!m) return null;
  const n = Number.parseInt(m[1]!, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

function parseMissingWord(raw: unknown, i: number): FitbMissingWord {
  if (!isRecord(raw)) throw new Error(`missingWords[${i}] must be an object`);
  const correctWord = raw.correctWord;
  const clue = raw.clue;
  const explanationThai = raw.explanationThai;
  if (typeof correctWord !== "string" || !correctWord.trim()) {
    throw new Error(`missingWords[${i}].correctWord required`);
  }
  if (typeof clue !== "string" || !clue.trim()) {
    throw new Error(`missingWords[${i}].clue required`);
  }
  if (typeof explanationThai !== "string" || !explanationThai.trim()) {
    throw new Error(`missingWords[${i}].explanationThai required`);
  }
  const prefixRaw =
    typeof raw.prefix_length === "number" && Number.isFinite(raw.prefix_length)
      ? Math.floor(raw.prefix_length)
      : NaN;
  if (!Number.isFinite(prefixRaw) || prefixRaw < 1 || prefixRaw > 5) {
    throw new Error(`missingWords[${i}].prefix_length must be 1, 2, 3, 4, or 5`);
  }
  const prefix_length = prefixRaw;
  const synonyms = Array.isArray(raw.synonyms)
    ? raw.synonyms.map((s, j) => {
        if (typeof s !== "string" || !s.trim()) {
          throw new Error(`missingWords[${i}].synonyms[${j}] invalid`);
        }
        return s.trim();
      })
    : [];
  return {
    correctWord: correctWord.trim(),
    clue: clue.trim(),
    prefix_length,
    explanationThai: explanationThai.trim(),
    synonyms,
  };
}

export function parseFitbBankJson(text: string): FitbSet[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Invalid JSON");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("JSON must be a non-empty array");
  }

  const out: FitbSet[] = [];
  const counters: Record<FitbDifficulty, number> = { easy: 0, medium: 0, hard: 0 };

  parsed.forEach((raw, idx) => {
    if (!isRecord(raw)) throw new Error(`Row ${idx + 1}: must be an object`);
    const passage = raw.passage;
    const difficultyRaw = raw.difficulty;
    const setId = raw.set_id;
    const cefr = raw.cefr_level;
    const missing = raw.missingWords;
    if (typeof passage !== "string" || !passage.trim()) {
      throw new Error(`Row ${idx + 1}: passage required`);
    }
    if (typeof difficultyRaw !== "string") {
      throw new Error(`Row ${idx + 1}: difficulty required`);
    }
    const difficulty = mapFitbAdminDifficulty(difficultyRaw);
    if (!difficulty) {
      throw new Error(`Row ${idx + 1}: unknown difficulty "${difficultyRaw}"`);
    }
    if (typeof setId !== "string" || !setId.trim()) {
      throw new Error(`Row ${idx + 1}: set_id required`);
    }
    if (!Array.isArray(missing) || missing.length === 0) {
      throw new Error(`Row ${idx + 1}: missingWords must be a non-empty array`);
    }
    if (missing.length > FITB_MAX_BLANKS) {
      throw new Error(`Row ${idx + 1}: at most ${FITB_MAX_BLANKS} blanks`);
    }
    const blankCount = countBlanksInPassage(passage);
    if (blankCount !== missing.length) {
      throw new Error(
        `Row ${idx + 1}: passage has ${blankCount} [BLANK n] markers but ${missing.length} missingWords`,
      );
    }
    const missingWords = missing.map((m, i) => parseMissingWord(m, i));
    let setNumber = parseSetNumberFromId(setId.trim());
    if (setNumber != null && setNumber > FITB_SET_COUNT) setNumber = null;
    if (setNumber == null) {
      counters[difficulty] += 1;
      setNumber = counters[difficulty];
    }
    if (setNumber < 1 || setNumber > FITB_SET_COUNT) {
      throw new Error(`Row ${idx + 1}: set number must be 1–${FITB_SET_COUNT}`);
    }
    const cefrNorm = typeof cefr === "string" ? cefr.trim().toUpperCase() : "";
    const allowedCefr = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);
    if (!allowedCefr.has(cefrNorm)) {
      throw new Error(`Row ${idx + 1}: cefr_level must be A1, A2, B1, B2, C1, or C2`);
    }
    const cefrLevel = cefrNorm;
    out.push({
      setNumber,
      setId: setId.trim(),
      round: 1 as FitbRoundNum,
      difficulty,
      cefrLevel,
      passage: passage.trim(),
      missingWords,
    });
  });

  return out;
}

export function normalizeFitbSetsForBank(sets: FitbSet[]): Record<FitbDifficulty, FitbSet[]> {
  const maps: Record<FitbDifficulty, Map<number, FitbSet>> = {
    easy: new Map(),
    medium: new Map(),
    hard: new Map(),
  };
  for (const s of sets) {
    maps[s.difficulty].set(s.setNumber, s);
  }
  const bank: Record<FitbDifficulty, FitbSet[]> = {
    easy: [],
    medium: [],
    hard: [],
  };
  for (const d of ["easy", "medium", "hard"] as const) {
    bank[d] = [...maps[d].values()].sort((a, b) => a.setNumber - b.setNumber);
  }
  return bank;
}
