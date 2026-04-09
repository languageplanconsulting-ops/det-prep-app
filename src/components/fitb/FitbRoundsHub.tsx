"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FITB_ROUND_NUMBERS } from "@/lib/fitb-constants";
import { getFitbRoundStats, loadFitbVisibleBank } from "@/lib/fitb-storage";
import type { FitbRoundNum } from "@/types/fitb";

function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

export function FitbRoundsHub() {
  const [v, setV] = useState(0);

  useEffect(() => {
    const refresh = () => setV((n) => n + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-fitb-storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-fitb-storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return (
    <div className="space-y-8">
      <header className="ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.25em] text-ep-blue">
          Literacy · Fill in the blank
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Choose a round</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Five rounds. Each round has Easy / Medium / Hard sets. Averages use your best score per exam as a
          percent of that exam&apos;s max; the date is your most recent attempt in that round.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-black uppercase tracking-wide">Rounds</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {FITB_ROUND_NUMBERS.map((round) => (
            <RoundCard key={`${round}-${v}`} round={round} />
          ))}
        </div>
      </section>
    </div>
  );
}

function RoundCard({ round }: { round: FitbRoundNum }) {
  const bank = loadFitbVisibleBank();
  const totalSets =
    bank[round].easy.length + bank[round].medium.length + bank[round].hard.length;
  const stats = getFitbRoundStats(round);

  return (
    <Link
      href={`/practice/literacy/fill-in-blank/round/${round}`}
      className="ep-interactive ep-brutal flex flex-col rounded-sm border-4 border-black bg-ep-yellow px-4 py-6 text-left shadow-[4px_4px_0_0_#000] hover:bg-ep-yellow/90"
    >
      <span className="text-2xl font-black">Round {round}</span>
      <span className="ep-stat mt-2 text-sm font-bold text-neutral-800">
        {totalSets > 0 ? `${totalSets} uploaded set(s)` : "Coming soon"}
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
