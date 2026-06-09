"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  MiniStudyListenRespondExercise,
  MiniStudyListenRespondSession,
} from "@/lib/mini-study/content";

type Props = { session: MiniStudyListenRespondSession };

export function MiniStudyListenRespondPhase({ session }: Props) {
  const [idx, setIdx] = useState(0);
  const [audioByEx, setAudioByEx] = useState<Record<string, string>>({});
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [playsUsed, setPlaysUsed] = useState<Record<string, number>>({});
  const [picked, setPicked] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [results, setResults] = useState<{ id: string; correct: boolean }[]>([]);
  const [done, setDone] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const ex: MiniStudyListenRespondExercise | undefined = session.exercises[idx];
  const plays = ex ? playsUsed[ex.id] ?? 0 : 0;
  const total = session.exercises.length;

  const ensureAudio = useCallback(
    async (id: string, text: string) => {
      if (audioByEx[id]) return audioByEx[id];
      setAudioLoading(true);
      setAudioError(null);
      try {
        const res = await fetch("/api/speech-synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, provider: "deepgram" }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          audioBase64?: string;
          mimeType?: string;
          error?: string;
        };
        if (!res.ok || !json.audioBase64) {
          setAudioError(json.error ?? "Could not generate audio.");
          return null;
        }
        const url = `data:${json.mimeType ?? "audio/mpeg"};base64,${json.audioBase64}`;
        setAudioByEx((p) => ({ ...p, [id]: url }));
        return url;
      } catch {
        setAudioError("TTS connection failed.");
        return null;
      } finally {
        setAudioLoading(false);
      }
    },
    [audioByEx],
  );

  const playAudio = useCallback(async () => {
    if (!ex) return;
    const url = await ensureAudio(ex.id, ex.audioText);
    if (!url) return;
    setPlaysUsed((p) => ({ ...p, [ex.id]: (p[ex.id] ?? 0) + 1 }));
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.currentTime = 0;
      void audioRef.current.play().catch(() => {});
    }
  }, [ex, ensureAudio]);

  useEffect(() => {
    if (!done && ex && plays === 0 && !audioLoading) {
      void playAudio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, done]);

  if (done) {
    const numCorrect = results.filter((r) => r.correct).length;
    return (
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="rounded-sm border-4 border-black bg-white p-6 shadow-[6px_6px_0_0_#111]">
          <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-[#004AAD]">
            Session complete
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            {numCorrect} / {total} correct
          </h1>
        </div>
        <Link
          href="/practice/mini-study"
          className="inline-block rounded-[4px] border-4 border-black bg-white px-4 py-2 text-sm font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000]"
        >
          ← All sessions
        </Link>
      </main>
    );
  }

  if (!ex) return null;

  const checked = picked !== null;
  const correctOpt = ex.options.find((o) => o.letter === ex.correctLetter)!;
  const pickedOpt = ex.options.find((o) => o.letter === picked);
  const isCorrect = picked === ex.correctLetter;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <audio ref={audioRef} className="hidden" preload="auto" />

      <header className="rounded-sm border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#111]">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-red-700">
          Session {session.index}
        </p>
        <h1 className="mt-1 text-lg font-black">
          {ex.title} ({idx + 1} / {total})
        </h1>
      </header>

      <div className="rounded-sm border-2 border-[#004AAD] bg-[#eef4ff] p-3 text-sm leading-7 text-neutral-800">
        <strong>บริบทสั้นๆ:</strong> {ex.scenarioRecapTh}
      </div>

      <div className="rounded-sm border-4 border-black bg-white p-5 shadow-[4px_4px_0_0_#111]">
        <h2 className="text-sm font-black uppercase tracking-wide text-neutral-500">
          Conversation so far
        </h2>
        <div className="mt-2 space-y-2 text-sm leading-7">
          {ex.conversationSoFar.map((t, i) => (
            <p key={i}>
              <span className="font-bold">{t.speaker}:</span> "{t.text}"
            </p>
          ))}
        </div>
      </div>

      <div className="rounded-sm border-4 border-black bg-white p-5 shadow-[6px_6px_0_0_#111]">
        <h2 className="text-base font-black text-[#004AAD]">{ex.turnLabel}</h2>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={playAudio}
            disabled={audioLoading}
            className="rounded-[4px] border-4 border-black bg-[#004AAD] px-5 py-3 text-sm font-black uppercase tracking-wide text-[#FFCC00] shadow-[4px_4px_0_0_#000] disabled:opacity-50"
          >
            {audioLoading ? "Loading…" : plays === 0 ? "▶ Play audio" : "↻ Play again"}
          </button>
          <span className="text-xs text-neutral-500">Plays: {plays}</span>
        </div>
        {audioError ? <p className="mt-2 text-sm text-red-700">{audioError}</p> : null}

        <h3 className="mt-5 text-sm font-bold">{ex.question}</h3>
        <div className="mt-2 space-y-2">
          {ex.options.map((o) => {
            const isPicked = picked === o.letter;
            const isCorrectOption = o.letter === ex.correctLetter;
            const baseClass = "block w-full rounded-sm border-2 px-3 py-2 text-left text-sm";
            const colorClass = checked
              ? isCorrectOption
                ? "border-green-700 bg-green-50"
                : isPicked
                  ? "border-red-700 bg-red-50"
                  : "border-neutral-300 bg-white text-neutral-500"
              : isPicked
                ? "border-[#004AAD] bg-[#eef4ff] font-bold"
                : "border-black bg-white hover:bg-neutral-50";
            return (
              <button
                key={o.letter}
                type="button"
                onClick={() => !checked && setPicked(o.letter)}
                disabled={checked}
                className={`${baseClass} ${colorClass}`}
              >
                <span className="mr-2 font-black">{o.letter}.</span>
                {o.text}
              </button>
            );
          })}
        </div>

        {checked ? (
          <div className="mt-4 space-y-3">
            <div
              className={`rounded-sm border-2 p-3 text-sm font-bold ${
                isCorrect ? "border-green-700 bg-green-50 text-green-800" : "border-red-700 bg-red-50 text-red-800"
              }`}
            >
              {isCorrect
                ? `✓ Correct — ${ex.correctLetter}`
                : `✗ Not quite — correct answer is ${ex.correctLetter}`}
            </div>
            <div className="space-y-2 rounded-sm border-2 border-[#004AAD] bg-[#eef4ff] p-3 text-sm leading-7">
              <p>
                <strong>คำอธิบาย:</strong>
              </p>
              {ex.options.map((o) => (
                <p key={o.letter}>
                  <span className={o.letter === ex.correctLetter ? "text-green-800" : "text-red-800"}>
                    {o.letter === ex.correctLetter ? "✅" : "❌"}
                  </span>{" "}
                  <strong>{o.letter}</strong> — {o.explanationTh}
                </p>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setResults((p) => [...p, { id: ex.id, correct: isCorrect }]);
                  if (idx + 1 >= total) {
                    setDone(true);
                    return;
                  }
                  setIdx((i) => i + 1);
                  setPicked(null);
                }}
                className="rounded-[4px] border-4 border-black bg-[#004AAD] px-5 py-2 text-sm font-black uppercase tracking-wide text-[#FFCC00] shadow-[4px_4px_0_0_#000]"
              >
                {idx + 1 >= total ? "Finish" : "Next exercise →"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <Link href="/practice/mini-study" className="inline-block text-xs text-neutral-500 underline">
        Exit session
      </Link>
    </main>
  );
}
