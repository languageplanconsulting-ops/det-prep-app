import { isSfxEnabled, sfxTap } from "@/lib/exam-sfx";

/**
 * Tap sound. For admins (sfx enabled) it plays the new friendly "pop". For
 * normal users it plays the ORIGINAL square-wave blink, byte-for-byte unchanged,
 * so the revamp's sound never reaches them.
 */
export function playBlinkBeep(): void {
  if (isSfxEnabled()) {
    sfxTap();
    return;
  }
  // Original sound (users) — unchanged.
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
