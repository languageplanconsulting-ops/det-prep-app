"use client";

import Link from "next/link";
import { useState } from "react";
import { sfxTransition } from "@/lib/exam-sfx";
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
  nextPassageNumber,
  onRunnerComplete,
}: {
  round: VocabRoundNum;
  sessionLevel: VocabSessionLevel;
  setNumber: number;
  passageNumber: number;
  passage: VocabPassageUnit;
  nextPassageNumber: number | null;
  /** Fired once scoring completes, in addition to the normal report flow — used by the
   * daily-practice runner (src/components/practice/daily-runner) to advance to the next item. */
  onRunnerComplete?: (scorePct: number, maxScore: number) => void;
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
    onRunnerComplete?.(maxScore > 0 ? (attainedScore / maxScore) * 100 : 0, maxScore);
  };

  const redeem = () => {
    sfxTransition();
    setResultRows(null);
    setPhase("exam");
    setExamKey((k) => k + 1);
  };

  const nextPassageHref =
    nextPassageNumber != null
      ? `/practice/comprehension/vocabulary/round/${round}/${setNumber}/${sessionLevel}/${nextPassageNumber}`
      : null;

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
        <div key={`exam-${examKey}`} className="ep-step-slide-in">
          <VocabExam
            passage={passage}
            setNumber={setNumber}
            passageNumber={passageNumber}
            onComplete={onComplete}
          />
        </div>
      ) : resultRows ? (
        <div key="report" className="ep-step-slide-in">
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
            nextPassageHref={nextPassageHref}
          />
        </div>
      ) : null}
    </div>
  );
}
