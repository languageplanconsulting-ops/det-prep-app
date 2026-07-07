/**
 * exam-sfx — gamified UI sounds for the whole app (clicks, correct/wrong,
 * transitions, celebrations). Plays real audio assets from /audio/sfx,
 * pooled + preloaded so overlapping taps don't cut each other off. Respects
 * a per-device mute (default ON, like Duolingo) and stays silent if audio
 * is blocked. Pairs with visual feedback — never the only signal (WCAG).
 */

const MUTE_KEY = "ep-sfx-muted";
const MUTE_EVENT = "ep-sfx-mute-change";

/** On for everyone by default. Kept as a hook so a caller could still disable it. */
let _enabled = true;
export function setSfxEnabled(on: boolean): void {
  _enabled = on;
}
export function isSfxEnabled(): boolean {
  return _enabled;
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

/**
 * Small pool per asset so rapid-fire taps overlap instead of cutting off.
 * Grows lazily (one element fetched up front, more only once actually needed)
 * so we don't fire N parallel requests for the same file on module load.
 */
const POOL_SIZE = 4;
const pools = new Map<string, HTMLAudioElement[]>();
const poolCursor = new Map<string, number>();

function makeAudio(src: string, volume: number): HTMLAudioElement {
  const el = new Audio(src);
  el.preload = "auto";
  el.volume = volume;
  return el;
}

function getPool(src: string, volume: number): HTMLAudioElement[] {
  let pool = pools.get(src);
  if (!pool) {
    pool = [makeAudio(src, volume)];
    pools.set(src, pool);
  }
  return pool;
}

function playFile(src: string, volume = 0.55): void {
  if (typeof window === "undefined") return;
  if (!_enabled || getSfxMuted()) return;
  try {
    const pool = getPool(src, volume);
    const i = poolCursor.get(src) ?? 0;
    let el = pool[i];
    if (!el) {
      el = makeAudio(src, volume);
      pool[i] = el;
    }
    poolCursor.set(src, (i + 1) % POOL_SIZE);
    el.currentTime = 0;
    void el.play().catch(() => {
      /* autoplay blocked before first user gesture — ignore */
    });
  } catch {
    /* ignore */
  }
}

/** Synthesized fallback for the one event with no matching asset (wrong answer). */
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

function playSynthThunk(): void {
  if (!_enabled || getSfxMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.18);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.21);
    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        /* ignore */
      }
    };
  } catch {
    /* ignore */
  }
}

const ASSET = {
  click: "/audio/sfx/click.wav",
  pop: "/audio/sfx/pop.wav",
  transition: "/audio/sfx/transition.wav",
  celebrateBell: "/audio/sfx/celebrate-bell.wav",
  celebrateFanfare: "/audio/sfx/celebrate-fanfare.wav",
  celebrateGrand: "/audio/sfx/celebrate-grand.wav",
} as const;

/** Preload the frequent, low-latency-sensitive sounds; celebrations load on first use. */
if (typeof window !== "undefined") {
  getPool(ASSET.click, 0.45);
  getPool(ASSET.pop, 0.6);
  getPool(ASSET.transition, 0.5);
}

/** Cute bubble pop on any tap/select — every button/tile in the app. */
export function sfxTap(): void {
  playFile(ASSET.click, 0.45);
}

/** Highkey bubble-pop "ding" on a correct answer. */
export function sfxCorrect(): void {
  playFile(ASSET.pop, 0.6);
}

/** Soft synthesized "thunk" on wrong — gentle, never harsh. */
export function sfxWrong(): void {
  playSynthThunk();
}

/** Page-swipe whoosh on submit / moving to the next question. */
export function sfxSubmit(): void {
  playFile(ASSET.transition, 0.5);
}

/** Same page-swipe sound for step/screen navigation (mock test, lessons, diagnosis). */
export function sfxTransition(): void {
  playFile(ASSET.transition, 0.5);
}

/** Happy bell chime when a score/report reveals. Fires often — keep it light. */
export function sfxReveal(): void {
  playFile(ASSET.celebrateBell, 0.55);
}

/**
 * Bigger celebration moments. "md" = finishing a lesson/exercise set or a
 * streak day (fanfare). "lg" = finishing a full mock test, a big streak
 * milestone, or a badge (grand violin swell) — keep this one rare.
 */
export function sfxCelebrate(size: "md" | "lg" = "md"): void {
  playFile(size === "lg" ? ASSET.celebrateGrand : ASSET.celebrateFanfare, 0.65);
}
