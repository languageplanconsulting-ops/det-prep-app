import type { MockQuestionType } from "@/lib/mock-test/types";

export type RoutingBand = 85 | 125 | 150;

export type EngineStage = 1 | 2 | 3 | 4;

/** One scheduled item in the attempt (may be a multi-step UI row for composite types). */
export type AssemblySlot = {
  slotId: string;
  stage: EngineStage;
  /** Order within the full attempt (1-based). */
  orderIndex: number;
  /** High-level label for analytics. */
  canonicalTask: string;
  questionType: MockQuestionType;
  questionId: string;
  targetBand: RoutingBand;
  maxPoints: number;
  timeLimitSec: number | null;
  contentFamily: string;
};

export type V2AssemblyState = {
  engineVersion: 2;
  slots: AssemblySlot[];
  /** Families consumed this attempt (in-attempt dedupe). */
  usedContentFamilies: string[];
  /** Serialized asset fingerprints (URLs) used this attempt. */
  usedAssetKeys: string[];
  routingBand?: RoutingBand;
  stage1Raw100?: number;
  stage1DetLike?: number;
};

/** One scored row (stored in v2_response_log and used for final placement). */
export type V2ResponseRecord = {
  attempt_id: string;
  slot_id: string;
  engine_stage: EngineStage;
  question_id: string;
  task_type: MockQuestionType;
  target_band: RoutingBand;
  earned_points: number;
  max_points: number;
  task_score_0_to_100: number;
  /** Optional analytics columns; final placement uses task-level blending instead. */
  reading_contrib: number;
  listening_contrib: number;
  writing_contrib: number;
  speaking_contrib: number;
  macro: "reading" | "listening" | "writing" | "speaking";
};

export type V2PlacementResult = {
  routing_band: RoutingBand;
  stage1_raw_100: number;
  stage1_det_like: number;
  reading_subscore: number;
  listening_subscore: number;
  writing_subscore: number;
  speaking_subscore: number;
  overall_raw_0_to_100: number;
  final_score_raw: number;
  final_score_rounded_5: number;
  cefr_level: string;
  items: V2ResponseRecord[];
};
