export type RealWordDifficulty = "easy" | "medium" | "hard";

export type RealWordRoundNum = 1 | 2 | 3 | 4 | 5;

export interface RealWordCard {
  word: string;
  is_real: boolean;
  explanationThai: string;
  synonyms: string;
}

export interface RealWordSet {
  setNumber: number;
  setId: string;
  difficulty: RealWordDifficulty;
  /** Practice round (1–5); optional for legacy rows. */
  round?: RealWordRoundNum;
  words: RealWordCard[];
}

export type RealWordFullBank = Record<RealWordRoundNum, Record<RealWordDifficulty, RealWordSet[]>>;

export interface RealWordProgressRecord {
  bestScore: number;
  maxScore: number;
  updatedAt: string;
  userId?: string;
}
