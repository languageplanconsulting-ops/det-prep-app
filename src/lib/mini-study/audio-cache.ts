/**
 * Mini Study pre-baked audio cache.
 *
 * Static MP3 files in `public/mini-study-audio/<hash>.mp3` are generated once
 * at build-time via `npm run build:audio` (script: scripts/build-mini-study-audio.ts).
 * The manifest below lists which texts have a cached file ready.
 *
 * At runtime, listening phases call `getCachedAudioUrl(text)` BEFORE hitting
 * the Deepgram API. If we have a static file, playback is instant — no API roundtrip,
 * no API cost for repeat users.
 *
 * If the text is missing from the manifest (e.g. new content added between
 * audio builds), the caller falls back to /api/speech-synthesize as before.
 */

import { MINI_STUDY_AUDIO_HASHES } from "./audio-manifest";

const PUBLIC_DIR = "/mini-study-audio";

/**
 * Compute a stable 16-char hex hash from the trimmed text.
 * Must match the hashing used in scripts/build-mini-study-audio.ts.
 */
async function hashText(text: string): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (typeof crypto === "undefined" || !crypto.subtle) return null;
  const bytes = new TextEncoder().encode(trimmed);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, 16);
}

/**
 * Returns the static URL if this text has a pre-baked MP3, otherwise null.
 * Callers should fall back to live TTS when this returns null.
 */
export async function getCachedAudioUrl(text: string): Promise<string | null> {
  const hash = await hashText(text);
  if (!hash) return null;
  return MINI_STUDY_AUDIO_HASHES.has(hash) ? `${PUBLIC_DIR}/${hash}.mp3` : null;
}
