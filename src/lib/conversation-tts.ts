/**
 * Web Speech API — no MP3. Prefer en-US / en-GB voices.
 */

export function ensureSpeechVoices(cb: () => void): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const run = () => {
    cb();
  };
  if (window.speechSynthesis.getVoices().length > 0) {
    run();
    return;
  }
  window.speechSynthesis.addEventListener("voiceschanged", run, { once: true });
}

export function pickEnglishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const pick = (langPrefix: string) =>
    voices.find((v) => v.lang?.toLowerCase().startsWith(langPrefix.toLowerCase()));

  const ranked =
    pick("en-us") ||
    voices.find((v) => /en-us|united states/i.test(`${v.lang} ${v.name}`)) ||
    pick("en-gb") ||
    voices.find((v) => /en-gb|united kingdom|british/i.test(`${v.lang} ${v.name}`)) ||
    pick("en-au") ||
    pick("en") ||
    voices[0] ||
    null;

  return ranked;
}

export function cancelConversationSpeech(): void {
  if (typeof window === "undefined") return;
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
}

let activeAudio: HTMLAudioElement | null = null;
const apiFallbackCache = new Map<string, string>();

async function fetchApiFallbackSrc(text: string): Promise<string> {
  const key = text.trim();
  const cached = apiFallbackCache.get(key);
  if (cached) return cached;
  const res = await fetch("/api/speech-fallback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const data = (await res.json()) as { audioBase64?: string; mimeType?: string; error?: string };
  if (!res.ok || !data.audioBase64) {
    throw new Error(data.error || `Fallback synthesis failed (${res.status})`);
  }
  const mime = data.mimeType?.trim() || "audio/mpeg";
  const src = data.audioBase64.startsWith("data:audio/")
    ? data.audioBase64
    : `data:${mime};base64,${data.audioBase64}`;
  apiFallbackCache.set(key, src);
  return src;
}

function playAudioSrc(
  src: string,
  text: string,
  callbacks?: { onStart?: () => void; onEnd?: () => void },
): void {
  cancelConversationSpeech();
  const a = new Audio(src);
  activeAudio = a;
  a.onplay = () => callbacks?.onStart?.();
  a.onended = () => {
    if (activeAudio === a) activeAudio = null;
    callbacks?.onEnd?.();
  };
  a.onpause = () => {
    if (a.currentTime > 0 && a.currentTime < a.duration) {
      callbacks?.onEnd?.();
    }
  };
  a.onerror = () => {
    if (activeAudio === a) activeAudio = null;
    speakConversationLine(text, callbacks);
  };
  void a.play().catch(() => {
    if (activeAudio === a) activeAudio = null;
    speakConversationLine(text, callbacks);
  });
}

export function speakConversationLine(
  text: string,
  callbacks?: { onStart?: () => void; onEnd?: () => void },
): void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    callbacks?.onEnd?.();
    return;
  }
  cancelConversationSpeech();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickEnglishVoice();
  if (v) {
    u.voice = v;
    u.lang = v.lang;
  } else {
    u.lang = "en-US";
  }
  u.rate = 0.92;
  u.pitch = 1;
  u.onstart = () => callbacks?.onStart?.();
  u.onend = () => callbacks?.onEnd?.();
  u.onerror = () => callbacks?.onEnd?.();
  window.speechSynthesis.speak(u);
}

export function speakConversationLineWithOptionalAudio(
  text: string,
  audio?: { audioBase64?: string; audioMimeType?: string },
  callbacks?: { onStart?: () => void; onEnd?: () => void; onError?: (message: string) => void },
): void {
  const b64 = audio?.audioBase64?.trim();
  if (!b64) {
    void fetchApiFallbackSrc(text)
      .then((src) => {
        playAudioSrc(src, text, callbacks);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Unknown API fallback error";
        callbacks?.onError?.(`API speech unavailable (${msg}). Using browser voice.`);
        speakConversationLine(text, callbacks);
      });
    return;
  }
  const mime = audio?.audioMimeType?.trim() || "audio/wav";
  const src = b64.startsWith("data:audio/") ? b64 : `data:${mime};base64,${b64}`;
  cancelConversationSpeech();
  const a = new Audio(src);
  activeAudio = a;
  a.onplay = () => callbacks?.onStart?.();
  a.onended = () => {
    if (activeAudio === a) activeAudio = null;
    callbacks?.onEnd?.();
  };
  a.onpause = () => {
    if (a.currentTime > 0 && a.currentTime < a.duration) {
      callbacks?.onEnd?.();
    }
  };
  a.onerror = () => {
    if (activeAudio === a) activeAudio = null;
    void fetchApiFallbackSrc(text)
      .then((fallbackSrc) => {
        playAudioSrc(fallbackSrc, text, callbacks);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Unknown API fallback error";
        callbacks?.onError?.(`API speech unavailable (${msg}). Using browser voice.`);
        speakConversationLine(text, callbacks);
      });
  };
  void a.play().catch(() => {
    if (activeAudio === a) activeAudio = null;
    void fetchApiFallbackSrc(text)
      .then((fallbackSrc) => {
        playAudioSrc(fallbackSrc, text, callbacks);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Unknown API fallback error";
        callbacks?.onError?.(`API speech unavailable (${msg}). Using browser voice.`);
        speakConversationLine(text, callbacks);
      });
  });
}
