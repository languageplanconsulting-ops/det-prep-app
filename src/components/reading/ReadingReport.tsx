"use client";

import Link from "next/link";
import { useState } from "react";
import {
  READING_DIFFICULTY_LABEL,
  READING_DIFFICULTY_MAX,
} from "@/lib/reading-constants";
import { addNotebookEntry, NOTEBOOK_BUILTIN, normalizeCategoryIds } from "@/lib/notebook-storage";
import { playBlinkBeep } from "@/lib/play-blink-beep";
import {
  isReadingVocabKeySaved,
  isReadingVocabKnown,
  markReadingVocabKnown,
  markReadingVocabSaved,
} from "@/lib/reading-storage";
import { buildFallbackReadingExplanation } from "@/lib/reading-utils";
import type {
  ReadingDifficulty,
  ReadingExamResultRow,
  ReadingExamUnit,
  ReadingRoundNum,
} from "@/types/reading";

export function ReadingReport({
  round,
  difficulty,
  setNumber,
  examNumber,
  readingExam,
  rows,
  onRedeem,
  setListHref,
}: {
  round: ReadingRoundNum;
  difficulty: ReadingDifficulty;
  setNumber: number;
  examNumber: number;
  readingExam: ReadingExamUnit;
  rows: ReadingExamResultRow[];
  onRedeem: () => void;
  setListHref: string;
}) {
  const maxScore = READING_DIFFICULTY_MAX[difficulty];
  const correctCount = rows.filter((r) => r.isCorrect).length;
  const score = Math.round((correctCount / 4) * maxScore);
  const examTitle = readingExam.titleEn?.trim();
  const vocabList = readingExam.highlightedVocab ?? [];

  return (
    <div className="space-y-8">
      <header className="ep-brutal-reading rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-ep-blue">
          Report — R{round} · {READING_DIFFICULTY_LABEL[difficulty]} · Set {setNumber} · Exam {examNumber}
          {examTitle ? ` · ${examTitle}` : ""}
        </p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p
              className="text-4xl font-black tabular-nums tracking-tight text-neutral-900"
              style={{ fontFamily: "var(--font-jetbrains), ui-monospace, monospace" }}
            >
              {score}
              <span className="text-2xl font-bold text-neutral-400">/{maxScore}</span>
            </p>
            <p className="mt-2 text-sm text-neutral-600">
              {correctCount} of 4 correct · weighted by difficulty max.
            </p>
          </div>
          <div
            className={`rounded-sm border-4 border-black px-4 py-2 text-center shadow-[3px_3px_0_0_#000] ${
              correctCount === 4
                ? "bg-emerald-100"
                : correctCount >= 2
                  ? "bg-amber-100"
                  : "bg-red-100"
            }`}
          >
            <p className="ep-stat text-[10px] font-black uppercase tracking-widest text-neutral-700">
              Result
            </p>
            <p className="text-lg font-black text-neutral-900">
              {correctCount === 4 ? "Perfect" : correctCount >= 2 ? "Mixed" : "Review"}
            </p>
          </div>
        </div>
      </header>

      <section className="ep-brutal-reading rounded-sm border-4 border-black bg-neutral-50 p-5 shadow-[4px_4px_0_0_#000]">
        <p className="text-xs font-black uppercase tracking-wide text-neutral-700">Question review</p>
        <p className="mt-1 text-sm text-neutral-600">
          Green cards are correct answers; red cards need review. Compare your choice to the key.
        </p>
        <ul className="mt-5 space-y-5">
          {rows.map((r) => (
            <li
              key={r.key}
              className={`overflow-hidden rounded-sm border-4 shadow-[4px_4px_0_0_#000] ${
                r.isCorrect
                  ? "border-emerald-700 bg-emerald-50/90"
                  : "border-red-600 bg-red-50/90"
              }`}
            >
              <div
                className={`flex flex-wrap items-center justify-between gap-2 border-b-4 border-black px-4 py-2 ${
                  r.isCorrect ? "bg-emerald-200/80" : "bg-red-200/80"
                }`}
              >
                <p className="text-xs font-black uppercase tracking-wide text-neutral-900">{r.label}</p>
                <span
                  className={`rounded-sm border-2 border-black px-2 py-0.5 text-xs font-black uppercase ${
                    r.isCorrect ? "bg-emerald-600 text-white" : "bg-red-700 text-white"
                  }`}
                >
                  {r.isCorrect ? "Correct" : "Incorrect"}
                </span>
              </div>
              <div className="p-4">
                <p className="text-sm font-bold leading-snug text-neutral-900">{r.question}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div
                    className={`rounded-sm border-4 p-3 ${
                      r.isCorrect
                        ? "border-emerald-700 bg-white"
                        : "border-red-600 bg-white ring-2 ring-red-300/60"
                    }`}
                  >
                    <p className="ep-stat text-[10px] font-black uppercase tracking-wide text-neutral-500">
                      Your answer
                    </p>
                    <p
                      className={`mt-2 whitespace-pre-wrap font-semibold ${
                        r.isCorrect ? "text-emerald-900" : "text-red-900"
                      }`}
                    >
                      {r.userAnswer || "—"}
                    </p>
                  </div>
                  <div className="rounded-sm border-4 border-emerald-700 bg-emerald-100/90 p-3">
                    <p className="ep-stat text-[10px] font-black uppercase tracking-wide text-emerald-900">
                      Correct answer
                    </p>
                    <p className="mt-2 whitespace-pre-wrap font-semibold text-emerald-950">{r.correctAnswer}</p>
                  </div>
                </div>
                {!r.isCorrect ? (
                  <div className="mt-4 rounded-sm border-2 border-black bg-white p-3 text-sm">
                    <p className="font-black uppercase tracking-wide text-red-800">Why this answer</p>
                    {r.explanationThai ? (
                      <p className="mt-2 whitespace-pre-wrap text-neutral-800">{r.explanationThai}</p>
                    ) : (
                      <GeneratedExplanation block={r} />
                    )}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="ep-brutal-reading rounded-sm border-4 border-black bg-white p-5 shadow-[4px_4px_0_0_#000]">
        <p className="text-xs font-black uppercase tracking-wide text-ep-blue">Vocabulary from this passage</p>
        <p className="mt-1 text-sm text-neutral-600">
          Words from your exam’s highlighted vocab list. Add to notebook or mark as already known to hide.
        </p>
        {vocabList.length === 0 ? (
          <p className="mt-4 rounded-sm border-2 border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-600">
            No highlighted vocabulary in this exam JSON. Uploads can include{" "}
            <code className="ep-stat text-xs">highlightedVocab</code> with word, meaning, and example.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {vocabList.map((v) => (
              <VocabRow
                key={v.word + setNumber + examNumber + v.meaningEn}
                round={round}
                difficulty={difficulty}
                setNumber={setNumber}
                examNumber={examNumber}
                v={v}
              />
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => {
            playBlinkBeep();
            onRedeem();
          }}
          className="ep-redeem-pulse ep-brutal-reading w-full bg-ep-yellow py-4 text-center text-lg font-black uppercase tracking-widest text-black"
        >
          Redeem yourself
        </button>
        <Link
          href={setListHref}
          className="ep-brutal-reading block bg-neutral-100 py-3 text-center text-sm font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000]"
        >
          Back to exams in this set
        </Link>
        <Link
          href="/practice/comprehension/reading"
          className="ep-brutal-reading block bg-white py-3 text-center text-sm font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000]"
        >
          Back to levels
        </Link>
      </div>
    </div>
  );
}

function GeneratedExplanation({ block }: { block: Pick<ReadingExamResultRow, "question" | "correctAnswer"> }) {
  const { en, th } = buildFallbackReadingExplanation(block);
  return (
    <div className="mt-2 space-y-2 text-neutral-800">
      <p className="text-xs font-bold uppercase text-neutral-500">English</p>
      <p className="whitespace-pre-wrap">{en}</p>
      <p className="text-xs font-bold uppercase text-neutral-500">ไทย</p>
      <p className="whitespace-pre-wrap">{th}</p>
    </div>
  );
}

function VocabRow({
  round,
  difficulty,
  setNumber,
  examNumber,
  v,
}: {
  round: ReadingRoundNum;
  difficulty: ReadingDifficulty;
  setNumber: number;
  examNumber: number;
  v: ReadingExamUnit["highlightedVocab"][number];
}) {
  const [saved, setSaved] = useState(() =>
    isReadingVocabKeySaved(round, difficulty, setNumber, examNumber, v.word),
  );
  const [known, setKnown] = useState(() =>
    isReadingVocabKnown(round, difficulty, setNumber, examNumber, v.word),
  );

  if (known) return null;

  const save = async () => {
    if (saved) return;
    playBlinkBeep();
    try {
      await addNotebookEntry({
        source: "reading-comprehension",
        categoryIds: normalizeCategoryIds([NOTEBOOK_BUILTIN.all, NOTEBOOK_BUILTIN.vocabulary]),
        titleEn: v.word,
        titleTh: v.meaningTh,
        bodyEn: `${v.meaningEn}\n\nExample: ${v.example}`,
        bodyTh: `${v.meaningTh}\n\nตัวอย่าง: ${v.example}`,
        userNote: "#reading",
        excerpt: v.example.length > 100 ? `${v.example.slice(0, 100)}…` : v.example,
        attemptId: `reading-${setNumber}-e${examNumber}-${v.word}`,
      });
      markReadingVocabSaved(round, difficulty, setNumber, examNumber, v.word);
      setSaved(true);
    } catch {
      /* storage full — leave unsaved */
    }
  };

  const markKnown = () => {
    playBlinkBeep();
    markReadingVocabKnown(round, difficulty, setNumber, examNumber, v.word);
    setKnown(true);
  };

  return (
    <li className="flex flex-col gap-2 rounded-sm border-4 border-black bg-neutral-50 p-4 shadow-[3px_3px_0_0_#000]">
      <p className="text-lg font-black text-neutral-900">{v.word}</p>
      <p className="text-sm font-semibold text-neutral-800">{v.meaningEn}</p>
      <p className="text-sm text-neutral-600">{v.meaningTh}</p>
      <p className="ep-stat text-xs italic text-neutral-500">“{v.example}”</p>
      {saved ? (
        <span className="inline-flex w-fit items-center gap-1 border-2 border-emerald-700 bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-900">
          ✓ Saved to notebook
        </span>
      ) : (
        <div className="mt-1 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void save()}
            className="border-4 border-black bg-ep-blue py-2 text-xs font-black uppercase tracking-wide text-white shadow-[3px_3px_0_0_#000]"
          >
            Add to notebook
          </button>
          <button
            type="button"
            onClick={markKnown}
            className="border-4 border-black bg-white py-2 text-xs font-black uppercase tracking-wide shadow-[3px_3px_0_0_#000]"
          >
            I already know
          </button>
        </div>
      )}
    </li>
  );
}
