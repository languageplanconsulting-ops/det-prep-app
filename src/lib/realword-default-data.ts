import { REALWORD_ROUND_NUMBERS, REALWORD_SET_COUNT } from "@/lib/realword-constants";
import type {
  RealWordDifficulty,
  RealWordFullBank,
  RealWordRoundNum,
  RealWordSet,
} from "@/types/realword";

function placeholderWords(setNum: number): RealWordSet["words"] {
  const reals = [
    { word: "authentic", explanationThai: "แท้จริง", synonyms: "genuine, real" },
    { word: "elaborate", explanationThai: "ละเอียด / ซับซ้อน", synonyms: "detailed, complex" },
    { word: "reluctant", explanationThai: "ลังเล / ไม่เต็มใจ", synonyms: "hesitant, unwilling" },
  ];
  const fakes = ["autentic", "elaborrate", "reluctent"];
  const base = setNum % 3;
  return [
    { ...reals[base]!, is_real: true },
    { ...reals[(base + 1) % 3]!, is_real: true },
    { word: fakes[base]!, is_real: false, explanationThai: "", synonyms: "" },
    { ...reals[(base + 2) % 3]!, is_real: true },
    { word: fakes[(base + 1) % 3]!, is_real: false, explanationThai: "", synonyms: "" },
    { word: "pragmatic", explanationThai: "นิยมทางปฏิบัติ", synonyms: "practical, sensible", is_real: true },
  ];
}

export function buildDefaultRealWordBank(): Record<RealWordDifficulty, RealWordSet[]> {
  const levels: RealWordDifficulty[] = ["easy", "medium", "hard"];
  const out: Record<RealWordDifficulty, RealWordSet[]> = { easy: [], medium: [], hard: [] };
  for (const d of levels) {
    out[d] = Array.from({ length: REALWORD_SET_COUNT }, (_, i) => {
      const setNumber = i + 1;
      return {
        setNumber,
        setId: `RW_${d.toUpperCase().slice(0, 1)}_${String(setNumber).padStart(2, "0")}`,
        difficulty: d,
        words: placeholderWords(setNumber),
      };
    });
  }
  return out;
}

export function emptyRealWordFullBank(): RealWordFullBank {
  const b = {} as RealWordFullBank;
  for (const r of REALWORD_ROUND_NUMBERS) {
    b[r] = { easy: [], medium: [], hard: [] };
  }
  return b;
}

/** Built-in placeholder boards exist only in round 1; other rounds start empty. */
export function defaultRealWordFullBank(): RealWordFullBank {
  const bank = emptyRealWordFullBank();
  const round = 1 as RealWordRoundNum;
  const seed = buildDefaultRealWordBank();
  for (const d of ["easy", "medium", "hard"] as const) {
    bank[round][d] = seed[d].map((s) => ({
      ...s,
      round,
      words: s.words.map((w) => ({ ...w })),
    }));
  }
  return bank;
}
