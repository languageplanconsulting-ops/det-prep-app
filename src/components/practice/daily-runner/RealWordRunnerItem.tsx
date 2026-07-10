"use client";

import { useEffect, useState } from "react";
import { RealWordSessionClient } from "@/components/realword/RealWordSessionClient";
import { ensureCanonicalPracticeContent } from "@/lib/practice-content/client";
import { REALWORD_ROUND_NUMBERS } from "@/lib/realword-constants";
import { getRealWordVisibleSet } from "@/lib/realword-storage";
import type { RandomDifficulty } from "@/lib/practice-random";
import type { RealWordRoundNum, RealWordSet } from "@/types/realword";

function toRealWordRound(round: number): RealWordRoundNum {
  return (REALWORD_ROUND_NUMBERS as number[]).includes(round) ? (round as RealWordRoundNum) : 1;
}

export function RealWordRunnerItem({
  round,
  difficulty,
  setNumber,
  onComplete,
}: {
  round: number;
  difficulty: RandomDifficulty;
  setNumber: number;
  onComplete: (scorePct: number, maxScore: number) => void;
}) {
  const [wordSet, setWordSet] = useState<RealWordSet | null | undefined>(undefined);
  const roundNum = toRealWordRound(round);

  useEffect(() => {
    let cancelled = false;
    setWordSet(undefined);
    (async () => {
      await ensureCanonicalPracticeContent();
      const set = getRealWordVisibleSet(roundNum, difficulty, setNumber);
      if (!cancelled) setWordSet(set);
    })();
    return () => {
      cancelled = true;
    };
  }, [roundNum, difficulty, setNumber]);

  if (wordSet === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-neutral-400">กำลังโหลด…</p>
      </div>
    );
  }

  if (!wordSet) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm font-bold text-red-500">โหลดข้อสอบไม่สำเร็จ</p>
      </div>
    );
  }

  return (
    <RealWordSessionClient
      round={roundNum}
      wordSet={wordSet}
      difficulty={difficulty}
      setNumber={setNumber}
      hubHref="/practice"
      onRunnerComplete={onComplete}
    />
  );
}
