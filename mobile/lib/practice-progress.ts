import { fetchPracticeAttempts } from "./api";

/**
 * Content key shared with the website (src/lib/practice-attempts-contentkey.ts)
 * so a set finished on either platform is recognised on the other.
 */
export function buildContentKey(
  skill: string,
  difficulty: string,
  round: number,
  setNum: number,
): string {
  return `${skill}:${difficulty}:r${round}:s${setNum}`;
}

const CONTENT_KEY_RE = /^([a-z_]+):([a-z]+):r(\d+):s(\d+)$/;

/** Best score % per set number for one skill/round/difficulty, across web and app. */
export async function fetchBestPctBySet(args: {
  taskType: string;
  skill: string;
  round: number;
  difficulty: string;
}): Promise<Map<number, number>> {
  const attempts = await fetchPracticeAttempts(args.taskType);
  const best = new Map<number, number>();
  for (const a of attempts) {
    const ck = a.detail?.contentKey;
    if (typeof ck !== "string") continue;
    const m = CONTENT_KEY_RE.exec(ck);
    if (!m || m[1] !== args.skill || m[2] !== args.difficulty || Number(m[3]) !== args.round) continue;
    const setNum = Number(m[4]);
    const pct = a.score_pct ?? 0;
    if (pct > (best.get(setNum) ?? -1)) best.set(setNum, pct);
  }
  return best;
}

/**
 * Reading and vocab pack the exam/passage number into the set slot as
 * setNumber*100 + (subNumber-1) — same as the website's packSubIndexed.
 */
export function packSubIndexed(setNumber: number, subNumber: number): number {
  return setNumber * 100 + (subNumber - 1);
}
