/**
 * exam-sfx — punchy, playful UI sounds synthesized via the Web Audio API.
 * No asset downloads, no network. Respects a per-device mute (default ON, like
 * Duolingo) and stays silent if audio is blocked. Pairs with visual feedback —
 * never the only signal (WCAG).
 */

const MUTE_KEY = "ep-sfx-muted";
const MUTE_EVENT = "ep-sfx-mute-change";

/** New sounds play ONLY when enabled (admins). Off for normal users. */
let _enabled = false;
export function setSfxEnabled(on: boolean): void {
  _enabled = on;
}
export function isSfxEnabled(): boolean {
  return _enabled;
}

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!_ctx) _ctx = new Ctor();
    if (_ctx.state === "suspended") void _ctx.resume();
    return _ctx;
  } catch {
    return null;
  }
}

export function getSfxMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSfxMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    window.dispatchEvent(new Event(MUTE_EVENT));
  } catch {
    /* ignore */
  }
}

export const SFX_MUTE_EVENT = MUTE_EVENT;

type Note = {
  f: number;
  type?: OscillatorType;
  start: number;
  dur: number;
  vol?: number;
  slideTo?: number;
};

function play(notes: Note[]): void {
  if (!_enabled || getSfxMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.type ?? "triangle";
      const t0 = now + n.start;
      osc.frequency.setValueAtTime(n.f, t0);
      if (n.slideTo) osc.frequency.exponentialRampToValueAtTime(n.slideTo, t0 + n.dur);
      const v = n.vol ?? 0.07;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(v, t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + n.dur + 0.03);
      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {
          /* ignore */
        }
      };
    }
  } catch {
    /* ignore */
  }
}

/** Light bouncy "pop" on tap/select. */
export function sfxTap(): void {
  play([{ f: 520, slideTo: 720, type: "triangle", start: 0, dur: 0.08, vol: 0.07 }]);
}

/** Cheerful rising two-note on a correct answer. */
export function sfxCorrect(): void {
  play([
    { f: 660, type: "triangle", start: 0, dur: 0.1, vol: 0.08 },
    { f: 990, type: "triangle", start: 0.08, dur: 0.14, vol: 0.08 },
  ]);
}

/** Soft low "thunk" on wrong — gentle, never harsh. */
export function sfxWrong(): void {
  play([{ f: 210, slideTo: 150, type: "sine", start: 0, dur: 0.18, vol: 0.06 }]);
}

/** Upward "whoosh" on submit. */
export function sfxSubmit(): void {
  play([{ f: 380, slideTo: 920, type: "sine", start: 0, dur: 0.2, vol: 0.06 }]);
}

/** Little 4-note arpeggio when a score/report reveals. */
export function sfxReveal(): void {
  play([
    { f: 523, start: 0, dur: 0.12, vol: 0.07 },
    { f: 659, start: 0.1, dur: 0.12, vol: 0.07 },
    { f: 784, start: 0.2, dur: 0.12, vol: 0.07 },
    { f: 1047, start: 0.3, dur: 0.22, vol: 0.08 },
  ]);
}
