"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";
import { DICTATION_ROUND_NUMBERS } from "@/lib/dictation-constants";
import {
  ensureDictationBankReady,
  getDictationRoundStats,
  loadDictationBank,
} from "@/lib/dictation-storage";
import type { DictationRoundNum } from "@/types/dictation";

function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

export function DictationRoundsHub() {
  const [v, setV] = useState(0);
  const [bankReady, setBankReady] = useState(false);

  useEffect(() => {
    void ensureDictationBankReady().then(() => setBankReady(true));
  }, []);

  useEffect(() => {
    const refresh = () => setV((n) => n + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-dictation-storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-dictation-storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  if (!bankReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LuxuryLoader label="Loading dictation bank…" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.25em] text-ep-blue">
          Literacy · Dictation
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Choose a round</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Five rounds. Each round has Easy / Medium / Hard sets. Averages use your best score per set as a
          percent of that set&apos;s max; the date is your most recent attempt in that round.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-black uppercase tracking-wide">Rounds</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {DICTATION_ROUND_NUMBERS.map((round) => (
            <RoundCard key={`${round}-${v}`} round={round} />
          ))}
        </div>
      </section>
    </div>
  );
}

function RoundCard({ round }: { round: DictationRoundNum }) {
  const bank = loadDictationBank();
  const totalSets =
    bank[round].easy.length + bank[round].medium.length + bank[round].hard.length;
  const stats = getDictationRoundStats(round);

  return (
    <Link
      href={`/practice/literacy/dictation/round/${round}`}
      className="ep-interactive ep-brutal flex flex-col rounded-sm border-4 border-black bg-ep-yellow px-4 py-6 text-left shadow-[4px_4px_0_0_#000] hover:bg-ep-yellow/90"
    >
      <span className="text-2xl font-black">Round {round}</span>
      <span className="ep-stat mt-2 text-sm font-bold text-neutral-800">
        {totalSets > 0 ? `${totalSets} set(s) in bank` : "COMING SOON"}
      </span>
      <span className="ep-stat mt-3 block text-xs font-bold uppercase tracking-wide text-neutral-700">
        Avg score
      </span>
      <span className="text-lg font-black text-ep-blue">
        {stats.avgPercent != null ? `${stats.avgPercent}%` : "—"}
      </span>
      <span className="ep-stat mt-2 block text-xs font-bold uppercase tracking-wide text-neutral-700">
        Latest attempt
      </span>
      <span className="ep-stat text-sm font-semibold text-neutral-800">
        {formatShortDate(stats.latestAttemptDate)}
      </span>
    </Link>
  );
}
