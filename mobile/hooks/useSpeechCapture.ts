import { useCallback, useEffect, useRef, useState } from "react";

import {
  ensureMicPermission,
  startTurnRecording,
  stopTurnRecording,
  useTurnRecorder,
} from "../lib/audio-record";
import { transcribeRecording } from "../lib/mock-api";

export type CaptureState = "idle" | "recording" | "transcribing";

export type CaptureError = "mic" | "start" | "transcribe" | null;

/**
 * Record one spoken answer and turn it into text with the website's
 * /api/speech-transcribe (same as the web mock's useSpeechCapture, minus the
 * browser-only live captions). `stop()` resolves with the transcript.
 */
export function useSpeechCapture() {
  const recorder = useTurnRecorder();
  const [state, setState] = useState<CaptureState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<CaptureError>(null);
  const startedAt = useRef(0);
  const busy = useRef(false);
  const cancelled = useRef(false);

  useEffect(() => {
    if (state !== "recording") return;
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt.current) / 1000)), 250);
    return () => clearInterval(id);
  }, [state]);

  const start = useCallback(async (): Promise<boolean> => {
    if (busy.current) return false;
    busy.current = true;
    cancelled.current = false;
    setError(null);
    try {
      const ok = await ensureMicPermission().catch(() => false);
      if (!ok) {
        setError("mic");
        return false;
      }
      await startTurnRecording(recorder);
      startedAt.current = Date.now();
      setSeconds(0);
      setState("recording");
      return true;
    } catch {
      setError("start");
      return false;
    } finally {
      busy.current = false;
    }
  }, [recorder]);

  const stop = useCallback(async (): Promise<string> => {
    if (busy.current) return "";
    busy.current = true;
    setState("transcribing");
    try {
      const audio = await stopTurnRecording(recorder);
      if (!audio || cancelled.current) return "";
      return (await transcribeRecording(audio.base64, audio.mimeType)).trim();
    } catch {
      if (!cancelled.current) setError("transcribe");
      return "";
    } finally {
      busy.current = false;
      if (!cancelled.current) setState("idle");
    }
  }, [recorder]);

  /** Drop the current recording without transcribing (time up / leaving the task). */
  const cancel = useCallback(() => {
    cancelled.current = true;
    setState("idle");
    try {
      if (recorder.isRecording) void recorder.stop().catch(() => undefined);
    } catch {
      /* ignore */
    }
  }, [recorder]);

  useEffect(
    () => () => {
      cancelled.current = true;
      try {
        if (recorder.isRecording) void recorder.stop().catch(() => undefined);
      } catch {
        /* ignore */
      }
    },
    [recorder],
  );

  return { state, seconds, error, start, stop, cancel };
}
