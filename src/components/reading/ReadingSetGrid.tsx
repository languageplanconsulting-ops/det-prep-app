"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { defaultReadingFullBank } from "@/lib/reading-default-data";
import {
  getReadingSetBestAcrossExams,
  loadReadingVisibleBank,
} from "@/lib/reading-storage";
import type { ReadingDifficulty, ReadingRoundNum } from "@/types/reading";

export function ReadingSetGrid({
  round,
  difficulty,
  bankVersion,
}: {
  round: ReadingRoundNum;
  difficulty: ReadingDifficulty;
  bankVersion: number;
}) {
  const [bank, setBank] = useState(() => defaultReadingFullBank());

  useEffect(() => {
    setBank(loadReadingVisibleBank());
  }, [round, difficulty, bankVersion]);

  const rows = bank[round][difficulty];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {rows.length === 0 ? (
        <div className="ep-brutal-reading col-span-full rounded-sm bg-neutral-100 p-4 text-sm font-bold text-neutral-600">
          COMING SOON
        </div>
      ) : rows.map((set) => {
        const setNum = set.setNumber;
        const prog = set
          ? getReadingSetBestAcrossExams(round, difficulty, setNum, set.exams.length)
          : null;
        const href = `/practice/comprehension/reading/round/${round}/${difficulty}/${setNum}`;
        const scoreLine =
          prog != null ? (
            <span className="ep-stat text-sm font-bold text-ep-blue">
              High score: {prog.bestScore}/{prog.maxScore}
              {prog.bestScore < prog.maxScore ? (
                <span className="mt-1 block text-[10px] font-bold uppercase text-neutral-600">
                  Redeem for full max →
                </span>
              ) : null}
            </span>
          ) : (
            <span className="ep-stat text-sm text-neutral-500">High score: —</span>
          );

        const inner = (
          <>
            <span className="block text-xl font-black">Set {setNum}</span>
            {set ? (
              <span className="mt-1 block text-xs font-semibold text-neutral-600">
                {set.exams.length} exam{set.exams.length === 1 ? "" : "s"}
              </span>
            ) : null}
            <div className="mt-3">{scoreLine}</div>
          </>
        );

        return (
          <Link
            key={setNum}
            href={href}
            className="ep-interactive ep-brutal-reading block rounded-sm bg-white p-4 hover:bg-ep-yellow/25"
          >
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
