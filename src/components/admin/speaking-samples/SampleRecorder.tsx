"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  pickVideoRecorderMimeType,
} from "@/lib/media-recording-helpers";
import {
  createBrowserSpeechRecognition,
  isBrowserSpeechRecognitionAvailable,
  type WebSpeechRecognitionInstance,
} from "@/lib/browser-speech-recognition";
import type { SubtitleCue } from "@/lib/speaking-samples-types";

export interface RecordingResult {
  blob: Blob;
  mime: string;
  durationMs: number;
  cues: SubtitleCue[];
}

/**
 * Webcam+mic recorder with live English captions (Web Speech API).
 * Cue timings are anchored to performance.now() from MediaRecorder.start() so they
 * stay in sync with the video, not with recognition event order.
 */
export function SampleRecorder({
  disabled = false,
  onRecorded,
}: {
  disabled?: boolean;
  onRecorded: (result: RecordingResult) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<WebSpeechRecognitionInstance | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);

  const startPerfRef = useRef(0);
  const cuesRef = useRef<SubtitleCue[]>([]);
  const segmentStartRef = useRef<number | null>(null);
  const lastEndRef = useRef(0);
  const tickRef = useRef<number | null>(null);
  const interimRef = useRef("");
  const recordingRef = useRef(false);

  useEffect(() => {
    setSpeechSupported(isBrowserSpeechRecognitionAvailable());
  }, []);

  const cleanup = useCallback(() => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const nowMs = useCallback(() => Math.max(0, performance.now() - startPerfRef.current), []);

  const startRecognition = useCallback(() => {
    if (!isBrowserSpeechRecognitionAvailable()) return;
    const rec = createBrowserSpeechRecognition();
    if (!rec) return;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.maxAlternatives = 1;
    rec.onresult = (ev) => {
      let interimText = "";
      for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
        const result = ev.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (segmentStartRef.current === null) {
          segmentStartRef.current = Math.max(lastEndRef.current, nowMs());
        }
        if (result.isFinal) {
          const text = transcript.trim();
          const endMs = nowMs();
          if (text) {
            cuesRef.current.push({
              text,
              startMs: segmentStartRef.current ?? lastEndRef.current,
              endMs,
            });
            lastEndRef.current = endMs;
          }
          segmentStartRef.current = null;
        } else {
          interimText += transcript;
        }
      }
      interimRef.current = interimText.trim();
      setInterim(interimRef.current);
    };
    rec.onerror = (ev) => {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
        setSpeechSupported(false);
      }
      // network / no-speech errors: keep recording, captions just pause.
    };
    rec.onend = () => {
      // Auto-restart while still recording (some browsers end on silence).
      if (recordingRef.current && recognitionRef.current === rec) {
        try {
          rec.start();
        } catch {
          /* ignore */
        }
      }
    };
    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      /* ignore */
    }
  }, [nowMs]);

  const start = useCallback(async () => {
    setError(null);
    cuesRef.current = [];
    segmentStartRef.current = null;
    lastEndRef.current = 0;
    setInterim("");
    setElapsedMs(0);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
    } catch {
      setError("ไม่สามารถเข้าถึงกล้อง/ไมโครโฟนได้ — please allow camera & microphone access.");
      return;
    }
    streamRef.current = stream;
    if (previewRef.current) {
      previewRef.current.srcObject = stream;
      previewRef.current.muted = true;
      void previewRef.current.play().catch(() => {});
    }

    const mime = pickVideoRecorderMimeType();
    chunksRef.current = [];
    let recorder: MediaRecorder;
    try {
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    } catch {
      setError("Recording is not supported in this browser.");
      cleanup();
      return;
    }
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const actualMime = recorder.mimeType || mime || "video/webm";
      const blob = new Blob(chunksRef.current, { type: actualMime });
      const durationMs = nowMs();
      // Close out a dangling open segment.
      if (segmentStartRef.current !== null && interimRef.current.trim()) {
        cuesRef.current.push({
          text: interimRef.current.trim(),
          startMs: segmentStartRef.current,
          endMs: durationMs,
        });
      }
      recordingRef.current = false;
      cleanup();
      setRecording(false);
      setInterim("");
      interimRef.current = "";
      onRecorded({ blob, mime: actualMime, durationMs, cues: [...cuesRef.current] });
    };

    startPerfRef.current = performance.now();
    recorder.start();
    recordingRef.current = true;
    setRecording(true);
    startRecognition();

    tickRef.current = window.setInterval(() => setElapsedMs(nowMs()), 200);
  }, [cleanup, nowMs, onRecorded, startRecognition]);

  const stop = useCallback(() => {
    try {
      recorderRef.current?.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const seconds = Math.floor(elapsedMs / 1000);
  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="rounded-[6px] border-2 border-black bg-white p-3 shadow-[3px_3px_0_0_#000]">
      <div className="relative overflow-hidden rounded-[4px] border-2 border-black bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={previewRef} playsInline muted className="block max-h-[50vh] w-full" />
        {recording ? (
          <div className="absolute left-2 top-2 flex items-center gap-2 rounded bg-black/70 px-2 py-1 text-xs font-bold text-white">
            <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            REC {mmss}
          </div>
        ) : null}
        {recording && interim ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center px-3">
            <span className="rounded bg-black/70 px-2 py-1 text-center text-sm text-white">{interim}</span>
          </div>
        ) : null}
      </div>

      {!speechSupported ? (
        <p className="mt-2 text-xs font-semibold text-amber-700">
          Live captions need Chrome or Edge. You can still record — add subtitles manually after.
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm font-semibold text-red-600">{error}</p> : null}

      <div className="mt-3">
        {!recording ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => void start()}
            className="w-full rounded-[4px] border-2 border-black bg-ep-yellow px-4 py-3 text-sm font-bold shadow-[3px_3px_0_0_#000] disabled:opacity-50"
          >
            🎥 Start recording
          </button>
        ) : (
          <button
            type="button"
            onClick={stop}
            className="w-full rounded-[4px] border-2 border-black bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-[3px_3px_0_0_#000]"
          >
            ⏹ Stop & review
          </button>
        )}
      </div>
    </div>
  );
}
