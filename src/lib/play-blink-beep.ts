import { isSfxEnabled, sfxTap } from "@/lib/exam-sfx";

/**
 * Tap sound. Plays the friendly bubble-click "pop" (exam-sfx) whenever sfx is
 * enabled — the default for everyone. Falls back to the old square-wave blink
 * only if sfx has been explicitly disabled.
 */
export function playBlinkBeep(): void {
  if (isSfxEnabled()) {
    sfxTap();
    return;
  }
  // Fallback square-wave beep (only reachable if sfx is disabled).
  if (typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.11);
    osc.onended = () => ctx.close().catch(() => {});
  } catch {
    /* ignore */
  }
}
