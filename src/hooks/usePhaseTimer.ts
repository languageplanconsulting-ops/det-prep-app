"use client";

import { useCallback, useEffect, useState } from "react";

import {
  formatCountdown,
  getPhaseTimeLimitSeconds,
} from "@/lib/mock-test/phase-timer";

function resolvePhaseSeconds(phase: number, overrideSeconds?: number): number {
  if (
    typeof overrideSeconds === "number" &&
    Number.isFinite(overrideSeconds) &&
    overrideSeconds > 0
  ) {
    return Math.max(1, Math.floor(overrideSeconds));
  }
  return getPhaseTimeLimitSeconds(phase);
}

export type PhaseTimerControls = {
  secondsRemaining: number;
  isWarning: boolean;
  isCritical: boolean;
  isExpired: boolean;
  formattedTime: string;
  progress: number;
  startTimer: (phase: number, overrideSeconds?: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: (phase: number, overrideSeconds?: number) => void;
};

/**
 * Countdown timer for mock test phases. Does not tick while the tab is hidden.
 */
export function usePhaseTimer(): PhaseTimerControls {
  const [totalSeconds, setTotalSeconds] = useState(() =>
    getPhaseTimeLimitSeconds(1),
  );
  const [secondsRemaining, setSecondsRemaining] = useState(() =>
    getPhaseTimeLimitSeconds(1),
  );
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      setSecondsRemaining((prev) => {
        const next = Math.max(0, prev - 1);
        if (next <= 0) setRunning(false);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const startTimer = useCallback((nextPhase: number, overrideSeconds?: number) => {
    const t = resolvePhaseSeconds(nextPhase, overrideSeconds);
    setTotalSeconds(t);
    setSecondsRemaining(t);
    setRunning(true);
  }, []);

  const pauseTimer = useCallback(() => {
    setRunning(false);
  }, []);

  const resumeTimer = useCallback(() => {
    if (secondsRemaining <= 0) return;
    setRunning(true);
  }, [secondsRemaining]);

  const resetTimer = useCallback((nextPhase: number, overrideSeconds?: number) => {
    const t = resolvePhaseSeconds(nextPhase, overrideSeconds);
    setTotalSeconds(t);
    setSecondsRemaining(t);
    setRunning(true);
  }, []);

  const isWarning = secondsRemaining > 0 && secondsRemaining < 60;
  const isCritical = secondsRemaining > 0 && secondsRemaining < 30;
  const isExpired = secondsRemaining <= 0;
  const progress =
    totalSeconds > 0
      ? Math.max(0, Math.min(1, secondsRemaining / totalSeconds))
      : 0;

  return {
    secondsRemaining,
    isWarning,
    isCritical,
    isExpired,
    formattedTime: formatCountdown(secondsRemaining),
    progress,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
  };
}
