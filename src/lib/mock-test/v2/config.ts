/**
 * Central tuning knobs for mock test engine v2.
 * Edit values here; formulas are imported by routing, stage builders, and final scoring.
 */

import type { RoutingBand } from "@/lib/mock-test/v2/types";

/** ─── Routing: Stage 1 “det-like” (NOT final score) → internal band for Stages 2–4 ─── */
export const ROUTING_THRESHOLDS = {
  /** Below this → route to 85-band pool */
  to85Below: 110,
  /** This (inclusive) until below to150From → 125-band */
  to125From: 110,
  to125Below: 135,
  /** This or above → 150-band */
  to150From: 135,
} as const;

export function routeFromStage1DetLike(stage1DetLike: number): RoutingBand {
  if (stage1DetLike < ROUTING_THRESHOLDS.to85Below) return 85;
  if (stage1DetLike < ROUTING_THRESHOLDS.to125Below) return 125;
  return 150;
}

/** ─── Stage 1 anchor scoring (0–100 per task) → aggregate ─── */
export const STAGE1_FORMULAS = {
  /** Mean of all Stage 1 task scores (each already 0–100). */
  aggregateStage1Raw100: (taskScores: number[]) => {
    const t = taskScores.filter((x) => Number.isFinite(x));
    if (t.length === 0) return 0;
    return t.reduce((a, b) => a + b, 0) / t.length;
  },
  /**
   * Internal routing statistic only (10–160-ish range).
   * final reported score uses FINAL_DET_FORMULA on overall_raw_0_to_100 instead.
   */
  stage1DetLikeFromRaw100: (stage1Raw100: number) =>
    10 + stage1Raw100 * 1.5,
} as const;

/** ─── Final continuous DET-like placement score ─── */
export const DET_LIKE_FORMULAS = {
  /**
   * overall_raw_0_to_100: average of four macro subscores (each 0–100).
   * final_score_raw: continuous, e.g. 108.4
   */
  finalScoreRawFromOverall100: (overallRaw0To100: number) =>
    10 + overallRaw0To100 * 1.5,

  /** Optional display helper; real placement logic should use final_score_raw. */
  roundToNearest5: (raw: number) => Math.round(raw / 5) * 5,
} as const;

/**
 * Subscore weights — must sum to 1 within each macro skill **when all tasks exist**.
 * Missing task types: weights are renormalized over present types only.
 *
 * Keys = DB question_type (see task-registry.ts).
 */
export const SUBSCORE_WEIGHTS = {
  reading: {
    read_and_select: 0.2,
    real_english_word: 0.15,
    fill_in_blanks: 0.3,
    vocabulary_reading: 0.25,
    read_then_speak: 0.1,
  },
  listening: {
    dictation: 0.3,
    interactive_listening: 0.6,
    interactive_speaking: 0.1,
  },
  writing: {
    write_about_photo: 0.35,
    read_and_write: 0.65,
  },
  speaking: {
    speak_about_photo: 0.15,
    read_then_speak: 0.45,
    interactive_speaking: 0.4,
  },
} as const;

/** CEFR from continuous final_score_raw (same scale as DET-like 10–160). */
export const CEFR_BANDS: readonly {
  min: number;
  max: number;
  level: string;
}[] = [
  { min: 10, max: 29.999, level: "A1" },
  { min: 30, max: 59.999, level: "A2" },
  { min: 60, max: 99.999, level: "B1" },
  { min: 100, max: 129.999, level: "B2" },
  { min: 130, max: 154.999, level: "C1" },
  { min: 155, max: 160, level: "C2" },
];

export function cefrFromFinalScoreRaw(finalScoreRaw: number): string {
  const x = Math.max(10, Math.min(160, finalScoreRaw));
  for (const b of CEFR_BANDS) {
    if (x >= b.min && x <= b.max) return b.level;
  }
  return "C2";
}

/** Anti-repeat */
export const ANTI_REPEAT = {
  /** Skip same content_family if used in this window (days) for this user. */
  familyExcludeDays: 30,
  /** Also block same asset URL in content (best-effort string match). */
  dedupeImageKeys: ["image_url", "imageUrl"] as const,
  dedupeAudioKeys: ["audio_url", "audioUrl"] as const,
} as const;

/** Objective scoring: task_score_0_100 = earned/max*100 */
export const DEFAULT_MAX_POINTS_OBJECTIVE = 1;

/** AI tasks: raw AI is assumed 0–160 like production exams; convert to 0–100 for mixing. */
export function ai160ToScore100(score160: number): number {
  const s = Math.max(0, Math.min(160, score160));
  return (s / 160) * 100;
}
