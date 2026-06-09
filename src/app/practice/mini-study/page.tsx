"use client";

import Link from "next/link";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { MINI_STUDY_SESSIONS } from "@/lib/mini-study/content";
import { BrutalPanel } from "@/components/ui/BrutalPanel";

export default function MiniStudyHubPage() {
  const { isAdmin, loading } = useEffectiveTier();

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-sm text-neutral-500">
        Loading…
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-sm border-4 border-black bg-[#fff7d1] p-6 shadow-[6px_6px_0_0_#111]">
          <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-red-700">
            Admin only
          </p>
          <h1 className="mt-2 text-2xl font-black">Mini Study Session</h1>
          <p className="mt-2 text-sm text-neutral-700">
            This feature is in admin preview. It is not available to regular users yet.
          </p>
          <Link
            href="/practice"
            className="mt-4 inline-block rounded-[4px] border-4 border-black bg-white px-4 py-2 text-sm font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            ← Back to Practice
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header className="ep-brutal rounded-sm border-black bg-white p-6">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-red-700">
          Admin preview · Mini Study
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          15-minute Study Sessions
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          ADHD-friendly micro-lessons for the Duolingo English Test. Each session is a
          short explanation card followed by Deepgram-voiced dictation exercises with
          strict 100% match grading.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {MINI_STUDY_SESSIONS.map((s) => (
          <BrutalPanel
            key={s.id}
            eyebrow={`Session ${s.index} · ${s.durationLabel}`}
            title={s.title}
          >
            <p className="mb-4 text-sm text-neutral-600">{s.subtitle}</p>
            <p className="mb-4 text-xs font-bold uppercase tracking-wide text-neutral-500">
              {s.items.length} dictation items
            </p>
            <Link
              href={`/practice/mini-study/${s.id}`}
              className="inline-block rounded-[4px] border-4 border-black bg-[#004AAD] px-4 py-2 text-sm font-black uppercase tracking-wide text-[#FFCC00] shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
            >
              Start session →
            </Link>
          </BrutalPanel>
        ))}
      </div>
    </main>
  );
}
