"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FitbSessionClient } from "@/components/fitb/FitbSessionClient";
import { StudySessionBoundary } from "@/components/practice/StudySessionBoundary";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";
import { getFitbVisibleSet } from "@/lib/fitb-storage";
import type { FitbDifficulty, FitbRoundNum, FitbSet } from "@/types/fitb";

export function FitbSessionGate({
  round,
  difficulty,
  setNumber,
  startWithRedeem,
}: {
  round: FitbRoundNum;
  difficulty: FitbDifficulty;
  setNumber: number;
  startWithRedeem: boolean;
}) {
  const [set, setSet] = useState<FitbSet | null | undefined>(undefined);

  useEffect(() => {
    setSet(getFitbVisibleSet(round, difficulty, setNumber) ?? null);
  }, [round, difficulty, setNumber]);

  if (set === undefined) {
    return <LuxuryLoader label="Loading fill-in-the-blank set…" />;
  }

  if (set === null) {
    return (
      <div className="ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="font-bold text-neutral-800">Set {setNumber} is not available.</p>
        <Link
          href={`/practice/literacy/fill-in-blank/round/${round}/${difficulty}`}
          className="ep-interactive mt-4 inline-block text-sm font-bold uppercase text-ep-blue underline-offset-2 hover:underline"
        >
          Back to exam bank
        </Link>
      </div>
    );
  }

  return (
    <StudySessionBoundary
      skill="literacy"
      exerciseType="fill_in_blank"
      difficulty={difficulty}
      setId={`fitb-r${round}-${difficulty}-s${setNumber}`}
    >
      <FitbSessionClient
        key={`${set.setId}-${startWithRedeem}`}
        set={set}
        round={round}
        difficulty={difficulty}
        setNumber={setNumber}
        startWithRedeem={startWithRedeem}
      />
    </StudySessionBoundary>
  );
}
