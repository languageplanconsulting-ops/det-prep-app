"use client";

/**
 * Shared skill → Runner*Item switch. Extracted from DailyPracticeRunner so both the
 * study-plan daily runner AND the timed-random session (TimedRandomSession) render the
 * five auto-graded skills identically instead of keeping two copies that could drift.
 */
import type { RandomDifficulty } from "@/lib/practice-random";
import type { DailyPlanSkill } from "@/lib/study-plan/daily-plan";

import { DictationRunnerItem } from "@/components/practice/daily-runner/DictationRunnerItem";
import { FitbRunnerItem } from "@/components/practice/daily-runner/FitbRunnerItem";
import { VocabRunnerItem } from "@/components/practice/daily-runner/VocabRunnerItem";
import { ReadingRunnerItem } from "@/components/practice/daily-runner/ReadingRunnerItem";
import { RealWordRunnerItem } from "@/components/practice/daily-runner/RealWordRunnerItem";

export function RunnerSlotItem({
  skill,
  round,
  difficulty,
  setNumber,
  onComplete,
}: {
  skill: DailyPlanSkill;
  round: number;
  difficulty: RandomDifficulty;
  setNumber: number;
  onComplete: (scorePct: number, maxScore: number) => void;
}) {
  switch (skill) {
    case "dictation":
      return (
        <DictationRunnerItem round={round} difficulty={difficulty} setNumber={setNumber} onComplete={onComplete} />
      );
    case "fitb":
      return <FitbRunnerItem round={round} difficulty={difficulty} setNumber={setNumber} onComplete={onComplete} />;
    case "vocab":
      return <VocabRunnerItem round={round} difficulty={difficulty} setNumber={setNumber} onComplete={onComplete} />;
    case "reading":
      return (
        <ReadingRunnerItem round={round} difficulty={difficulty} setNumber={setNumber} onComplete={onComplete} />
      );
    case "realword":
      return (
        <RealWordRunnerItem round={round} difficulty={difficulty} setNumber={setNumber} onComplete={onComplete} />
      );
    default:
      return null;
  }
}
