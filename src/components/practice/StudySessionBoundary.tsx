"use client";

import { useEffect } from "react";

import { useStudyTimer, type StartTrackingParams } from "@/hooks/useStudyTimer";

type Props = StartTrackingParams & { children: React.ReactNode };

/**
 * Starts server-backed study timing (tab-visible seconds) for the wrapped exam UI.
 * Ends the session on unmount or when deps change.
 */
export function StudySessionBoundary({
  children,
  exerciseType,
  skill,
  difficulty,
  setId,
}: Props) {
  const { startTracking, stopTracking } = useStudyTimer();

  useEffect(() => {
    void (async () => {
      try {
        await startTracking({ exerciseType, skill, difficulty, setId });
      } catch {
        /* unsigned-in or missing Supabase — exam still works */
      }
    })();
    return () => {
      void stopTracking(undefined, false);
    };
  }, [exerciseType, skill, difficulty, setId, startTracking, stopTracking]);

  return <>{children}</>;
}
