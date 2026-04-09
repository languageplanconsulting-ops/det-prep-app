"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RealWordSessionClient } from "@/components/realword/RealWordSessionClient";
import { StudySessionBoundary } from "@/components/practice/StudySessionBoundary";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";
import { getRealWordVisibleSet } from "@/lib/realword-storage";
import type { RealWordDifficulty, RealWordRoundNum, RealWordSet } from "@/types/realword";

export function RealWordSessionGate({
  round,
  difficulty,
  setNumber,
}: {
  round: RealWordRoundNum;
  difficulty: RealWordDifficulty;
  setNumber: number;
}) {
  const setsListHref = `/practice/literacy/real-word/round/${round}/${difficulty}`;
  const [set, setWordSet] = useState<RealWordSet | null | undefined>(undefined);

  useEffect(() => {
    setWordSet(getRealWordVisibleSet(round, difficulty, setNumber) ?? null);
  }, [round, difficulty, setNumber]);

  if (set === undefined) {
    return <LuxuryLoader label="Loading real word set…" />;
  }

  if (set === null) {
    return (
      <div className="ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="font-bold text-neutral-800">Set {setNumber} is not available.</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold">
          <Link
            href={setsListHref}
            className="ep-interactive text-ep-blue underline-offset-2 hover:underline"
          >
            Back to sets
          </Link>
          <span className="text-neutral-300">·</span>
          <Link href="/practice/literacy/real-word" className="ep-interactive text-ep-blue underline-offset-2 hover:underline">
            All rounds
          </Link>
        </div>
      </div>
    );
  }

  return (
    <StudySessionBoundary
      skill="literacy"
      exerciseType="real_word"
      difficulty={difficulty}
      setId={`rw-r${round}-${difficulty}-s${setNumber}`}
    >
      <RealWordSessionClient
        round={round}
        wordSet={set}
        difficulty={difficulty}
        setNumber={setNumber}
        hubHref={setsListHref}
      />
    </StudySessionBoundary>
  );
}
