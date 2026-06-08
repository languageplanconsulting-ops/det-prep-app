/**
 * Browser TTS fallback (Plan B for mock-test audio).
 *
 * When a hosted `audio_url` fails to load AND server-side TTS (`/api/speech-synthesize`)
 * also fails, mock-test components fall back to the browser's built-in
 * `window.speechSynthesis` so users can still hear the prompt and complete the flow.
 *
 * No external dependencies, no network. Works offline.
 */

export type BrowserSpeakOptions = {
  /** ISO language tag (default "en-US"). */
  lang?: string;
  /** 0.1–10, default 1. */
  rate?: number;
  /** 0–1, default 1. */
  volume?: number;
  /** 0–2, default 1. */
  pitch?: number;
  /** Called when speech finishes (or fails to start). */
  onEnd?: () => void;
  /** Optional voice URI; if absent, the platform's default voice for `lang` is used. */
  voiceURI?: string;
};

let cachedVoices: SpeechSynthesisVoice[] | null = null;

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  if (cachedVoices && cachedVoices.length > 0) return cachedVoices;
  const v = window.speechSynthesis.getVoices();
  cachedVoices = v;
  return v;
}

/** True if the current browser supports speech synthesis. */
export function isBrowserTtsSupported(): boolean {
  return typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined";
}

/**
 * Speak `text` using the browser's TTS engine.
 * Cancels any currently-queued utterance first so calls don't pile up.
 * Returns false if browser TTS isn't available.
 */
export function browserSpeak(text: string, opts: BrowserSpeakOptions = {}): boolean {
  if (!isBrowserTtsSupported()) {
    opts.onEnd?.();
    return false;
  }
  const synth = window.speechSynthesis;
  try {
    synth.cancel();
  } catch {
    /* ignore */
  }
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = opts.lang ?? "en-US";
  utter.rate = opts.rate ?? 1;
  utter.volume = opts.volume ?? 1;
  utter.pitch = opts.pitch ?? 1;
  const voices = loadVoices();
  const chosen =
    voices.find((v) => v.voiceURI === opts.voiceURI) ??
    voices.find((v) => v.lang === utter.lang) ??
    voices.find((v) => v.lang.startsWith(utter.lang.split("-")[0] ?? ""));
  if (chosen) utter.voice = chosen;

  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    opts.onEnd?.();
  };
  utter.onend = finish;
  utter.onerror = finish;

  try {
    synth.speak(utter);
    return true;
  } catch {
    finish();
    return false;
  }
}

/** Stop any in-progress browser speech. Safe to call always. */
export function browserSpeakCancel(): void {
  if (!isBrowserTtsSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}
