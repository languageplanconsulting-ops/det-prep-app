/**
 * Web Speech API (SpeechRecognition) — Chrome / Edge / Safari (partial).
 * Runs in the browser; no upload to our Gemini transcribe route.
 * Note: many browsers still send audio to the vendor’s speech service (e.g. Google in Chrome),
 * so this is not guaranteed “fully offline.”
 */

export type WebSpeechRecognitionResultList = {
  length: number;
  [index: number]: { isFinal: boolean; 0: { transcript: string } };
};

export type WebSpeechRecognitionEventLike = {
  resultIndex: number;
  results: WebSpeechRecognitionResultList;
};

export type WebSpeechRecognitionErrorEventLike = {
  error: string;
};

export type WebSpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: WebSpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: WebSpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};

export function isBrowserSpeechRecognitionAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    SpeechRecognition?: new () => WebSpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => WebSpeechRecognitionInstance;
  };
  return Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition);
}

export function createBrowserSpeechRecognition(): WebSpeechRecognitionInstance | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => WebSpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => WebSpeechRecognitionInstance;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  return new Ctor();
}
