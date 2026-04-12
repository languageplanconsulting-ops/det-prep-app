"use client";

import { useEffect, useState } from "react";

import { synthesizeSpeechWithRetry } from "@/lib/admin-batch-speech";

function base64ToBlob(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

type Props = {
  content: Record<string, unknown>;
  onSubmit: (answer: string) => void;
};

/**
 * Dictation for mock tests: plays `audio_url` when set; otherwise synthesizes
 * speech from `reference_sentence` via `/api/speech-synthesize` (Amazon Polly by default).
 */
export function MockTestDictation({ content, onSubmit }: Props) {
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
          provider: "polly",
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
              : "Could not synthesize audio. Set AWS keys for Polly (or GEMINI_API_KEY) or add audio_url.",
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
      {playSrc ? (
        <audio controls className="w-full" src={playSrc} key={playSrc}>
          <track kind="captions" />
        </audio>
      ) : null}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="w-full rounded-[4px] border-4 border-black bg-white p-3 text-sm"
        placeholder="Type what you hear / พิมพ์สิ่งที่ได้ยิน"
      />
      <button
        type="button"
        onClick={() => onSubmit(text)}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000]"
      >
        ส่งคำตอบ / Submit
      </button>
    </div>
  );
}
