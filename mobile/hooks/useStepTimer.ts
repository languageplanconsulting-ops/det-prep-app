import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Countdown for one exam step, measured against the wall clock so it stays
 * right when the app is backgrounded or a frame drops. `pause()` / `resume()`
 * hold the clock (e.g. dictation only starts counting once the audio ends).
 */
export function useStepTimer() {
  const [limitSec, setLimitSec] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);
  const [running, setRunning] = useState(false);
  const [armedKey, setArmedKey] = useState<string | null>(null);
  const endAt = useRef(0);
  const pausedLeft = useRef(0);

  const start = useCallback((key: string, seconds: number, opts?: { paused?: boolean }) => {
    const ms = Math.max(0, seconds) * 1000;
    setLimitSec(seconds);
    setRemainingMs(ms);
    setArmedKey(key);
    if (opts?.paused) {
      pausedLeft.current = ms;
      setRunning(false);
    } else {
      endAt.current = Date.now() + ms;
      setRunning(true);
    }
  }, []);

  const pause = useCallback(() => {
    setRunning((was) => {
      if (was) pausedLeft.current = Math.max(0, endAt.current - Date.now());
      return false;
    });
  }, []);

  const resume = useCallback(() => {
    setRunning((was) => {
      if (!was) endAt.current = Date.now() + pausedLeft.current;
      return true;
    });
  }, []);

  const stop = useCallback(() => {
    setRunning(false);
    setArmedKey(null);
  }, []);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const left = Math.max(0, endAt.current - Date.now());
      setRemainingMs(left);
      if (left <= 0) setRunning(false);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [running]);

  const remainingSec = remainingMs / 1000;
  const progress = limitSec > 0 ? Math.max(0, Math.min(1, remainingSec / limitSec)) : 0;
  return {
    armedKey,
    limitSec,
    remainingSec,
    progress,
    running,
    expired: armedKey != null && remainingMs <= 0,
    warning: limitSec > 0 && remainingSec <= Math.min(30, limitSec * 0.25),
    critical: limitSec > 0 && remainingSec <= Math.min(10, limitSec * 0.1),
    start,
    pause,
    resume,
    stop,
  };
}

/**
 * Fire `onTimeUp` once when `timeUp` turns true (each task hands in whatever
 * the learner has so far). Latest callback is always used.
 */
export function useTimeUp(timeUp: boolean | undefined, onTimeUp: () => void) {
  const fired = useRef(false);
  const cb = useRef(onTimeUp);
  cb.current = onTimeUp;
  useEffect(() => {
    if (!timeUp || fired.current) return;
    fired.current = true;
    cb.current();
  }, [timeUp]);
}
