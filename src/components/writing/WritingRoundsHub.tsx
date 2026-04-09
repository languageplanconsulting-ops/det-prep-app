"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { WRITING_ROUND_NUMBERS } from "@/lib/writing-constants";
import { countWritingTopicsByRound } from "@/lib/writing-storage";

export function WritingRoundsHub() {
  const [, setV] = useState(0);

  useEffect(() => {
    const refresh = () => setV((n) => n + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-writing-topics", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-writing-topics", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const counts = countWritingTopicsByRound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Link href="/practice" className="text-sm font-bold text-ep-blue hover:underline">
        ← Practice hub
      </Link>
      <header className="ep-brutal rounded-sm border-black bg-white p-6">
        <p className="ep-stat text-xs font-bold uppercase tracking-widest text-ep-blue">
          Read & write (essay)
        </p>
        <h1 className="mt-2 text-3xl font-black">Choose a round</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Each round lists its own topics. Plan 1–5 minutes, then write at least 50 words.
        </p>
      </header>
      <ul className="space-y-3">
        {WRITING_ROUND_NUMBERS.map((r) => (
          <li key={r}>
            <Link href={`/practice/production/read-and-write/round/${r}`}>
              <BrutalPanel className="hover:bg-ep-yellow/20">
                <p className="text-lg font-extrabold">Round {r}</p>
                <p className="text-sm text-neutral-600">
                  {counts[r]} topic{counts[r] === 1 ? "" : "s"}
                </p>
              </BrutalPanel>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
