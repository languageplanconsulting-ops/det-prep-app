"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FitbSetGrid } from "@/components/fitb/FitbSetGrid";
import { NonApiExamQuotaReminder } from "@/components/practice/NonApiExamQuotaReminder";
import { SoftSetPicker, softPct, type SoftSetItem } from "@/components/practice/SoftSetPicker";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { FITB_DIFFICULTY_LABEL } from "@/lib/fitb-constants";
import { getFitbProgress, loadFitbVisibleBank } from "@/lib/fitb-storage";
import type { FitbDifficulty, FitbRoundNum } from "@/types/fitb";

export function FitbDifficultySetsPage({
  round,
  difficulty,
}: {
  round: FitbRoundNum;
  difficulty: FitbDifficulty;
}) {
  const [bankVersion, setBankVersion] = useState(0);
  const { isAdmin, previewEligible } = useEffectiveTier();
  const soft = isAdmin || previewEligible;

  useEffect(() => {
    const onStorage = () => setBankVersion((n) => n + 1);
    window.addEventListener("storage", onStorage);
    window.addEventListener("ep-fitb-storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("ep-fitb-storage", onStorage);
    };
  }, []);

  if (soft) {
    void bankVersion;
    const items: SoftSetItem[] = loadFitbVisibleBank()[round][difficulty].map((set) => ({
      key: String(set.setNumber),
      label: `ชุด ${set.setNumber}`,
      href: `/practice/literacy/fill-in-blank/round/${round}/${difficulty}/${set.setNumber}`,
      pct: softPct(getFitbProgress(round, difficulty, set.setNumber)),
    }));
    return (
      <SoftSetPicker
        round={round}
        difficultyLabel={FITB_DIFFICULTY_LABEL[difficulty]}
        title="เติมคำในช่องว่าง"
        noun="ชุด"
        items={items}
        lockExam="fitb"
        changeDifficultyHref={`/practice/literacy/fill-in-blank/round/${round}`}
        allRoundsHref="/practice/literacy/fill-in-blank"
        notice={<NonApiExamQuotaReminder exam="fitb" />}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3 text-sm font-bold text-ep-blue">
        <Link href="/practice/literacy/fill-in-blank" className="hover:underline">
          ← All rounds
        </Link>
        <span className="text-neutral-300">·</span>
        <Link href={`/practice/literacy/fill-in-blank/round/${round}`} className="hover:underline">
          Round {round}
        </Link>
        <span className="text-neutral-300">·</span>
        <Link href="/practice" className="hover:underline">
          Practice hub
        </Link>
      </div>

      <header className="ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.25em] text-ep-blue">
          Round {round} · {FITB_DIFFICULTY_LABEL[difficulty]}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Exam bank</h1>
        <p className="mt-2 text-sm text-neutral-600">Pick a set to practice.</p>
      </header>

      <NonApiExamQuotaReminder exam="fitb" />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black uppercase tracking-wide">Sets</h2>
          <Link
            href={`/practice/literacy/fill-in-blank/round/${round}`}
            className="border-4 border-black bg-white px-3 py-2 text-sm font-bold shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            Change difficulty
          </Link>
        </div>
        <FitbSetGrid round={round} difficulty={difficulty} bankVersion={bankVersion} />
      </section>
    </div>
  );
}
