"use client";

import { pullContentBankSnapshotFromSupabase } from "@/lib/content-bank-sync";
import { ensureDictationBankReady } from "@/lib/dictation-storage";
import { getBrowserSupabase } from "@/lib/supabase-browser";

let syncPromise: Promise<void> | null = null;
let lastSyncedAt: string | null = null;

/**
 * Pull the published Supabase content bank into localStorage/IndexedDB before
 * reading practice sets. Ensures website + future mobile clients see the same
 * questions and set order as admin published.
 */
export async function ensureCanonicalPracticeContent(): Promise<void> {
  if (typeof window === "undefined") return;

  if (syncPromise) {
    await syncPromise;
    return;
  }

  syncPromise = (async () => {
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
    await ensureDictationBankReady();
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
