"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { RealWordGame } from "@/components/realword/RealWordGame";
import { RealWordReport } from "@/components/realword/RealWordReport";
import { sfxTransition } from "@/lib/exam-sfx";
import { XP, awardXp } from "@/lib/gamification";
import { useLessonUserId } from "@/lib/lesson-user";
import { REALWORD_MAX_SCORE } from "@/lib/realword-constants";
import { saveRealWordProgress } from "@/lib/realword-storage";
import { realWordCounts, realWordRunScore } from "@/lib/realword-scoring";
import type { RealWordDifficulty, RealWordRoundNum, RealWordSet } from "@/types/realword";

function shuffleWordSet(wordSet: RealWordSet): RealWordSet {
  const words = [...wordSet.words];
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j]!, words[i]!];
  }
  return { ...wordSet, words };
}

export function RealWordSessionClient({
  round,
  wordSet,
  difficulty,
  setNumber,
  hubHref,
  onRunnerComplete,
}: {
  round: RealWordRoundNum;
  wordSet: RealWordSet;
  difficulty: RealWordDifficulty;
  setNumber: number;
  /** Usually the set list for this round + difficulty. */
  hubHref: string;
  /** Fired once scoring completes, in addition to the normal report flow — used by the
   * daily-practice runner (src/components/practice/daily-runner) to advance to the next item. */
  onRunnerComplete?: (scorePct: number, maxScore: number) => void;
}) {
  const uid = useLessonUserId();
  const [phase, setPhase] = useState<"game" | "report">("game");
  const [sessionWordSet, setSessionWordSet] = useState<RealWordSet>(() => shuffleWordSet(wordSet));
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const rewarded = useRef(false);

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const submit = () => {
    saveRealWordProgress({
      round,
      difficulty,
      setNumber,
      words: sessionWordSet.words,
      selectedIndices: selected,
    });
    const maxScore = REALWORD_MAX_SCORE[difficulty];
    const { R, UR, M } = realWordCounts({ words: sessionWordSet.words, selectedIndices: selected });
    const score = realWordRunScore(UR, M, R, maxScore);
    const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    if (!rewarded.current) {
      rewarded.current = true;
      awardXp(uid, XP.auto(pct)).catch(() => {});
    }
    onRunnerComplete?.(pct, maxScore);
    setPhase("report");
  };

  const redeemNow = () => {
    sfxTransition();
    setSelected(new Set());
    setSessionWordSet(shuffleWordSet(wordSet));
    setPhase("game");
  };

  const inRunner = !!onRunnerComplete;

  if (phase === "report") {
    return (
      <div className="space-y-6">
        {!inRunner && (
          <Link
            href={hubHref}
            className="inline-block text-sm font-bold uppercase tracking-wide text-ep-blue underline-offset-2 hover:underline"
          >
            ← Sets
          </Link>
        )}
        <div key={phase} className="ep-step-slide-in">
          <RealWordReport
            wordSet={sessionWordSet}
            round={round}
            difficulty={difficulty}
            setNumber={setNumber}
            selected={selected}
            hubHref={hubHref}
            onRedeemNow={redeemNow}
            inRunner={inRunner}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {!inRunner ? (
          <Link
            href={hubHref}
            className="text-sm font-bold uppercase tracking-wide text-ep-blue underline-offset-2 hover:underline"
          >
            ← Sets
          </Link>
        ) : (
          <span />
        )}
        <p className="max-w-xs text-right text-xs font-bold text-neutral-600">{sessionWordSet.setId}</p>
      </div>
      <div key={phase} className="ep-step-slide-in">
        <RealWordGame wordSet={sessionWordSet} selected={selected} onToggle={toggle} onSubmit={submit} />
      </div>
    </div>
  );
}
