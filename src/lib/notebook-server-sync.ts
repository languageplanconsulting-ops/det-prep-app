"use client";

import type { NotebookEntry } from "@/types/writing";

export function syncNotebookEntryToServer(entry: NotebookEntry): void {
  if (typeof window === "undefined") return;
  void fetch("/api/notebook/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ entry }),
  }).catch(() => {});
}

export function deleteNotebookEntryOnServer(clientEntryId: string): void {
  if (typeof window === "undefined") return;
  void fetch(
    `/api/notebook/sync?clientEntryId=${encodeURIComponent(clientEntryId)}`,
    { method: "DELETE", credentials: "include" },
  ).catch(() => {});
}

export async function backfillNotebookEntriesToServer(
  entries: NotebookEntry[],
): Promise<void> {
  if (typeof window === "undefined" || entries.length === 0) return;
  const chunk = 200;
  for (let i = 0; i < entries.length; i += chunk) {
    const part = entries.slice(i, i + chunk);
    try {
      await fetch("/api/notebook/sync", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ entries: part }),
      });
    } catch {
      /* ignore */
    }
  }
}
