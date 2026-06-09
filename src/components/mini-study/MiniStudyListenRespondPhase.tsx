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
          setAudioError(json.error ?? "สร้างเสียงไม่สำเร็จ");
          return null;
        }
        const url = `data:${json.mimeType ?? "audio/mpeg"};base64,${json.audioBase64}`;
        setAudioByEx((p) => ({ ...p, [id]: url }));
        return url;
      } catch {
        setAudioError("เชื่อมต่อ TTS ไม่สำเร็จ");
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
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#004AAD]">
            เรียนจบบทนี้แล้ว
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            {numCorrect} / {total} correct
          </h1>
        </div>
        <Link
          href="/practice/mini-study"
          className="inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold ring-1 ring-slate-300 shadow-sm hover:bg-slate-50 transition"
        >
          ← กลับไปหน้าหลัก
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

      <header className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <p className="text-xs font-semibold uppercase tracking-wider text-red-700">
          Session {session.index}
        </p>
        <h1 className="mt-1 text-lg font-black">
          {ex.title} ({idx + 1} / {total})
        </h1>
      </header>

      <div className="rounded-xl bg-[#eef4ff] p-3 ring-1 ring-[#004AAD]/30 text-sm leading-7 text-neutral-800">
        <strong>บริบทสั้นๆ:</strong> {ex.scenarioRecapTh}
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-sm font-black uppercase tracking-wide text-neutral-500">
          บทสนทนาที่ผ่านมา
        </h2>
        <div className="mt-2 space-y-2 text-sm leading-7">
          {ex.conversationSoFar.map((t, i) => (
            <p key={i}>
              <span className="font-bold">{t.speaker}:</span> "{t.text}"
            </p>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-base font-black text-[#004AAD]">{ex.turnLabel}</h2>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={playAudio}
            disabled={audioLoading}
            className="rounded-lg bg-[#004AAD] px-5 py-3 text-sm font-semibold text-[#FFCC00] shadow-sm hover:shadow-md transition disabled:opacity-50"
          >
            {audioLoading ? "กำลังโหลด…" : plays === 0 ? "▶ เล่นเสียง" : "↻ เล่นซ้ำ"}
          </button>
          <span className="text-xs text-neutral-500">ฟังไป: {plays}</span>
        </div>
        {audioError ? <p className="mt-2 text-sm text-red-700">{audioError}</p> : null}

        <h3 className="mt-5 text-sm font-bold">{ex.question}</h3>
        <div className="mt-2 space-y-2">
          {ex.options.map((o) => {
            const isPicked = picked === o.letter;
            const isCorrectOption = o.letter === ex.correctLetter;
            const baseClass = "block w-full rounded-xl border px-3 py-2 text-left text-sm";
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
              className={`rounded-xl border p-3 text-sm font-semibold ${
                isCorrect ? "border-green-700 bg-green-50 text-green-800" : "border-red-700 bg-red-50 text-red-800"
              }`}
            >
              {isCorrect
                ? `✓ Correct — ${ex.correctLetter}`
                : `✗ Not quite — correct answer is ${ex.correctLetter}`}
            </div>
            <div className="space-y-2 rounded-xl bg-[#eef4ff] p-3 ring-1 ring-[#004AAD]/30 text-sm leading-7">
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
                className="rounded-lg bg-[#004AAD] px-5 py-2 text-sm font-semibold text-[#FFCC00] shadow-sm hover:shadow-md transition"
              >
                {idx + 1 >= total ? "จบ" : "ข้อถัดไป →"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <Link href="/practice/mini-study" className="inline-block text-xs text-neutral-500 underline">
        ออกจากบทเรียน
      </Link>
    </main>
  );
}
