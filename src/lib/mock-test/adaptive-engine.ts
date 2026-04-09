import type { Difficulty } from "@/lib/access-control";
import { ADAPTIVE_PHASE_MAX, isAdaptivePhase } from "@/lib/mock-test/constants";
import type {
  AdaptiveLog,
  AdaptiveState,
  MockQuestionRow,
} from "@/lib/mock-test/types";

export function pointsForDifficulty(difficulty: Difficulty): number {
  if (difficulty === "easy") return 1;
  if (difficulty === "medium") return 1.5;
  return 2;
}

/**
 * Difficulty to use for the next question given current adaptive state (after prior answers).
 */
export function getNextDifficulty(state: AdaptiveState): Difficulty {
  return state.currentDifficulty;
}

/**
 * Pick a random unused question from the pool for this phase & difficulty.
 */
export function getNextQuestion(
  phase: number,
  difficulty: Difficulty,
  usedIds: string[],
  pool: MockQuestionRow[],
): MockQuestionRow | null {
  const candidates = pool.filter(
    (q) =>
      q.phase === phase &&
      q.difficulty === difficulty &&
      !usedIds.includes(q.id) &&
      q.is_active !== false,
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}

export type AdaptiveResponseInput = {
  difficulty: Difficulty;
  isCorrect: boolean;
};

/**
 * Sum of points for adaptive (multiple-choice) responses.
 */
export function calculateAdaptiveScore(
  responses: AdaptiveResponseInput[],
): number {
  let total = 0;
  for (const r of responses) {
    if (r.isCorrect) total += pointsForDifficulty(r.difficulty);
  }
  return Math.round(total * 100) / 100;
}

export function shouldUpgrade(state: AdaptiveState): boolean {
  if (!isAdaptivePhase(state.phase)) return false;
  if (state.currentDifficulty !== "medium") return false;
  return state.consecutiveCorrect >= 3;
}

export function shouldDowngrade(state: AdaptiveState): boolean {
  if (!isAdaptivePhase(state.phase)) return false;
  if (state.currentDifficulty === "hard") {
    return state.consecutiveWrong >= 2;
  }
  if (state.currentDifficulty === "medium") {
    return state.consecutiveWrong >= 2;
  }
  return false;
}

/**
 * Apply one answer and return updated adaptive state for phases 1–4.
 * Phases 5–9 return state unchanged (non-adaptive).
 */
export function applyAdaptiveAnswer(
  state: AdaptiveState,
  isCorrect: boolean,
): AdaptiveState {
  if (!isAdaptivePhase(state.phase)) {
    return { ...state };
  }

  const d: Difficulty = state.currentDifficulty;
  let cc = state.consecutiveCorrect;
  let cw = state.consecutiveWrong;

  if (isCorrect) {
    cc += 1;
    cw = 0;
  } else {
    cw += 1;
    cc = 0;
  }

  // HARD: two wrong → MEDIUM (not EASY)
  if (d === "hard" && cw >= 2) {
    return { phase: state.phase, currentDifficulty: "medium", consecutiveCorrect: 0, consecutiveWrong: 0 };
  }
  // MEDIUM: two wrong → EASY
  if (d === "medium" && cw >= 2) {
    return { phase: state.phase, currentDifficulty: "easy", consecutiveCorrect: 0, consecutiveWrong: 0 };
  }
  // EASY: three correct → MEDIUM
  if (d === "easy" && cc >= 3) {
    return { phase: state.phase, currentDifficulty: "medium", consecutiveCorrect: 0, consecutiveWrong: 0 };
  }
  // MEDIUM: three correct → HARD
  if (d === "medium" && cc >= 3) {
    return { phase: state.phase, currentDifficulty: "hard", consecutiveCorrect: 0, consecutiveWrong: 0 };
  }
  // HARD: three correct → stay HARD, reset streak
  if (d === "hard" && cc >= 3) {
    return { phase: state.phase, currentDifficulty: "hard", consecutiveCorrect: 0, consecutiveWrong: 0 };
  }

  return {
    phase: state.phase,
    currentDifficulty: d,
    consecutiveCorrect: cc,
    consecutiveWrong: cw,
  };
}

export type SessionPhaseResponses = Record<
  string,
  {
    items?: Array<{
      questionId: string;
      difficulty: string;
      isCorrect: boolean;
      pointsEarned: number;
      difficultyAfter?: string;
      timestamp?: string;
    }>;
  }
>;

export function getAdaptiveLog(session: {
  phase_responses?: SessionPhaseResponses | null;
}): AdaptiveLog[] {
  const raw = session.phase_responses;
  if (!raw || typeof raw !== "object") return [];
  const out: AdaptiveLog[] = [];
  for (let p = 1; p <= ADAPTIVE_PHASE_MAX; p++) {
    const block = raw[String(p)];
    const items = block?.items;
    if (!items) continue;
    for (const it of items) {
      out.push({
        questionId: it.questionId,
        difficulty: it.difficulty,
        isCorrect: it.isCorrect,
        pointsEarned: it.pointsEarned ?? 0,
        difficultyAfter: it.difficultyAfter ?? it.difficulty,
        timestamp: it.timestamp ?? new Date().toISOString(),
      });
    }
  }
  return out;
}
