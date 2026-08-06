"use client";

import { useEffect, useMemo, useState } from "react";

import { useSpeechCapture } from "@/hooks/useSpeechCapture";
import { SpeechPunctuationNote } from "@/components/speaking/SpeechPunctuationNote";
import { useTimeUpSubmit } from "@/hooks/useTimeUpSubmit";

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function SpeakAboutPhotoMock({
  content,
  submitting = false,
  timeUp = false,
  onImageReady,
  onSubmit,
}: {
  content: Record<string, unknown>;
  submitting?: boolean;
  /** Step countdown hit 00:00 — commit the transcript as-is, even under 15 words. */
  timeUp?: boolean;
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

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const capture = useSpeechCapture();
  const { transcript, setTranscript, listening, transcribing } = capture;
  const speechError = capture.error;

  const wc = useMemo(() => countWords(transcript), [transcript]);
  const canSubmit = wc >= 15;

  // Time up: send whatever was captured. The 15-word gate is a coaching floor
  // for a deliberate submit — it must never leave a learner on a dead 00:00
  // timer with a disabled button.
  useTimeUpSubmit(timeUp, () => {
    capture.cancel();
    onSubmit({ text: transcript.trim() });
  });

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
            onClick={() => void capture.start()}
            disabled={submitting || transcribing}
            className="border-2 border-black bg-ep-blue px-4 py-3 text-sm font-black text-white shadow-[3px_3px_0_0_#000] disabled:opacity-50"
          >
            {transcribing ? "Transcribing…" : "Start speaking"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void capture.stop()}
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

      <SpeechPunctuationNote />

      <button
        type="button"
        disabled={submitting || !canSubmit || transcribing}
        onClick={() => {
          capture.cancel();
          if (!canSubmit) {
            setSubmitError("Please speak enough words (>= 15) before submitting.");
            return;
          }
          onSubmit({ text: transcript.trim() });
        }}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "ส่งคำตอบ... / Sending" : transcribing ? "กำลังถอดเสียง…" : "ส่งคำตอบ / Submit"}
      </button>
    </div>
  );
}

