"use client";

/**
 * Shared content picker for the daily-practice RUNNER (src/components/practice/daily-runner/*).
 * Given a plan skill + difficulty, picks a concrete (round, setNumber) to play next, using the
 * same "list available sets, pick one" call the old random-queue builder used
 * (src/lib/practice-queue-builder.ts) — factored out here so every skill's Runner*Item adapter
 * shares one implementation instead of five copies that could drift.
 *
 * Difficulty may be "any" ("ทุกระดับ"): we then try EVERY level the learner can actually open,
 * in random order, per round. Rolling a single level per attempt used to dead-end signed-out or
 * free-tier learners — /api/practice/content/set answers 401 / 403 for them, which looked
 * identical to "the bank is empty" and produced a bogus "ยังไม่มีข้อสอบสำหรับระดับนี้" screen.
 */
import {
  randomRound,
  pickOne,
  type RandomDifficulty,
  type RandomDifficultyOrAny,
} from "@/lib/practice-random";
import { buildContentKey, type PracticeSkill } from "@/lib/practice-attempts-contentkey";
import type { DailyPlanSkill } from "@/lib/study-plan/daily-plan";

export type RunnerContentPick = { round: number; difficulty: RandomDifficulty; setNumber: number; contentKey: string };

/** Why nothing could be picked — the UI must not report all three as "no content". */
export type RunnerPickFailure =
  /** 401 — no Supabase session; every content call is rejected. */
  | "unauthenticated"
  /** 403 — every requested level is above the learner's tier. */
  | "locked"
  /** Reachable and allowed, but the content bank really has nothing. */
  | "empty";

export type RunnerPickResult =
  | { ok: true; pick: RunnerContentPick }
  | { ok: false; reason: RunnerPickFailure };

const ALL_DIFFICULTIES: RandomDifficulty[] = ["easy", "medium", "hard"];

/** DailyPlanSkill is a strict subset of PracticeSkill (the 5 auto-graded runner skills). */
function toPracticeSkill(skill: DailyPlanSkill): PracticeSkill {
  return skill;
}

function shuffled<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type LaneResult = { setNumbers: number[]; status: number };

async function fetchLane(
  skillId: DailyPlanSkill,
  round: number,
  difficulty: RandomDifficulty,
): Promise<LaneResult> {
  try {
    const res = await fetch(
      `/api/practice/content/set?skill=${skillId}&round=${round}&difficulty=${difficulty}&list=1`,
      { credentials: "same-origin" },
    );
    if (!res.ok) return { setNumbers: [], status: res.status };
    const json = (await res.json()) as { setNumbers?: number[] };
    return { setNumbers: json.setNumbers ?? [], status: 200 };
  } catch {
    // Offline / aborted — indistinguishable from a server hiccup, so treat it as an empty lane
    // and let the remaining attempts decide.
    return { setNumbers: [], status: 0 };
  }
}

/**
 * Picks one playable (round, setNumber) for `skill`, avoiding any contentKey already in
 * `excludeKeys` (this run's already-played items) when possible. Retries a handful of round
 * rolls before giving up — mirrors pickOneSession's retry budget in practice-queue-builder.ts.
 *
 * With difficulty "any" each attempt walks every not-yet-locked level for that round, so one
 * locked level can never sink the whole roll.
 */
export async function pickRunnerContent(
  skill: DailyPlanSkill,
  difficulty: RandomDifficultyOrAny,
  excludeKeys: Set<string>,
  maxAttempts = 8,
): Promise<RunnerPickResult> {
  const practiceSkill = toPracticeSkill(skill);
  const locked = new Set<RandomDifficulty>();
  let sawLocked = false;
  let fallback: RunnerContentPick | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const round = randomRound();
    const lanes = (difficulty === "any" ? shuffled(ALL_DIFFICULTIES) : [difficulty]).filter(
      (d) => !locked.has(d),
    );
    if (lanes.length === 0) break; // every level this learner asked for is above their tier

    for (const lane of lanes) {
      const { setNumbers, status } = await fetchLane(skill, round, lane);
      if (status === 401) return { ok: false, reason: "unauthenticated" };
      if (status === 403) {
        locked.add(lane);
        sawLocked = true;
        continue;
      }
      if (setNumbers.length === 0) continue;

      const fresh = setNumbers.filter(
        (n) => !excludeKeys.has(buildContentKey(practiceSkill, lane, round, n)),
      );
      const pool = fresh.length > 0 ? fresh : setNumbers;
      const setNumber = pickOne(pool);
      const contentKey = buildContentKey(practiceSkill, lane, round, setNumber);
      const pick: RunnerContentPick = { round, difficulty: lane, setNumber, contentKey };
      if (fresh.length > 0) return { ok: true, pick };
      // Keep the first fully-exhausted-pool pick as a fallback in case every later attempt
      // also exhausts (small content banks) — better than failing the slot outright.
      if (!fallback) fallback = pick;
    }
  }

  if (fallback) return { ok: true, pick: fallback };
  return { ok: false, reason: sawLocked ? "locked" : "empty" };
}
