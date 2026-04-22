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

function extractTopicLabel(setId: string): string {
  const raw = setId.match(/_TOPIC_(.+)$/i)?.[1] ?? "";
  if (!raw) return "Untitled topic";
  return raw
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

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
  const playedRows = rows.filter((ws) => getRealWordProgress(round, difficulty, ws.setNumber) != null);
  const perfectRows = rows.filter((ws) => {
    const progress = getRealWordProgress(round, difficulty, ws.setNumber);
    return progress != null && Math.round(progress.bestScore) >= maxScore;
  });
  const newRows = rows.length - playedRows.length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="ep-brutal rounded-sm border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
          <p className="ep-stat text-[10px] font-black uppercase tracking-[0.25em] text-neutral-500">Sets in bank</p>
          <p className="mt-2 text-4xl font-black text-neutral-900">{rows.length}</p>
          <p className="mt-1 text-xs font-bold text-neutral-600">Admin-uploaded sets available for this level.</p>
        </div>
        <div className="ep-brutal rounded-sm border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
          <p className="ep-stat text-[10px] font-black uppercase tracking-[0.25em] text-neutral-500">Played</p>
          <p className="mt-2 text-4xl font-black text-ep-blue">{playedRows.length}</p>
          <p className="mt-1 text-xs font-bold text-neutral-600">Sets where you already have a recorded score.</p>
        </div>
        <div className="ep-brutal rounded-sm border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
          <p className="ep-stat text-[10px] font-black uppercase tracking-[0.25em] text-neutral-500">Maxed</p>
          <p className="mt-2 text-4xl font-black text-emerald-700">{perfectRows.length}</p>
          <p className="mt-1 text-xs font-bold text-neutral-600">Sets where you already reached {maxScore}/{maxScore}.</p>
        </div>
      </section>

      <section className="ep-brutal overflow-hidden rounded-sm border-4 border-black bg-white shadow-[4px_4px_0_0_#000]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-black bg-[linear-gradient(90deg,#fff1a8_0%,#fff7d1_55%,#ffffff_100%)] px-5 py-4">
          <div>
            <p className="text-lg font-black uppercase tracking-wide text-neutral-900">Exam bank</p>
            <p className="mt-1 text-xs font-bold text-neutral-600">
              Open any set to practice. Highest score per set is saved here.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="border-2 border-black bg-white px-2 py-1 text-[10px] font-black uppercase shadow-[2px_2px_0_0_#000]">
              {newRows} new
            </span>
            <span className="border-2 border-black bg-ep-yellow px-2 py-1 text-[10px] font-black uppercase shadow-[2px_2px_0_0_#000]">
              Max score {maxScore}
            </span>
          </div>
        </div>
        <ul className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.length === 0 ? (
          <li className="px-1 py-4 text-sm font-bold text-neutral-600">
            COMING SOON — no admin-uploaded sets here yet.
          </li>
        ) : (
          rows.map((ws) => {
            const setNumber = ws.setNumber;
            const prog = getRealWordProgress(round, difficulty, setNumber);
            const topicLabel = extractTopicLabel(ws.setId);
            const perfect = prog != null && Math.round(prog.bestScore) >= maxScore;
            const needsRedeem = prog != null && !perfect;
            const href = `/practice/literacy/real-word/round/${round}/${difficulty}/${setNumber}`;
            const realCount = ws.words.filter((w) => w.is_real).length;
            const fakeCount = ws.words.length - realCount;
            const statusText = perfect ? "Maxed" : prog ? "Played" : "New";
            const statusClass = perfect
              ? "bg-emerald-100 text-emerald-900"
              : prog
                ? "bg-ep-yellow text-neutral-900"
                : "bg-white text-neutral-900";

            return (
              <li key={setNumber}>
                <Link
                  href={href}
                  className="ep-interactive block h-full rounded-sm border-4 border-black bg-white p-5 text-sm shadow-[4px_4px_0_0_#000] transition-colors hover:bg-ep-yellow/15"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-lg font-black text-neutral-900">Set {setNumber}</p>
                      <p className="mt-1 line-clamp-2 text-sm font-bold text-neutral-700">{topicLabel}</p>
                      <p className="ep-stat mt-1 text-[10px] font-bold text-neutral-500">{ws.setId}</p>
                    </div>
                    <span className={`border-2 border-black px-2 py-1 text-[10px] font-black uppercase shadow-[2px_2px_0_0_#000] ${statusClass}`}>
                      {statusText}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="border-2 border-black bg-neutral-50 px-3 py-2">
                      <p className="ep-stat text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500">Words</p>
                      <p className="mt-1 text-xl font-black text-neutral-900">{ws.words.length}</p>
                    </div>
                    <div className="border-2 border-black bg-neutral-50 px-3 py-2">
                      <p className="ep-stat text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500">Real</p>
                      <p className="mt-1 text-xl font-black text-ep-blue">{realCount}</p>
                    </div>
                    <div className="border-2 border-black bg-neutral-50 px-3 py-2">
                      <p className="ep-stat text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500">Fake</p>
                      <p className="mt-1 text-xl font-black text-red-700">{fakeCount}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="ep-stat text-[10px] font-black uppercase tracking-[0.24em] text-neutral-500">
                        High score
                      </p>
                      <p className="mt-1 text-2xl font-black text-neutral-900">
                        {prog ? Math.round(prog.bestScore) : "—"}
                        <span className="ml-1 text-sm font-bold text-neutral-400">/{maxScore}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      {needsRedeem ? (
                        <span className="mb-2 inline-flex border-2 border-black bg-ep-yellow px-2 py-1 text-[10px] font-black uppercase shadow-[2px_2px_0_0_#000]">
                          Redeem
                        </span>
                      ) : null}
                      <p className="text-xs font-black uppercase tracking-wide text-neutral-700">
                        {perfect ? "Perfect run" : prog ? "Replay set" : "Start set"}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })
        )}
        </ul>
      </section>
    </div>
  );
}
