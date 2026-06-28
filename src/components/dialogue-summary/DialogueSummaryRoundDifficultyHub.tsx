"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SoftDifficultyHub, softBandStat } from "@/components/practice/SoftDifficultyHub";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import {
  DIALOGUE_SUMMARY_DIFFICULTIES,
  DIALOGUE_SUMMARY_DIFFICULTY_LABEL,
  DIALOGUE_SUMMARY_MAX_SCORE,
} from "@/lib/dialogue-summary-constants";
import {
  getDialogueSummaryProgress,
  loadDialogueSummaryVisibleBank,
} from "@/lib/dialogue-summary-storage";
import type { DialogueSummaryRoundNum } from "@/types/dialogue-summary";

export function DialogueSummaryRoundDifficultyHub({ round }: { round: DialogueSummaryRoundNum }) {
  const [v, setV] = useState(0);
  const { isAdmin, previewEligible } = useEffectiveTier();
  const soft = true;

  useEffect(() => {
    const refresh = () => setV((n) => n + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-dialogue-summary-storage", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-dialogue-summary-storage", refresh);
    };
  }, []);

  const bank = loadDialogueSummaryVisibleBank();

  if (soft) {
    const bands = DIALOGUE_SUMMARY_DIFFICULTIES.map((d) => {
      const rows = bank[round][d];
      const stat = softBandStat(
        rows.map((r) => r.setNumber),
        (n) => {
          const p = getDialogueSummaryProgress(round, d, n);
          return p ? { bestScore: p.bestScore160, maxScore: 160 } : null;
        },
      );
      return {
        key: d,
        label: DIALOGUE_SUMMARY_DIFFICULTY_LABEL[d],
        ...stat,
        maxScore: DIALOGUE_SUMMARY_MAX_SCORE,
        href: `/practice/listening/dialogue-summary/round/${round}/${d}`,
      };
    });
    return (
      <SoftDifficultyHub
        round={round}
        bands={bands}
        backHref="/practice/listening/dialogue-summary"
        subtitle="ฟังบทสนทนาแล้วสรุป · ดันความแม่นเฉลี่ยให้ถึง 95% แล้วไต่ระดับถัดไป"
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3 text-sm font-bold text-ep-blue">
        <Link href="/practice/listening/dialogue-summary" className="hover:underline">
          ← All rounds
        </Link>
        <span className="text-neutral-300">·</span>
        <Link href="/practice" className="hover:underline">
          Practice hub
        </Link>
      </div>

      <header className="ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.25em] text-ep-blue">Round {round}</p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight">Choose difficulty</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Each level is scored out of {DIALOGUE_SUMMARY_MAX_SCORE} using the same rubric (relevancy, grammar, flow,
          vocabulary).
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-black uppercase tracking-wide">Level</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {DIALOGUE_SUMMARY_DIFFICULTIES.map((d) => {
            const count = bank[round][d].length;
            return (
              <Link
                key={`${d}-${v}`}
                href={`/practice/listening/dialogue-summary/round/${round}/${d}`}
                className="ep-interactive ep-brutal rounded-sm border-4 border-black bg-white px-4 py-8 text-left shadow-[4px_4px_0_0_#000] hover:bg-ep-yellow/15"
              >
                <span className="block text-2xl font-black uppercase">{DIALOGUE_SUMMARY_DIFFICULTY_LABEL[d]}</span>
                <span className="ep-stat mt-3 block text-sm font-bold text-neutral-800">
                  {count > 0
                    ? `${count} set${count === 1 ? "" : "s"} · max ${DIALOGUE_SUMMARY_MAX_SCORE} pts`
                    : "COMING SOON"}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
