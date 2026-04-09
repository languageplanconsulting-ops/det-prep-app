"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DictationSessionClient } from "@/components/dictation/DictationSessionClient";
import { StudySessionBoundary } from "@/components/practice/StudySessionBoundary";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";
import { ensureDictationBankReady, getDictationItem } from "@/lib/dictation-storage";
import type { DictationDifficulty, DictationItem, DictationRoundNum } from "@/types/dictation";

export function DictationSessionGate({
  round,
  difficulty,
  setNumber,
}: {
  round: DictationRoundNum;
  difficulty: DictationDifficulty;
  setNumber: number;
}) {
  const [item, setItem] = useState<DictationItem | null | undefined>(undefined);

  useEffect(() => {
    void (async () => {
      await ensureDictationBankReady();
      setItem(getDictationItem(round, difficulty, setNumber) ?? null);
    })();
  }, [round, difficulty, setNumber]);

  if (item === undefined) {
    return <LuxuryLoader label="Loading dictation set…" />;
  }

  if (item === null) {
    return (
      <div className="ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="font-bold text-neutral-800">
          Set {setNumber} is not available. Paste dictation JSON in Admin or use defaults.
        </p>
        <Link
          href={`/practice/literacy/dictation/round/${round}/${difficulty}`}
          className="ep-interactive mt-4 inline-block text-sm font-bold uppercase text-ep-blue underline-offset-2 hover:underline"
        >
          Back to sets
        </Link>
      </div>
    );
  }

  return (
    <StudySessionBoundary
      skill="literacy"
      exerciseType="dictation"
      difficulty={difficulty}
      setId={`dict-r${round}-${difficulty}-s${setNumber}`}
    >
      <DictationSessionClient item={item} round={round} difficulty={difficulty} setNumber={setNumber} />
    </StudySessionBoundary>
  );
}
