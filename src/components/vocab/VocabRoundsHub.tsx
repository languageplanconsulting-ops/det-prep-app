"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { VOCAB_ROUND_NUMBERS } from "@/lib/vocab-constants";
import { VocabExamIntroModal } from "@/components/vocab/VocabExamIntroModal";
import { VocabularyBuilderAvailabilityBanner } from "@/components/vocab/VocabularyBuilderAvailabilityBanner";
import { getVocabRoundStats, loadVocabVisibleBank } from "@/lib/vocab-storage";
import type { VocabRoundNum } from "@/types/vocab";

function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

export function VocabRoundsHub() {
  const [v, setV] = useState(0);

  useEffect(() => {
    const refresh = () => setV((n) => n + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-vocab-storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-vocab-storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return (
    <div className="space-y-8">
      <VocabExamIntroModal />
      <header className="ep-brutal-reading rounded-sm bg-white p-6">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-ep-blue">
          Vocabulary in context
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">English Plan — vocabulary exam bank</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Five rounds. Each round has eight sets. Inside a set, pick Easy / Medium / Hard, then a test. Averages
          use your best score per test as a percent of that test&apos;s max; the date is your most recent attempt
          in that round.
        </p>
      </header>

      <VocabularyBuilderAvailabilityBanner />

      <section className="space-y-4">
        <h2 className="text-lg font-black uppercase tracking-wide">Rounds</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {VOCAB_ROUND_NUMBERS.map((round) => (
            <RoundCard key={`${round}-${v}`} round={round} />
          ))}
        </div>
      </section>
    </div>
  );
}

function RoundCard({ round }: { round: VocabRoundNum }) {
  const bank = loadVocabVisibleBank();
  const totalSets = bank[round].length;
  const stats = getVocabRoundStats(round);

  return (
    <Link
      href={`/practice/comprehension/vocabulary/round/${round}`}
      className="ep-interactive ep-brutal-reading flex flex-col rounded-sm bg-ep-yellow px-4 py-6 text-left shadow-[4px_4px_0_0_#000] hover:bg-ep-yellow/90"
    >
      <span className="text-2xl font-black">Round {round}</span>
      <span className="ep-stat mt-2 text-sm font-bold text-neutral-800">
        {totalSets > 0 ? `${totalSets} set(s) uploaded` : "COMING SOON"}
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
