/**
 * Anti-repeat selection: in-attempt + optional 30-day content_family skip.
 * Edit window in config.ts (ANTI_REPEAT.familyExcludeDays).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { ANTI_REPEAT } from "@/lib/mock-test/v2/config";

export function extractAssetKeysFromContent(content: unknown): string[] {
  if (!content || typeof content !== "object") return [];
  const c = content as Record<string, unknown>;
  const keys: string[] = [];
  for (const k of ANTI_REPEAT.dedupeImageKeys) {
    const v = c[k];
    if (typeof v === "string" && v.trim()) keys.push(`img:${v.trim()}`);
  }
  for (const k of ANTI_REPEAT.dedupeAudioKeys) {
    const v = c[k];
    if (typeof v === "string" && v.trim()) keys.push(`aud:${v.trim()}`);
  }
  return keys;
}

/** Pull families used in prior v2 sessions for this user (best-effort). */
export async function loadFamiliesToAvoid(
  supabase: SupabaseClient,
  userId: string,
): Promise<Set<string>> {
  const since = new Date(
    Date.now() - ANTI_REPEAT.familyExcludeDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data, error } = await supabase
    .from("mock_test_sessions")
    .select("assembly")
    .eq("user_id", userId)
    .eq("engine_version", 2)
    .gte("started_at", since);

  if (error || !data) return new Set();

  const fam = new Set<string>();
  for (const row of data) {
    const a = row.assembly as { usedContentFamilies?: string[] } | null;
    if (a?.usedContentFamilies?.length) {
      for (const f of a.usedContentFamilies) fam.add(f);
    }
  }
  return fam;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
