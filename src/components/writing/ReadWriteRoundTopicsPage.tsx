"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { ReadWriteTopicExamCard } from "@/components/writing/ReadWriteTopicExamCard";
import type { WritingRoundNum } from "@/lib/writing-constants";
import { loadWritingTopicsByRound } from "@/lib/writing-storage";

export function ReadWriteRoundTopicsPage({ round }: { round: number }) {
  const [v, setV] = useState(0);
  const valid = round === 1 || round === 2 || round === 3 || round === 4 || round === 5;
  const r = (valid ? round : 1) as WritingRoundNum;

  useEffect(() => {
    const refresh = () => setV((n) => n + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-writing-topics", refresh);
    window.addEventListener("ep-read-write-topic-progress", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-writing-topics", refresh);
      window.removeEventListener("ep-read-write-topic-progress", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  if (!valid) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="font-bold">Invalid round.</p>
        <Link href="/practice/production/read-and-write" className="mt-4 inline-block text-ep-blue">
          Back
        </Link>
      </div>
    );
  }

  const topics = loadWritingTopicsByRound(r);

  return (
    <div key={v} className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Link
        href="/practice/production/read-and-write"
        className="text-sm font-bold text-ep-blue hover:underline"
      >
        ← Rounds
      </Link>
      <header className="ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="ep-stat text-xs font-bold uppercase tracking-widest text-ep-blue">
          Read & write (essay)
        </p>
        <h1 className="mt-2 text-3xl font-black">Round {r}</h1>
        <p className="mt-2 text-sm text-neutral-600">
          {topics.length === 0
            ? "No topics in this round yet — ask your admin to upload JSON for this round."
            : "Choose a topic. After you submit, your latest score appears on the tile (same as write-about-photo)."}
        </p>
      </header>
      {topics.length === 0 ? (
        <BrutalPanel title="No topics yet">
          <p className="text-sm text-neutral-700">
            Topics appear here when they are added in the admin panel with{" "}
            <code className="ep-stat text-xs">round</code> set to {r}.
          </p>
        </BrutalPanel>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {topics.map((t) => (
            <li key={t.id}>
              <ReadWriteTopicExamCard topic={t} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
