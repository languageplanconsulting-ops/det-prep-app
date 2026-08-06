"use client";

/**
 * One speech-capture implementation for every spoken exercise.
 *
 * The seven speaking components each used to drive the Web Speech API directly and treat its
 * live captions as the ONLY source of the transcript. Firefox does not implement that API at
 * all and Safari's stops after a few seconds, so on those browsers the transcript stayed empty
 * — and since every one of these screens gates its submit button on a word count, the learner
 * could never submit (bug report 7c587de9, "ส่งคำตอบไม่ได้ค่ะ").
 *
 * So: the microphone is ALWAYS recorded with MediaRecorder, and live captions are a bonus the
 * browser may or may not provide. On stop, if captions came up short, the recording is
 * transcribed by /api/speech-transcribe — the same Gemini route the lesson, interactive-speaking
 * and admin-sample recorders already use.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import {
  pickMediaRecorderMimeType,
  transcribeAudioBlobClient,
} from "@/lib/client-audio-transcribe";
import {
  getSpeechRecognitionCtor,
  handleSpeechRecognitionError,
} from "@/lib/speech-recognition-helpers";

const MIC_BLOCKED_MESSAGE =
  "เปิดไมโครโฟนไม่ได้ครับ — อนุญาตให้เว็บใช้ไมค์ในเบราว์เซอร์ แล้วลองใหม่ หรือพิมพ์คำตอบลงในกล่องด้านล่างก็ส่งตรวจได้เหมือนกัน";
const TRANSCRIBE_FAILED_MESSAGE =
  "ถอดเสียงไม่สำเร็จครับ — ลองอัดใหม่อีกครั้ง หรือพิมพ์คำตอบลงในกล่องด้านล่างแล้วส่งได้เลย";

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export type SpeechCapture = {
  transcript: string;
  setTranscript: (next: string) => void;
  listening: boolean;
  /** Server-side transcription in flight — keep submit disabled while true. */
  transcribing: boolean;
  error: string | null;
  setError: (next: string | null) => void;
  /** Begin recording (and live captions where supported). */
  start: () => Promise<void>;
  /** Stop, and transcribe the recording if captions produced fewer than `minWords`. */
  stop: () => Promise<void>;
  /** Tear down without transcribing — for unmount, resets and question changes. */
  cancel: () => void;
};

export function useSpeechCapture(opts?: { minWords?: number; lang?: string }): SpeechCapture {
  const minWords = opts?.minWords ?? 15;
  const lang = opts?.lang ?? "en-US";

  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const listeningRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const networkRetriesRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  const cancel = useCallback(() => {
    setListening(false);
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    try {
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    } catch {
      /* ignore */
    }
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  const start = useCallback(async () => {
    setError(null);
    setTranscript("");
    finalTranscriptRef.current = "";
    networkRetriesRef.current = 0;
    audioChunksRef.current = [];

    // The recording is the path that always works; captions below are the bonus.
    let recordingOk = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mimeType = pickMediaRecorderMimeType();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      recordingOk = true;
    } catch {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      if (!recordingOk) {
        setError(MIC_BLOCKED_MESSAGE);
        return;
      }
      setListening(true);
      return;
    }

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    recRef.current = rec;

    rec.onresult = (event: SpeechRecognitionEventLike) => {
      networkRetriesRef.current = 0;
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const piece = r[0]?.transcript ?? "";
        if (r.isFinal) {
          finalTranscriptRef.current = `${finalTranscriptRef.current} ${piece}`.trim();
        } else {
          interim += piece;
        }
      }
      const fin = finalTranscriptRef.current;
      setTranscript(`${fin}${interim ? (fin ? " " : "") + interim : ""}`.trim());
    };

    rec.onerror = (ev: SpeechRecognitionErrorEventLike) => {
      // Captions failing is survivable now — the recording is still going, and stop()
      // will transcribe it — so never surface a caption error while we are recording.
      if (recordingOk) return;
      handleSpeechRecognitionError(ev, {
        listeningRef,
        networkRetriesRef,
        setSpeechError: setError,
        setListening,
      });
    };

    rec.onend = () => {
      if (!listeningRef.current || recRef.current !== rec) return;
      window.setTimeout(() => {
        if (!listeningRef.current || recRef.current !== rec) return;
        try {
          rec.start();
        } catch {
          // Captions gave up mid-answer (Safari does this). Keep recording.
          recRef.current = null;
          if (!recordingOk) setListening(false);
        }
      }, 200);
    };

    try {
      rec.start();
      setListening(true);
    } catch {
      recRef.current = null;
      if (recordingOk) {
        setListening(true);
      } else {
        setError(MIC_BLOCKED_MESSAGE);
        setListening(false);
      }
    }
  }, [lang]);

  const stop = useCallback(async () => {
    const mr = mediaRecorderRef.current;
    const captured = await new Promise<Blob | null>((resolve) => {
      if (!mr || mr.state !== "recording") {
        resolve(null);
        return;
      }
      mr.onstop = () => {
        const chunks = audioChunksRef.current;
        resolve(chunks.length ? new Blob(chunks, { type: chunks[0]!.type || "audio/webm" }) : null);
      };
      try {
        mr.stop();
      } catch {
        resolve(null);
      }
    });

    cancel();

    const spoken = finalTranscriptRef.current.trim();
    if (countWords(spoken) >= minWords || !captured) return;

    setTranscribing(true);
    setError(null);
    try {
      const text = await transcribeAudioBlobClient(captured);
      if (text) {
        finalTranscriptRef.current = text;
        setTranscript(text);
      } else {
        setError(TRANSCRIBE_FAILED_MESSAGE);
      }
    } catch {
      setError(TRANSCRIBE_FAILED_MESSAGE);
    } finally {
      setTranscribing(false);
    }
  }, [cancel, minWords]);

  return {
    transcript,
    setTranscript,
    listening,
    transcribing,
    error,
    setError,
    start,
    stop,
    cancel,
  };
}
