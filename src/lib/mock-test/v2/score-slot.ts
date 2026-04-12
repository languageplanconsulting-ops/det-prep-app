/**
 * Per-slot scoring: objective ratio → 0–100; AI grader (0–10) → 0–100 via ×10.
 */

import type { MockQuestionType } from "@/lib/mock-test/types";
import { gradeDetResponse } from "@/lib/mock-test/grader";
import { ai160ToScore100 } from "@/lib/mock-test/v2/config";
import { contributionVector, macroSkillForTaskType } from "@/lib/mock-test/v2/task-registry";
import type { PoolQuestionRow } from "@/lib/mock-test/v2/pool-picker";
import type { RoutingBand, V2ResponseRecord } from "@/lib/mock-test/v2/types";

function normalizeTyped(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^a-z0-9\s']/g, "");
}

function parseObjectiveCorrect(
  qt: MockQuestionType,
  question: PoolQuestionRow,
  answer: unknown,
): { earned: number; max: number } {
  const max = Math.max(0.0001, Number(question.max_points ?? 1));
  const ca = question.correct_answer as { answer?: string } | null;
  const raw =
    typeof answer === "object" && answer && "answer" in answer
      ? String((answer as { answer: unknown }).answer)
      : String(answer ?? "");

  if (!ca || typeof ca.answer !== "string") {
    return { earned: 0, max };
  }

  if (qt === "dictation") {
    const ok = normalizeTyped(raw) === normalizeTyped(ca.answer);
    return { earned: ok ? max : 0, max };
  }
  const ok = raw.trim().toLowerCase() === ca.answer.trim().toLowerCase();
  return { earned: ok ? max : 0, max };
}

function extractText(answer: unknown): string {
  if (answer == null) return "";
  if (typeof answer === "string") return answer;
  if (typeof answer === "object" && "text" in (answer as object)) {
    return String((answer as { text?: string }).text ?? "");
  }
  return JSON.stringify(answer);
}

/** Map 0–10 examiner score → 0–100 task score (aligned with ×160 intermediate). */
export function grader10ToTaskScore100(score10: number): number {
  const s = Math.max(0, Math.min(10, score10));
  return s * 10;
}

/** Map 0–160-style score → 0–100 */
export function score160ToTask100(s: number): number {
  return ai160ToScore100(s);
}

export async function scoreSlot(
  attemptId: string,
  slotId: string,
  engineStage: import("@/lib/mock-test/v2/types").EngineStage,
  question: PoolQuestionRow,
  answer: unknown,
): Promise<V2ResponseRecord> {
  const qt = question.question_type;
  const band = (question.target_band ?? 125) as RoutingBand;

  const objectiveTypes: MockQuestionType[] = [
    "fill_in_blanks",
    "read_and_select",
    "real_english_word",
    "dictation",
    "interactive_listening",
  ];

  let taskScore100 = 0;
  let earned = 0;
  let max = Number(question.max_points ?? 1);

  if (objectiveTypes.includes(qt)) {
    const r = parseObjectiveCorrect(qt, question, answer);
    earned = r.earned;
    max = r.max;
    taskScore100 = max > 0 ? (earned / max) * 100 : 0;
  } else if (qt === "vocabulary_reading") {
    const pre =
      typeof answer === "object" && answer && "averageScore0To100" in answer
        ? Number((answer as { averageScore0To100?: number }).averageScore0To100)
        : NaN;
    if (Number.isFinite(pre)) {
      taskScore100 = Math.max(0, Math.min(100, pre));
      earned = taskScore100;
      max = 100;
    } else {
      taskScore100 = 0;
      earned = 0;
      max = 100;
    }
  } else {
    const text = extractText(answer);
    if (!text.trim()) {
      taskScore100 = 0;
      earned = 0;
      max = 160;
    } else {
      const g = await gradeDetResponse(
        text,
        `Task type: ${qt}. Score as DET open response (map internally to 0–160 scale).`,
      );
      const score160 = (g.score / 10) * 160;
      taskScore100 = score160ToTask100(score160);
      earned = score160;
      max = 160;
    }
  }

  const contrib = contributionVector(qt, taskScore100);
  const macro = macroSkillForTaskType(qt) as V2ResponseRecord["macro"];

  return {
    attempt_id: attemptId,
    slot_id: slotId,
    engine_stage: engineStage,
    question_id: question.id,
    task_type: qt,
    target_band: band,
    earned_points: earned,
    max_points: max,
    task_score_0_to_100: taskScore100,
    ...contrib,
    macro,
  };
}
