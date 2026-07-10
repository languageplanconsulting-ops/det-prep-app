"use client";

import { useEffect, useState } from "react";
import { MascotLoader } from "@/components/ui/MascotLoader";
import { VocabSessionClient } from "@/components/vocab/VocabSessionClient";
import { ensureCanonicalPracticeContent } from "@/lib/practice-content/client";
import { pickOne, type RandomDifficulty } from "@/lib/practice-random";
import { getVocabPassageFromSet, getVocabVisibleSetByNumber } from "@/lib/vocab-storage";
import type { VocabPassageUnit, VocabRoundNum, VocabSessionLevel } from "@/types/vocab";

/** `RandomDifficulty` ("easy"|"medium"|"hard") is the exact same union as `VocabSessionLevel` —
 * no remapping needed, but keep this as an explicit typed pass-through in case that ever changes. */
function toSessionLevel(difficulty: RandomDifficulty): VocabSessionLevel {
  return difficulty;
}

function isVocabRoundNum(n: number): n is VocabRoundNum {
  return n === 1 || n === 2 || n === 3 || n === 4 || n === 5;
}

export function VocabRunnerItem({
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
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error" }
    | { status: "ready"; passage: VocabPassageUnit }
  >({ status: "loading" });

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    (async () => {
      await ensureCanonicalPracticeContent();
      if (!alive) return;
      if (!isVocabRoundNum(round)) {
        setState({ status: "error" });
        return;
      }
      const set = getVocabVisibleSetByNumber(setNumber, round);
      const passages = set?.passages ?? [];
      const passageNumber = passages.length > 0 ? pickOne(passages).passageNumber : 1;
      const passage = set ? getVocabPassageFromSet(set, passageNumber) : undefined;
      if (!alive) return;
      if (!passage) {
        setState({ status: "error" });
        return;
      }
      setState({ status: "ready", passage });
    })();
    return () => {
      alive = false;
    };
  }, [round, difficulty, setNumber]);

  if (state.status === "loading") {
    return (
      <div className="flex justify-center py-10">
        <MascotLoader label="กำลังโหลด…" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-neutral-200">
        <p className="text-sm font-bold text-neutral-500">โหลดข้อสอบไม่สำเร็จ</p>
      </div>
    );
  }

  const sessionLevel = toSessionLevel(difficulty);

  return (
    <VocabSessionClient
      round={round as VocabRoundNum}
      sessionLevel={sessionLevel}
      setNumber={setNumber}
      passageNumber={state.passage.passageNumber}
      passage={state.passage}
      nextPassageNumber={null}
      onRunnerComplete={onComplete}
    />
  );
}
