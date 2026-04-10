"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  READING_DIFFICULTIES,
  READING_DIFFICULTY_LABEL,
  READING_DIFFICULTY_MAX,
} from "@/lib/reading-constants";
import { loadReadingVisibleBank } from "@/lib/reading-storage";
import type { ReadingRoundNum } from "@/types/reading";

export function ReadingRoundDifficultyHub({ round }: { round: ReadingRoundNum }) {
  const [v, setV] = useState(0);

  useEffect(() => {
    const refresh = () => setV((n) => n + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-reading-storage", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-reading-storage", refresh);
    };
  }, []);

  const bank = loadReadingVisibleBank();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3 text-sm font-bold text-ep-blue">
        <Link href="/practice/comprehension/reading" className="hover:underline">
          ← All rounds
        </Link>
        <span className="text-neutral-300">·</span>
        <Link href="/practice" className="hover:underline">
          Practice hub
        </Link>
      </div>

      <header className="ep-brutal-reading rounded-sm bg-white p-6">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-ep-blue">Round {round}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Choose difficulty</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          DET caps: Easy {READING_DIFFICULTY_MAX.easy} · Medium {READING_DIFFICULTY_MAX.medium} · Hard{" "}
          {READING_DIFFICULTY_MAX.hard} per exam. Open a set to see its exams.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-black uppercase tracking-wide">Level</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {READING_DIFFICULTIES.map((d) => {
            const count = bank[round][d].length;
            return (
              <Link
                key={`${d}-${v}`}
                href={`/practice/comprehension/reading/round/${round}/${d}`}
                className="ep-interactive ep-brutal-reading rounded-sm bg-white px-4 py-8 text-left shadow-[4px_4px_0_0_#000] hover:bg-ep-yellow/25"
              >
                <span className="block text-2xl font-black uppercase">{READING_DIFFICULTY_LABEL[d]}</span>
                <span className="ep-stat mt-3 block text-sm font-bold text-neutral-800">
                  {count > 0
                    ? `${count} set${count === 1 ? "" : "s"} · max ${READING_DIFFICULTY_MAX[d]} pts / exam`
                    : "COMING SOON"}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
