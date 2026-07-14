"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DictationReport } from "@/components/dictation/DictationReport";
import { StickyExamCTA } from "@/components/practice/StickyExamCTA";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { getDictationAudioDataUrlByItemId } from "@/lib/dictation-audio-indexeddb";
import { dictationScoreFromDiff, diffDictationChars } from "@/lib/dictation-diff";
import { sfxCorrect, sfxTransition, sfxWrong } from "@/lib/exam-sfx";
import { dictationMaxForDifficulty, saveDictationAttempt } from "@/lib/dictation-storage";
import type { DictationDifficulty, DictationItem, DictationRoundNum } from "@/types/dictation";

export function DictationSessionClient({
  item,
  round,
  difficulty,
  setNumber,
  onRunnerComplete,
}: {
  item: DictationItem;
  round: DictationRoundNum;
  difficulty: DictationDifficulty;
  setNumber: number;
  /** Fired once scoring completes, in addition to the normal report flow — used by the
   * daily-practice runner (src/components/practice/daily-runner) to advance to the next item. */
  onRunnerComplete?: (scorePct: number, maxScore: number) => void;
}) {
  const { isAdmin, previewEligible } = useEffectiveTier();
  const soft = true;

  const [phase, setPhase] = useState<"practice" | "report">("practice");
  const [userText, setUserText] = useState("");
  const [reportKey, setReportKey] = useState(0);
  const [audioErr, setAudioErr] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const apiFallbackSrcRef = useRef<string | null>(null);
  const indexedDbAudioSrcRef = useRef<string | null>(null);

  const maxScore = dictationMaxForDifficulty(difficulty);
  const setsHref = `/practice/literacy/dictation/round/${round}/${difficulty}`;
  const hubHref = "/practice/literacy/dictation";
  const hasSavedAudio = Boolean(item.audioBase64?.trim() || item.audioInIndexedDb);

  const playBrowserTTS = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setAudioErr("This browser does not support text-to-speech.");
      return;
    }
    const synth = window.speechSynthesis;
    if (synth.speaking) {
      synth.cancel();
      setPlaying(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(item.transcript);
    u.lang = "en-US";
    u.rate = 0.9;
    u.pitch = 1;
    u.onstart = () => setPlaying(true);
    u.onend = () => setPlaying(false);
    u.onerror = () => {
      setPlaying(false);
      setAudioErr("Could not use computer voice in this browser.");
    };
    utteranceRef.current = u;
    synth.speak(u);
  }, [item.transcript]);

  const fetchApiFallbackSrc = useCallback(async (): Promise<string | null> => {
    if (apiFallbackSrcRef.current) return apiFallbackSrcRef.current;
    const res = await fetch("/api/speech-fallback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: item.transcript }),
    });
    const data = (await res.json()) as { audioBase64?: string; mimeType?: string; error?: string };
    if (!res.ok || !data.audioBase64) {
      throw new Error(data.error || `Fallback synthesis failed (${res.status})`);
    }
    const mime = data.mimeType?.trim() || "audio/mpeg";
    const src = data.audioBase64.startsWith("data:audio/")
      ? data.audioBase64
      : `data:${mime};base64,${data.audioBase64}`;
    apiFallbackSrcRef.current = src;
    return src;
  }, [item.transcript]);

  const playApiFallback = useCallback(async () => {
    try {
      const src = await fetchApiFallbackSrc();
      if (!src) throw new Error("No fallback audio");
      if (!audioRef.current) {
        audioRef.current = new Audio(src);
      } else {
        audioRef.current.src = src;
      }
      const a = audioRef.current;
      if (!a) return;
      a.currentTime = 0;
      a.onplay = () => setPlaying(true);
      a.onpause = () => setPlaying(false);
      a.onended = () => setPlaying(false);
      a.onerror = () => {
        setPlaying(false);
        setAudioErr("API fallback failed. Using browser voice.");
        playBrowserTTS();
      };
      await a.play();
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Unknown error";
      setAudioErr(`API fallback unavailable (${reason}). Using browser voice.`);
      playBrowserTTS();
    }
  }, [fetchApiFallbackSrc, playBrowserTTS]);

  const buildInlineAudioSrc = useCallback((): string | null => {
    const raw = item.audioBase64?.trim();
    if (!raw) return null;
    if (raw.startsWith("data:audio/")) return raw;
    const mime = item.audioMimeType?.trim() || "audio/wav";
    return `data:${mime};base64,${raw}`;
  }, [item.audioBase64, item.audioMimeType]);

  const resolveSavedAudioSrc = useCallback(async (): Promise<string | null> => {
    const inline = buildInlineAudioSrc();
    if (inline) return inline;
    if (!item.audioInIndexedDb) return null;
    if (indexedDbAudioSrcRef.current) return indexedDbAudioSrcRef.current;
    const src = await getDictationAudioDataUrlByItemId(item.id);
    if (!src) return null;
    indexedDbAudioSrcRef.current = src;
    return src;
  }, [buildInlineAudioSrc, item.audioInIndexedDb, item.id]);

  const togglePlay = useCallback(() => {
    void (async () => {
      const src = await resolveSavedAudioSrc();
      if (src) {
        if (!audioRef.current) {
          audioRef.current = new Audio(src);
        }
        const a = audioRef.current;
        if (!a) return;
        if (!a.paused) {
          a.pause();
          setPlaying(false);
          return;
        }
        a.currentTime = 0;
        a.onplay = () => setPlaying(true);
        a.onpause = () => setPlaying(false);
        a.onended = () => setPlaying(false);
        a.onerror = () => {
          setPlaying(false);
          setAudioErr("Saved audio failed. Falling back to API voice.");
          void playApiFallback();
        };
        void a.play().catch(() => {
          setPlaying(false);
          setAudioErr("Saved audio failed. Falling back to API voice.");
          void playApiFallback();
        });
        return;
      }
      void playApiFallback();
    })();
  }, [playApiFallback, resolveSavedAudioSrc]);

  const replayFive = useCallback(() => {
    void (async () => {
      const src = await resolveSavedAudioSrc();
      if (src) {
        if (!audioRef.current) {
          audioRef.current = new Audio(src);
        }
        const a = audioRef.current;
        if (!a) return;
        a.currentTime = 0;
        a.onplay = () => setPlaying(true);
        a.onpause = () => setPlaying(false);
        a.onended = () => setPlaying(false);
        void a.play().catch(() => {
          setPlaying(false);
          setAudioErr("Saved audio failed. Falling back to API voice.");
          void playApiFallback();
        });
        return;
      }
      void playApiFallback();
    })();
  }, [playApiFallback, resolveSavedAudioSrc]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const submitPractice = () => {
    const d = diffDictationChars(item.transcript, userText);
    const score = dictationScoreFromDiff(d.correctChars, d.totalChars, maxScore);
    if (score >= maxScore * 0.6) sfxCorrect();
    else sfxWrong();
    saveDictationAttempt({
      round,
      difficulty,
      setNumber,
      attainedScore: score,
      maxScore,
    });
    setPhase("report");
    setReportKey((k) => k + 1);
    onRunnerComplete?.(maxScore > 0 ? (score / maxScore) * 100 : 0, maxScore);
  };

  const handleFixSubmit = (merged: string, newScore: number) => {
    saveDictationAttempt({
      round,
      difficulty,
      setNumber,
      attainedScore: newScore,
      maxScore,
    });
    setUserText(merged);
    setReportKey((k) => k + 1);
  };

  const practiceAgain = () => {
    sfxTransition();
    setUserText("");
    setPhase("practice");
    setAudioErr(null);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(false);
  };

  const inRunner = !!onRunnerComplete;

  if (phase === "report") {
    return (
      <div key={phase} className="ep-step-slide-in space-y-6">
        {!inRunner && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={setsHref}
              className="ep-interactive text-sm font-bold uppercase tracking-wide text-ep-blue underline-offset-2 hover:underline"
            >
              ← Sets
            </Link>
            <p className="ep-stat text-xs text-neutral-500">
              Round {round} · set {setNumber} · {item.hintText}
            </p>
          </div>
        )}
        <DictationReport
          key={reportKey}
          expected={item.transcript}
          userText={userText}
          maxScore={maxScore}
          round={round}
          difficulty={difficulty}
          setNumber={setNumber}
          onPracticeAgain={practiceAgain}
          onFixSubmit={handleFixSubmit}
          inRunner={inRunner}
        />
      </div>
    );
  }

  if (soft) {
    // ── Soft-modern admin rebuild — same handlers/state, new presentation ──
    return (
      <div key={phase} className="ep-step-slide-in mx-auto max-w-2xl space-y-4">
        {!inRunner && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link href={setsHref} className="font-semibold hover:text-[#004AAD]">
              ← ชุดข้อสอบ
            </Link>
            <span>·</span>
            <Link href={hubHref} className="hover:text-[#004AAD]">
              ทุกรอบ
            </Link>
          </div>
        )}

        <div className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200 sm:p-6">
          <header className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-xl text-white">
                🎧
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  Dictation · รอบ {round} · {difficulty}
                </p>
                <h1 className="text-lg font-bold">Set {setNumber}</h1>
              </div>
            </div>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-700">
              ฟังแล้วพิมพ์
            </span>
          </header>

          {/* audio */}
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <button
              type="button"
              data-no-sfx
              onClick={togglePlay}
              className="inline-flex items-center gap-2 rounded-xl bg-[#004AAD] px-5 py-2.5 text-sm font-bold text-[#FFCC00] hover:opacity-90"
            >
              {playing ? "⏸ หยุด" : "▶ เล่นเสียง"}
            </button>
            <button
              type="button"
              data-no-sfx
              onClick={replayFive}
              className="inline-flex items-center gap-2 rounded-xl bg-[#FFCC00] px-5 py-2.5 text-sm font-extrabold text-[#004AAD] hover:opacity-90"
            >
              ↻ ฟังซ้ำ
            </button>
            <span className="ml-auto text-xs text-slate-500">
              ฟังกี่ครั้งก็ได้ · ยังไม่มีคำใบ้จนกว่าจะส่ง
            </span>
          </div>
          {audioErr ? <p className="mb-3 text-sm font-semibold text-rose-600">{audioErr}</p> : null}

          {/* input */}
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            พิมพ์ประโยคที่ได้ยิน
          </p>
          <textarea
            id="dictation-input"
            value={userText}
            onChange={(e) => setUserText(e.target.value)}
            rows={5}
            spellCheck={false}
            placeholder="พิมพ์ทั้งประโยคที่นี่…"
            className="w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-base leading-relaxed outline-none focus:border-[#004AAD]"
            style={{ fontFamily: "var(--font-jetbrains), ui-monospace, monospace" }}
          />
          <StickyExamCTA>
            <button
              type="button"
              onClick={submitPractice}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#004AAD] px-6 py-3.5 text-base font-bold text-[#FFCC00] hover:opacity-90"
            >
              ส่งคำตอบ →
            </button>
          </StickyExamCTA>

          {/* coach tip */}
          <div className="mt-5 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#004AAD] text-xl font-extrabold text-[#FFCC00] ring-[2.5px] ring-[#FFCC00]">
              D
            </div>
            <div className="relative flex-1 rounded-2xl rounded-tl-sm border border-[#004AAD]/10 bg-white px-3.5 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
              <span className="absolute -left-[7px] top-3.5 h-0 w-0 border-y-[6px] border-r-[7px] border-y-transparent border-r-white" />
              <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-[#FFCC00] px-2.5 py-[5px] text-[10px] font-extrabold uppercase leading-none tracking-wide text-[#004AAD]">
                <span className="text-[11px] leading-none">✨</span>Tips from P&apos;Doy
              </span>
              <p className="text-[13px] leading-6 text-slate-800">
                ตัวพิมพ์ใหญ่/จุด ไม่นับ แต่ <strong>comma ต้องตรง</strong> · ระวัง{" "}
                <strong>-ed, -s ท้ายคำ</strong> ที่สุด — จุดนี้แหละที่ทำคะแนนหลุด
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={setsHref}
          className="ep-interactive text-sm font-bold uppercase tracking-wide text-ep-blue underline-offset-2 hover:underline"
        >
          ← Sets
        </Link>
        <Link href={hubHref} className="ep-interactive ep-stat text-xs text-neutral-500">
          All rounds
        </Link>
      </div>

      <header className="ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-ep-blue">Dictation set {setNumber}</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">Listen and type</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Listen carefully and type the full sentence in the box. You will see feedback after you submit.
        </p>
      </header>

      <div className="ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="text-xs font-bold uppercase tracking-wide text-neutral-700">Audio</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            data-no-sfx
            onClick={togglePlay}
            className="border-4 border-black bg-ep-blue px-4 py-2 text-sm font-black uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            data-no-sfx
            onClick={replayFive}
            className="border-4 border-black bg-ep-yellow px-4 py-2 text-sm font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            Replay
          </button>
        </div>
        {audioErr ? <p className="mt-3 text-sm font-bold text-red-700">{audioErr}</p> : null}
      </div>

      <div className="ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <label htmlFor="dictation-input" className="text-xs font-bold uppercase tracking-wide text-neutral-700">
          Your dictation
        </label>
        <textarea
          id="dictation-input"
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
          rows={8}
          spellCheck={false}
          placeholder="Type the full sentence here. No hints until you submit."
          className="mt-3 w-full resize-y border-4 border-black bg-neutral-50 p-4 text-base leading-relaxed shadow-[4px_4px_0_0_#000] outline-none focus:bg-white"
          style={{ fontFamily: "var(--font-jetbrains), ui-monospace, monospace" }}
        />
        <button
          type="button"
          onClick={submitPractice}
          className="mt-4 w-full border-4 border-black bg-ep-blue py-3 text-sm font-black uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none sm:w-auto sm:px-10"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
