"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  REALWORD_DIFFICULTIES,
  REALWORD_DIFFICULTY_LABEL,
  REALWORD_MAX_SCORE,
} from "@/lib/realword-constants";
import { loadRealWordVisibleBank } from "@/lib/realword-storage";
import type { RealWordRoundNum } from "@/types/realword";

export function RealWordRoundDifficultyHub({ round }: { round: RealWordRoundNum }) {
  const [v, setV] = useState(0);

  useEffect(() => {
    const refresh = () => setV((n) => n + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-realword-storage", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-realword-storage", refresh);
    };
  }, []);

  const bank = loadRealWordVisibleBank();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3 text-sm font-bold text-ep-blue">
        <Link href="/practice/literacy/real-word" className="hover:underline">
          ← All rounds
        </Link>
        <span className="text-neutral-300">·</span>
        <Link href="/practice" className="hover:underline">
          Practice hub
        </Link>
      </div>

      <header className="ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.25em] text-ep-blue">Round {round}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Choose difficulty</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Level caps: Easy {REALWORD_MAX_SCORE.easy} · Medium {REALWORD_MAX_SCORE.medium} · Hard{" "}
          {REALWORD_MAX_SCORE.hard} points per set. Only admin-uploaded sets are listed.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-black uppercase tracking-wide">Level</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {REALWORD_DIFFICULTIES.map((d) => {
            const count = bank[round][d].length;
            return (
              <Link
                key={`${d}-${v}`}
                href={`/practice/literacy/real-word/round/${round}/${d}`}
                className="ep-interactive ep-brutal rounded-sm border-4 border-black bg-white px-4 py-8 text-left shadow-[4px_4px_0_0_#000] hover:bg-ep-yellow/25"
              >
                <span className="block text-2xl font-black uppercase">{REALWORD_DIFFICULTY_LABEL[d]}</span>
                <span className="ep-stat mt-3 block text-sm font-bold text-neutral-800">
                  {count > 0
                    ? `${count} set${count === 1 ? "" : "s"} · max ${REALWORD_MAX_SCORE[d]} pts`
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
