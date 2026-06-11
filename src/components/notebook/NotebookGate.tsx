"use client";

import { NotebookListV2 } from "@/components/notebook/NotebookListV2";

/**
 * Soft-modern Notebook V2 — now shown to all users (launched).
 * The original NotebookList remains in git history for rollback.
 */
export function NotebookGate() {
  return <NotebookListV2 />;
}
