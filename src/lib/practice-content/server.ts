import type { SupabaseClient } from "@supabase/supabase-js";

import type { PracticeContentSnapshot } from "@/lib/practice-content/types";

const GLOBAL_SNAPSHOT_ID = "global";

/**
 * The global snapshot is one very large JSON row that every learner reads identically.
 * Downloading it on every API call was the main source of Supabase egress, so each warm
 * server instance keeps a copy and only re-checks the tiny `updated_at` column (at most
 * once per PROBE_INTERVAL_MS). The full payload is re-downloaded only when it changed.
 */
const PROBE_INTERVAL_MS = 60_000;

type CacheEntry = {
  snapshot: PracticeContentSnapshot;
  updatedAt: string | null;
  checkedAt: number;
};

let cache: CacheEntry | null = null;
let inflight: Promise<CacheEntry> | null = null;

function parseSnapshot(raw: unknown): PracticeContentSnapshot {
  const snapshot: PracticeContentSnapshot = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === "string" && v.length > 0) snapshot[k] = v;
    }
  }
  return snapshot;
}

async function loadFull(supabase: SupabaseClient): Promise<CacheEntry> {
  const { data, error } = await supabase
    .from("content_bank_snapshots")
    .select("payload, updated_at")
    .eq("id", GLOBAL_SNAPSHOT_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const updatedAt =
    data && typeof (data as { updated_at?: unknown }).updated_at === "string"
      ? (data as { updated_at: string }).updated_at
      : null;

  return { snapshot: parseSnapshot(data?.payload), updatedAt, checkedAt: Date.now() };
}

async function refresh(supabase: SupabaseClient): Promise<CacheEntry> {
  if (cache) {
    // Cheap probe: only the timestamp, a few bytes instead of the whole payload.
    const { data, error } = await supabase
      .from("content_bank_snapshots")
      .select("updated_at")
      .eq("id", GLOBAL_SNAPSHOT_ID)
      .maybeSingle();
    if (!error) {
      const probed =
        data && typeof (data as { updated_at?: unknown }).updated_at === "string"
          ? (data as { updated_at: string }).updated_at
          : null;
      if (probed === cache.updatedAt) {
        cache = { ...cache, checkedAt: Date.now() };
        return cache;
      }
    }
  }
  const fresh = await loadFull(supabase);
  cache = fresh;
  return fresh;
}

export async function fetchPracticeContentSnapshot(
  supabase: SupabaseClient,
): Promise<{ snapshot: PracticeContentSnapshot; updatedAt: string | null }> {
  if (cache && Date.now() - cache.checkedAt < PROBE_INTERVAL_MS) {
    return { snapshot: cache.snapshot, updatedAt: cache.updatedAt };
  }
  if (!inflight) {
    inflight = refresh(supabase).finally(() => {
      inflight = null;
    });
  }
  const entry = await inflight;
  return { snapshot: entry.snapshot, updatedAt: entry.updatedAt };
}
