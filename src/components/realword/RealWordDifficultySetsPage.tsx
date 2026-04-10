"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  REALWORD_DIFFICULTY_LABEL,
  REALWORD_MAX_SCORE,
} from "@/lib/realword-constants";
import { getRealWordProgress, loadRealWordVisibleBank } from "@/lib/realword-storage";
import { defaultRealWordFullBank } from "@/lib/realword-default-data";
import type { RealWordDifficulty, RealWordRoundNum } from "@/types/realword";

export function RealWordDifficultySetsPage({
  round,
  difficulty,
}: {
  round: RealWordRoundNum;
  difficulty: RealWordDifficulty;
}) {
  const [bankVersion, setBankVersion] = useState(0);

  useEffect(() => {
    const onStorage = () => setBankVersion((n) => n + 1);
    window.addEventListener("storage", onStorage);
    window.addEventListener("ep-realword-storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("ep-realword-storage", onStorage);
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3 text-sm font-bold text-ep-blue">
        <Link href={`/practice/literacy/real-word/round/${round}`} className="hover:underline">
          ← Round {round} levels
        </Link>
        <span className="text-neutral-300">·</span>
        <Link href="/practice/literacy/real-word" className="hover:underline">
          All rounds
        </Link>
        <span className="text-neutral-300">·</span>
        <Link href="/practice" className="hover:underline">
          Practice hub
        </Link>
      </div>

      <header className="ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.25em] text-ep-blue">
          Round {round} · {REALWORD_DIFFICULTY_LABEL[difficulty]}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Sets</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Open a set to play. High score and redeem status update after you submit a run.
        </p>
      </header>

      <SetList round={round} difficulty={difficulty} bankVersion={bankVersion} />
    </div>
  );
}

function SetList({
  round,
  difficulty,
  bankVersion,
}: {
  round: RealWordRoundNum;
  difficulty: RealWordDifficulty;
  bankVersion: number;
}) {
  const [bank, setBank] = useState(defaultRealWordFullBank);

  useEffect(() => {
    setBank(loadRealWordVisibleBank());
  }, [difficulty, bankVersion, round]);

  const rows = bank[round][difficulty];
  const maxScore = REALWORD_MAX_SCORE[difficulty];

  return (
    <div className="ep-brutal overflow-hidden rounded-sm border-4 border-black bg-white shadow-[4px_4px_0_0_#000]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2 border-b-4 border-black bg-ep-yellow/30 px-4 py-2 ep-stat text-[10px] font-black uppercase tracking-widest text-neutral-800">
        <span>Set</span>
        <span className="text-right">Status</span>
        <span className="pl-2 text-right">High score</span>
      </div>
      <ul className="divide-y-4 divide-black">
        {rows.length === 0 ? (
          <li className="px-4 py-6 text-sm font-bold text-neutral-600">COMING SOON — no admin-uploaded sets here yet.</li>
        ) : (
          rows.map((ws) => {
            const setNumber = ws.setNumber;
            const prog = getRealWordProgress(round, difficulty, setNumber);
            const scoreLine =
              prog != null ? (
                <span className="ep-stat font-bold text-ep-blue">
                  {Math.round(prog.bestScore)}/{maxScore}
                </span>
              ) : (
                <span className="ep-stat text-neutral-400">—</span>
              );
            const perfect = prog != null && Math.round(prog.bestScore) >= maxScore;
            const needsRedeem = prog != null && !perfect;
            const href = `/practice/literacy/real-word/round/${round}/${difficulty}/${setNumber}`;

            return (
              <li key={setNumber} className="border-b-4 border-black last:border-b-0">
                <Link
                  href={href}
                  className="ep-interactive grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-4 py-4 text-sm hover:bg-ep-yellow/20"
                >
                  <div className="min-w-0">
                    <span className="block font-black text-neutral-900">Set {setNumber}</span>
                    <span className="ep-stat mt-0.5 block text-[10px] font-bold text-neutral-600">{ws.setId}</span>
                    <span className="ep-stat mt-0.5 block text-[10px] text-neutral-500">
                      {ws.words.length} words · {ws.words.filter((w) => w.is_real).length} real
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-right">
                    {needsRedeem ? (
                      <span className="border-2 border-black bg-ep-yellow px-1.5 py-0.5 text-[9px] font-black uppercase">
                        Redeem
                      </span>
                    ) : null}
                    {perfect ? (
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-emerald-700 bg-emerald-100 text-sm font-black text-emerald-800"
                        title="Max score"
                      >
                        ✓
                      </span>
                    ) : null}
                    <span className="text-xs font-bold uppercase tracking-wide text-neutral-700">
                      {perfect ? "Max" : prog ? "Played" : "New"}
                    </span>
                  </div>
                  <span className="pl-2 text-right text-sm">{scoreLine}</span>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
