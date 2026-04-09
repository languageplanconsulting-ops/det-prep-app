"use client";

import Link from "next/link";
import { useState } from "react";
import { VOCAB_SESSION_MAX } from "@/lib/vocab-constants";
import { saveVocabAttempt } from "@/lib/vocab-storage";
import type {
  VocabExamResultRow,
  VocabPassageUnit,
  VocabRoundNum,
  VocabSessionLevel,
} from "@/types/vocab";
import { VocabExam } from "./VocabExam";
import { VocabReport } from "./VocabReport";

export function VocabSessionClient({
  round,
  sessionLevel,
  setNumber,
  passageNumber,
  passage,
}: {
  round: VocabRoundNum;
  sessionLevel: VocabSessionLevel;
  setNumber: number;
  passageNumber: number;
  passage: VocabPassageUnit;
}) {
  const [phase, setPhase] = useState<"exam" | "report">("exam");
  const [examKey, setExamKey] = useState(0);
  const [resultRows, setResultRows] = useState<VocabExamResultRow[] | null>(null);

  const maxScore = VOCAB_SESSION_MAX[sessionLevel];
  const setListHref = `/practice/comprehension/vocabulary/round/${round}/${setNumber}/${sessionLevel}`;
  const bankHref = "/practice/comprehension/vocabulary";

  const onComplete = (rows: VocabExamResultRow[]) => {
    const correctCount = rows.filter((r) => r.isCorrect).length;
    const attainedScore = Math.round((correctCount / 6) * maxScore);
    saveVocabAttempt({
      round,
      sessionLevel,
      setNumber,
      passageNumber,
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
          ← Tests in set {setNumber}
        </Link>
        <p className="ep-stat text-xs text-neutral-500">
          Max {maxScore} pts · 6 blanks
        </p>
      </div>

      {phase === "exam" ? (
        <VocabExam
          key={examKey}
          passage={passage}
          setNumber={setNumber}
          passageNumber={passageNumber}
          onComplete={onComplete}
        />
      ) : resultRows ? (
        <VocabReport
          round={round}
          sessionLevel={sessionLevel}
          setNumber={setNumber}
          passageNumber={passageNumber}
          passage={passage}
          rows={resultRows}
          onRedeem={redeem}
          setListHref={setListHref}
          bankHref={bankHref}
        />
      ) : null}
    </div>
  );
}
