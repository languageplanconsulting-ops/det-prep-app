"use client";

import Link from "next/link";
import { useState } from "react";
import { RealWordGame } from "@/components/realword/RealWordGame";
import { RealWordReport } from "@/components/realword/RealWordReport";
import { saveRealWordProgress } from "@/lib/realword-storage";
import type { RealWordDifficulty, RealWordRoundNum, RealWordSet } from "@/types/realword";

export function RealWordSessionClient({
  round,
  wordSet,
  difficulty,
  setNumber,
  hubHref,
}: {
  round: RealWordRoundNum;
  wordSet: RealWordSet;
  difficulty: RealWordDifficulty;
  setNumber: number;
  /** Usually the set list for this round + difficulty. */
  hubHref: string;
}) {
  const [phase, setPhase] = useState<"game" | "report">("game");
  const [selected, setSelected] = useState<Set<number>>(() => new Set());

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const submit = () => {
    saveRealWordProgress({
      round,
      difficulty,
      setNumber,
      words: wordSet.words,
      selectedIndices: selected,
    });
    setPhase("report");
  };

  const redeemNow = () => {
    setSelected(new Set());
    setPhase("game");
  };

  if (phase === "report") {
    return (
      <div className="space-y-6">
        <Link
          href={hubHref}
          className="inline-block text-sm font-bold uppercase tracking-wide text-ep-blue underline-offset-2 hover:underline"
        >
          ← Sets
        </Link>
        <RealWordReport
          wordSet={wordSet}
          difficulty={difficulty}
          selected={selected}
          hubHref={hubHref}
          onRedeemNow={redeemNow}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link
          href={hubHref}
          className="text-sm font-bold uppercase tracking-wide text-ep-blue underline-offset-2 hover:underline"
        >
          ← Sets
        </Link>
        <p className="max-w-xs text-right text-xs font-bold text-neutral-600">{wordSet.setId}</p>
      </div>
      <RealWordGame wordSet={wordSet} selected={selected} onToggle={toggle} onSubmit={submit} />
    </div>
  );
}
