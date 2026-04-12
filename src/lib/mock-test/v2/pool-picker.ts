/**
 * Random selection from mock_questions with band + type filters and anti-repeat.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { MockQuestionType } from "@/lib/mock-test/types";
import {
  extractAssetKeysFromContent,
  loadFamiliesToAvoid,
  shuffle,
} from "@/lib/mock-test/v2/anti-repeat";
import type { RoutingBand } from "@/lib/mock-test/v2/types";

export type PoolQuestionRow = {
  id: string;
  question_type: MockQuestionType;
  content: unknown;
  correct_answer: unknown;
  target_band: number | null;
  difficulty: string;
  max_points: number | null;
  time_limit_sec: number | null;
  content_family: string | null;
  is_active: boolean;
};

function bandFallbackOr(
  band: RoutingBand,
): { target: number | null; difficulty: string | null } {
  if (band === 85) return { target: 85, difficulty: "easy" };
  if (band === 125) return { target: 125, difficulty: "medium" };
  return { target: 150, difficulty: "hard" };
}

/**
 * Fetch candidates for (type, band), then pick first passing exclude rules after shuffle.
 */
export async function pickPoolQuestion(
  supabase: SupabaseClient,
  questionType: MockQuestionType,
  band: RoutingBand,
  opts: {
    excludeFamilies: Set<string>;
    excludeIds: Set<string>;
    excludeAssetKeys: Set<string>;
    historicalFamilies: Set<string>;
  },
): Promise<PoolQuestionRow | null> {
  const { excludeFamilies, excludeIds, excludeAssetKeys, historicalFamilies } =
    opts;
  const { target, difficulty } = bandFallbackOr(band);

  const sel =
    "id, question_type, content, correct_answer, target_band, difficulty, max_points, time_limit_sec, content_family, is_active";

  const { data: byBand } = await supabase
    .from("mock_questions")
    .select(sel)
    .eq("question_type", questionType)
    .eq("is_active", true)
    .eq("target_band", target);

  let rows = (byBand ?? []) as PoolQuestionRow[];

  if (rows.length === 0) {
    const { data: legacy } = await supabase
      .from("mock_questions")
      .select(sel)
      .eq("question_type", questionType)
      .eq("is_active", true)
      .eq("difficulty", difficulty ?? "medium");
    rows = (legacy ?? []) as PoolQuestionRow[];
  }

  const filtered = rows.filter((r) => {
    if (excludeIds.has(r.id)) return false;
    const fam = (r.content_family ?? "unknown").trim();
    if (excludeFamilies.has(fam)) return false;
    if (historicalFamilies.has(fam)) return false;
    const assets = extractAssetKeysFromContent(r.content);
    if (assets.some((a) => excludeAssetKeys.has(a))) return false;
    return true;
  });

  if (filtered.length === 0) return null;
  const choice = shuffle(filtered)[0];
  return choice ?? null;
}

