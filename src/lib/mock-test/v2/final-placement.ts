/**
 * Continuous DET-like placement from scored task rows.
 * Edit weights in config.ts (SUBSCORE_WEIGHTS); formulas in DET_LIKE_FORMULAS.
 */

import {
  DET_LIKE_FORMULAS,
  STAGE1_FORMULAS,
  SUBSCORE_WEIGHTS,
  cefrFromFinalScoreRaw,
} from "@/lib/mock-test/v2/config";
import type { MockQuestionType } from "@/lib/mock-test/types";
import type { RoutingBand, V2PlacementResult, V2ResponseRecord } from "@/lib/mock-test/v2/types";

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Average task score per task_type (multiple slots of same type → mean). */
export function averageScoreByTaskType(
  items: V2ResponseRecord[],
): Partial<Record<MockQuestionType, number>> {
  const buckets = new Map<MockQuestionType, number[]>();
  for (const it of items) {
    const arr = buckets.get(it.task_type) ?? [];
    arr.push(it.task_score_0_to_100);
    buckets.set(it.task_type, arr);
  }
  const out: Partial<Record<MockQuestionType, number>> = {};
  for (const [t, arr] of buckets) {
    out[t] = average(arr);
  }
  return out;
}

/**
 * Weighted blend; only types with a present average participate; weights renormalized over those.
 */
function blend(
  weights: Record<string, number>,
  avgs: Partial<Record<string, number | null>>,
): number {
  let num = 0;
  let den = 0;
  for (const [type, w] of Object.entries(weights)) {
    const v = avgs[type];
    if (v == null || !Number.isFinite(v)) continue;
    num += w * v;
    den += w;
  }
  if (den <= 0) return 0;
  return num / den;
}

export function computeStage1Anchor(stage1Items: V2ResponseRecord[]): {
  stage1_raw_100: number;
  stage1_det_like: number;
} {
  const scores = stage1Items.map((i) => i.task_score_0_to_100);
  const stage1_raw_100 = STAGE1_FORMULAS.aggregateStage1Raw100(scores);
  const stage1_det_like = STAGE1_FORMULAS.stage1DetLikeFromRaw100(stage1_raw_100);
  return { stage1_raw_100, stage1_det_like };
}

export function computeFinalPlacement(
  routingBand: RoutingBand,
  items: V2ResponseRecord[],
): V2PlacementResult {
  const av = averageScoreByTaskType(items);

  const wR = SUBSCORE_WEIGHTS.reading as Record<string, number>;
  const wL = SUBSCORE_WEIGHTS.listening as Record<string, number>;
  const wW = SUBSCORE_WEIGHTS.writing as Record<string, number>;
  const wS = SUBSCORE_WEIGHTS.speaking as Record<string, number>;

  const reading_subscore = blend(wR, av as Record<string, number | null>);
  const listening_subscore = blend(wL, av as Record<string, number | null>);
  const writing_subscore = blend(wW, av as Record<string, number | null>);
  const speaking_subscore = blend(wS, av as Record<string, number | null>);

  const overall_raw_0_to_100 =
    (reading_subscore + listening_subscore + writing_subscore + speaking_subscore) / 4;

  const final_score_raw =
    DET_LIKE_FORMULAS.finalScoreRawFromOverall100(overall_raw_0_to_100);
  const final_score_rounded_5 = DET_LIKE_FORMULAS.roundToNearest5(final_score_raw);
  const cefr_level = cefrFromFinalScoreRaw(final_score_raw);

  const stage1 = items.filter((i) => i.engine_stage === 1);
  const { stage1_raw_100, stage1_det_like } = computeStage1Anchor(stage1);

  return {
    routing_band: routingBand,
    stage1_raw_100,
    stage1_det_like,
    reading_subscore,
    listening_subscore,
    writing_subscore,
    speaking_subscore,
    overall_raw_0_to_100,
    final_score_raw,
    final_score_rounded_5,
    cefr_level,
    items,
  };
}
