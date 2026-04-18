"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getSpeechRecognitionCtor,
  handleSpeechRecognitionError,
} from "@/lib/speech-recognition-helpers";

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function SpeakAboutPhotoMock({
  content,
  submitting = false,
  onImageReady,
  onSubmit,
}: {
  content: Record<string, unknown>;
  submitting?: boolean;
  onImageReady?: () => void;
  onSubmit: (answer: { text: string }) => void;
}) {
  // Support multiple possible field names from different admin upload formats
  const imageUrl = String(
    content.image_url ??
      content.imageUrl ??
      content.photo_url ??
      content.photoUrl ??
      content.img_url ??
      content.imgUrl ??
      "",
  );
  const photoType = String(content.photo_type ?? content.photoType ?? "");

  const promptEn = String(content.prompt_en ?? content.instruction ?? "");
  const promptTh = String(content.prompt_th ?? content.instruction_th ?? "");

  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const listeningRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const networkRetriesRef = useRef(0);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  const stopRecognition = useCallback(() => {
    setListening(false);
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
  }, []);

  useEffect(() => {
    return () => stopRecognition();
  }, [stopRecognition]);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSpeechError(
        "Speech recognition is not available in this browser. Try Chrome/Edge desktop, or type your response below.",
      );
      return;
    }
    setSpeechError(null);
    setSubmitError(null);
    setTranscript("");
    finalTranscriptRef.current = "";
    networkRetriesRef.current = 0;

    const rec = new Ctor();
    rec.lang = "en-US";
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
      handleSpeechRecognitionError(ev, {
        listeningRef,
        networkRetriesRef,
        setSpeechError,
        setListening,
      });
    };

    rec.onend = () => {
      // Chrome often fires onend during silence; keep going while still "listening".
      if (!listeningRef.current || recRef.current !== rec) return;
      window.setTimeout(() => {
        if (!listeningRef.current || recRef.current !== rec) return;
        try {
          rec.start();
        } catch {
          setListening(false);
        }
      }, 200);
    };

    try {
      rec.start();
      setListening(true);
    } catch {
      setSpeechError("Could not start the microphone. Please allow mic permissions, then try again.");
      setListening(false);
    }
  }, []);

  const wc = useMemo(() => countWords(transcript), [transcript]);
  const canSubmit = wc >= 15;

  useEffect(() => {
    setImageLoaded(false);
  }, [imageUrl]);

  useEffect(() => {
    if (!imageUrl) onImageReady?.();
  }, [imageUrl, onImageReady]);

  return (
    <div className="space-y-4">
      {photoType ? <p className="text-xs font-black uppercase tracking-wide text-[#004AAD]">{photoType}</p> : null}

      {imageUrl ? (
        <div className="relative">
          {!imageLoaded ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[4px] border-4 border-black bg-white/90">
              <div className="flex items-center gap-2 text-sm font-black text-[#004AAD]">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#004AAD] border-t-transparent" />
                Loading photo...
              </div>
            </div>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            onLoad={() => {
              setImageLoaded(true);
              onImageReady?.();
            }}
            onError={() => setImageLoaded(false)}
            className="max-h-64 w-full rounded-[4px] border-4 border-black object-cover"
          />
        </div>
      ) : (
        <div className="rounded-[4px] border-4 border-dashed border-black bg-neutral-50 p-6 text-center text-sm font-bold text-neutral-600">
          Photo not provided / ไม่มีรูป
        </div>
      )}

      <div className="space-y-2">
        {promptTh ? <p className="text-sm font-bold text-neutral-900">{promptTh}</p> : null}
        {promptEn ? <p className="text-xs text-neutral-600">{promptEn}</p> : null}
      </div>

      {speechError ? (
        <p className="rounded-[4px] border-4 border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{speechError}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!listening ? (
          <button
            type="button"
            onClick={startListening}
            disabled={submitting}
            className="border-2 border-black bg-ep-blue px-4 py-3 text-sm font-black text-white shadow-[3px_3px_0_0_#000] disabled:opacity-50"
          >
            Start speaking (live caption)
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecognition}
            disabled={submitting}
            className="border-2 border-black bg-red-700 px-4 py-3 text-sm font-black text-white shadow-[3px_3px_0_0_#000] disabled:opacity-50"
          >
            Stop
          </button>
        )}
      </div>

      {submitError ? <p className="text-sm font-bold text-red-700">{submitError}</p> : null}

      <label className="block text-sm font-bold text-neutral-900">
        Live transcript (you can edit)
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={6}
          className="mt-2 w-full rounded-[4px] border-2 border-black bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-ep-blue"
          placeholder="Your English speech appears here…"
        />
      </label>
      <p className="text-xs font-mono text-neutral-500">
        {wc} words · need at least 15 to submit
      </p>

      <button
        type="button"
        disabled={submitting || !canSubmit}
        onClick={() => {
          stopRecognition();
          if (!canSubmit) {
            setSubmitError("Please speak enough words (>= 15) before submitting.");
            return;
          }
          onSubmit({ text: transcript.trim() });
        }}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "ส่งคำตอบ... / Sending" : "ส่งคำตอบ / Submit"}
      </button>
    </div>
  );
}

