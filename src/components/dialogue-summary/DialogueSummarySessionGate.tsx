"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DialogueSummarySessionClient } from "@/components/dialogue-summary/DialogueSummarySessionClient";
import { StudySessionBoundary } from "@/components/practice/StudySessionBoundary";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";
import { getDialogueSummaryVisibleExam } from "@/lib/dialogue-summary-storage";
import type { DialogueSummaryDifficulty, DialogueSummaryExam, DialogueSummaryRoundNum } from "@/types/dialogue-summary";

export function DialogueSummarySessionGate({
  round,
  difficulty,
  setNumber,
}: {
  round: DialogueSummaryRoundNum;
  difficulty: DialogueSummaryDifficulty;
  setNumber: number;
}) {
  const [exam, setExam] = useState<DialogueSummaryExam | null | undefined>(undefined);

  useEffect(() => {
    setExam(getDialogueSummaryVisibleExam(round, difficulty, setNumber) ?? null);
  }, [round, difficulty, setNumber]);

  if (exam === undefined) {
    return <LuxuryLoader label="Loading set…" />;
  }

  if (exam === null) {
    return (
      <div className="ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="font-bold text-neutral-800">This set is not available.</p>
        <Link
          href={`/practice/listening/dialogue-summary/round/${round}/${difficulty}`}
          className="ep-interactive mt-4 inline-block text-sm font-bold uppercase text-ep-blue underline-offset-2 hover:underline"
        >
          Back to set list
        </Link>
      </div>
    );
  }

  return (
    <StudySessionBoundary
      skill="conversation"
      exerciseType="dialogue_summary"
      difficulty={difficulty}
      setId={`ds-r${round}-${difficulty}-s${setNumber}`}
    >
      <DialogueSummarySessionClient exam={exam} />
    </StudySessionBoundary>
  );
}
