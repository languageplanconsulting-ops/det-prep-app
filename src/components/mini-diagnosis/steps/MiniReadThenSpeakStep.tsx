"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PrimaryButton, SoftCard } from "@/components/mini-diagnosis/steps/ui";
import { useSpeechCapture } from "@/hooks/useSpeechCapture";
import { SpeechPunctuationNote } from "@/components/speaking/SpeechPunctuationNote";

const MIN_WORDS = 15;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Mini-diagnosis read-then-speak: passage card + big mic button with a
 * recording pulse, live transcript, word-goal meter. Same speech-recognition
 * logic and { text } payload as the mock component.
 */
export function MiniReadThenSpeakStep({
  content,
  submitting = false,
  onSubmit,
}: {
  content: Record<string, unknown>;
  submitting?: boolean;
  onSubmit: (answer: unknown) => void;
}) {
  const passage = String(content.passage ?? "");
  const topic = String(content.topic ?? content.topic_en ?? content.cue_card ?? "").trim();
  const promptEn = String(content.prompt_en ?? content.instruction ?? "");
  const promptTh = String(content.prompt_th ?? content.instruction_th ?? "");

  const capture = useSpeechCapture({ minWords: MIN_WORDS });
  const { transcript, setTranscript, listening, transcribing } = capture;
  const speechError = capture.error;

  const wc = useMemo(() => countWords(transcript), [transcript]);
  const canSubmit = wc >= MIN_WORDS && !transcribing;
  const goalPct = Math.min(100, Math.round((wc / MIN_WORDS) * 100));

  return (
    <div className="space-y-4">
      {passage ? (
        <SoftCard>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">อ่านข้อความนี้ก่อน</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-slate-800">{passage}</p>
        </SoftCard>
      ) : null}
      {!passage && topic ? (
        <SoftCard>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">หัวข้อพูด</p>
          <p className="mt-1.5 text-base font-bold text-slate-900">{topic}</p>
        </SoftCard>
      ) : null}

      {promptTh || promptEn ? (
        <div className="px-1">
          {promptTh ? <p className="text-sm font-bold text-slate-800">{promptTh}</p> : null}
          {promptEn ? <p className="mt-0.5 text-xs text-slate-500">{promptEn}</p> : null}
        </div>
      ) : null}

      {/* mic */}
      <SoftCard className="text-center">
        <button
          type="button"
          disabled={submitting || transcribing}
          onClick={() => void (listening ? capture.stop() : capture.start())}
          aria-label={listening ? "หยุดพูด" : "เริ่มพูด"}
          className={`relative mx-auto flex h-24 w-24 items-center justify-center rounded-full text-white shadow-lg transition active:scale-95 disabled:opacity-40 ${
            listening ? "bg-rose-500" : "bg-ep-blue"
          }`}
        >
          {listening ? (
            <>
              <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/40" />
              <span className="relative h-7 w-7 rounded-md bg-white" />
            </>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10">
              <path d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-6a3.5 3.5 0 1 0-7 0v6A3.5 3.5 0 0 0 12 15Z" />
              <path d="M18.5 11.5a6.5 6.5 0 0 1-13 0H4a8 8 0 0 0 7 7.94V22h2v-2.56a8 8 0 0 0 7-7.94h-1.5Z" />
            </svg>
          )}
        </button>
        <p className="mt-3 text-sm font-semibold text-slate-700">
          {transcribing
            ? "กำลังถอดเสียงเป็นข้อความ…"
            : listening
              ? "กำลังอัดเสียงอยู่… พูดต่อได้เลย 🎙️"
              : wc > 0
                ? "พูดเพิ่มหรือแก้ข้อความด้านล่างได้"
                : "แตะเพื่อเริ่มพูด"}
        </p>
      </SoftCard>

      {speechError ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-700">{speechError}</p>
      ) : null}

      {/* transcript */}
      <SoftCard>
        <div className="flex items-center justify-between">
          <label htmlFor="minidiag-speak-transcript" className="text-sm font-bold text-slate-800">
            สิ่งที่คุณพูด (แก้ไขได้)
          </label>
          <span
            className={`font-mono text-xs font-bold ${canSubmit ? "text-emerald-600" : "text-slate-400"}`}
          >
            {wc} คำ {canSubmit ? "✓" : `/ ขั้นต่ำ ${MIN_WORDS}`}
          </span>
        </div>
        <textarea
          id="minidiag-speak-transcript"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={5}
          disabled={submitting}
          placeholder="Your English appears here…"
          className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-3 text-base leading-relaxed text-slate-900 outline-none transition focus:border-ep-blue focus:bg-white"
        />
        <SpeechPunctuationNote className="mt-2" />
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-300 ${canSubmit ? "bg-emerald-500" : "bg-ep-blue"}`}
            style={{ width: `${goalPct}%` }}
          />
        </div>
      </SoftCard>

      <PrimaryButton
        disabled={submitting || !canSubmit}
        onClick={() => {
          capture.cancel();
          onSubmit({ text: transcript.trim() });
        }}
      >
        {submitting ? "ระบบกำลังตรวจงาน…" : canSubmit ? "ส่งคำตอบ" : `พูดอีกนิดนะ (ขั้นต่ำ ${MIN_WORDS} คำ)`}
      </PrimaryButton>
    </div>
  );
}
