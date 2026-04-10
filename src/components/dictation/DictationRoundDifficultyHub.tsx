"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";
import {
  DICTATION_DIFFICULTIES,
  DICTATION_DIFFICULTY_LABEL,
  DICTATION_MAX_SCORE,
} from "@/lib/dictation-constants";
import { ensureDictationBankReady, loadDictationBank } from "@/lib/dictation-storage";
import type { DictationRoundNum } from "@/types/dictation";

export function DictationRoundDifficultyHub({ round }: { round: DictationRoundNum }) {
  const [v, setV] = useState(0);
  const [bankReady, setBankReady] = useState(false);

  useEffect(() => {
    void ensureDictationBankReady().then(() => setBankReady(true));
  }, []);

  useEffect(() => {
    const refresh = () => setV((n) => n + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-dictation-storage", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-dictation-storage", refresh);
    };
  }, []);

  if (!bankReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LuxuryLoader label="Loading dictation bank…" />
      </div>
    );
  }

  const bank = loadDictationBank();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3 text-sm font-bold text-ep-blue">
        <Link href="/practice/literacy/dictation" className="hover:underline">
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
          DET caps: Easy {DICTATION_MAX_SCORE.easy} · Medium {DICTATION_MAX_SCORE.medium} · Hard{" "}
          {DICTATION_MAX_SCORE.hard}. Open a set to listen with computer voice and type the full sentence.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-black uppercase tracking-wide">Level</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {DICTATION_DIFFICULTIES.map((d) => {
            const count = bank[round][d].length;
            return (
              <Link
                key={`${d}-${v}`}
                href={`/practice/literacy/dictation/round/${round}/${d}`}
                className="ep-interactive ep-brutal rounded-sm border-4 border-black bg-white px-4 py-8 text-left shadow-[4px_4px_0_0_#000] hover:bg-ep-yellow/15"
              >
                <span className="block text-2xl font-black uppercase">{DICTATION_DIFFICULTY_LABEL[d]}</span>
                <span className="ep-stat mt-3 block text-sm font-bold text-neutral-800">
                  {count > 0
                    ? `${count} set${count === 1 ? "" : "s"} · max ${DICTATION_MAX_SCORE[d]} pts`
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
