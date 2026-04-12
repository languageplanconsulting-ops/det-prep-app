/**
 * Stage composition — edit this file to change counts/order per stage.
 * Band = which pool (`mock_questions.target_band`) to draw from: 85 / 125 / 150.
 *
 * Suggested timings (product reference — enforce in UI / pool `time_limit_sec`):
 *
 * Stage 1 (anchor, all 125-band pool): ~7:00 total
 *   1 Real English Word set 1:00 · 1 Fill in the Blanks set 2:00 · 3 Dictation 3:00 · 1 Write About the Photo 1:00
 *
 * Stage 2 (same task types for every route; only `target_band` differs): ~25:45–26:45
 *   1 REW · 1 FITB · 3 Dictation · 1 Interactive Reading · 1 Interactive Listening ·
 *   1 Read, Then Speak · 1 Speak About the Photo
 *
 * Stage 3: REW · FITB · 1 Listen and Type · Write About the Photo · Read, Then Speak (e.g. 5:00 on RTS)
 *
 * Stage 4: Interactive Writing · Interactive Speaking (~11:30–12:40 total)
 */

import type { MockQuestionType } from "@/lib/mock-test/types";
import type { RoutingBand } from "@/lib/mock-test/v2/types";
import { TASK } from "@/lib/mock-test/v2/task-registry";

export type SlotTemplate = {
  questionType: MockQuestionType;
  /** Pool tier for this draw */
  band: RoutingBand;
  /** How many separate pool rows */
  count: number;
};

/**
 * Stage 1 — anchor: ONLY 125-band items.
 * Mean of per-task 0–100 scores → stage1_raw_100 → stage1_det_like for routing only.
 */
export const STAGE1_TEMPLATES: SlotTemplate[] = [
  { questionType: TASK.realEnglishWord, band: 125, count: 1 },
  { questionType: TASK.fillInBlanks, band: 125, count: 1 },
  { questionType: TASK.listenAndType, band: 125, count: 3 },
  { questionType: TASK.writeAboutPhoto, band: 125, count: 1 },
];

/**
 * Stage 2 — identical structure for 85 / 125 / 150 routes.
 * Difference is only which difficulty pool (`routed`) each slot draws from — full skill coverage on every route.
 */
export function stage2Templates(routed: RoutingBand): SlotTemplate[] {
  return [
    { questionType: TASK.realEnglishWord, band: routed, count: 1 },
    { questionType: TASK.fillInBlanks, band: routed, count: 1 },
    { questionType: TASK.listenAndType, band: routed, count: 3 },
    { questionType: TASK.interactiveReading, band: routed, count: 1 },
    { questionType: TASK.interactiveListening, band: routed, count: 1 },
    { questionType: TASK.readThenSpeak, band: routed, count: 1 },
    { questionType: TASK.speakAboutPhoto, band: routed, count: 1 },
  ];
}

/**
 * Stage 3 — confirmation / check; same band mix as Stage 2 (all from routed pool).
 */
export function stage3Templates(routed: RoutingBand): SlotTemplate[] {
  return [
    { questionType: TASK.realEnglishWord, band: routed, count: 1 },
    { questionType: TASK.fillInBlanks, band: routed, count: 1 },
    { questionType: TASK.listenAndType, band: routed, count: 1 },
    { questionType: TASK.writeAboutPhoto, band: routed, count: 1 },
    { questionType: TASK.readThenSpeak, band: routed, count: 1 },
  ];
}

/** Stage 4 — productive stability; pool tier follows the routed band. */
export function stage4Templates(routed: RoutingBand): SlotTemplate[] {
  return [
    { questionType: TASK.interactiveWriting, band: routed, count: 1 },
    { questionType: TASK.interactiveSpeaking, band: routed, count: 1 },
  ];
}

/** Flatten templates into ordered single-item specs (expand count). */
export function expandTemplates(
  stage: import("@/lib/mock-test/v2/types").EngineStage,
  templates: SlotTemplate[],
  startOrderIndex: number,
): Omit<import("@/lib/mock-test/v2/types").AssemblySlot, "slotId" | "questionId" | "maxPoints" | "timeLimitSec" | "contentFamily">[] {
  const out: Omit<
    import("@/lib/mock-test/v2/types").AssemblySlot,
    "slotId" | "questionId" | "maxPoints" | "timeLimitSec" | "contentFamily"
  >[] = [];
  let o = startOrderIndex;
  for (const t of templates) {
    for (let i = 0; i < t.count; i++) {
      o += 1;
      out.push({
        stage,
        orderIndex: o,
        canonicalTask: t.questionType,
        questionType: t.questionType,
        targetBand: t.band,
      });
    }
  }
  return out;
}
