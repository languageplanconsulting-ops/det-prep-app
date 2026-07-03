"use client";

import { useEffect, useRef, useState } from "react";

import { synthesizeSpeechWithRetry } from "@/lib/admin-batch-speech";
import { browserSpeak, browserSpeakCancel, isBrowserTtsSupported } from "@/lib/browser-tts";
import { EqualizerBars, PrimaryButton, SoftCard } from "@/components/mini-diagnosis/steps/ui";

function base64ToBlob(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

const MAX_PLAYS = 3;

/**
 * Mini-diagnosis dictation: custom play control (no raw <audio> bar),
 * capped replays, soft mobile-first layout. Timer starts after first playback
 * via onAudioPlaybackFinished — same contract as the mock component.
 */
export function MiniDictationStep({
  content,
  submitting = false,
  onSubmit,
  onAudioPlaybackFinished,
}: {
  content: Record<string, unknown>;
  submitting?: boolean;
  onSubmit: (answer: unknown) => void;
  onAudioPlaybackFinished?: () => void;
}) {
  const refSentence = String(content.reference_sentence ?? "").trim();
  const audioUrl = String(content.audio_url ?? "").trim();

  const [text, setText] = useState("");
  const [playSrc, setPlaySrc] = useState<string | null>(audioUrl || null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(audioUrl ? "ready" : refSentence ? "loading" : "error");
  const [playsUsed, setPlaysUsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [firstPlayDone, setFirstPlayDone] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);
  const [browserTtsActive, setBrowserTtsActive] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Synthesize speech when no hosted audio.
  useEffect(() => {
    if (audioUrl || !refSentence) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    setStatus("loading");
    void (async () => {
      try {
        const { audioBase64, mimeType } = await synthesizeSpeechWithRetry({ text: refSentence, headers: {} });
        const mime = mimeType?.trim() || "audio/mpeg";
        objectUrl = URL.createObjectURL(base64ToBlob(audioBase64, mime));
        if (!cancelled) {
          setPlaySrc(objectUrl);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [audioUrl, refSentence]);

  useEffect(() => () => browserSpeakCancel(), []);

  // If there is nothing playable at all, release the timer immediately.
  useEffect(() => {
    if (status === "error" && !isBrowserTtsSupported() && !firstPlayDone) {
      onAudioPlaybackFinished?.();
      setFirstPlayDone(true);
    }
  }, [status, firstPlayDone, onAudioPlaybackFinished]);

  const markFirstPlayDone = () => {
    if (!firstPlayDone) {
      onAudioPlaybackFinished?.();
      setFirstPlayDone(true);
    }
  };

  const handlePlay = () => {
    if (playing || browserTtsActive || playsUsed >= MAX_PLAYS) return;
    // Hosted / synthesized audio path
    if (playSrc && !audioFailed) {
      const el = audioRef.current;
      if (!el) return;
      el.src = playSrc;
      el.currentTime = 0;
      setPlaysUsed((p) => p + 1);
      setPlaying(true);
      void el.play().catch(() => {
        setPlaying(false);
        setAudioFailed(true);
      });
      return;
    }
    // Browser-voice fallback
    if (refSentence && isBrowserTtsSupported()) {
      setPlaysUsed((p) => p + 1);
      setBrowserTtsActive(true);
      const started = browserSpeak(refSentence, {
        lang: "en-US",
        onEnd: () => {
          setBrowserTtsActive(false);
          markFirstPlayDone();
        },
      });
      if (!started) setBrowserTtsActive(false);
    }
  };

  const playsLeft = MAX_PLAYS - playsUsed;
  const isSpeaking = playing || browserTtsActive;
  const canPlay = status !== "loading" && playsLeft > 0 && !isSpeaking && !submitting;
  const words = text.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Listening zone */}
      <SoftCard className="text-center">
        <audio
          ref={audioRef}
          className="hidden"
          onEnded={() => {
            setPlaying(false);
            markFirstPlayDone();
          }}
          onError={() => {
            setPlaying(false);
            setAudioFailed(true);
          }}
        >
          <track kind="captions" />
        </audio>

        <button
          type="button"
          disabled={!canPlay}
          onClick={handlePlay}
          aria-label="เล่นเสียง"
          className={`relative mx-auto flex h-24 w-24 items-center justify-center rounded-full text-white shadow-lg transition active:scale-95 disabled:opacity-40 ${
            isSpeaking ? "bg-emerald-500" : "bg-ep-blue"
          }`}
        >
          {isSpeaking ? (
            <span className="text-3xl">
              <EqualizerBars playing />
            </span>
          ) : status === "loading" ? (
            <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-white/40 border-t-white" />
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-10 w-10">
              <path d="M8 5.14v13.72c0 .9.98 1.45 1.75.98l10.3-6.86a1.15 1.15 0 0 0 0-1.96L9.75 4.16A1.15 1.15 0 0 0 8 5.14Z" />
            </svg>
          )}
          {!isSpeaking && status === "ready" && playsUsed === 0 ? (
            <span className="absolute inset-0 -z-0 animate-ping rounded-full bg-ep-blue/25" />
          ) : null}
        </button>

        <p className="mt-3 text-sm font-semibold text-slate-700">
          {status === "loading"
            ? "กำลังเตรียมเสียง…"
            : isSpeaking
              ? "กำลังเล่นเสียง ฟังดีๆ นะ 🎧"
              : playsLeft > 0
                ? "แตะเพื่อฟังประโยค"
                : "ฟังครบแล้ว — พิมพ์สิ่งที่ได้ยินได้เลย"}
        </p>

        {/* plays-left dots */}
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {Array.from({ length: MAX_PLAYS }).map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${i < playsLeft ? "bg-ep-blue" : "bg-slate-200"}`}
            />
          ))}
          <span className="ml-1.5 text-xs text-slate-400">ฟังได้อีก {playsLeft} ครั้ง</span>
        </div>

        {status === "error" && !isBrowserTtsSupported() ? (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
            เสียงไม่พร้อมใช้งานชั่วคราว — พิมพ์คำตอบจากที่จำได้ หรือรีโหลดหน้า
          </p>
        ) : null}
        {(status === "error" || audioFailed) && isBrowserTtsSupported() ? (
          <p className="mt-3 text-xs text-slate-400">ระบบใช้เสียงสำรองของเบราว์เซอร์ให้อัตโนมัติ</p>
        ) : null}
      </SoftCard>

      {/* Typing zone */}
      <SoftCard>
        <div className="flex items-center justify-between">
          <label htmlFor="minidiag-dictation-input" className="text-sm font-bold text-slate-800">
            พิมพ์สิ่งที่ได้ยิน
          </label>
          <span className="font-mono text-xs text-slate-400">{words} คำ</span>
        </div>
        <textarea
          id="minidiag-dictation-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          disabled={submitting}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Type what you hear…"
          className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-3 text-base leading-relaxed text-slate-900 outline-none transition focus:border-ep-blue focus:bg-white"
        />
        <p className="mt-1.5 text-xs text-slate-400">เว้นวรรคและเครื่องหมาย , สำคัญต่อคะแนน</p>
      </SoftCard>

      <PrimaryButton disabled={submitting || !text.trim()} onClick={() => onSubmit({ answer: text })}>
        {submitting ? "กำลังส่ง…" : "ส่งคำตอบ"}
      </PrimaryButton>
    </div>
  );
}
