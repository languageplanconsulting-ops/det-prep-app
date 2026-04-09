"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DICTATION_MAX_SCORE,
  DICTATION_SET_COUNT,
} from "@/lib/dictation-constants";
import { defaultDictationFullBank } from "@/lib/dictationData";
import {
  ensureDictationBankReady,
  getDictationProgress,
  loadDictationBank,
} from "@/lib/dictation-storage";
import type { DictationDifficulty, DictationRoundNum } from "@/types/dictation";

export function DictationSetGrid({
  round,
  difficulty,
  bankVersion,
}: {
  round: DictationRoundNum;
  difficulty: DictationDifficulty;
  bankVersion: number;
}) {
  const [bank, setBank] = useState(() => defaultDictationFullBank());

  useEffect(() => {
    void (async () => {
      await ensureDictationBankReady();
      setBank(loadDictationBank());
    })();
  }, [round, difficulty, bankVersion]);

  const rows = bank[round][difficulty];
  const cap = DICTATION_MAX_SCORE[difficulty];

  if (rows.length === 0) {
    return (
      <div className="ep-brutal rounded-sm border-4 border-black bg-neutral-100 p-6 shadow-[4px_4px_0_0_#000]">
        <p className="text-lg font-black text-neutral-800">Coming soon</p>
        <p className="mt-2 text-sm text-neutral-600">
          No uploaded dictation sets for this round and level yet.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: DICTATION_SET_COUNT }, (_, i) => i + 1).map((setNumber) => {
        const set = rows.find((s) => s.setNumber === setNumber);
        const prog = getDictationProgress(round, difficulty, setNumber);
        const scoreLine = prog ? `SCORE: ${Math.round(prog.bestScore)}/${cap}` : `SCORE: —/${cap}`;
        const complete = prog != null && prog.bestScore >= prog.maxScore;
        const href = `/practice/literacy/dictation/round/${round}/${difficulty}/${setNumber}`;

        if (!set) {
          return (
            <div
              key={setNumber}
              className="ep-brutal rounded-sm border-4 border-black bg-neutral-100 p-4 opacity-60 shadow-[4px_4px_0_0_#000]"
            >
              <p className="font-black">Set {setNumber}</p>
              <p className="mt-2 text-xs font-bold text-neutral-500">No data</p>
            </div>
          );
        }

        return (
          <Link
            key={setNumber}
            href={href}
            className="ep-interactive ep-brutal relative block rounded-sm border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000] hover:bg-ep-yellow/15"
          >
            {complete ? (
              <span
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-emerald-700 bg-emerald-100 text-sm font-black text-emerald-800"
                title="Completed"
              >
                ✓
              </span>
            ) : null}
            <p className="mt-1 text-xl font-black">Set {setNumber}</p>
            <p className="ep-stat mt-2 text-xs font-bold text-neutral-800">{scoreLine}</p>
            <p className="mt-1 text-[10px] text-neutral-500 truncate" title={set.hintText}>
              {set.hintText}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
