"use client";

import { getBrowserSupabase } from "@/lib/supabase-browser";

export const CONTENT_BANK_KEYS = [
  "ep-conversation-bank-v2",
  "ep-fitb-bank-v1",
  "ep-fitb-admin-uploaded-v2",
  "ep-reading-sets",
  "ep-reading-admin-uploaded-v1",
  "ep-vocab-sets",
  "ep-vocab-admin-uploaded-v1",
  "ep-dictation-bank-v1",
  "ep-realword-bank-v1",
  "ep-realword-admin-uploaded-v1",
  "ep-dialogue-summary-bank-v1",
  "ep-dialogue-summary-admin-uploaded-v1",
] as const;

type ContentBankSnapshot = Record<string, string>;

export function readLocalContentBankSnapshot(): ContentBankSnapshot {
  if (typeof window === "undefined") return {};
  const out: ContentBankSnapshot = {};
  for (const key of CONTENT_BANK_KEYS) {
    const raw = localStorage.getItem(key);
    if (typeof raw === "string" && raw.length > 0) {
      out[key] = raw;
    }
  }
  return out;
}

export function applyLocalContentBankSnapshot(snapshot: ContentBankSnapshot): number {
  if (typeof window === "undefined") return 0;
  let written = 0;
  for (const [k, v] of Object.entries(snapshot)) {
    if (!CONTENT_BANK_KEYS.includes(k as (typeof CONTENT_BANK_KEYS)[number])) continue;
    if (typeof v !== "string" || !v.length) continue;
    localStorage.setItem(k, v);
    written += 1;
  }
  if (written > 0) {
    window.dispatchEvent(new Event("ep-write-about-photo-rounds"));
    window.dispatchEvent(new Event("ep-conversation-storage"));
    window.dispatchEvent(new Event("ep-dictation-storage"));
    window.dispatchEvent(new Event("ep-fitb-storage"));
    window.dispatchEvent(new Event("ep-reading-storage"));
    window.dispatchEvent(new Event("ep-vocab-storage"));
    window.dispatchEvent(new Event("ep-realword-storage"));
    window.dispatchEvent(new Event("ep-dialogue-summary-storage"));
  }
  return written;
}

export async function pushContentBankSnapshotToSupabase(): Promise<{ ok: boolean; error?: string }> {
  const supabase = getBrowserSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured" };
  const payload = readLocalContentBankSnapshot();
  const { data: auth } = await supabase.auth.getUser();
  const updatedBy = auth.user?.id ?? null;
  const { error } = await supabase.from("content_bank_snapshots").upsert(
    {
      id: "global",
      payload,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    },
    { onConflict: "id" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function pullContentBankSnapshotFromSupabase(): Promise<{
  ok: boolean;
  applied: number;
  error?: string;
}> {
  const supabase = getBrowserSupabase();
  if (!supabase) return { ok: false, applied: 0, error: "Supabase not configured" };
  const { data, error } = await supabase
    .from("content_bank_snapshots")
    .select("payload")
    .eq("id", "global")
    .maybeSingle();
  if (error) return { ok: false, applied: 0, error: error.message };
  if (!data?.payload || typeof data.payload !== "object") return { ok: true, applied: 0 };
  const snapshot = data.payload as ContentBankSnapshot;
  const applied = applyLocalContentBankSnapshot(snapshot);
  return { ok: true, applied };
}

