import type { SpeakingRoundNum } from "@/types/speaking";

export const SPEAKING_ROUND_NUMBERS: readonly SpeakingRoundNum[] = [1, 2, 3, 4, 5];

export function isSpeakingRound(n: number): n is SpeakingRoundNum {
  return n === 1 || n === 2 || n === 3 || n === 4 || n === 5;
}

/** Admin uploads are merged into this round until multi-round upload exists. */
export const SPEAKING_ADMIN_UPLOAD_ROUND = 1 as SpeakingRoundNum;
