"use client";

import { pullContentBankSnapshotFromSupabase } from "@/lib/content-bank-sync";
import { ensureDictationBankReady } from "@/lib/dictation-storage";
import { getBrowserSupabase } from "@/lib/supabase-browser";

let syncPromise: Promise<void> | null = null;
let lastSyncedAt: string | null = null;

/**
 * Pull the published Supabase content bank into memory (mirrored to localStorage/IndexedDB
 * best-effort) before reading practice sets. Ensures website + future mobile clients see the
 * same questions and set order as admin published.
 *
 * NEVER REJECTS. Every practice gate `await`s this before it can resolve its own loading state,
 * so a throw here (an offline pull, a blocked or full storage) left the learner staring at a
 * spinner forever instead of at content or an error. Callers fall through to whatever content
 * is already local; a gate with nothing local then shows its own "not available" state.
 */
export async function ensureCanonicalPracticeContent(): Promise<void> {
  if (typeof window === "undefined") return;

  if (syncPromise) {
    await syncPromise;
    return;
  }

  syncPromise = (async () => {
    try {
      const supabase = getBrowserSupabase();
      if (supabase) {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          const res = await pullContentBankSnapshotFromSupabase();
          if (res.ok && res.serverUpdatedAt) {
            lastSyncedAt = res.serverUpdatedAt;
          }
        }
      }
    } catch (err) {
      console.warn("[practice-content] Content bank sync failed — using local content", err);
    }
    try {
      await ensureDictationBankReady();
    } catch (err) {
      console.warn("[practice-content] Dictation bank hydrate failed", err);
    }
  })();

  try {
    await syncPromise;
  } finally {
    syncPromise = null;
  }
}

export function getLastPracticeContentSyncAt(): string | null {
  return lastSyncedAt;
}
