"use client";

/**
 * Daily-practice runner adapter for the "fitb" skill group. Loads the concrete FitbSet for
 * (round, difficulty, setNumber) then renders the real FitbSessionClient unchanged — see
 * src/components/practice/daily-runner (runner shell, built separately) for how items advance.
 */
import { useEffect, useState } from "react";
import { FitbSessionClient } from "@/components/fitb/FitbSessionClient";
import { ensureCanonicalPracticeContent } from "@/lib/practice-content/client";
import { getFitbVisibleSet } from "@/lib/fitb-storage";
import { FITB_ROUND_NUMBERS } from "@/lib/fitb-constants";
import type { RandomDifficulty } from "@/lib/practice-random";
import type { FitbRoundNum, FitbSet } from "@/types/fitb";

/** Narrow a plain round number (from the runner's plan/content-picker) into FitbRoundNum. */
function toFitbRound(n: number): FitbRoundNum {
  return (FITB_ROUND_NUMBERS as readonly number[]).includes(n) ? (n as FitbRoundNum) : 1;
}

export function FitbRunnerItem({
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
  const roundNum = toFitbRound(round);
  const [set, setSet] = useState<FitbSet | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setSet(undefined);
    (async () => {
      await ensureCanonicalPracticeContent();
      const loaded = getFitbVisibleSet(roundNum, difficulty, setNumber);
      if (!cancelled) setSet(loaded);
    })();
    return () => {
      cancelled = true;
    };
  }, [roundNum, difficulty, setNumber]);

  if (set === undefined) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <p className="text-sm text-neutral-400">กำลังโหลด…</p>
      </div>
    );
  }

  if (!set) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <p className="text-sm text-red-500">โหลดข้อสอบไม่สำเร็จ</p>
      </div>
    );
  }

  return (
    <FitbSessionClient
      set={set}
      round={roundNum}
      difficulty={difficulty}
      setNumber={setNumber}
      startWithRedeem={false}
      onComplete={onComplete}
    />
  );
}
