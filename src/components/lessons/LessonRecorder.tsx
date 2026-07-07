"use client";

import { useEffect, useRef, useState } from "react";
import { blobToBase64Data, pickRecorderMimeType } from "@/lib/media-recording-helpers";

/**
 * Record-a-take control for the speak lessons — web equivalent of
 * det-mobile's Recorder.tsx (expo-audio). Tap to start, tap to stop; on
 * stop, base64-encodes the take and calls onResult.
 */
export function LessonRecorder({
  onResult,
  maxSeconds = 60,
  disabled,
}: {
  onResult: (r: { base64: string; mimeType: string }) => void;
  maxSeconds?: number;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (tick.current) clearInterval(tick.current);
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  async function start() {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const mime = pickRecorderMimeType();
      const rec = mime ? new MediaRecorder(s, { mimeType: mime }) : new MediaRecorder(s);
      chunks.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      rec.onstop = async () => {
        setBusy(true);
        try {
          const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
          const base64 = await blobToBase64Data(blob);
          onResult({ base64, mimeType: rec.mimeType || "audio/webm" });
        } catch (e) {
          setError(e instanceof Error ? e.message : "บันทึกเสียงไม่สำเร็จ");
        } finally {
          setBusy(false);
          s.getTracks().forEach((t) => t.stop());
        }
      };
      mediaRecorder.current = rec;
      rec.start();
      setRecording(true);
      setElapsed(0);
      tick.current = setInterval(() => {
        setElapsed((e) => {
          if (e + 1 >= maxSeconds) {
            stop();
            return maxSeconds;
          }
          return e + 1;
        });
      }, 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ต้องอนุญาตให้ใช้ไมโครโฟนก่อน");
    }
  }

  function stop() {
    if (tick.current) {
      clearInterval(tick.current);
      tick.current = null;
    }
    setRecording(false);
    mediaRecorder.current?.stop();
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={recording ? stop : start}
        disabled={disabled || busy}
        className={`flex h-24 w-24 items-center justify-center rounded-full text-4xl shadow-lg transition active:scale-95 disabled:opacity-50 ${
          recording ? "bg-rose-600" : "bg-[#004AAD]"
        }`}
      >
        {recording ? "⏹" : "🎙"}
      </button>
      <p className="mt-3 text-xs font-bold text-slate-500">
        {busy ? "กำลังประมวลผล…" : recording ? `กำลังอัด ${mm}:${ss} · แตะเพื่อหยุด` : "แตะเพื่อเริ่มพูด"}
      </p>
      {error ? <p className="mt-2 max-w-[220px] text-center text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
