"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DictationReport } from "@/components/dictation/DictationReport";
import { getDictationAudioDataUrlByItemId } from "@/lib/dictation-audio-indexeddb";
import { dictationScoreFromDiff, diffDictationChars } from "@/lib/dictation-diff";
import { dictationMaxForDifficulty, saveDictationAttempt } from "@/lib/dictation-storage";
import type { DictationDifficulty, DictationItem, DictationRoundNum } from "@/types/dictation";

export function DictationSessionClient({
  item,
  round,
  difficulty,
  setNumber,
}: {
  item: DictationItem;
  round: DictationRoundNum;
  difficulty: DictationDifficulty;
  setNumber: number;
}) {
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
    saveDictationAttempt({
      round,
      difficulty,
      setNumber,
      attainedScore: score,
      maxScore,
    });
    setPhase("report");
    setReportKey((k) => k + 1);
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

  if (phase === "report") {
    return (
      <div className="space-y-6">
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
        <DictationReport
          key={reportKey}
          expected={item.transcript}
          userText={userText}
          maxScore={maxScore}
          onPracticeAgain={practiceAgain}
          onFixSubmit={handleFixSubmit}
        />
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
          Use <strong>Play</strong> / <strong>Pause</strong> and <strong>Replay −5s</strong> as needed. Type the full sentence in the box
          — no feedback until you submit.
        </p>
        <p className="mt-2 text-xs font-bold text-neutral-600">
          Audio source: {hasSavedAudio ? "Saved audio (fallback: Gemini API -> Browser TTS)" : "Gemini API fallback"}
        </p>
      </header>

      <div className="ep-brutal rounded-sm border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="text-xs font-bold uppercase tracking-wide text-neutral-700">Audio</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="border-4 border-black bg-ep-blue px-4 py-2 text-sm font-black uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
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
