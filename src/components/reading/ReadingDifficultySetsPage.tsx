"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { READING_DIFFICULTY_LABEL, READING_DIFFICULTY_MAX } from "@/lib/reading-constants";
import { getReadingExamProgress, loadReadingVisibleBank } from "@/lib/reading-storage";
import type { ReadingDifficulty, ReadingRoundNum } from "@/types/reading";

export function ReadingDifficultySetsPage({
  round,
  difficulty,
}: {
  round: ReadingRoundNum;
  difficulty: ReadingDifficulty;
}) {
  const [bankVersion, setBankVersion] = useState(0);

  useEffect(() => {
    const onStorage = () => setBankVersion((n) => n + 1);
    window.addEventListener("storage", onStorage);
    window.addEventListener("ep-reading-storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("ep-reading-storage", onStorage);
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3 text-sm font-bold text-ep-blue">
        <Link href="/practice/comprehension/reading" className="hover:underline">
          ← All rounds
        </Link>
        <span className="text-neutral-300">·</span>
        <Link href={`/practice/comprehension/reading/round/${round}`} className="hover:underline">
          Round {round}
        </Link>
        <span className="text-neutral-300">·</span>
        <Link href="/practice" className="hover:underline">
          Practice hub
        </Link>
      </div>

      <header className="ep-brutal-reading rounded-sm bg-white p-6">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-ep-blue">
          Round {round} · {READING_DIFFICULTY_LABEL[difficulty]}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Reading questions</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Choose a question directly. No set selection step.
        </p>
      </header>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black uppercase tracking-wide">Questions</h2>
          <Link
            href={`/practice/comprehension/reading/round/${round}`}
            className="border-4 border-black bg-white px-3 py-2 text-sm font-bold shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            Change difficulty
          </Link>
        </div>
        <QuestionGrid round={round} difficulty={difficulty} bankVersion={bankVersion} />
      </section>
    </div>
  );
}

function QuestionGrid({
  round,
  difficulty,
  bankVersion,
}: {
  round: ReadingRoundNum;
  difficulty: ReadingDifficulty;
  bankVersion: number;
}) {
  const [bank, setBank] = useState(loadReadingVisibleBank);
  const maxScore = READING_DIFFICULTY_MAX[difficulty];

  useEffect(() => {
    setBank(loadReadingVisibleBank());
  }, [round, difficulty, bankVersion]);

  const sets = bank[round][difficulty];
  const flat = sets.flatMap((set) =>
    set.exams.map((exam, index) => ({
      setNumber: set.setNumber,
      examNumber: index + 1,
      title: exam.titleEn?.trim() || `Question ${index + 1}`,
    })),
  );

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {flat.length === 0 ? (
        <div className="ep-brutal-reading col-span-full rounded-sm bg-neutral-100 p-4 text-sm font-bold text-neutral-600">
          COMING SOON
        </div>
      ) : (
        flat.map((item, idx) => {
          const prog = getReadingExamProgress(round, difficulty, item.setNumber, item.examNumber);
          const href = `/practice/comprehension/reading/round/${round}/${difficulty}/${item.setNumber}/${item.examNumber}`;
          return (
            <Link
              key={`${item.setNumber}-${item.examNumber}`}
              href={href}
              className="ep-interactive ep-brutal-reading block rounded-sm bg-white p-4 hover:bg-ep-yellow/25"
            >
              <p className="text-lg font-black">Question {idx + 1}</p>
              <p className="mt-1 text-xs font-semibold text-neutral-600 line-clamp-2">{item.title}</p>
              <p className="ep-stat mt-2 text-xs text-neutral-600">
                {prog ? `Best: ${prog.bestScore}/${maxScore}` : "Not attempted yet"}
              </p>
            </Link>
          );
        })
      )}
    </div>
  );
}
