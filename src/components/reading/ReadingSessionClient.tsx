"use client";

import Link from "next/link";
import { useState } from "react";
import { READING_DIFFICULTY_MAX } from "@/lib/reading-constants";
import { saveReadingAttempt } from "@/lib/reading-storage";
import type {
  ReadingDifficulty,
  ReadingExamResultRow,
  ReadingExamUnit,
  ReadingRoundNum,
} from "@/types/reading";
import { ReadingExam } from "./ReadingExam";
import { ReadingReport } from "./ReadingReport";

export function ReadingSessionClient({
  round,
  difficulty,
  setNumber,
  examNumber,
  readingExam,
}: {
  round: ReadingRoundNum;
  difficulty: ReadingDifficulty;
  setNumber: number;
  examNumber: number;
  readingExam: ReadingExamUnit;
}) {
  const [phase, setPhase] = useState<"exam" | "report">("exam");
  const [examKey, setExamKey] = useState(0);
  const [resultRows, setResultRows] = useState<ReadingExamResultRow[] | null>(null);

  const maxScore = READING_DIFFICULTY_MAX[difficulty];
  const setListHref = `/practice/comprehension/reading/round/${round}/${difficulty}/${setNumber}`;

  const onComplete = (rows: ReadingExamResultRow[]) => {
    const correctCount = rows.filter((r) => r.isCorrect).length;
    const attainedScore = Math.round((correctCount / 4) * maxScore);
    saveReadingAttempt({
      round,
      difficulty,
      setNumber,
      examNumber,
      attainedScore,
      maxScore,
      correctCount,
    });
    setResultRows(rows);
    setPhase("report");
  };

  const redeem = () => {
    setResultRows(null);
    setPhase("exam");
    setExamKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={setListHref}
          className="text-sm font-bold uppercase tracking-wide text-ep-blue underline-offset-2 hover:underline"
        >
          ← Exams in set {setNumber}
        </Link>
        <p className="ep-stat text-xs text-neutral-500">
          Set {setNumber} · Exam {examNumber} · Max {maxScore} pts
        </p>
      </div>

      {phase === "exam" ? (
        <ReadingExam
          key={examKey}
          setNumber={setNumber}
          examNumber={examNumber}
          readingExam={readingExam}
          onComplete={onComplete}
        />
      ) : resultRows ? (
        <ReadingReport
          round={round}
          difficulty={difficulty}
          setNumber={setNumber}
          examNumber={examNumber}
          readingExam={readingExam}
          rows={resultRows}
          onRedeem={redeem}
          setListHref={setListHref}
        />
      ) : null}
    </div>
  );
}
