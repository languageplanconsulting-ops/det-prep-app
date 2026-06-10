"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SoftHubHeader } from "@/components/practice/SoftHubHeader";
import { READING_DIFFICULTIES, READING_ROUND_NUMBERS } from "@/lib/reading-constants";
import { EnhancedRoundCard } from "@/components/practice/EnhancedRoundCard";
import { getReadingRoundStats, loadReadingVisibleBank } from "@/lib/reading-storage";
import type { ReadingRoundNum } from "@/types/reading";

function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

export function ReadingRoundsHub() {
  // soft Brown UI promoted to default for all users (was admin-only)
  const soft = true;
  const [v, setV] = useState(0);

  useEffect(() => {
    const refresh = () => setV((n) => n + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-reading-storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-reading-storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const recommendedRound: ReadingRoundNum | null = (() => {
    void v;
    for (const r of READING_ROUND_NUMBERS) {
      const s = getReadingRoundStats(r);
      if (s.setsAttempted === 0) return r;
    }
    return null;
  })();

  if (soft) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href="/practice" className="text-sm font-semibold text-[#004AAD] hover:underline">
          ← กลับหน้าฝึก
        </Link>
        <SoftHubHeader
          color="emerald"
          icon="📖"
          eyebrow="Comprehension · Reading"
          title="การอ่านจับใจความ"
          subtitle="Reading"
          tip={
            <>
              ฝึก <strong>จับใจความ + หา title + main idea</strong> — ออกสอบ DET บ่อยสุดครับ ·
              ตอบผิดข้อไหน อ่านเหตุผลให้เข้าใจ แล้วเก็บคำศัพท์ลง Notebook
            </>
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {READING_ROUND_NUMBERS.map((round) => (
            <RoundCard
              key={`${round}-${v}`}
              round={round}
              soft
              recommendedRound={recommendedRound}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="ep-brutal-reading rounded-sm bg-white p-6">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-ep-blue">
          Reading skills
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">English Plan — comprehension</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Five rounds. Each round has Easy / Medium / Hard sets. Averages use your best score on each exam as a
          percent of that exam&apos;s max; the date is your most recent attempt in that round.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-black uppercase tracking-wide">Rounds</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {READING_ROUND_NUMBERS.map((round) => (
            <RoundCard key={`${round}-${v}`} round={round} />
          ))}
        </div>
      </section>
    </div>
  );
}

function RoundCard({
  round,
  soft = false,
  recommendedRound,
}: {
  round: ReadingRoundNum;
  soft?: boolean;
  recommendedRound?: ReadingRoundNum | null;
}) {
  const bank = loadReadingVisibleBank();
  let totalSets = 0;
  for (const d of READING_DIFFICULTIES) {
    totalSets += bank[round][d].length;
  }
  const stats = getReadingRoundStats(round);
  const hasAttempts = stats.avgPercent != null;

  if (soft) {
    return (
      <EnhancedRoundCard
        href={`/practice/comprehension/reading/round/${round}`}
        round={round}
        totalSets={stats.totalSets}
        setsAttempted={stats.setsAttempted}
        avgPercent={stats.avgPercent}
        latestAttemptDate={stats.latestAttemptDate}
        byDifficulty={stats.byDifficulty}
        isRecommended={recommendedRound === round}
        estMinPerSet={4}
      />
    );
  }

  return (
    <Link
      href={`/practice/comprehension/reading/round/${round}`}
      className="ep-interactive ep-brutal-reading flex flex-col rounded-sm bg-ep-yellow px-4 py-6 text-left shadow-[4px_4px_0_0_#000] hover:bg-ep-yellow/90"
    >
      <span className="text-2xl font-black">Round {round}</span>
      <span className="ep-stat mt-2 text-sm font-bold text-neutral-800">
        {totalSets > 0 ? `${totalSets} set(s) uploaded` : "COMING SOON"}
      </span>
      <span className="ep-stat mt-3 block text-xs font-bold uppercase tracking-wide text-neutral-700">
        Avg score
      </span>
      <span className="text-lg font-black text-ep-blue">
        {stats.avgPercent != null ? `${stats.avgPercent}%` : "—"}
      </span>
      <span className="ep-stat mt-2 block text-xs font-bold uppercase tracking-wide text-neutral-700">
        Latest attempt
      </span>
      <span className="ep-stat text-sm font-semibold text-neutral-800">
        {formatShortDate(stats.latestAttemptDate)}
      </span>
    </Link>
  );
}
