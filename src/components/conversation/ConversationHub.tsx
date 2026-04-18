"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CONVERSATION_FULL_SCORE,
  CONVERSATION_ROUND_COUNT,
  CONVERSATION_DIFFICULTIES,
  CONVERSATION_TOTAL_STEPS,
} from "@/lib/conversation-constants";
import { filterConversationExamsForPractice } from "@/lib/conversation-practice-filter";
import {
  conversationMaxForExam,
  getConversationProgress,
  loadConversationBank,
} from "@/lib/conversation-storage";
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

function roundCompletionCount(round: number): { done: number; total: number } {
  const bank = loadConversationBank();
  let total = 0;
  let done = 0;
  for (const d of CONVERSATION_DIFFICULTIES) {
    const exams = filterConversationExamsForPractice(bank[round]?.[d]);
    for (const exam of exams) {
      total++;
      const maxScore = conversationMaxForExam(exam);
      const prog = getConversationProgress(round, d, exam.setNumber);
      if (isComplete(prog, maxScore)) done++;
    }
  }
  return { done, total };
}

export function ConversationHub() {
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

  return (
    <div className="space-y-8">
      <header className="ep-panel-luxury ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.25em] text-ep-blue">
          Listening · Interactive conversation
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Interactive conversation</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Pick a <strong>round</strong> to open its question bank — no extra steps. Each set is scenario listening, then
          dialogue with TTS from each question&apos;s{" "}
          <code className="rounded bg-neutral-100 px-1 ep-stat text-[10px]">transcript</code> field.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-black uppercase tracking-wide">Rounds · question banks</h2>
        <RoundGrid key={bankVersion} />
      </section>
    </div>
  );
}

function RoundGrid() {
  const bank = loadConversationBank();
  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: CONVERSATION_ROUND_COUNT }, (_, i) => i + 1).map((round) => {
        const { done, total } = roundCompletionCount(round);
        const easyN = filterConversationExamsForPractice(bank[round]?.easy).length;
        const medN = filterConversationExamsForPractice(bank[round]?.medium).length;
        const setCount = easyN + medN;
        const href = `/practice/listening/interactive/${round}`;
        return (
          <Link
            key={round}
            href={href}
            className="ep-btn-luxury ep-interactive ep-brutal flex min-h-[10.5rem] flex-col rounded-sm border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000] hover:bg-ep-yellow/25"
          >
            <span className="text-lg font-black leading-tight">Round {round}</span>
            <span className="ep-stat mt-2 text-[11px] font-bold text-neutral-600">
              {setCount === 0 ? "No sets yet" : `${setCount} set${setCount === 1 ? "" : "s"} in bank`}
            </span>
            <span className="ep-stat mt-1 text-[10px] font-bold text-neutral-500">
              Full score · {CONVERSATION_FULL_SCORE} pts per set
            </span>
            <span className="mt-auto pt-3 ep-stat text-[10px] font-black uppercase text-ep-blue">
              Progress · {total === 0 ? "—" : `${done}/${total}`}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
