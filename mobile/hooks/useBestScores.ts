import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { fetchBestPctBySet } from "../lib/practice-progress";

/**
 * Best score % per set slot for one skill/round/difficulty, shared with the
 * website via practice_attempts. Refetches whenever the screen regains focus
 * (e.g. back from a finished set). Empty map while loading or when disabled.
 */
export function useBestScores(args: {
  taskType?: string;
  contentSkill?: string;
  round: number;
  difficulty: string;
}): Map<number, number> {
  const { taskType, contentSkill, round, difficulty } = args;
  const [best, setBest] = useState<Map<number, number>>(() => new Map());

  useFocusEffect(
    useCallback(() => {
      if (!taskType || !contentSkill) return;
      let cancelled = false;
      void fetchBestPctBySet({ taskType, skill: contentSkill, round, difficulty }).then((m) => {
        if (!cancelled) setBest(m);
      });
      return () => {
        cancelled = true;
      };
    }, [taskType, contentSkill, round, difficulty]),
  );

  return best;
}
