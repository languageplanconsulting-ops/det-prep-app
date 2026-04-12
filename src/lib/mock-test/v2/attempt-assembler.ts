/**
 * Builds assembly slots by expanding stage templates + pool picks.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { extractAssetKeysFromContent, loadFamiliesToAvoid } from "@/lib/mock-test/v2/anti-repeat";
import { pickPoolQuestion } from "@/lib/mock-test/v2/pool-picker";
import {
  expandTemplates,
  STAGE1_TEMPLATES,
  stage2Templates,
  stage3Templates,
  stage4Templates,
} from "@/lib/mock-test/v2/stage-sequences";
import type {
  AssemblySlot,
  EngineStage,
  RoutingBand,
  V2AssemblyState,
} from "@/lib/mock-test/v2/types";

export type AssemblyAccumulator = {
  usedContentFamilies: Set<string>;
  usedQuestionIds: Set<string>;
  usedAssetKeys: Set<string>;
};

export function emptyAccumulator(): AssemblyAccumulator {
  return {
    usedContentFamilies: new Set(),
    usedQuestionIds: new Set(),
    usedAssetKeys: new Set(),
  };
}

function newSlotId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `slot_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function buildSlotsForTemplates(
  supabase: SupabaseClient,
  userId: string,
  stage: EngineStage,
  templates: import("@/lib/mock-test/v2/stage-sequences").SlotTemplate[],
  startOrderIndex: number,
  acc: AssemblyAccumulator,
): Promise<AssemblySlot[]> {
  const skeletons = expandTemplates(stage, templates, startOrderIndex);
  const historical = await loadFamiliesToAvoid(supabase, userId);
  const out: AssemblySlot[] = [];

  for (const sk of skeletons) {
    const picked = await pickPoolQuestion(supabase, sk.questionType, sk.targetBand, {
      excludeFamilies: acc.usedContentFamilies,
      excludeIds: acc.usedQuestionIds,
      excludeAssetKeys: acc.usedAssetKeys,
      historicalFamilies: historical,
    });
    if (!picked) {
      throw new Error(
        `Pool exhausted: no question for type ${sk.questionType} band ${sk.targetBand}. Upload more items.`,
      );
    }
    const fam = (picked.content_family ?? `id:${picked.id}`).trim();
    acc.usedContentFamilies.add(fam);
    acc.usedQuestionIds.add(picked.id);
    for (const k of extractAssetKeysFromContent(picked.content)) {
      acc.usedAssetKeys.add(k);
    }

    const maxPts = Number(picked.max_points ?? 1);
    out.push({
      slotId: newSlotId(),
      stage,
      orderIndex: sk.orderIndex,
      canonicalTask: sk.canonicalTask,
      questionType: picked.question_type,
      questionId: picked.id,
      targetBand: sk.targetBand,
      maxPoints: Number.isFinite(maxPts) && maxPts > 0 ? maxPts : 1,
      timeLimitSec: picked.time_limit_sec ?? null,
      contentFamily: fam,
    });
  }

  return out;
}

export async function buildStage1Assembly(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ slots: AssemblySlot[]; acc: AssemblyAccumulator; state: V2AssemblyState }> {
  const acc = emptyAccumulator();
  const slots = await buildSlotsForTemplates(
    supabase,
    userId,
    1,
    STAGE1_TEMPLATES,
    0,
    acc,
  );
  const state: V2AssemblyState = {
    engineVersion: 2,
    slots,
    usedContentFamilies: [...acc.usedContentFamilies],
    usedAssetKeys: [...acc.usedAssetKeys],
  };
  return { slots, acc, state };
}

export async function appendStagesAfterRouting(
  supabase: SupabaseClient,
  userId: string,
  routed: RoutingBand,
  acc: AssemblyAccumulator,
  lastOrderIndex: number,
): Promise<{ slots: AssemblySlot[]; statePatch: Partial<V2AssemblyState> }> {
  const s2 = await buildSlotsForTemplates(
    supabase,
    userId,
    2,
    stage2Templates(routed),
    lastOrderIndex,
    acc,
  );
  const last2 = s2[s2.length - 1]?.orderIndex ?? lastOrderIndex;
  const s3 = await buildSlotsForTemplates(
    supabase,
    userId,
    3,
    stage3Templates(routed),
    last2,
    acc,
  );
  const last3 = s3[s3.length - 1]?.orderIndex ?? last2;
  const s4 = await buildSlotsForTemplates(
    supabase,
    userId,
    4,
    stage4Templates(routed),
    last3,
    acc,
  );
  const all = [...s2, ...s3, ...s4];
  return {
    slots: all,
    statePatch: {
      routingBand: routed,
      usedContentFamilies: [...acc.usedContentFamilies],
      usedAssetKeys: [...acc.usedAssetKeys],
    },
  };
}
