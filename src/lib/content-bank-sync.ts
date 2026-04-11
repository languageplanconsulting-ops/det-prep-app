"use client";

import {
  getDictationBankJsonForContentSync,
  reconcileDictationBankAfterContentPull,
} from "@/lib/dictation-storage";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export const CONTENT_BANK_KEYS = [
  "ep-conversation-bank-v2",
  "ep-write-about-photo-rounds-v1",
  "ep-writing-topics",
  "ep-speaking-topics",
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
    window.dispatchEvent(new Event("ep-writing-topics"));
    window.dispatchEvent(new Event("ep-speaking-storage"));
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

export async function pushContentBankSnapshotToSupabase(): Promise<{
  ok: boolean;
  error?: string;
  serverUpdatedAt: string | null;
}> {
  const supabase = getBrowserSupabase();
  if (!supabase) return { ok: false, error: "Supabase not configured", serverUpdatedAt: null };
  const payload = readLocalContentBankSnapshot();
  try {
    payload["ep-dictation-bank-v1"] = await getDictationBankJsonForContentSync();
  } catch (err) {
    console.warn("[content-bank-sync] Could not merge dictation bank for push", err);
  }
  const { data: auth } = await supabase.auth.getUser();
  const updatedBy = auth.user?.id ?? null;
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("content_bank_snapshots")
    .upsert(
      {
        id: "global",
        payload,
        updated_at: now,
        updated_by: updatedBy,
      },
      { onConflict: "id" },
    )
    .select("updated_at")
    .maybeSingle();
  if (error) return { ok: false, error: error.message, serverUpdatedAt: null };
  const serverUpdatedAt =
    data && typeof (data as { updated_at?: unknown }).updated_at === "string"
      ? (data as { updated_at: string }).updated_at
      : now;
  return { ok: true, serverUpdatedAt };
}

export async function pullContentBankSnapshotFromSupabase(): Promise<{
  ok: boolean;
  applied: number;
  error?: string;
  /** When the global snapshot was last written on the server (ISO). */
  serverUpdatedAt: string | null;
}> {
  const supabase = getBrowserSupabase();
  if (!supabase) {
    return { ok: false, applied: 0, error: "Supabase not configured", serverUpdatedAt: null };
  }
  const { data, error } = await supabase
    .from("content_bank_snapshots")
    .select("payload, updated_at")
    .eq("id", "global")
    .maybeSingle();
  if (error) {
    return { ok: false, applied: 0, error: error.message, serverUpdatedAt: null };
  }
  const serverUpdatedAt =
    data && typeof (data as { updated_at?: unknown }).updated_at === "string"
      ? ((data as { updated_at: string }).updated_at as string)
      : null;
  if (!data?.payload || typeof data.payload !== "object") {
    return { ok: true, applied: 0, serverUpdatedAt };
  }
  const snapshot = data.payload as ContentBankSnapshot;
  const applied = applyLocalContentBankSnapshot(snapshot);
  try {
    await reconcileDictationBankAfterContentPull();
  } catch (err) {
    console.warn("[content-bank-sync] Dictation reconcile after pull failed", err);
  }
  return { ok: true, applied, serverUpdatedAt };
}

