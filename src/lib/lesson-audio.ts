/**
 * TTS playback for lesson runners — mirrors det-mobile's audio-play.ts
 * `speakText` (Deepgram network TTS preferred, browser speechSynthesis
 * fallback on failure). Reuses the SAME /api/speech-synthesize route the
 * rest of the web app already uses (mock test, mini-study, study-plan).
 */
import { browserSpeak } from "@/lib/browser-tts";

const urlCache = new Map<string, string>();

async function synthesize(text: string): Promise<string | null> {
  const cached = urlCache.get(text);
  if (cached) return cached;
  try {
    const res = await fetch("/api/speech-synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, provider: "deepgram" }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      audioBase64?: string;
      mimeType?: string;
    };
    if (!res.ok || !json.audioBase64) return null;
    const url = `data:${json.mimeType ?? "audio/mpeg"};base64,${json.audioBase64}`;
    urlCache.set(text, url);
    return url;
  } catch {
    return null;
  }
}

export type LessonPlayer = { play: () => void };

/** Returns a player whose play() fetches (or reuses cached) TTS and plays it, falling back to browser TTS on failure. */
export function speakLesson(text: string): LessonPlayer {
  let audioEl: HTMLAudioElement | null = null;
  return {
    play: () => {
      void (async () => {
        const url = await synthesize(text);
        if (url) {
          if (!audioEl) audioEl = new Audio(url);
          else if (audioEl.src !== url) audioEl.src = url;
          audioEl.currentTime = 0;
          try {
            await audioEl.play();
          } catch {
            browserSpeak(text, { lang: "en-US" });
          }
        } else {
          browserSpeak(text, { lang: "en-US" });
        }
      })();
    },
  };
}
