"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getVocabPassageFromSet, getVocabVisibleSetByNumber } from "@/lib/vocab-storage";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";
import type { VocabPassageUnit, VocabRoundNum, VocabSessionLevel } from "@/types/vocab";
import { StudySessionBoundary } from "@/components/practice/StudySessionBoundary";
import { VocabSessionClient } from "./VocabSessionClient";

export function VocabSessionGate({
  round,
  sessionLevel,
  setNumber,
  passageNumber,
}: {
  round: VocabRoundNum;
  sessionLevel: VocabSessionLevel;
  setNumber: number;
  passageNumber: number;
}) {
  const [passage, setPassage] = useState<VocabPassageUnit | null | undefined>(undefined);

  useEffect(() => {
    const set = getVocabVisibleSetByNumber(setNumber, round);
    if (!set) {
      setPassage(null);
      return;
    }
    setPassage(getVocabPassageFromSet(set, passageNumber) ?? null);
  }, [round, setNumber, passageNumber]);

  const setListHref = `/practice/comprehension/vocabulary/round/${round}/${setNumber}/${sessionLevel}`;

  if (passage === undefined) {
    return <LuxuryLoader label="Opening this passage…" />;
  }

  if (passage === null) {
    return (
      <div className="ep-brutal-reading rounded-sm bg-white p-6">
        <p className="font-bold text-neutral-800">
          Passage {passageNumber} was not found in set {setNumber}.
        </p>
        <Link
          href={setListHref}
          className="ep-interactive mt-4 inline-block text-sm font-bold uppercase text-ep-blue underline-offset-2 hover:underline"
        >
          Back to passage list
        </Link>
      </div>
    );
  }

  return (
    <StudySessionBoundary
      skill="comprehension"
      exerciseType="vocabulary"
      difficulty={sessionLevel}
      setId={`voc-r${round}-s${setNumber}-l${sessionLevel}-p${passageNumber}`}
    >
      <VocabSessionClient
        round={round}
        sessionLevel={sessionLevel}
        setNumber={setNumber}
        passageNumber={passageNumber}
        passage={passage}
      />
    </StudySessionBoundary>
  );
}
