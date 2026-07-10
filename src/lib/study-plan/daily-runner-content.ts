"use client";

/**
 * Shared content picker for the daily-practice RUNNER (src/components/practice/daily-runner/*).
 * Given a plan skill + difficulty, picks a concrete (round, setNumber) to play next, using the
 * same "list available sets, pick one" call the old random-queue builder used
 * (src/lib/practice-queue-builder.ts) — factored out here so every skill's Runner*Item adapter
 * shares one implementation instead of five copies that could drift.
 */
import { randomRound, pickOne, type RandomDifficulty } from "@/lib/practice-random";
import { buildContentKey, type PracticeSkill } from "@/lib/practice-attempts-contentkey";
import type { DailyPlanSkill } from "@/lib/study-plan/daily-plan";

export type RunnerContentPick = { round: number; difficulty: RandomDifficulty; setNumber: number; contentKey: string };

/** DailyPlanSkill is a strict subset of PracticeSkill (the 5 auto-graded runner skills). */
function toPracticeSkill(skill: DailyPlanSkill): PracticeSkill {
  return skill;
}

async function fetchSetNumbers(
  skillId: DailyPlanSkill,
  round: number,
  difficulty: RandomDifficulty,
): Promise<number[]> {
  const res = await fetch(
    `/api/practice/content/set?skill=${skillId}&round=${round}&difficulty=${difficulty}&list=1`,
    { credentials: "same-origin" },
  );
  if (!res.ok) return [];
  const json = (await res.json()) as { setNumbers?: number[] };
  return json.setNumbers ?? [];
}

/**
 * Picks one playable (round, setNumber) for `skill` at `difficulty`, avoiding any contentKey
 * already in `excludeKeys` (this run's already-played items) when possible. Retries a handful
 * of round rolls before giving up — mirrors pickOneSession's retry budget in
 * practice-queue-builder.ts. Returns null only if the content bank has nothing playable at all
 * (e.g. a locked difficulty for a free user) after every attempt.
 */
export async function pickRunnerContent(
  skill: DailyPlanSkill,
  difficulty: RandomDifficulty,
  excludeKeys: Set<string>,
  maxAttempts = 8,
): Promise<RunnerContentPick | null> {
  const practiceSkill = toPracticeSkill(skill);
  let fallback: RunnerContentPick | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const round = randomRound();
    const setNumbers = await fetchSetNumbers(skill, round, difficulty);
    if (setNumbers.length === 0) continue;
    const fresh = setNumbers.filter(
      (n) => !excludeKeys.has(buildContentKey(practiceSkill, difficulty, round, n)),
    );
    const pool = fresh.length > 0 ? fresh : setNumbers;
    const setNumber = pickOne(pool);
    const contentKey = buildContentKey(practiceSkill, difficulty, round, setNumber);
    const pick: RunnerContentPick = { round, difficulty, setNumber, contentKey };
    if (fresh.length > 0) return pick;
    // Keep the first fully-exhausted-pool pick as a fallback in case every later attempt
    // also exhausts (small content banks) — better than failing the slot outright.
    if (!fallback) fallback = pick;
  }
  return fallback;
}
