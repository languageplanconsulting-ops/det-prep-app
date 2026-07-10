"use client";

import { useEffect, useState } from "react";
import { DictationSessionClient } from "@/components/dictation/DictationSessionClient";
import { DICTATION_ROUND_NUMBERS } from "@/lib/dictation-constants";
import { getDictationItem } from "@/lib/dictation-storage";
import { ensureCanonicalPracticeContent } from "@/lib/practice-content/client";
import type { RandomDifficulty } from "@/lib/practice-random";
import type { DictationItem, DictationRoundNum } from "@/types/dictation";

function toDictationRound(round: number): DictationRoundNum {
  return (DICTATION_ROUND_NUMBERS as number[]).includes(round) ? (round as DictationRoundNum) : 1;
}

export function DictationRunnerItem({
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
  const [item, setItem] = useState<DictationItem | null | undefined>(undefined);
  const roundNum = toDictationRound(round);

  useEffect(() => {
    let cancelled = false;
    setItem(undefined);
    (async () => {
      await ensureCanonicalPracticeContent();
      const loaded = getDictationItem(roundNum, difficulty, setNumber);
      if (!cancelled) setItem(loaded);
    })();
    return () => {
      cancelled = true;
    };
  }, [roundNum, difficulty, setNumber]);

  if (item === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-neutral-400">กำลังโหลด…</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm font-bold text-red-500">โหลดข้อสอบไม่สำเร็จ</p>
      </div>
    );
  }

  return (
    <DictationSessionClient
      item={item}
      round={roundNum}
      difficulty={difficulty}
      setNumber={setNumber}
      onRunnerComplete={onComplete}
    />
  );
}
