"use client";

import { useState } from "react";

import {
  pullContentBankSnapshotFromSupabase,
  pushContentBankSnapshotToSupabase,
} from "@/lib/content-bank-sync";

export type ContentBankRemoteResult = Awaited<
  ReturnType<typeof pullContentBankSnapshotFromSupabase>
>;

export function AdminContentBankSyncPanel({
  onAfterRemoteChange,
}: {
  /** Called after a successful push or pull so parent can align counts and &quot;published&quot; time. */
  onAfterRemoteChange?: (result: ContentBankRemoteResult) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const runPush = async () => {
    setBusy(true);
    setMsg(null);
    setErr(null);
    const r = await pushContentBankSnapshotToSupabase();
    if (!r.ok) {
      setErr(r.error ?? "Failed to sync to server.");
    } else {
      setMsg("Synced current browser bank to server snapshot.");
      onAfterRemoteChange?.({
        ok: true,
        applied: 0,
        serverUpdatedAt: r.serverUpdatedAt,
      });
    }
    setBusy(false);
  };

  const runPull = async () => {
    setBusy(true);
    setMsg(null);
    setErr(null);
    const r = await pullContentBankSnapshotFromSupabase();
    if (!r.ok) {
      setErr(r.error ?? "Failed to load snapshot from server.");
    } else {
      setMsg(`Loaded snapshot from server. Applied ${r.applied} key(s).`);
      onAfterRemoteChange?.(r);
    }
    setBusy(false);
  };

  return (
    <section className="mt-4 rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
      <p className="text-sm font-black uppercase tracking-wide text-neutral-800">Shared content sync</p>
      <p className="mt-1 text-xs text-neutral-600">
        Use this to publish browser-uploaded banks to all signed-in users (and pull back from server if needed).
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void runPush()}
          className="rounded-[2px] border-2 border-black bg-[#004AAD] px-3 py-2 text-xs font-black uppercase text-[#FFCC00] disabled:opacity-50"
        >
          {busy ? "..." : "Sync to server now"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void runPull()}
          className="rounded-[2px] border-2 border-black bg-neutral-100 px-3 py-2 text-xs font-black uppercase text-neutral-900 disabled:opacity-50"
        >
          {busy ? "..." : "Load from server"}
        </button>
      </div>
      {msg ? <p className="mt-2 text-xs font-bold text-green-700">{msg}</p> : null}
      {err ? <p className="mt-2 text-xs font-bold text-red-700">{err}</p> : null}
    </section>
  );
}

