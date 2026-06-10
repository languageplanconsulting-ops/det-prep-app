"use client";

import { useEffect, useState } from "react";

import { synthesizeSpeechWithRetry } from "@/lib/admin-batch-speech";
import { browserSpeak, browserSpeakCancel, isBrowserTtsSupported } from "@/lib/browser-tts";

function base64ToBlob(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

type Props = {
  content: Record<string, unknown>;
  onSubmit: (answer: string) => void;
  onAudioPlaybackFinished?: () => void;
  submitting?: boolean;
};

/**
 * Dictation for mock tests: plays `audio_url` when set; otherwise synthesizes
 * speech from `reference_sentence` via `/api/speech-synthesize` (Deepgram first when configured).
 */
export function MockTestDictation({
  content,
  onSubmit,
  onAudioPlaybackFinished,
  submitting = false,
}: Props) {
  const [text, setText] = useState("");
  const refSentence = String(content.reference_sentence ?? "").trim();
  const audioUrl = String(content.audio_url ?? "").trim();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(() => {
    if (audioUrl) return "ready";
    if (refSentence) return "loading";
    return "error";
  });
  const [error, setError] = useState<string | null>(() =>
    !audioUrl && !refSentence ? "Dictation needs reference_sentence (or audio_url)." : null,
  );
  const [playFinishedNotified, setPlayFinishedNotified] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);
  const [browserTtsActive, setBrowserTtsActive] = useState(false);

  // Cancel any in-flight browser speech when the question changes / component unmounts.
  useEffect(() => {
    return () => {
      browserSpeakCancel();
    };
  }, [refSentence, audioUrl]);

  const playBrowserTts = () => {
    if (!refSentence) return;
    setBrowserTtsActive(true);
    const started = browserSpeak(refSentence, {
      lang: "en-US",
      onEnd: () => {
        setBrowserTtsActive(false);
        if (!playFinishedNotified) {
          onAudioPlaybackFinished?.();
          setPlayFinishedNotified(true);
        }
      },
    });
    if (!started) setBrowserTtsActive(false);
  };

  useEffect(() => {
    if (audioUrl) {
      setBlobUrl(null);
      setStatus("ready");
      setError(null);
      return;
    }
    if (!refSentence) {
      setBlobUrl(null);
      setStatus("error");
      setError("Dictation needs reference_sentence (or audio_url).");
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;
    setBlobUrl(null);
    setStatus("loading");
    setError(null);

    void (async () => {
      try {
        const { audioBase64, mimeType } = await synthesizeSpeechWithRetry({
          text: refSentence,
          headers: {},
        });
        const mime = mimeType?.trim() || "audio/mpeg";
        objectUrl = URL.createObjectURL(base64ToBlob(audioBase64, mime));
        if (!cancelled) {
          setBlobUrl(objectUrl);
          setStatus("ready");
        }
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setError(
            e instanceof Error
              ? e.message
              : "Could not synthesize audio. กรุณาลองใหม่อีกครั้ง",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [audioUrl, refSentence]);

  const playSrc = audioUrl || blobUrl || undefined;

  useEffect(() => {
    if (playFinishedNotified) return;
    if (!playSrc) {
      onAudioPlaybackFinished?.();
      setPlayFinishedNotified(true);
    }
  }, [onAudioPlaybackFinished, playFinishedNotified, playSrc]);

  return (
    <div className="space-y-4">
      <p className="text-sm font-bold">{String(content.instruction_th ?? "")}</p>
      <p className="text-xs text-neutral-600">{String(content.instruction ?? "")}</p>
      {status === "loading" && !audioUrl ? (
        <p className="rounded-[4px] border-4 border-black bg-neutral-50 p-3 text-sm text-neutral-700">
          กำลังสร้างเสียง… / Generating audio…
        </p>
      ) : null}
      {status === "error" && error ? (
        <p className="rounded-[4px] border-4 border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>
      ) : null}
      {playSrc && !audioFailed ? (
        <audio
          controls
          autoPlay
          className="w-full"
          src={playSrc}
          key={playSrc}
          onError={() => setAudioFailed(true)}
          onEnded={() => {
            if (!playFinishedNotified) {
              onAudioPlaybackFinished?.();
              setPlayFinishedNotified(true);
            }
          }}
        >
          <track kind="captions" />
        </audio>
      ) : null}
      {(audioFailed || status === "error") && refSentence && isBrowserTtsSupported() ? (
        <div className="space-y-2 rounded-[4px] border-4 border-black bg-yellow-50 p-3">
          <p className="text-xs font-bold text-neutral-700">
            Hosted audio unavailable — use your browser's voice as a backup.
          </p>
          <button
            type="button"
            disabled={submitting || browserTtsActive}
            onClick={playBrowserTts}
            className="rounded-[4px] border-2 border-black bg-white px-3 py-2 text-xs font-black shadow-[2px_2px_0_0_#000] disabled:opacity-50"
          >
            {browserTtsActive ? "🔊 Speaking…" : "🔊 Read aloud (browser voice)"}
          </button>
        </div>
      ) : null}
      {playSrc && !playFinishedNotified ? (
        <button
          type="button"
          onClick={() => {
            onAudioPlaybackFinished?.();
            setPlayFinishedNotified(true);
          }}
          className="rounded-[4px] border-2 border-black bg-neutral-50 px-3 py-2 text-xs font-bold"
        >
          I finished listening (start timer)
        </button>
      ) : null}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="w-full rounded-[4px] border-4 border-black bg-white p-3 text-sm"
        placeholder="Type what you hear / พิมพ์สิ่งที่ได้ยิน"
        disabled={submitting}
      />
      <button
        type="button"
        disabled={submitting}
        onClick={() => onSubmit(text)}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "ส่งคำตอบ... / Sending" : "ส่งคำตอบ / Submit"}
      </button>
    </div>
  );
}
