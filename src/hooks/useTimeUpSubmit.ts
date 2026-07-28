"use client";

import { useEffect, useRef } from "react";

/**
 * Fires a task's submit exactly once when its step timer runs out.
 *
 * The fixed mock used to do nothing at 00:00: the countdown sat at zero and the
 * learner had to notice and press Submit themselves, which reads as a frozen
 * exam — and on tasks with a submit gate (e.g. "speak at least 15 words") they
 * could be left with no enabled button at all. Each question component calls
 * this with a getter for whatever it has so far, so time-up always commits the
 * partial answer and the sequence keeps moving, like the real DET.
 *
 * `buildAnswer` is read through a ref, so components can pass a fresh closure
 * every render without re-arming the effect.
 */
export function useTimeUpSubmit(timeUp: boolean | undefined, buildAnswer: () => void): void {
  const firedRef = useRef(false);
  const buildRef = useRef(buildAnswer);
  buildRef.current = buildAnswer;

  useEffect(() => {
    if (!timeUp || firedRef.current) return;
    firedRef.current = true;
    buildRef.current();
  }, [timeUp]);
}
