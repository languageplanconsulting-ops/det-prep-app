"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FreeQuotaLockedLink } from "@/components/practice/FreeQuotaLockedLink";
import { NonApiExamQuotaReminder } from "@/components/practice/NonApiExamQuotaReminder";
import { VOCAB_SESSION_LABEL, VOCAB_SESSION_MAX } from "@/lib/vocab-constants";
import { getVocabPassageProgress, loadVocabVisibleBank } from "@/lib/vocab-storage";
import type { VocabRoundNum, VocabSessionLevel } from "@/types/vocab";

export function VocabDifficultyQuestionsPage({
  round,
  sessionLevel,
}: {
  round: VocabRoundNum;
  sessionLevel: VocabSessionLevel;
}) {
  const [v, setV] = useState(0);

  useEffect(() => {
    const onStorage = () => setV((n) => n + 1);
    window.addEventListener("storage", onStorage);
    window.addEventListener("ep-vocab-storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("ep-vocab-storage", onStorage);
    };
  }, []);

  const sets = loadVocabVisibleBank()[round];
  const rows = sets.flatMap((set) =>
    set.passages
      .filter((p) => p.contentLevel === sessionLevel)
      .map((p) => ({
        setNumber: set.setNumber,
        passageNumber: p.passageNumber,
        title: p.titleEn?.trim() || `Question ${p.passageNumber}`,
      })),
  );
  const maxScore = VOCAB_SESSION_MAX[sessionLevel];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3 text-sm font-bold text-ep-blue">
        <Link href="/practice/comprehension/vocabulary" className="hover:underline">
          ← All rounds
        </Link>
        <span className="text-neutral-300">·</span>
        <Link href={`/practice/comprehension/vocabulary/round/${round}`} className="hover:underline">
          Round {round}
        </Link>
      </div>

      <header className="ep-brutal-reading rounded-sm bg-white p-6">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-ep-blue">
          Round {round} · {VOCAB_SESSION_LABEL[sessionLevel]}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Vocabulary questions</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Choose a question directly. No set selection step.
        </p>
      </header>

      <NonApiExamQuotaReminder exam="vocabulary" />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" key={v}>
        {rows.length === 0 ? (
          <div className="ep-brutal-reading col-span-full rounded-sm bg-neutral-100 p-4 text-sm font-bold text-neutral-600">
            COMING SOON
          </div>
        ) : (
          rows.map((row, idx) => {
            const prog = getVocabPassageProgress(round, sessionLevel, row.setNumber, row.passageNumber);
            return (
              <FreeQuotaLockedLink
                key={`${row.setNumber}-${row.passageNumber}-${idx}`}
                href={`/practice/comprehension/vocabulary/round/${round}/${row.setNumber}/${sessionLevel}/${row.passageNumber}`}
                exam="vocabulary"
                className="ep-interactive ep-brutal-reading block rounded-sm bg-white p-4 hover:bg-ep-yellow/25"
              >
                <p className="text-lg font-black">Question {idx + 1}</p>
                <p className="mt-1 line-clamp-2 text-xs font-semibold text-neutral-600">{row.title}</p>
                <p className="ep-stat mt-2 text-xs text-neutral-600">
                  {prog ? `Best: ${prog.bestScore}/${maxScore}` : "Not attempted yet"}
                </p>
              </FreeQuotaLockedLink>
            );
          })
        )}
      </section>
    </div>
  );
}
