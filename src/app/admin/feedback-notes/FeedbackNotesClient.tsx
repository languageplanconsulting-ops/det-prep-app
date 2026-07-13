"use client";

import { useEffect, useState } from "react";

import type { ProductFeedbackNote } from "@/lib/product-feedback";

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  });
}

export function FeedbackNotesClient() {
  const [rows, setRows] = useState<ProductFeedbackNote[]>([]);
  const [deployed, setDeployed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/feedback-notes", { credentials: "same-origin" });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        const json = (await res.json()) as { deployed: boolean; rows: ProductFeedbackNote[] };
        setDeployed(json.deployed);
        setRows(json.rows ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Feedback notes</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Open-ended answers users leave after the free mini-diagnosis.
      </p>

      {loading ? (
        <p className="mt-8 text-sm text-neutral-500">Loading…</p>
      ) : error ? (
        <div className="mt-6 rounded-md border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : !deployed ? (
        <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-neutral-700">
          Feedback notes table not deployed yet. Run{" "}
          <code className="rounded bg-neutral-200 px-1">
            supabase/manual_run_product_feedback_notes.sql
          </code>{" "}
          in the Supabase SQL editor, then responses will start showing up here.
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-500">No feedback notes yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-md border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="text-sm leading-relaxed text-neutral-900">{row.response}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono">{row.promptKey}</span>
                {row.pagePath ? (
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono">{row.pagePath}</span>
                ) : null}
                <span>{fmtTime(row.createdAt)}</span>
                <span>{row.userId ? "signed in" : "anonymous"}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
