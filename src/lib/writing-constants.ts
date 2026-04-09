export type WritingRoundNum = 1 | 2 | 3 | 4 | 5;

export const WRITING_ROUND_NUMBERS: WritingRoundNum[] = [1, 2, 3, 4, 5];

export function parseWritingRoundParam(s: string): WritingRoundNum | undefined {
  const n = Number.parseInt(s, 10);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return undefined;
}
