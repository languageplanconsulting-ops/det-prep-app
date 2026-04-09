"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getReadingExamFromSet,
  getReadingVisibleSetByNumber,
} from "@/lib/reading-storage";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";
import type { ReadingDifficulty, ReadingExamUnit, ReadingRoundNum } from "@/types/reading";
import { StudySessionBoundary } from "@/components/practice/StudySessionBoundary";
import { ReadingSessionClient } from "./ReadingSessionClient";

export function ReadingSessionGate({
  round,
  difficulty,
  setNumber,
  examNumber,
}: {
  round: ReadingRoundNum;
  difficulty: ReadingDifficulty;
  setNumber: number;
  examNumber: number;
}) {
  const [exam, setExam] = useState<ReadingExamUnit | null | undefined>(undefined);

  useEffect(() => {
    const set = getReadingVisibleSetByNumber(round, difficulty, setNumber);
    if (!set) {
      setExam(null);
      return;
    }
    setExam(getReadingExamFromSet(set, examNumber) ?? null);
  }, [round, difficulty, setNumber, examNumber]);

  if (exam === undefined) {
    return <LuxuryLoader label="Opening this exam…" />;
  }

  if (exam === null) {
    return (
      <div className="ep-brutal-reading rounded-sm bg-white p-6">
        <p className="font-bold text-neutral-800">
          Exam {examNumber} is not in set {setNumber}. Choose another exam from the list.
        </p>
        <Link
          href={`/practice/comprehension/reading/round/${round}/${difficulty}/${setNumber}`}
          className="ep-interactive mt-4 inline-block text-sm font-bold uppercase tracking-wide text-ep-blue underline-offset-2 hover:underline"
        >
          Back to exam list
        </Link>
      </div>
    );
  }

  return (
    <StudySessionBoundary
      skill="comprehension"
      exerciseType="reading"
      difficulty={difficulty}
      setId={`read-r${round}-${difficulty}-s${setNumber}-e${examNumber}`}
    >
      <ReadingSessionClient
        round={round}
        difficulty={difficulty}
        setNumber={setNumber}
        examNumber={examNumber}
        readingExam={exam}
      />
    </StudySessionBoundary>
  );
}
