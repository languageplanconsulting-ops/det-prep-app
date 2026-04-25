"use client";

import { useEffect, useState } from "react";
import { FreeQuotaLockedLink } from "@/components/practice/FreeQuotaLockedLink";
import { FITB_MAX_SCORE, fitbMaxScore } from "@/lib/fitb-constants";
import { getFitbProgress, loadFitbVisibleBank } from "@/lib/fitb-storage";
import type { FitbDifficulty, FitbRoundNum } from "@/types/fitb";

function isComplete(
  prog: ReturnType<typeof getFitbProgress>,
  blankCount: number,
  difficulty: FitbDifficulty,
): boolean {
  if (!prog) return false;
  const cap = fitbMaxScore(difficulty);
  if (Math.round(prog.bestScore) >= cap) return true;
  if (
    prog.lastBlankOk &&
    prog.lastBlankOk.length === blankCount &&
    prog.lastBlankOk.every(Boolean)
  ) {
    return true;
  }
  return false;
}

export function FitbSetGrid({
  round,
  difficulty,
  bankVersion,
}: {
  round: FitbRoundNum;
  difficulty: FitbDifficulty;
  bankVersion: number;
}) {
  const [rows, setRows] = useState(() => loadFitbVisibleBank()[round][difficulty]);

  useEffect(() => {
    setRows(loadFitbVisibleBank()[round][difficulty]);
  }, [round, difficulty, bankVersion]);

  const cap = FITB_MAX_SCORE[difficulty];

  if (rows.length === 0) {
    return (
      <div className="ep-brutal rounded-sm border-4 border-black bg-neutral-100 p-6 shadow-[4px_4px_0_0_#000]">
        <p className="text-lg font-black text-neutral-800">COMING SOON</p>
        <p className="mt-2 text-sm text-neutral-600">
          No uploaded sets for this round and level yet.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {rows.map((set) => {
        const setNumber = set.setNumber;
        const n = set.missingWords.length;
        const prog = getFitbProgress(round, difficulty, setNumber);
        const scoreLine = prog ? `SCORE: ${Math.round(prog.bestScore)}/${cap}` : `SCORE: —/${cap}`;
        const complete = isComplete(prog, n, difficulty);
        const needsRedeem =
          !!prog &&
          !complete &&
          !!prog.lastBlankOk &&
          prog.lastBlankOk.some((x) => !x);
        const href = needsRedeem
          ? `/practice/literacy/fill-in-blank/round/${round}/${difficulty}/${setNumber}?redeem=1`
          : `/practice/literacy/fill-in-blank/round/${round}/${difficulty}/${setNumber}`;

        return (
          <FreeQuotaLockedLink
            key={setNumber}
            href={href}
            exam="fitb"
            className="ep-interactive ep-brutal relative block rounded-sm border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000] hover:bg-ep-yellow/15"
          >
            {needsRedeem ? (
              <span className="absolute right-2 top-2 border-2 border-black bg-ep-yellow px-1.5 py-0.5 text-[9px] font-black uppercase">
                Redeem
              </span>
            ) : null}
            {complete ? (
              <span
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-emerald-700 bg-emerald-100 text-sm font-black text-emerald-800"
                title="Completed"
              >
                ✓
              </span>
            ) : null}
            <p className="ep-stat text-[10px] font-bold uppercase tracking-widest text-ep-blue">{set.setId}</p>
            <p className="mt-1 text-xl font-black">Set {setNumber}</p>
            <p className="ep-stat mt-2 text-xs font-bold text-neutral-800">{scoreLine}</p>
            <p className="mt-1 text-[10px] text-neutral-500">
              {n} blank{n === 1 ? "" : "s"} · {set.cefrLevel}
            </p>
          </FreeQuotaLockedLink>
        );
      })}
    </div>
  );
}
