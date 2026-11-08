"use client";

import {
  readContentBankItem,
  writeContentBankItem,
} from "@/lib/content-bank-store";
import {
  getDictationBankJsonForContentSync,
  reconcileDictationBankAfterContentPull,
} from "@/lib/dictation-storage";
import { loadRealWordBank, rebuildRealWordAdminOccupancyFromBank } from "@/lib/realword-storage";
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
  "ep-interactive-speaking-scenarios-v1",
] as const;

type ContentBankSnapshot = Record<string, string>;

export function readLocalContentBankSnapshot(): ContentBankSnapshot {
  if (typeof window === "undefined") return {};
  const out: ContentBankSnapshot = {};
  for (const key of CONTENT_BANK_KEYS) {
    const raw = readContentBankItem(key);
    if (typeof raw === "string" && raw.length > 0) {
      out[key] = raw;
    }
  }
  return out;
}

export function applyLocalContentBankSnapshot(snapshot: ContentBankSnapshot): number {
  if (typeof window === "undefined") return 0;
  let written = 0;
  let wroteRealWordBank = false;
  for (const [k, v] of Object.entries(snapshot)) {
    if (!CONTENT_BANK_KEYS.includes(k as (typeof CONTENT_BANK_KEYS)[number])) continue;
    if (typeof v !== "string" || !v.length) continue;
    // Never throws — the banks are far bigger than the localStorage quota, so this is a
    // best-effort mirror over an in-memory store (see content-bank-store).
    writeContentBankItem(k, v);
    written += 1;
    if (k === "ep-realword-bank-v1") wroteRealWordBank = true;
  }
  if (wroteRealWordBank) {
    try {
      rebuildRealWordAdminOccupancyFromBank(loadRealWordBank());
    } catch {
      /* ignore */
    }
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
    window.dispatchEvent(new Event("ep-interactive-speaking-storage"));
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
  let updatedBy: string | null = auth.user?.id ?? null;
  if (updatedBy) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", updatedBy)
      .maybeSingle();
    if (!profile?.id) {
      updatedBy = null;
    }
  }
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
  lastPull = null; // force the next pull to re-check the server after our own publish
  return { ok: true, serverUpdatedAt };
}

type PullResult = {
  ok: boolean;
  applied: number;
  error?: string;
  /** When the global snapshot was last written on the server (ISO). */
  serverUpdatedAt: string | null;
};

/**
 * The published banks are ~2.7 MB. Pulling them on every page load, from several components,
 * for every learner was the main source of Supabase egress. So:
 *  1. concurrent callers share one in-flight pull,
 *  2. a pull is reused for PULL_REUSE_MS,
 *  3. we first read only `updated_at` (bytes) and, if it matches the copy cached in IndexedDB,
 *     apply that copy locally instead of downloading the payload again.
 */
const PULL_REUSE_MS = 5 * 60_000;
const SNAPSHOT_DB = "ep-content-bank-cache";
const SNAPSHOT_STORE = "snapshot";
const SNAPSHOT_KEY = "global";

type CachedSnapshot = { updatedAt: string; payload: ContentBankSnapshot };

let pullInflight: Promise<PullResult> | null = null;
let lastPull: { at: number; result: PullResult } | null = null;

function openSnapshotDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(SNAPSHOT_DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(SNAPSHOT_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function readCachedSnapshot(): Promise<CachedSnapshot | null> {
  const db = await openSnapshotDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(SNAPSHOT_STORE, "readonly").objectStore(SNAPSHOT_STORE).get(SNAPSHOT_KEY);
      req.onsuccess = () => {
        const v = req.result as CachedSnapshot | undefined;
        resolve(v && typeof v.updatedAt === "string" && v.payload ? v : null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    } finally {
      db.close();
    }
  });
}

async function writeCachedSnapshot(value: CachedSnapshot): Promise<void> {
  const db = await openSnapshotDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(SNAPSHOT_STORE, "readwrite");
      tx.objectStore(SNAPSHOT_STORE).put(value, SNAPSHOT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    } finally {
      db.close();
    }
  });
}

async function applyAndReconcile(snapshot: ContentBankSnapshot): Promise<number> {
  const applied = applyLocalContentBankSnapshot(snapshot);
  try {
    await reconcileDictationBankAfterContentPull();
  } catch (err) {
    console.warn("[content-bank-sync] Dictation reconcile after pull failed", err);
  }
  return applied;
}

async function doPull(): Promise<PullResult> {
  const supabase = getBrowserSupabase();
  if (!supabase) {
    return { ok: false, applied: 0, error: "Supabase not configured", serverUpdatedAt: null };
  }

  // Cheap probe: timestamp only.
  const probe = await supabase
    .from("content_bank_snapshots")
    .select("updated_at")
    .eq("id", "global")
    .maybeSingle();
  if (probe.error) {
    return { ok: false, applied: 0, error: probe.error.message, serverUpdatedAt: null };
  }
  const probedAt =
    probe.data && typeof (probe.data as { updated_at?: unknown }).updated_at === "string"
      ? (probe.data as { updated_at: string }).updated_at
      : null;
  if (!probedAt) return { ok: true, applied: 0, serverUpdatedAt: null };

  const cached = await readCachedSnapshot();
  if (cached && cached.updatedAt === probedAt) {
    const applied = await applyAndReconcile(cached.payload);
    return { ok: true, applied, serverUpdatedAt: probedAt };
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
  const applied = await applyAndReconcile(snapshot);
  if (serverUpdatedAt) {
    void writeCachedSnapshot({ updatedAt: serverUpdatedAt, payload: snapshot });
  }
  return { ok: true, applied, serverUpdatedAt };
}

export async function pullContentBankSnapshotFromSupabase(): Promise<PullResult> {
  if (lastPull && lastPull.result.ok && Date.now() - lastPull.at < PULL_REUSE_MS) {
    return lastPull.result;
  }
  if (!pullInflight) {
    pullInflight = doPull()
      .then((result) => {
        if (result.ok) lastPull = { at: Date.now(), result };
        return result;
      })
      .finally(() => {
        pullInflight = null;
      });
  }
  return pullInflight;
}
