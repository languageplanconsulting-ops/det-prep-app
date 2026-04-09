"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConversationSessionClient } from "@/components/conversation/ConversationSessionClient";
import { StudySessionBoundary } from "@/components/practice/StudySessionBoundary";
import { LuxuryLoader } from "@/components/ui/LuxuryLoader";
import { hydrateConversationExamForPlayback } from "@/lib/conversation-audio-hydrate";
import { getConversationExam } from "@/lib/conversation-storage";
import type { ConversationDifficulty, ConversationExam } from "@/types/conversation";

export function ConversationSessionGate({
  round,
  difficulty,
  setNumber,
  startWithRedeem,
}: {
  round: number;
  difficulty: ConversationDifficulty;
  setNumber: number;
  startWithRedeem: boolean;
}) {
  const [exam, setExam] = useState<ConversationExam | null | undefined>(undefined);
  const [bankTick, setBankTick] = useState(0);

  useEffect(() => {
    const refresh = () => setBankTick((t) => t + 1);
    window.addEventListener("ep-conversation-storage", refresh);
    return () => window.removeEventListener("ep-conversation-storage", refresh);
  }, []);

  useEffect(() => {
    setExam(undefined);
  }, [round, difficulty, setNumber]);

  useEffect(() => {
    let cancelled = false;
    const raw = getConversationExam(round, difficulty, setNumber);
    if (raw === null) {
      setExam(null);
      return;
    }
    void hydrateConversationExamForPlayback(raw)
      .then((h) => {
        if (!cancelled) setExam(h);
      })
      .catch(() => {
        if (!cancelled) setExam(raw);
      });
    return () => {
      cancelled = true;
    };
  }, [round, difficulty, setNumber, bankTick]);

  if (exam === undefined) {
    return <LuxuryLoader label="Loading interactive conversation…" />;
  }

  if (exam === null) {
    return (
      <div className="ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="font-bold text-neutral-800">Set {setNumber} is not available.</p>
        <Link
          href="/practice/listening/interactive"
          className="ep-interactive mt-4 inline-block text-sm font-bold uppercase text-ep-blue underline-offset-2 hover:underline"
        >
          Back to interactive hub
        </Link>
      </div>
    );
  }

  return (
    <StudySessionBoundary
      skill="conversation"
      exerciseType="interactive_conversation"
      difficulty={difficulty}
      setId={`ic-r${round}-${difficulty}-s${setNumber}`}
    >
      <ConversationSessionClient
        key={`${exam.id}-${startWithRedeem}`}
        exam={exam}
        round={round}
        difficulty={difficulty}
        setNumber={setNumber}
        startWithRedeem={startWithRedeem}
      />
    </StudySessionBoundary>
  );
}
