"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  READING_DIFFICULTY_LABEL,
  READING_DIFFICULTY_MAX,
  READING_RECOMMENDED_EXAMS_PER_SET,
} from "@/lib/reading-constants";
import {
  getReadingExamProgress,
  getReadingVisibleSetByNumber,
} from "@/lib/reading-storage";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";
import type { ReadingDifficulty, ReadingRoundNum, ReadingSet } from "@/types/reading";

export function ReadingSetExamList({
  round,
  difficulty,
  setNumber,
}: {
  round: ReadingRoundNum;
  difficulty: ReadingDifficulty;
  setNumber: number;
}) {
  const [set, setSet] = useState<ReadingSet | null | undefined>(undefined);

  useEffect(() => {
    setSet(getReadingVisibleSetByNumber(round, difficulty, setNumber) ?? null);
  }, [round, difficulty, setNumber]);

  const maxScore = READING_DIFFICULTY_MAX[difficulty];

  if (set === undefined) {
    return <LuxuryLoader label="Gathering exams in this set…" />;
  }

  if (set === null) {
    return (
      <div className="ep-brutal-reading rounded-sm bg-white p-6">
        <p className="font-bold text-neutral-800">
          Set {setNumber} is not available yet.
        </p>
        <Link
          href={`/practice/comprehension/reading/round/${round}/${difficulty}`}
          className="ep-interactive mt-4 inline-block text-sm font-bold uppercase text-ep-blue underline-offset-2 hover:underline"
        >
          Back to sets
        </Link>
      </div>
    );
  }

  const examCount = set.exams.length;
  const belowRecommended = examCount < READING_RECOMMENDED_EXAMS_PER_SET;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/practice/comprehension/reading/round/${round}/${difficulty}`}
          className="ep-interactive text-sm font-bold uppercase tracking-wide text-ep-blue underline-offset-2 hover:underline"
        >
          ← Sets
        </Link>
        <p className="ep-stat text-xs text-neutral-500">
          Round {round} · {READING_DIFFICULTY_LABEL[difficulty]} · Max {maxScore} pts per exam
        </p>
      </div>

      <header className="ep-brutal-reading rounded-sm bg-white p-6">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-ep-blue">
          Round {round} · Set {setNumber}
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">Choose an exam</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          This set has <strong>{examCount}</strong> exam{examCount === 1 ? "" : "s"}. Each exam is one
          passage with four questions. Pick one to start.
        </p>
        {belowRecommended ? (
          <p className="mt-3 border-l-4 border-ep-yellow bg-ep-yellow/20 px-3 py-2 text-sm font-semibold text-neutral-800">
            Tip: aim for at least {READING_RECOMMENDED_EXAMS_PER_SET} exams per set in your Admin JSON (
            <span className="ep-stat">{`"exams"`}</span> array). You currently have {examCount}.
          </p>
        ) : null}
      </header>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {set.exams.map((exam, index) => {
          const examNumber = index + 1;
          const label = exam.titleEn?.trim() || `Exam ${examNumber}`;
          const prog = getReadingExamProgress(round, difficulty, setNumber, examNumber);
          const href = `/practice/comprehension/reading/round/${round}/${difficulty}/${setNumber}/${examNumber}`;
          return (
            <li key={examNumber}>
              <Link
                href={href}
                className="ep-interactive ep-brutal-reading flex min-h-[5.5rem] flex-col justify-center rounded-sm bg-white p-4 hover:bg-ep-yellow/25"
              >
                <span className="text-lg font-black">{label}</span>
                <span className="ep-stat mt-2 text-xs text-neutral-600">
                  {prog != null ? (
                    <>
                      Best: {prog.bestScore}/{prog.maxScore}
                      {prog.bestScore < prog.maxScore ? (
                        <span className="ml-1 font-bold text-ep-blue">· Redeem for max</span>
                      ) : null}
                    </>
                  ) : (
                    "Not attempted yet"
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
