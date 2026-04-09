"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getBrowserSupabase } from "@/lib/supabase-browser";
import {
  type StudyDifficulty,
  type StudySkill,
  recoverAbandonedStudySession,
  StudyTracker,
} from "@/lib/study-tracker";

export type StartTrackingParams = {
  exerciseType: string;
  skill: StudySkill;
  difficulty?: StudyDifficulty;
  setId?: string | null;
};

function formatMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function useStudyTimer() {
  const [isTracking, setIsTracking] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const trackerRef = useRef<StudyTracker | null>(null);

  useEffect(() => {
    void recoverAbandonedStudySession();
  }, []);

  useEffect(() => {
    if (!isTracking) return;
    const id = window.setInterval(() => {
      const t = trackerRef.current;
      if (t) setElapsedSeconds(t.getElapsedSeconds());
    }, 1000);
    return () => window.clearInterval(id);
  }, [isTracking]);

  useEffect(() => {
    return () => {
      const t = trackerRef.current;
      const sid = t?.getSessionId();
      if (t && sid) {
        void t.endSession(sid, undefined, false);
      }
      t?.dispose();
      trackerRef.current = null;
    };
  }, []);

  const startTracking = useCallback(async (params: StartTrackingParams) => {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      throw new Error(
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
      );
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("You must be signed in to track study time.");
    }

    const prev = trackerRef.current;
    trackerRef.current = null;
    if (prev) {
      const sid = prev.getSessionId();
      if (sid) {
        await prev.endSession(sid, undefined, false);
      } else {
        prev.dispose();
      }
    }

    const tracker = new StudyTracker();
    trackerRef.current = tracker;

    await tracker.startSession(
      user.id,
      params.exerciseType,
      params.skill,
      params.difficulty,
      params.setId,
    );

    setElapsedSeconds(tracker.getElapsedSeconds());
    setIsTracking(true);
  }, []);

  const stopTracking = useCallback(
    async (score?: number | null, completed = true) => {
      const tracker = trackerRef.current;
      const sid = tracker?.getSessionId();
      trackerRef.current = null;
      if (!tracker || !sid) {
        setIsTracking(false);
        setElapsedSeconds(0);
        return;
      }
      await tracker.endSession(sid, score, completed);
      setIsTracking(false);
      setElapsedSeconds(0);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ep-study-sessions-updated"));
      }
    },
    [],
  );

  return {
    isTracking,
    elapsedSeconds,
    elapsedFormatted: formatMMSS(elapsedSeconds),
    startTracking,
    stopTracking,
  };
}
