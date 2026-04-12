"use client";

import { useMemo, useState } from "react";
import { shuffleMcOptions } from "@/lib/reading-utils";
import type { VocabExamResultRow, VocabPassageUnit } from "@/types/vocab";

export function VocabExam({
  passage,
  setNumber,
  passageNumber,
  onComplete,
}: {
  passage: VocabPassageUnit;
  setNumber: number;
  passageNumber: number;
  onComplete: (rows: VocabExamResultRow[]) => void;
}) {
  const parts = useMemo(() => passage.passageText.split("[BLANK]"), [passage.passageText]);
  const shuffledPerBlank = useMemo(() => {
    return passage.blanks.map((b) => shuffleMcOptions(b.options, b.correctAnswer));
  }, [passage.blanks]);
  const blankCount = passage.blanks.length;

  const [questionIndex, setQuestionIndex] = useState(0);
  /** Correct words revealed in the passage (always the right word, even if MC wrong). */
  const [filledCorrect, setFilledCorrect] = useState<string[]>([]);
  const [userPicks, setUserPicks] = useState<string[]>([]);

  if (parts.length !== blankCount + 1) {
    return (
      <p className="text-sm font-bold text-red-700">
        Invalid passage: expected {blankCount} [BLANK] markers.
      </p>
    );
  }

  const currentBlank = passage.blanks[questionIndex];
  const { shuffled } = shuffledPerBlank[questionIndex];

  const selectOption = (option: string) => {
    const correct = currentBlank.correctAnswer;
    setUserPicks((prev) => [...prev, option]);
    setFilledCorrect((prev) => [...prev, correct]);

    if (questionIndex < blankCount - 1) {
      setQuestionIndex((i) => i + 1);
      return;
    }

    const picks = [...userPicks, option];
    const rows: VocabExamResultRow[] = passage.blanks.map((b, i) => ({
      blankIndex: i + 1,
      question: b.question,
      userAnswer: picks[i] ?? "",
      correctAnswer: b.correctAnswer,
      isCorrect: picks[i] === b.correctAnswer,
      explanationThai: b.explanationThai,
    }));
    onComplete(rows);
  };

  return (
    <div className="space-y-6">
      <section className="ep-brutal-reading rounded-sm bg-white p-5">
        <h2 className="text-lg font-black uppercase tracking-wide text-ep-blue">
          Passage — Set {setNumber} · Passage {passageNumber}
        </h2>
        <div className="mt-4 text-sm leading-relaxed text-neutral-900">
          {parts.map((segment, i) => (
            <span key={i}>
              {segment}
              {i < blankCount ? (
                <span
                  className={`mx-0.5 inline-block min-w-[4.5rem] border-b-4 border-ep-blue px-1 text-center font-black transition-[color,background-color,border-color,transform] duration-300 ease-out ${
                    filledCorrect[i] !== undefined
                      ? "scale-[1.02] text-ep-blue"
                      : "text-ep-blue/90"
                  }`}
                >
                  {filledCorrect[i] !== undefined ? filledCorrect[i] : "[BLANK]"}
                </span>
              ) : null}
            </span>
          ))}
        </div>
      </section>

      <section className="ep-brutal-reading rounded-sm bg-neutral-50 p-5">
        <div key={questionIndex} className="ep-comp-step-in">
          <p className="ep-stat text-xs font-bold uppercase text-neutral-500">
            Blank {questionIndex + 1} of {blankCount}
          </p>
          <p className="mt-2 text-base font-bold text-neutral-900">{currentBlank.question}</p>
          <ul className="mt-4 space-y-2">
            {shuffled.map((opt) => (
              <li key={opt + questionIndex}>
                <button
                  type="button"
                  onClick={() => selectOption(opt)}
                  className="w-full border-4 border-black bg-white px-3 py-3 text-left text-sm font-semibold shadow-[4px_4px_0_0_#000] transition duration-200 ease-out hover:bg-ep-yellow/40 active:translate-y-px active:shadow-[3px_3px_0_0_#000]"
                >
                  {opt}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
