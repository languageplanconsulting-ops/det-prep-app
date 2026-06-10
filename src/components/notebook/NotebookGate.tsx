"use client";

import { NotebookList } from "@/components/notebook/NotebookList";
import { NotebookListV2 } from "@/components/notebook/NotebookListV2";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";

/**
 * Renders the soft-modern Notebook V2 for admins only. Everyone else (and while
 * the admin flag is still loading) gets the existing brutalist notebook,
 * byte-for-byte unchanged. Zero user impact.
 */
export function NotebookGate() {
  const { isAdmin, previewEligible } = useEffectiveTier();

  // Admin-only V2 — match the app's admin signal (DB admin OR code/preview admin).
  if (isAdmin || previewEligible) {
    return <NotebookListV2 />;
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <header className="ep-brutal rounded-sm border-black bg-white p-6">
        <h1 className="text-3xl font-black tracking-tight">Notebook</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Notes from read-and-write reports live in <strong>All</strong> plus a topic
          folder (grammar, vocabulary, or production feedback). Add your own categories,
          search, sort, and personal notes — everything stays in this browser.
        </p>
      </header>
      <NotebookList />
    </main>
  );
}
