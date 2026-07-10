export type RandomizableSkill =
  | "dictation"
  | "fitb"
  | "realword"
  | "reading"
  | "vocab"
  | "conversation"
  | "dialogue_summary";

export type RandomDifficulty = "easy" | "medium" | "hard";

/** UI-only pooling choice — "any" must never be persisted as a difficulty value (see buildContentKey). */
export type RandomDifficultyOrAny = RandomDifficulty | "any";

const ALL_DIFFICULTIES: RandomDifficulty[] = ["easy", "medium", "hard"];

/** Resolve a per-item difficulty: "any" rolls a fresh random pick each call. */
export function resolveDifficulty(choice: RandomDifficultyOrAny): RandomDifficulty {
  return choice === "any" ? pickOne(ALL_DIFFICULTIES) : choice;
}

/** Single-skill randomizer duration options — separate from DURATION_TO_COUNT's cross-skill scale. */
export type SingleSkillDuration = 5 | 10 | 15 | 20 | "unlimited";

/** Roughly "how many sets fit in this much time" for a single-skill queue. */
export const SINGLE_SKILL_DURATION_TO_COUNT: Record<Exclude<SingleSkillDuration, "unlimited">, number> = {
  5: 1,
  10: 2,
  15: 3,
  20: 4,
};

/** "Unlimited" rolls this many up front, then the learner can keep asking for more. */
export const UNLIMITED_INITIAL_BATCH = 5;

export const RANDOM_SKILLS: { id: RandomizableSkill; label: string; emoji: string }[] = [
  { id: "dictation", label: "Dictation · ฟังแล้วพิมพ์ตาม", emoji: "🎧" },
  { id: "fitb", label: "Fill in the blank · เติมคำที่หาย", emoji: "✏️" },
  { id: "realword", label: "Real word · แยกคำจริง/ปลอม", emoji: "🔤" },
  { id: "reading", label: "Reading · บทอ่าน", emoji: "📖" },
  { id: "vocab", label: "Vocabulary · คำศัพท์ในบริบท", emoji: "📚" },
  { id: "conversation", label: "Interactive conversation", emoji: "🗣️" },
  { id: "dialogue_summary", label: "Dialogue → summary", emoji: "💬" },
];

/** Rough "how many sets fit in this much time" — same options as the study-plan duration picker. */
export const DURATION_TO_COUNT: Record<5 | 10 | 20 | 30, number> = {
  5: 1,
  10: 2,
  20: 4,
  30: 6,
};

const ROUNDS = [1, 2, 3, 4, 5];

export function randomRound(): number {
  return ROUNDS[Math.floor(Math.random() * ROUNDS.length)];
}

export function pickOne<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Deep-link into the existing runner routes — same URL shapes the set-list grids already use. */
export function buildPracticeHref(
  skill: RandomizableSkill,
  round: number,
  difficulty: RandomDifficulty,
  setNumber: number,
): string {
  switch (skill) {
    case "dictation":
      return `/practice/literacy/dictation/round/${round}/${difficulty}/${setNumber}`;
    case "fitb":
      return `/practice/literacy/fill-in-blank/round/${round}/${difficulty}/${setNumber}`;
    case "realword":
      return `/practice/literacy/real-word/round/${round}/${difficulty}/${setNumber}`;
    case "dialogue_summary":
      return `/practice/listening/dialogue-summary/round/${round}/${difficulty}/${setNumber}`;
    case "reading":
      return `/practice/comprehension/reading/round/${round}/${difficulty}/${setNumber}/1`;
    case "conversation":
      return `/practice/listening/interactive/${round}/${difficulty}/${setNumber}`;
    case "vocab":
      return `/practice/comprehension/vocabulary/round/${round}/${setNumber}/${difficulty}`;
  }
}
