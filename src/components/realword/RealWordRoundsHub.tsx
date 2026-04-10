"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { REALWORD_DIFFICULTIES, REALWORD_ROUND_NUMBERS } from "@/lib/realword-constants";
import { getRealWordRoundStats, loadRealWordVisibleBank } from "@/lib/realword-storage";
import type { RealWordRoundNum } from "@/types/realword";

function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

export function RealWordRoundsHub() {
  const [v, setV] = useState(0);

  useEffect(() => {
    const refresh = () => setV((n) => n + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-realword-storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-realword-storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return (
    <div className="space-y-8">
      <header className="ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.25em] text-ep-blue">
          Literacy · Real English word
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Selection hub</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Five rounds. In each round, pick Easy / Medium / Hard, then open an admin-uploaded set. Pick every authentic
          word; avoid fake traps. Best score is saved per set; <strong>Redeem</strong> appears until you reach a perfect
          max score.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-black uppercase tracking-wide">Rounds</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {REALWORD_ROUND_NUMBERS.map((round) => (
            <RoundCard key={`${round}-${v}`} round={round} />
          ))}
        </div>
      </section>
    </div>
  );
}

function RoundCard({ round }: { round: RealWordRoundNum }) {
  const bank = loadRealWordVisibleBank();
  let totalSets = 0;
  for (const d of REALWORD_DIFFICULTIES) {
    totalSets += bank[round][d].length;
  }
  const stats = getRealWordRoundStats(round);

  return (
    <Link
      href={`/practice/literacy/real-word/round/${round}`}
      className="ep-interactive ep-brutal flex flex-col rounded-sm border-4 border-black bg-ep-yellow px-4 py-6 text-left shadow-[4px_4px_0_0_#000] hover:bg-ep-yellow/90"
    >
      <span className="text-2xl font-black">Round {round}</span>
      <span className="ep-stat mt-2 text-sm font-bold text-neutral-800">
        {totalSets > 0 ? `${totalSets} set(s) uploaded` : "COMING SOON"}
      </span>
      <span className="ep-stat mt-3 block text-xs font-black uppercase tracking-wide text-neutral-700">
        Avg score
      </span>
      <span className="text-lg font-black text-ep-blue">
        {stats.avgPercent != null ? `${stats.avgPercent}%` : "—"}
      </span>
      <span className="ep-stat mt-2 block text-xs font-black uppercase tracking-wide text-neutral-700">
        Latest attempt
      </span>
      <span className="ep-stat text-sm font-semibold text-neutral-800">
        {formatShortDate(stats.latestAttemptDate)}
      </span>
    </Link>
  );
}
