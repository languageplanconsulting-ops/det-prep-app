import { FITB_SET_COUNT } from "@/lib/fitb-constants";
import type { FitbDifficulty, FitbFullBank, FitbRoundNum, FitbSet } from "@/types/fitb";

const LEVELS: FitbDifficulty[] = ["easy", "medium", "hard"];

function emptyBank(): FitbFullBank {
  const r = [1, 2, 3, 4, 5] as const;
  const base = {} as FitbFullBank;
  for (const n of r) {
    base[n] = { easy: [], medium: [], hard: [] };
  }
  return base;
}

function miniPassage(level: FitbDifficulty, n: number): { passage: string; words: FitbSet["missingWords"] } {
  const w = [
    {
      correctWord: "growth",
      clue: "Increase in size or amount.",
      prefix_length: 1,
      explanationThai: "การเติบโต — noun ทั่วไป",
      synonyms: ["expansion", "rise"],
    },
    {
      correctWord: "requires",
      clue: "Needs something as a necessary condition.",
      prefix_length: 2,
      explanationThai: "ต้องการ — verb ในปัจจุบัน",
      synonyms: ["needs", "demands"],
    },
    {
      correctWord: "careful",
      clue: "Done with attention to avoid harm or mistakes.",
      prefix_length: 2,
      explanationThai: "ระมัดระวัง — adjective",
      synonyms: ["cautious", "prudent"],
    },
  ] as const;
  return {
    passage: `The [BLANK 1] of this ${level} practice set ${n} [BLANK 2] [BLANK 3] reading.`,
    words: w.map((x) => ({ ...x, synonyms: [...x.synonyms] })),
  };
}

/** Defaults live in round 1 only; other rounds stay empty until admin upload. */
export function buildDefaultFitbBank(): FitbFullBank {
  const bank = emptyBank();
  const round = 1 as FitbRoundNum;
  for (const level of LEVELS) {
    for (let setNumber = 1; setNumber <= FITB_SET_COUNT; setNumber++) {
      const { passage, words } = miniPassage(level, setNumber);
      bank[round][level].push({
        setNumber,
        setId: `set_${level}_${String(setNumber).padStart(2, "0")}`,
        round,
        difficulty: level,
        cefrLevel: level === "easy" ? "A2" : level === "medium" ? "B1" : "B2",
        passage,
        missingWords: words,
      });
    }
  }
  return bank;
}
