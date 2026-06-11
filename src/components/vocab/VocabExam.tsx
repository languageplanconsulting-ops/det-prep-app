"use client";

import { useMemo, useState } from "react";
import { sfxCorrect, sfxWrong } from "@/lib/exam-sfx";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
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

  const { isAdmin, previewEligible } = useEffectiveTier();
  const soft = true;

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
    if (option === correct) sfxCorrect();
    else sfxWrong();
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
      {soft ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-xl text-white">
              📚
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Vocabulary · Set {setNumber} · Passage {passageNumber}
              </p>
              <h1 className="text-lg font-bold">เติมคำในบริบท</h1>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#004AAD] text-xl font-extrabold text-[#FFCC00] ring-[2.5px] ring-[#FFCC00]">
              D
            </div>
            <div className="relative flex-1 rounded-2xl rounded-tl-sm border border-[#004AAD]/10 bg-white px-3.5 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
              <span className="absolute -left-[7px] top-3.5 h-0 w-0 border-y-[6px] border-r-[7px] border-y-transparent border-r-white" />
              <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-[#FFCC00] px-2.5 py-[5px] text-[10px] font-extrabold uppercase leading-none tracking-wide text-[#004AAD]">
                <span className="text-[11px] leading-none">✨</span>Tips from P&apos;Doy
              </span>
              <p className="text-[13px] leading-6 text-slate-800">
                อ่าน <strong>ทั้งประโยค</strong> ก่อนเลือก — ดูว่าคำไหนเข้ากับความหมายและไวยากรณ์ ·
                ตอบผิดช่องไหน เก็บลง Notebook ไว้ทบทวน
              </p>
            </div>
          </div>
        </div>
      ) : null}
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
            {shuffled.map((opt, oi) =>
              soft ? (
                <li key={opt + questionIndex}>
                  <button
                    type="button"
                    onClick={() => selectOption(opt)}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-left text-sm font-semibold transition hover:border-[#004AAD]"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-extrabold text-[#004AAD]">
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <span>{opt}</span>
                  </button>
                </li>
              ) : (
                <li key={opt + questionIndex}>
                  <button
                    type="button"
                    onClick={() => selectOption(opt)}
                    className="w-full border-4 border-black bg-white px-3 py-3 text-left text-sm font-semibold shadow-[4px_4px_0_0_#000] transition duration-200 ease-out hover:bg-ep-yellow/40 active:translate-y-px active:shadow-[3px_3px_0_0_#000]"
                  >
                    {opt}
                  </button>
                </li>
              ),
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
