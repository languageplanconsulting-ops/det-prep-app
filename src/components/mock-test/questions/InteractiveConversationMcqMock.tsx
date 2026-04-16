"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type McqTurn = {
  question_en: string;
  question_audio_url?: string;
  options: string[];
  correct_answer: string;
};

export function InteractiveConversationMcqMock({
  content,
  submitting = false,
  onSubmit,
}: {
  content: Record<string, unknown>;
  submitting?: boolean;
  onSubmit: (payload: {
    user_turn_answers: string[];
    turns: Array<{ question_en: string; reference_answer_en: string }>;
    averageScore0To100: number;
  }) => void;
}) {
  const turns = useMemo(
    () => (Array.isArray(content.turns) ? (content.turns as McqTurn[]) : []),
    [content.turns],
  );
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [pick, setPick] = useState<string | null>(null);
  const [hasListened, setHasListened] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);

  const current = turns[idx];
  if (!current || !turns.length) {
    return <p className="text-sm font-bold text-red-800">Missing turns for interactive conversation MCQ.</p>;
  }

  const audioSrc = String(current.question_audio_url ?? generatedAudioUrl ?? "");
  const canAnswer = hasListened || Boolean(ttsError);

  useEffect(() => {
    setPick(null);
    setHasListened(false);
    setGeneratedAudioUrl(null);
    setTtsLoading(false);
    setTtsError(null);
    // Reset audio position for the next turn.
    try {
      if (audioRef.current) audioRef.current.currentTime = 0;
    } catch {
      /* ignore */
    }
  }, [idx, current.question_audio_url]);

  const submitPick = () => {
    if (submitting) return;
    if (!pick) return;
    const nextAnswers = [...answers, pick];
    if (idx + 1 >= turns.length) {
      let correct = 0;
      for (let i = 0; i < turns.length; i++) {
        if (String(nextAnswers[i] ?? "").trim() === String(turns[i]?.correct_answer ?? "").trim()) {
          correct += 1;
        }
      }
      onSubmit({
        user_turn_answers: nextAnswers,
        turns: turns.map((t) => ({
          question_en: t.question_en,
          reference_answer_en: t.correct_answer,
        })),
        averageScore0To100: turns.length ? (correct / turns.length) * 100 : 0,
      });
      return;
    }
    setAnswers(nextAnswers);
    setPick(null);
    setIdx((x) => x + 1);
  };

  return (
    <div className="space-y-4">
      {canAnswer ? (
        <p className="text-sm font-bold text-[#004AAD]">
          {String(content.scenario_title_en ?? "Interactive conversation (MCQ)")}
        </p>
      ) : null}
      <p className="text-xs font-mono font-bold text-neutral-500">
        Question {idx + 1} / {turns.length}
      </p>

      {!canAnswer ? (
        <>
          {audioSrc ? (
            <audio
              ref={audioRef}
              key={audioSrc}
              src={audioSrc}
              preload="none"
              onEnded={() => setHasListened(true)}
            />
          ) : null}
          <button
            type="button"
            disabled={submitting || ttsLoading}
            onClick={async () => {
              setHasListened(false);
              setTtsError(null);
              try {
                if (audioSrc) {
                  if (!audioRef.current) return;
                  audioRef.current.currentTime = 0;
                  await audioRef.current.play();
                  return;
                }
                // No audio_url provided -> generate on demand.
                setTtsLoading(true);
                const res = await fetch("/api/speech-synthesize", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ text: current.question_en }),
                });
                const j = (await res.json().catch(() => ({}))) as { audioBase64?: string; mimeType?: string };
                if (j.audioBase64 && j.mimeType) {
                  const url = `data:${j.mimeType};base64,${j.audioBase64}`;
                  setGeneratedAudioUrl(url);
                  window.setTimeout(() => {
                    try {
                      if (!audioRef.current) return;
                      audioRef.current.currentTime = 0;
                      void audioRef.current.play();
                    } catch {
                      /* ignore */
                    }
                  }, 50);
                  return;
                }
                setTtsError("Could not generate audio for this question.");
              } catch {
                setTtsError("Could not generate audio for this question.");
              } finally {
                setTtsLoading(false);
              }
            }}
            className="w-full rounded-[4px] border-4 border-black bg-ep-blue py-3 text-sm font-black text-white shadow-[4px_4px_0_0_#000] disabled:opacity-50"
          >
            {ttsLoading ? "Generating audio... / กำลังสร้างเสียง" : "Play audio (ฟังคำถามก่อน)"}
          </button>
          <p className="text-xs font-bold text-neutral-600">กดฟังเสียงก่อน แล้วค่อยเลือกคำตอบ</p>
          {ttsError ? <p className="text-xs font-bold text-red-700">{ttsError}</p> : null}
        </>
      ) : hasListened ? (
        <p className="rounded-[4px] border-4 border-black bg-emerald-50 p-3 text-sm font-black text-emerald-800">
          Audio finished. You can answer now / ฟังเสร็จแล้ว ตอบได้เลย
        </p>
      ) : ttsError ? (
        <p className="text-xs font-bold text-red-700">{ttsError}</p>
      ) : null}

      {canAnswer ? (
        <p className="rounded-[4px] border-4 border-black bg-[#004AAD]/5 p-3 text-sm font-bold">
          {current.question_en}
        </p>
      ) : null}

      <div className="grid gap-2">
        {(Array.isArray(current.options) ? current.options : []).map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setPick(o)}
            disabled={submitting || !canAnswer}
            className={`rounded-[4px] border-4 border-black px-3 py-2 text-left text-sm font-bold shadow-[4px_4px_0_0_#000] ${
              pick === o ? "bg-[#FFCC00]" : "bg-white"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={submitting || !pick || !canAnswer}
        onClick={submitPick}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000] disabled:opacity-50"
      >
        {submitting ? "Sending... / กำลังส่ง" : idx + 1 >= turns.length ? "Finish conversation" : "Next question"}
      </button>
    </div>
  );
}
