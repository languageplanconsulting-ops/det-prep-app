"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MiniStudyDictationSession } from "@/lib/mini-study/content";
import { getCachedAudioUrl } from "@/lib/mini-study/audio-cache";

type Props = { session: MiniStudyDictationSession };

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function MiniStudyDictationPhase({ session }: Props) {
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [audioByItem, setAudioByItem] = useState<Record<string, string>>({});
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [playsUsed, setPlaysUsed] = useState<Record<string, number>>({});
  const [results, setResults] = useState<{ id: string; correct: boolean }[]>([]);
  const [done, setDone] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const current = session.items[idx];
  const playsForCurrent = current ? playsUsed[current.id] ?? 0 : 0;
  const total = session.items.length;

  const ensureAudio = useCallback(
    async (itemId: string, text: string): Promise<string | null> => {
      if (audioByItem[itemId]) return audioByItem[itemId];
      setAudioLoading(true);
      setAudioError(null);
      try {
        const cached = await getCachedAudioUrl(text);
        if (cached) {
          setAudioByItem((prev) => ({ ...prev, [itemId]: cached }));
          setAudioLoading(false);
          return cached;
        }
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
          setAudioError(json.error ?? "สร้างเสียงไม่สำเร็จ Please try again.");
          return null;
        }
        const mime = json.mimeType ?? "audio/mpeg";
        const url = `data:${mime};base64,${json.audioBase64}`;
        setAudioByItem((prev) => ({ ...prev, [itemId]: url }));
        return url;
      } catch {
        setAudioError("เชื่อมต่อ TTS ไม่สำเร็จ Please try again.");
        return null;
      } finally {
        setAudioLoading(false);
      }
    },
    [audioByItem],
  );

  const playAudio = useCallback(async () => {
    if (!current) return;
    const url = await ensureAudio(current.id, current.sentence);
    if (!url) return;
    setPlaysUsed((prev) => ({ ...prev, [current.id]: (prev[current.id] ?? 0) + 1 }));
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.currentTime = 0;
      void audioRef.current.play().catch(() => {});
    }
  }, [current, ensureAudio]);

  useEffect(() => {
    if (!done && playsForCurrent === 0 && current && !audioLoading) {
      void playAudio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, done]);

  if (done) {
    const numCorrect = results.filter((r) => r.correct).length;
    return (
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#004AAD]">
            เรียนจบบทนี้แล้ว
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            {numCorrect} / {total} correct
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            ตรวจแบบ 100% — ต้องตรงทุกตัวอักษรถึงจะถูก
          </p>
        </div>

        <ol className="space-y-2">
          {results.map((r, i) => {
            const item = session.items[i];
            return (
              <li
                key={r.id}
                className={`rounded-xl border-2 ${r.correct ? "border-green-700 bg-green-50" : "border-red-700 bg-red-50"} p-3 text-sm`}
              >
                <span className="font-bold">{i + 1}.</span>{" "}
                <span className={r.correct ? "text-green-800" : "text-red-800"}>
                  {r.correct ? "✓" : "✗"}
                </span>{" "}
                <span className="text-neutral-800">{item.sentence}</span>
              </li>
            );
          })}
        </ol>

        <div className="flex justify-between gap-3">
          <Link
            href="/practice/mini-study"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold ring-1 ring-slate-300 shadow-sm hover:bg-slate-50 transition"
          >
            ← กลับไปหน้าหลัก
          </Link>
          <button
            type="button"
            onClick={() => {
              setIdx(0);
              setInput("");
              setChecked(false);
              setCorrect(null);
              setShowSolution(false);
              setResults([]);
              setPlaysUsed({});
              setDone(false);
            }}
            className="rounded-lg bg-[#FFCC00] px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:brightness-95 transition"
          >
            เริ่มบทใหม่
          </button>
        </div>
      </main>
    );
  }

  const handleCheck = () => {
    if (!current) return;
    const ok = normalize(input) === normalize(current.sentence);
    setCorrect(ok);
    setChecked(true);
    if (ok) setShowSolution(false);
  };

  const handleNext = () => {
    if (!current) return;
    setResults((prev) => [...prev, { id: current.id, correct: correct === true }]);
    if (idx + 1 >= total) {
      setDone(true);
      return;
    }
    setIdx((i) => i + 1);
    setInput("");
    setChecked(false);
    setCorrect(null);
    setShowSolution(false);
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <audio ref={audioRef} className="hidden" preload="auto" />

      <header className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-red-700">
            Session {session.index}
          </p>
          <h1 className="text-lg font-black">
            Item {idx + 1} / {total}
          </h1>
        </div>
        <div className="text-xs text-neutral-500">ฟังไป: {playsForCurrent}</div>
      </header>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={playAudio}
            disabled={audioLoading}
            className="rounded-lg bg-[#004AAD] px-5 py-3 text-sm font-semibold text-[#FFCC00] shadow-sm hover:shadow-md transition disabled:opacity-50"
          >
            {audioLoading ? "กำลังโหลด…" : playsForCurrent === 0 ? "▶ เล่นเสียง" : "↻ เล่นซ้ำ"}
          </button>
          <p className="text-xs text-neutral-500">
            พิมพ์ตามที่ได้ยินทุกตัวอักษร รวม comma ด้วย
          </p>
        </div>
        {audioError ? <p className="mt-3 text-sm text-red-700">{audioError}</p> : null}

        <textarea
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (checked) {
              setChecked(false);
              setCorrect(null);
              setShowSolution(false);
            }
          }}
          placeholder="พิมพ์ประโยคที่ได้ยินที่นี่…"
          rows={3}
          className="mt-4 w-full rounded-xl bg-white p-3 ring-1 ring-slate-200 text-base"
          autoFocus
        />

        {checked ? (
          <div
            className={`mt-3 rounded-xl border p-3 text-sm font-semibold ${
              correct ? "border-green-700 bg-green-50 text-green-800" : "border-red-700 bg-red-50 text-red-800"
            }`}
          >
            {correct ? "✓ ถูกต้อง — ตรง 100%!" : "✗ Not a 100% match. Try again, or click ดูเฉลย."}
          </div>
        ) : null}

        {showSolution ? (
          <div className="mt-3 space-y-2 rounded-xl bg-[#eef4ff] p-3 ring-1 ring-[#004AAD]/30">
            <div className="text-xs font-bold uppercase tracking-wide text-[#004AAD]">
              Solution
            </div>
            <div className="text-sm font-bold text-neutral-900">{current.sentence}</div>
            <div className="text-xs leading-6 text-neutral-700">{current.explanation}</div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!checked || !correct ? (
            <button
              type="button"
              onClick={handleCheck}
              disabled={!input.trim()}
              className="rounded-lg bg-[#FFCC00] px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:brightness-95 transition disabled:opacity-50"
            >
              Check
            </button>
          ) : null}
          {checked && !correct ? (
            <button
              type="button"
              onClick={() => setShowSolution(true)}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold ring-1 ring-slate-300 shadow-sm hover:bg-slate-50 transition"
            >
              ดูเฉลย
            </button>
          ) : null}
          {checked ? (
            <button
              type="button"
              onClick={handleNext}
              className="ml-auto rounded-lg bg-[#004AAD] px-4 py-2 text-sm font-semibold text-[#FFCC00] shadow-sm hover:shadow-md transition"
            >
              {idx + 1 >= total ? "จบ" : "Next →"}
            </button>
          ) : null}
        </div>
      </div>

      <Link href="/practice/mini-study" className="inline-block text-xs text-neutral-500 underline">
        ออกจากบทเรียน
      </Link>
    </main>
  );
}
