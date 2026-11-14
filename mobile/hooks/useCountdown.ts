import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Exam countdown measured against a wall-clock deadline, so a slow JS thread or
 * a backgrounded app can't stretch the time. Pausing keeps the seconds left;
 * `reset` sets a new amount. `onDone` fires once when it reaches zero.
 */
export function useCountdown(totalSeconds: number, running: boolean, onDone?: () => void) {
  const [left, setLeft] = useState(totalSeconds);
  // Bumped by reset() so a running timer re-anchors its deadline.
  const [epoch, setEpoch] = useState(0);
  const leftRef = useRef(totalSeconds);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!running || leftRef.current <= 0) return;
    const endAt = Date.now() + leftRef.current * 1000;
    const id = setInterval(() => {
      const remain = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      if (remain !== leftRef.current) {
        leftRef.current = remain;
        setLeft(remain);
      }
      if (remain <= 0) {
        clearInterval(id);
        onDoneRef.current?.();
      }
    }, 200);
    return () => clearInterval(id);
  }, [running, epoch]);

  const reset = useCallback(
    (seconds: number = totalSeconds) => {
      leftRef.current = seconds;
      setLeft(seconds);
      setEpoch((n) => n + 1);
    },
    [totalSeconds],
  );

  return { left, reset };
}
