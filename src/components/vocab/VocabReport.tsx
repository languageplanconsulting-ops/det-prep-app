"use client";

import Link from "next/link";
import { useState } from "react";
import {
  VOCAB_SESSION_LABEL,
  VOCAB_SESSION_MAX,
} from "@/lib/vocab-constants";
import { addNotebookEntry, NOTEBOOK_BUILTIN, normalizeCategoryIds } from "@/lib/notebook-storage";
import {
  isVocabWordNotebookSaved,
  markVocabWordNotebookSaved,
} from "@/lib/vocab-storage";
import { LANDING_PAGE_GRID_BG } from "@/lib/landing-page-visual";
import type {
  VocabExamResultRow,
  VocabPassageUnit,
  VocabRoundNum,
  VocabSessionLevel,
} from "@/types/vocab";

export function VocabReport({
  round,
  sessionLevel,
  setNumber,
  passageNumber,
  passage,
  rows,
  onRedeem,
  setListHref,
  bankHref,
}: {
  round: VocabRoundNum;
  sessionLevel: VocabSessionLevel;
  setNumber: number;
  passageNumber: number;
  passage: VocabPassageUnit;
  rows: VocabExamResultRow[];
  onRedeem: () => void;
  setListHref: string;
  bankHref: string;
}) {
  const maxScore = VOCAB_SESSION_MAX[sessionLevel];
  const correctCount = rows.filter((r) => r.isCorrect).length;
  const score = Math.round((correctCount / 6) * maxScore);

  return (
    <div className="min-h-screen bg-[#fafafa] text-neutral-900">
      <div className={`px-4 py-8 sm:px-6 sm:py-12 ${LANDING_PAGE_GRID_BG}`}>
        <div className="mx-auto max-w-[900px] space-y-8">
          <header className="ep-brutal-reading rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
            <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-ep-blue">
              Report — R{round} · {VOCAB_SESSION_LABEL[sessionLevel]} · Set {setNumber} · Passage {passageNumber}
            </p>
            <p className="ep-stat mt-4 text-2xl font-bold tracking-tight text-neutral-900">
              SCORE: {score}/{maxScore}
            </p>
            <p className="mt-2 text-sm text-neutral-600">
              {correctCount} of 6 correct · weighted by your chosen level.
            </p>
          </header>

          <section className="ep-brutal-reading rounded-sm border-4 border-black bg-white p-5 shadow-[4px_4px_0_0_#000]">
            <h2 className="text-lg font-black uppercase tracking-tight text-neutral-900">
              Question review
            </h2>
            <ul className="mt-6 space-y-6">
              {rows.map((r) => (
                <li
                  key={r.blankIndex}
                  className={`ep-brutal-reading rounded-sm border-4 p-5 shadow-[4px_4px_0_0_#000] ${
                    r.isCorrect
                      ? "border-emerald-600 bg-emerald-50/90"
                      : "border-red-600 bg-red-50/90"
                  }`}
                >
                  <p
                    className={`ep-stat text-xs font-bold uppercase tracking-[0.2em] ${
                      r.isCorrect ? "text-emerald-800" : "text-red-800"
                    }`}
                  >
                    Blank {r.blankIndex}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-neutral-900">{r.question}</p>
                  <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                    <div
                      className={`rounded-sm border-4 bg-white p-3 shadow-[2px_2px_0_0_#000] ${
                        r.isCorrect ? "border-emerald-700" : "border-red-700"
                      }`}
                    >
                      <p
                        className={`ep-stat text-[10px] font-bold uppercase ${
                          r.isCorrect ? "text-emerald-800" : "text-red-800"
                        }`}
                      >
                        Your answer
                      </p>
                      <p
                        className={`mt-1 font-medium ${
                          r.isCorrect ? "text-emerald-950" : "text-red-950"
                        }`}
                      >
                        {r.userAnswer || "—"}
                      </p>
                    </div>
                    <div className="rounded-sm border-4 border-black bg-ep-yellow/35 p-3 shadow-[2px_2px_0_0_#000]">
                      <p className="ep-stat text-[10px] font-bold uppercase text-neutral-700">
                        Correct answer
                      </p>
                      <p className="mt-1 font-medium text-neutral-900">{r.correctAnswer}</p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-sm border-4 border-black bg-white p-3 text-sm shadow-[2px_2px_0_0_#000]">
                    <p className="font-bold text-ep-blue">Explanation (ไทย)</p>
                    <p className="mt-2 whitespace-pre-wrap text-neutral-800">{r.explanationThai}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="ep-brutal-reading rounded-sm border-4 border-black bg-white p-5 shadow-[4px_4px_0_0_#000]">
            <h2 className="text-lg font-black uppercase tracking-tight text-neutral-900">
              Correct words & synonyms
            </h2>
            <ul className="mt-4 space-y-4">
              {passage.correctWords.map((cw, i) => (
                <WordNotebookRow
                  key={cw.word + i}
                  round={round}
                  setNumber={setNumber}
                  passageNumber={passageNumber}
                  entry={cw}
                />
              ))}
            </ul>
          </section>

          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={onRedeem}
              className="ep-redeem-pulse ep-brutal-reading w-full border-4 border-black bg-ep-yellow py-4 text-center text-lg font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000] transition hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_0_#000]"
            >
              Redeem yourself
            </button>
            <Link
              href={setListHref}
              className="ep-brutal-reading block border-4 border-black bg-neutral-100 py-3 text-center text-sm font-black uppercase tracking-wide text-neutral-900 shadow-[4px_4px_0_0_#000] transition hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_0_#000]"
            >
              Back to passages in this set
            </Link>
            <Link
              href={bankHref}
              className="ep-brutal-reading block border-4 border-black bg-white py-3 text-center text-sm font-black uppercase tracking-wide text-neutral-900 shadow-[4px_4px_0_0_#000] transition hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_0_#000]"
            >
              Back to levels
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function WordNotebookRow({
  round,
  setNumber,
  passageNumber,
  entry,
}: {
  round: VocabRoundNum;
  setNumber: number;
  passageNumber: number;
  entry: VocabPassageUnit["correctWords"][number];
}) {
  const [saved, setSaved] = useState(() =>
    isVocabWordNotebookSaved(round, setNumber, passageNumber, entry.word),
  );

  const synText =
    entry.synonyms.length > 0 ? entry.synonyms.join(", ") : "—";

  const save = () => {
    if (saved) return;
    try {
      addNotebookEntry({
        source: "vocabulary-comprehension",
        categoryIds: normalizeCategoryIds([NOTEBOOK_BUILTIN.all, NOTEBOOK_BUILTIN.vocabulary]),
        titleEn: entry.word,
        titleTh: entry.word,
        bodyEn: `Synonyms: ${synText}`,
        bodyTh: `คำเหมือน/ใกล้เคียง: ${synText}`,
        userNote: "",
        excerpt: synText.length > 80 ? `${synText.slice(0, 80)}…` : synText,
        attemptId: `vocab-${setNumber}-p${passageNumber}-${entry.word}`,
      });
      markVocabWordNotebookSaved(round, setNumber, passageNumber, entry.word);
      setSaved(true);
    } catch {
      /* ignore */
    }
  };

  return (
    <li className="ep-brutal-reading rounded-sm border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
      <p className="text-lg font-black text-neutral-900">{entry.word}</p>
      <p className="mt-2 text-sm text-neutral-700">
        <span className="font-bold">Synonyms: </span>
        <span className="ep-stat">{synText}</span>
      </p>
      <button
        type="button"
        onClick={save}
        className={`mt-3 border-4 border-black px-3 py-2 text-xs font-black uppercase shadow-[4px_4px_0_0_#000] ${
          saved ? "bg-green-600 text-white" : "bg-ep-yellow text-black"
        }`}
      >
        {saved ? "Saved!" : "Add to notebook"}
      </button>
    </li>
  );
}
