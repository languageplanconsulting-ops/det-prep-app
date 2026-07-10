"use client";

/**
 * Shared random-queue builder — used by RandomPracticePicker and the study-plan
 * calendar's "start today's session" flow, so there's one fetch/retry
 * implementation instead of two copies that could drift.
 */
import { canAccessDifficulty, type Tier } from "@/lib/access-control";
import {
  buildPracticeHref,
  DURATION_TO_COUNT,
  RANDOM_SKILLS,
  randomRound,
  pickOne,
  type RandomDifficulty,
} from "@/lib/practice-random";

export type QueueItem = { key: string; emoji: string; label: string; href: string };

/** Best default: "medium" if the tier can reach it, else "easy" (every tier can reach easy) — avoids
 * defaulting a free user to a difficulty the content route will reject on every single roll. */
export function defaultDifficultyFor(tier: Tier): RandomDifficulty {
  return canAccessDifficulty(tier, "medium").allowed ? "medium" : "easy";
}

async function fetchSetNumbers(
  skillId: string,
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

/** Tries up to `maxAttempts` skill/round combos before giving up on this one slot — the server
 * now rejects locked difficulty/skill combos (empty setNumbers), so a free user's queue just
 * skips those and tries again rather than erroring. */
async function pickOneSession(
  difficulty: RandomDifficulty,
  usedHrefs: Set<string>,
  maxAttempts = 6,
): Promise<QueueItem | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const skill = pickOne(RANDOM_SKILLS);
    const round = randomRound();
    const setNumbers = await fetchSetNumbers(skill.id, round, difficulty);
    if (setNumbers.length === 0) continue;
    const setNumber = pickOne(setNumbers);
    const href = buildPracticeHref(skill.id, round, difficulty, setNumber);
    if (usedHrefs.has(href)) continue;
    return { key: href, emoji: skill.emoji, label: skill.label, href };
  }
  return null;
}

/**
 * Builds a queue of `DURATION_TO_COUNT[duration]` distinct exercise sessions at the given
 * difficulty. May return fewer items than requested if the content bank / gating rules can't
 * fill every slot within the retry budget — callers should handle a shorter-than-expected queue.
 */
export async function buildRandomQueue(
  difficulty: RandomDifficulty,
  duration: 5 | 10 | 20 | 30,
): Promise<QueueItem[]> {
  const count = DURATION_TO_COUNT[duration];
  const used = new Set<string>();
  const picked: QueueItem[] = [];
  for (let i = 0; i < count; i++) {
    const item = await pickOneSession(difficulty, used);
    if (!item) continue;
    used.add(item.href);
    picked.push(item);
  }
  return picked;
}
