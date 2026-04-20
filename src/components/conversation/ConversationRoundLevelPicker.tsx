"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CONVERSATION_DIFFICULTY_LABEL, CONVERSATION_FULL_SCORE, CONVERSATION_TOTAL_STEPS } from "@/lib/conversation-constants";
import { filterConversationExamsForPractice } from "@/lib/conversation-practice-filter";
import {
  conversationMaxForExam,
  getConversationProgress,
  getConversationRoundStats,
  loadConversationBank,
} from "@/lib/conversation-storage";
import { buildDefaultConversationBank } from "@/lib/conversation-default-data";
import type { ConversationExam } from "@/types/conversation";

function isComplete(
  prog: ReturnType<typeof getConversationProgress>,
  maxScore: number,
): boolean {
  if (!prog) return false;
  if (Math.round(prog.bestScore) >= maxScore) return true;
  const ok = prog.lastItemOk;
  return !!ok && ok.length === CONVERSATION_TOTAL_STEPS && ok.every(Boolean);
}

function needsRedeem(
  prog: ReturnType<typeof getConversationProgress>,
  complete: boolean,
): boolean {
  if (!prog || complete) return false;
  return prog.lastItemOk?.some((x) => !x) ?? false;
}

function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

export function ConversationRoundLevelPicker({ round }: { round: number }) {
  const hubHref = "/practice/listening/interactive";
  const [bank, setBank] = useState(buildDefaultConversationBank);
  const [bankVersion, setBankVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setBankVersion((n) => n + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-conversation-storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-conversation-storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    setBank(loadConversationBank());
  }, [bankVersion]);

  const roundStats = getConversationRoundStats(round);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={hubHref}
          className="ep-interactive text-sm font-bold uppercase tracking-wide text-ep-blue underline-offset-2 hover:underline"
        >
          ← Interactive hub
        </Link>
      </div>

      <header className="ep-panel-luxury ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.25em] text-ep-blue">
          Round {round} · Question bank
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">Sets in this round</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          One list for the whole bank. Full score on every set: <strong>{CONVERSATION_FULL_SCORE}</strong> pts. The{" "}
          <strong>Tag</strong> column is a legacy content label only. Tap a row to start; use <strong>Redeem</strong>{" "}
          after mistakes.
        </p>

        <div className="mt-4 grid gap-4 border-t-2 border-dashed border-neutral-300 pt-4 sm:grid-cols-2">
          <div>
            <p className="ep-stat text-[10px] font-black uppercase tracking-wide text-neutral-600">
              Average score
            </p>
            <p className="mt-1 text-lg font-black text-ep-blue">
              {roundStats.avgPercent != null ? `${roundStats.avgPercent}%` : "—"}
            </p>
            <p className="ep-stat mt-0.5 text-xs text-neutral-500">
              Mean of your best % on each set you&apos;ve tried in this round.
            </p>
          </div>
          <div>
            <p className="ep-stat text-[10px] font-black uppercase tracking-wide text-neutral-600">
              Last attempt
            </p>
            <p className="mt-1 text-lg font-black text-neutral-900">
              {formatShortDate(roundStats.latestAttemptDate)}
            </p>
            <p className="ep-stat mt-0.5 text-xs text-neutral-500">
              Most recent finish across any set in this round.
            </p>
          </div>
        </div>
      </header>

      <section className="ep-panel-luxury ep-brutal overflow-hidden rounded-sm border-4 border-black bg-white shadow-[4px_4px_0_0_#000]">
        <div className="border-b-4 border-black bg-ep-yellow/30 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-wide text-neutral-900">Question bank</p>
          <p className="ep-stat mt-0.5 text-[10px] font-bold text-neutral-600">
            Sorted by bank slot (Easy first), then topic title. Full score {CONVERSATION_FULL_SCORE} pts each.
          </p>
        </div>
        <QuestionBankRows
          round={round}
          easyExams={filterConversationExamsForPractice(bank[round]?.easy)}
          mediumExams={filterConversationExamsForPractice(bank[round]?.medium)}
        />
      </section>
    </div>
  );
}

function QuestionBankRows({
  round,
  easyExams,
  mediumExams,
}: {
  round: number;
  easyExams: ConversationExam[];
  mediumExams: ConversationExam[];
}) {
  type Row = { exam: ConversationExam; difficulty: "easy" | "medium" };
  const rows: Row[] = [
    ...[...easyExams].sort((a, b) => a.setNumber - b.setNumber).map((exam) => ({ exam, difficulty: "easy" as const })),
    ...[...mediumExams]
      .sort((a, b) => a.setNumber - b.setNumber)
      .map((exam) => ({ exam, difficulty: "medium" as const })),
  ].sort((a, b) => {
    if (a.difficulty !== b.difficulty) return a.difficulty === "easy" ? -1 : 1;
    return a.exam.setNumber - b.exam.setNumber;
  });

  if (rows.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-sm font-bold text-neutral-700">No sets in this round yet.</p>
        <p className="ep-stat mt-2 text-xs text-neutral-500">
          Content appears here after an admin upload for round {round}.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden grid-cols-[5.5rem_minmax(0,1fr)_auto_5.5rem] gap-2 border-b-2 border-black bg-neutral-100 px-4 py-2 ep-stat text-[10px] font-black uppercase tracking-widest text-neutral-800 sm:grid">
        <span>Tag</span>
        <span>Set &amp; title</span>
        <span className="text-right">Status</span>
        <span className="text-right">Best</span>
      </div>
      <ul className="divide-y-4 divide-black">
        {rows.map(({ exam, difficulty }) => {
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
              <span className="ep-stat text-neutral-400">0/{examMax}</span>
            );

          return (
            <li key={`${difficulty}-${exam.id}`} className="border-b-4 border-black last:border-b-0">
              <Link
                href={href}
                className="ep-btn-luxury ep-interactive grid grid-cols-1 gap-3 px-4 py-4 text-sm hover:bg-ep-yellow/15 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto_5.5rem] sm:items-center sm:gap-2"
              >
                <div className="flex items-center gap-2 sm:block sm:min-w-0">
                  <span className="inline-flex w-fit rounded-sm border-2 border-black bg-ep-blue/10 px-2 py-0.5 ep-stat text-[10px] font-black uppercase text-ep-blue">
                    {CONVERSATION_DIFFICULTY_LABEL[difficulty]}
                  </span>
                </div>
                <div className="min-w-0 sm:pl-0">
                  <span className="line-clamp-2 block text-sm font-black text-neutral-900">
                    {exam.title}
                  </span>
                </div>
                <div className="flex flex-row items-center justify-between gap-2 sm:flex-col sm:items-end sm:justify-center sm:text-right">
                  <div className="flex flex-wrap items-center gap-1 sm:justify-end">
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
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wide text-neutral-700">
                    {complete ? "Done" : prog ? "In progress" : "Start"}
                  </span>
                </div>
                <div className="text-left text-base sm:text-right">{scoreCell}</div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
