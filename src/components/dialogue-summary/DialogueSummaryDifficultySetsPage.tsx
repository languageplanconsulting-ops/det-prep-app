"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DIALOGUE_SUMMARY_DIFFICULTY_LABEL,
  DIALOGUE_SUMMARY_MAX_SCORE,
} from "@/lib/dialogue-summary-constants";
import {
  getDialogueSummaryProgress,
  loadDialogueSummaryVisibleBank,
} from "@/lib/dialogue-summary-storage";
import type { DialogueSummaryDifficulty, DialogueSummaryRoundNum } from "@/types/dialogue-summary";

export function DialogueSummaryDifficultySetsPage({
  round,
  difficulty,
}: {
  round: DialogueSummaryRoundNum;
  difficulty: DialogueSummaryDifficulty;
}) {
  const [bankVersion, setBankVersion] = useState(0);

  useEffect(() => {
    const onStorage = () => setBankVersion((n) => n + 1);
    window.addEventListener("storage", onStorage);
    window.addEventListener("ep-dialogue-summary-storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("ep-dialogue-summary-storage", onStorage);
    };
  }, []);

  return (
    <div className="space-y-8" id="sets">
      <div className="flex flex-wrap gap-3 text-sm font-bold text-ep-blue">
        <Link href="/practice/listening/dialogue-summary" className="hover:underline">
          ← All rounds
        </Link>
        <span className="text-neutral-300">·</span>
        <Link href={`/practice/listening/dialogue-summary/round/${round}`} className="hover:underline">
          Round {round}
        </Link>
        <span className="text-neutral-300">·</span>
        <Link href="/practice" className="hover:underline">
          Practice hub
        </Link>
      </div>

      <header className="ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.25em] text-ep-blue">
          Round {round} · {DIALOGUE_SUMMARY_DIFFICULTY_LABEL[difficulty]}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Dialogue → summary — sets</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Open a set to read the scenario and dialogue, then write your summary. Best score /{DIALOGUE_SUMMARY_MAX_SCORE}{" "}
          is saved per set.
        </p>
      </header>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black uppercase tracking-wide">Sets</h2>
          <Link
            href={`/practice/listening/dialogue-summary/round/${round}`}
            className="border-4 border-black bg-white px-3 py-2 text-sm font-bold shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            Change difficulty
          </Link>
        </div>
        <SetList round={round} difficulty={difficulty} bankVersion={bankVersion} />
      </section>
    </div>
  );
}

function SetList({
  round,
  difficulty,
  bankVersion,
}: {
  round: DialogueSummaryRoundNum;
  difficulty: DialogueSummaryDifficulty;
  bankVersion: number;
}) {
  const [bank, setBank] = useState(loadDialogueSummaryVisibleBank);

  useEffect(() => {
    setBank(loadDialogueSummaryVisibleBank());
  }, [difficulty, bankVersion, round]);

  const rows = bank[round][difficulty];
  const maxScore = DIALOGUE_SUMMARY_MAX_SCORE;

  return (
    <div className="ep-brutal overflow-hidden rounded-sm border-4 border-black bg-white shadow-[4px_4px_0_0_#000]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2 border-b-4 border-black bg-ep-yellow/30 px-4 py-2 ep-stat text-[10px] font-black uppercase tracking-widest text-neutral-800">
        <span>Set</span>
        <span className="text-right">Status</span>
        <span className="pl-2 text-right">Best</span>
      </div>
      <ul className="divide-y-4 divide-black">
        {rows.length === 0 ? (
          <li className="px-4 py-6 text-sm font-bold text-neutral-600">Coming soon</li>
        ) : rows.map((ex) => {
          const setNumber = ex.setNumber;
          const prog = getDialogueSummaryProgress(round, difficulty, setNumber);
          const scoreLine =
            prog != null ? (
              <span className="ep-stat font-bold text-ep-blue">
                {Math.round(prog.bestScore160)}/{maxScore}
              </span>
            ) : (
              <span className="ep-stat text-neutral-400">—</span>
            );
          const perfect = prog != null && Math.round(prog.bestScore160) >= maxScore;
          const href = `/practice/listening/dialogue-summary/round/${round}/${difficulty}/${setNumber}`;

          return (
            <li key={setNumber} className="border-b-4 border-black last:border-b-0">
              <Link
                href={href}
                className="ep-interactive grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-4 py-4 text-sm hover:bg-ep-yellow/20"
              >
                <div className="min-w-0">
                  <span className="block font-black text-neutral-900">Set {setNumber}</span>
                  <span className="ep-stat mt-0.5 block text-[10px] font-bold text-neutral-600">{ex.titleEn}</span>
                  <span className="ep-stat mt-0.5 block text-[10px] text-neutral-500">{ex.titleTh}</span>
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                  {perfect ? (
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-emerald-700 bg-emerald-100 text-sm font-black text-emerald-800"
                      title="Max score"
                    >
                      ✓
                    </span>
                  ) : null}
                  <span className="text-xs font-bold uppercase tracking-wide text-neutral-700">
                    {perfect ? "Max" : prog ? "Attempted" : "New"}
                  </span>
                </div>
                <span className="pl-2 text-right text-sm">{scoreLine}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
