"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  VOCAB_SESSION_LABEL,
  VOCAB_SESSION_MAX,
} from "@/lib/vocab-constants";
import { getVocabVisibleSetByNumber } from "@/lib/vocab-storage";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";
import type { VocabRoundNum, VocabSessionLevel } from "@/types/vocab";

const LEVELS: VocabSessionLevel[] = ["easy", "medium", "hard"];

export function VocabSetLevelPicker({
  round,
  setNumber,
}: {
  round: VocabRoundNum;
  setNumber: number;
}) {
  const [ready, setReady] = useState(false);
  const [exists, setExists] = useState(false);

  const hubHref = `/practice/comprehension/vocabulary/round/${round}`;

  useEffect(() => {
    const s = getVocabVisibleSetByNumber(setNumber, round);
    setExists(!!s);
    setReady(true);
  }, [round, setNumber]);

  if (!ready) {
    return <LuxuryLoader label="Loading set…" />;
  }

  if (!exists) {
    return (
      <div className="ep-brutal-reading rounded-sm bg-white p-6">
        <p className="font-bold text-neutral-800">
          Set {setNumber} is not available yet.
        </p>
        <Link
          href={hubHref}
          className="ep-interactive mt-4 inline-block text-sm font-bold uppercase text-ep-blue underline-offset-2 hover:underline"
        >
          Back to sets
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={hubHref}
          className="ep-interactive text-sm font-bold uppercase tracking-wide text-ep-blue underline-offset-2 hover:underline"
        >
          ← All sets
        </Link>
      </div>

      <header className="ep-brutal-reading rounded-sm bg-white p-6">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-ep-blue">
          Set {setNumber}
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">Choose difficulty</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Pick Easy, Medium, or Hard. Scoring uses the max for that level; you will see tests that
          match that content band (about 10–20 per level when the bank is filled).
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {LEVELS.map((lv) => (
          <Link
            key={lv}
            href={`/practice/comprehension/vocabulary/round/${round}/${setNumber}/${lv}`}
            className="ep-interactive ep-brutal-reading block rounded-sm bg-ep-yellow px-4 py-8 text-left shadow-[4px_4px_0_0_#000] hover:bg-ep-yellow/90"
          >
            <span className="block text-2xl font-black uppercase">{VOCAB_SESSION_LABEL[lv]}</span>
            <span className="ep-stat mt-3 block text-sm font-bold text-neutral-800">
              Max {VOCAB_SESSION_MAX[lv]}
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
