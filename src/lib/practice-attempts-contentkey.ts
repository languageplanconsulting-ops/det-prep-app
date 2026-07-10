/**
 * Content-key format shared with the mobile app (det-mobile/src/lib/daily-practice.ts
 * contentKey()) so a set completed on either platform is recognizable on the other via
 * the practice_attempts.detail.contentKey field.
 */
export type PracticeSkill = "reading" | "vocab" | "fitb" | "realword" | "dialogue_summary" | "dictation";

export function buildContentKey(
  skill: PracticeSkill,
  difficulty: string,
  round: number,
  setNum: number,
): string {
  return `${skill}:${difficulty}:r${round}:s${setNum}`;
}

export type ParsedContentKey = {
  skill: PracticeSkill;
  difficulty: string;
  round: number;
  setNum: number;
};

const CONTENT_KEY_RE = /^([a-z_]+):([a-z]+):r(\d+):s(\d+)$/;

export function parseContentKey(key: string): ParsedContentKey | null {
  const m = CONTENT_KEY_RE.exec(key);
  if (!m) return null;
  return { skill: m[1] as PracticeSkill, difficulty: m[2], round: Number(m[3]), setNum: Number(m[4]) };
}

/**
 * Reading and vocab pack a sub-unit (exam/passage number) into the mobile
 * "setNum" as setNumber*100 + (subNumber-1) — mirrors the label math in
 * det-mobile/src/screens/ExamPracticeScreen.tsx loadRounds().
 */
export function packSubIndexed(setNumber: number, subNumber: number): number {
  return setNumber * 100 + (subNumber - 1);
}

export function unpackSubIndexed(setNum: number): { setNumber: number; subNumber: number } {
  return { setNumber: Math.floor(setNum / 100), subNumber: (setNum % 100) + 1 };
}
