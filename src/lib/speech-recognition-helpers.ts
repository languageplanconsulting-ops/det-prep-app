import type { MutableRefObject } from "react";

/** Chrome/Edge send audio to a remote speech service; "network" = that request failed, not always the mic. */
export function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/** Normal during silence or teardown — do not show an error banner */
export const SPEECH_RECOGNITION_SILENT_ERRORS = new Set(["no-speech", "aborted"]);

/** How many consecutive "network" errors to tolerate before we stop and show help */
export const SPEECH_NETWORK_ERROR_BUDGET = 5;

export function describeSpeechRecognitionError(code: string): string {
  switch (code) {
    case "network":
      return (
        "Could not reach the browser’s speech service (usually internet, firewall, or VPN — not your microphone). " +
        "Try turning VPN off, switching Wi‑Fi, or waiting a few seconds, then press Start again. " +
        "You can also type your answer in the box; that does not use the speech service."
      );
    case "not-allowed":
      return "Microphone access was blocked. Use the lock icon or site settings in the address bar and allow the microphone for this site.";
    case "audio-capture":
      return "No microphone was found, or another app is using it. Check System Settings → Privacy → Microphone.";
    case "service-not-allowed":
      return "Speech recognition is disabled by browser or device policy. Try another browser profile or type your answer.";
    case "language-not-supported":
      return "This language pack is not available. Use Chrome or Edge on desktop, or type your answer.";
    default:
      return `Speech recognition issue (${code}). Check permissions and try again, or type your answer below.`;
  }
}

type ErrorHandlerCtx = {
  listeningRef: MutableRefObject<boolean>;
  networkRetriesRef: MutableRefObject<number>;
  setSpeechError: (msg: string | null) => void;
  setListening: (v: boolean) => void;
  onFatal?: () => void;
};

/**
 * Handle SpeechRecognition onerror.
 * For "network", keep the session in "listening" mode so onend can call start() again (Chrome pattern).
 * After several failures, show a clear message and stop.
 */
export function handleSpeechRecognitionError(
  ev: SpeechRecognitionErrorEventLike,
  ctx: ErrorHandlerCtx,
): void {
  const code = ev.error ?? "unknown";
  if (SPEECH_RECOGNITION_SILENT_ERRORS.has(code)) return;

  if (code === "network") {
    ctx.networkRetriesRef.current += 1;
    if (ctx.networkRetriesRef.current <= SPEECH_NETWORK_ERROR_BUDGET) {
      return;
    }
    ctx.setSpeechError(describeSpeechRecognitionError("network"));
    ctx.setListening(false);
    ctx.onFatal?.();
    return;
  }

  ctx.setSpeechError(describeSpeechRecognitionError(code));
  ctx.setListening(false);
  ctx.onFatal?.();
}
