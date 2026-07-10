"use client";

import { useEffect, useState } from "react";
import { MascotLoader } from "@/components/ui/MascotLoader";
import { ReadingSessionClient } from "@/components/reading/ReadingSessionClient";
import { ensureCanonicalPracticeContent } from "@/lib/practice-content/client";
import type { RandomDifficulty } from "@/lib/practice-random";
import { getReadingExamFromSet, getReadingVisibleSetByNumber } from "@/lib/reading-storage";
import type { ReadingDifficulty, ReadingExamUnit, ReadingRoundNum } from "@/types/reading";

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; examNumber: number; readingExam: ReadingExamUnit; totalExams: number };

/**
 * Daily-practice runner adapter for the "reading" skill group — loads the concrete
 * ReadingSet (round/difficulty/setNumber) then the specific ReadingExamUnit inside it,
 * and renders the real ReadingSessionClient exactly as its own practice route does.
 * See src/components/practice/daily-runner/ for the shared adapter contract.
 */
export function ReadingRunnerItem({
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
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    (async () => {
      await ensureCanonicalPracticeContent();
      if (!alive) return;
      const set = getReadingVisibleSetByNumber(
        round as ReadingRoundNum,
        difficulty as ReadingDifficulty,
        setNumber,
      );
      const totalExams = set?.exams.length ?? 0;
      if (!set || totalExams === 0) {
        setState({ status: "error" });
        return;
      }
      // Pick a random exam within the set for variety — every exam in a set is fair game.
      const examNumber = 1 + Math.floor(Math.random() * totalExams);
      const readingExam = getReadingExamFromSet(set, examNumber);
      if (!readingExam) {
        setState({ status: "error" });
        return;
      }
      setState({ status: "ready", examNumber, readingExam, totalExams });
    })();
    return () => {
      alive = false;
    };
  }, [round, difficulty, setNumber]);

  if (state.status === "loading") {
    return (
      <div className="flex justify-center py-10">
        <MascotLoader label="กำลังโหลดข้อสอบ…" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700">
        โหลดข้อสอบไม่สำเร็จ
      </div>
    );
  }

  return (
    <ReadingSessionClient
      round={round as ReadingRoundNum}
      difficulty={difficulty as ReadingDifficulty}
      setNumber={setNumber}
      examNumber={state.examNumber}
      readingExam={state.readingExam}
      totalExams={state.totalExams}
      onRunnerComplete={onComplete}
    />
  );
}
