import type { SupabaseClient } from "@supabase/supabase-js";

import type { PracticeContentSnapshot } from "@/lib/practice-content/types";

const GLOBAL_SNAPSHOT_ID = "global";

export async function fetchPracticeContentSnapshot(
  supabase: SupabaseClient,
): Promise<{ snapshot: PracticeContentSnapshot; updatedAt: string | null }> {
  const { data, error } = await supabase
    .from("content_bank_snapshots")
    .select("payload, updated_at")
    .eq("id", GLOBAL_SNAPSHOT_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const raw = data?.payload;
  const snapshot: PracticeContentSnapshot = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === "string" && v.length > 0) snapshot[k] = v;
    }
  }

  const updatedAt =
    data && typeof (data as { updated_at?: unknown }).updated_at === "string"
      ? (data as { updated_at: string }).updated_at
      : null;

  return { snapshot, updatedAt };
}
