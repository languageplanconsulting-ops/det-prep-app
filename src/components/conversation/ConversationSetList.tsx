"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CONVERSATION_DIFFICULTY_LABEL,
  CONVERSATION_MAX_SCORE,
  CONVERSATION_TOTAL_STEPS,
} from "@/lib/conversation-constants";
import { filterConversationExamsForPractice } from "@/lib/conversation-practice-filter";
import {
  conversationMaxForExam,
  getConversationProgress,
  loadConversationBank,
} from "@/lib/conversation-storage";
import { buildDefaultConversationBank } from "@/lib/conversation-default-data";
import type { ConversationDifficulty } from "@/types/conversation";

function isComplete(
  prog: ReturnType<typeof getConversationProgress>,
  maxScore: number,
): boolean {
  if (!prog) return false;
  if (Math.round(prog.bestScore) >= maxScore) return true;
  const ok = prog.lastItemOk;
  if (ok && ok.length === CONVERSATION_TOTAL_STEPS && ok.every(Boolean)) {
    return true;
  }
  return false;
}

function needsRedeem(
  prog: ReturnType<typeof getConversationProgress>,
  complete: boolean,
): boolean {
  if (!prog || complete) return false;
  return prog.lastItemOk?.some((x) => !x) ?? false;
}

function audioCoverage(exam: {
  scenarioAudioBase64?: string;
  scenarioAudioInIndexedDb?: boolean;
  scenarioQuestions: { audioBase64?: string; audioInIndexedDb?: boolean }[];
  mainQuestions: { audioBase64?: string; audioInIndexedDb?: boolean }[];
}): { covered: number; total: number } {
  const total = 1 + exam.scenarioQuestions.length + exam.mainQuestions.length;
  let covered =
    Boolean(exam.scenarioAudioBase64?.trim()) || Boolean(exam.scenarioAudioInIndexedDb) ? 1 : 0;
  covered += exam.scenarioQuestions.filter(
    (q) => Boolean(q.audioBase64?.trim()) || Boolean(q.audioInIndexedDb),
  ).length;
  covered += exam.mainQuestions.filter(
    (q) => Boolean(q.audioBase64?.trim()) || Boolean(q.audioInIndexedDb),
  ).length;
  return { covered, total };
}

export function ConversationSetList({
  round,
  difficulty,
}: {
  round: number;
  difficulty: ConversationDifficulty;
}) {
  const [bankVersion, setBankVersion] = useState(0);

  useEffect(() => {
    const bump = () => setBankVersion((n) => n + 1);
    window.addEventListener("storage", bump);
    window.addEventListener("ep-conversation-storage", bump);
    return () => {
      window.removeEventListener("storage", bump);
      window.removeEventListener("ep-conversation-storage", bump);
    };
  }, []);

  const [bank, setBank] = useState(buildDefaultConversationBank);

  useEffect(() => {
    setBank(loadConversationBank());
  }, [difficulty, bankVersion]);

  const rows = filterConversationExamsForPractice(bank[round]?.[difficulty]).sort(
    (a, b) => a.setNumber - b.setNumber,
  );
  const levelMax = CONVERSATION_MAX_SCORE[difficulty];
  const hubHref = "/practice/listening/interactive";
  const roundHref = `/practice/listening/interactive/${round}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={roundHref}
          className="ep-interactive text-sm font-bold uppercase tracking-wide text-ep-blue underline-offset-2 hover:underline"
        >
          ← Round {round}
        </Link>
        <Link
          href={hubHref}
          className="ep-interactive text-xs font-bold uppercase text-neutral-500 underline-offset-2 hover:underline"
        >
          Hub
        </Link>
      </div>

      <header className="ep-panel-luxury ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.25em] text-ep-blue">
          Round {round} · {CONVERSATION_DIFFICULTY_LABEL[difficulty]}
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">Sets</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Max scores follow each set (default {levelMax} pts for this level). Open with{" "}
          <strong>REDEEM</strong> when you still have mistakes to fix.
        </p>
      </header>

      <div className="ep-panel-luxury ep-brutal overflow-hidden rounded-sm border-4 border-black bg-white shadow-[4px_4px_0_0_#000]">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2 border-b-4 border-black bg-ep-yellow/30 px-4 py-2 ep-stat text-[10px] font-black uppercase tracking-widest text-neutral-800">
          <span>Set</span>
          <span className="text-right">Status</span>
          <span className="pl-2 text-right">Score</span>
        </div>
        <ul className="divide-y-4 divide-black">
          {rows.length === 0 ? (
            <li className="px-4 py-6 text-sm font-bold text-neutral-600">
              No sets for this level yet — content appears after admin upload.
            </li>
          ) : (
            rows.map((exam) => {
              const setNumber = exam.setNumber;
              const examMax = conversationMaxForExam(exam);
              const prog = getConversationProgress(round, difficulty, setNumber);
              const complete = isComplete(prog, examMax);
              const redeem = needsRedeem(prog, complete);
              const href = redeem
                ? `/practice/listening/interactive/${round}/${difficulty}/${setNumber}?redeem=1`
                : `/practice/listening/interactive/${round}/${difficulty}/${setNumber}`;

              const scoreCell =
                prog != null ? (
                  <span className="ep-stat font-bold text-ep-blue">
                    {Math.round(prog.bestScore)}/{examMax}
                  </span>
                ) : (
                  <span className="ep-stat text-neutral-400">—</span>
                );

              const cov = audioCoverage(exam);
              return (
                <li key={exam.id} className="border-b-4 border-black last:border-b-0">
                  <Link
                    href={href}
                    className="ep-btn-luxury ep-interactive grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-4 py-4 text-sm hover:bg-ep-yellow/20"
                  >
                    <div className="min-w-0">
                      <span className="block font-black text-neutral-900">Set {setNumber}</span>
                      <span className="ep-stat mt-0.5 line-clamp-2 block text-[10px] font-bold text-neutral-600">
                        {exam.title}
                      </span>
                      <span className="ep-stat mt-1 block text-[10px] font-bold text-neutral-500">
                        Audio {cov.covered}/{cov.total} lines
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right">
                      {redeem ? (
                        <span className="border-2 border-black bg-ep-yellow px-1.5 py-0.5 text-[9px] font-black uppercase">
                          Redeem
                        </span>
                      ) : null}
                      {complete ? (
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-emerald-700 bg-emerald-100 text-sm font-black text-emerald-800"
                          title="Completed"
                        >
                          ✓
                        </span>
                      ) : null}
                      <span className="text-xs font-bold uppercase tracking-wide text-neutral-700">
                        {complete ? "Done" : prog ? "In progress" : "Start"}
                      </span>
                    </div>
                    <span className="pl-2 text-right text-sm">{scoreCell}</span>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
