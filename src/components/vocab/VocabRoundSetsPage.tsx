"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { VocabularyBuilderAvailabilityBanner } from "@/components/vocab/VocabularyBuilderAvailabilityBanner";
import { VOCAB_SESSION_LABEL, VOCAB_SESSION_MAX } from "@/lib/vocab-constants";
import { loadVocabVisibleBank } from "@/lib/vocab-storage";
import type { VocabRoundNum, VocabSessionLevel } from "@/types/vocab";

export function VocabRoundSetsPage({ round }: { round: VocabRoundNum }) {
  const [bankVersion, setBankVersion] = useState(0);

  useEffect(() => {
    const onStorage = () => setBankVersion((n) => n + 1);
    window.addEventListener("storage", onStorage);
    window.addEventListener("ep-vocab-storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("ep-vocab-storage", onStorage);
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3 text-sm font-bold text-ep-blue">
        <Link href="/practice/comprehension/vocabulary" className="hover:underline">
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
          Pick Easy, Medium, or Hard, then choose questions directly (no set selection step).
        </p>
      </header>

      <VocabularyBuilderAvailabilityBanner />

      <section className="space-y-4">
        <h2 className="text-lg font-black uppercase tracking-wide">Level</h2>
        <DifficultyGrid round={round} bankVersion={bankVersion} />
      </section>
    </div>
  );
}

function DifficultyGrid({ round, bankVersion }: { round: VocabRoundNum; bankVersion: number }) {
  const [counts, setCounts] = useState<Record<VocabSessionLevel, number>>({
    easy: 0,
    medium: 0,
    hard: 0,
  });

  useEffect(() => {
    const sets = loadVocabVisibleBank()[round];
    const next: Record<VocabSessionLevel, number> = { easy: 0, medium: 0, hard: 0 };
    for (const set of sets) {
      for (const p of set.passages) {
        next[p.contentLevel] += 1;
      }
    }
    setCounts(next);
  }, [round, bankVersion]);

  const levels: VocabSessionLevel[] = ["easy", "medium", "hard"];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {levels.map((lv) => (
        <Link
          key={lv}
          href={`/practice/comprehension/vocabulary/round/${round}/level/${lv}`}
          className="ep-interactive ep-brutal-reading block rounded-sm bg-white px-4 py-8 text-left shadow-[4px_4px_0_0_#000] hover:bg-ep-yellow/25"
        >
          <span className="block text-2xl font-black uppercase">{VOCAB_SESSION_LABEL[lv]}</span>
          <span className="ep-stat mt-3 block text-sm font-bold text-neutral-800">
            {counts[lv] > 0 ? `${counts[lv]} questions · max ${VOCAB_SESSION_MAX[lv]}` : "COMING SOON"}
          </span>
        </Link>
      ))}
    </div>
  );
}
