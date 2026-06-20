import { NextResponse } from "next/server";

import { transcribeEnglishAudioWithDeepgram } from "@/lib/deepgram-transcribe";

export const maxDuration = 120;

/** ~8 MiB raw binary cap (base64 is ~33% larger). */
const MAX_BASE64_CHARS = 12_000_000;

function isAllowedMime(mime: string): boolean {
  return mime.split(";")[0]!.trim().toLowerCase().startsWith("audio/");
}

// POST { audioBase64, mimeType } → RAW Deepgram transcript (no auto-correction).
export async function POST(req: Request) {
  const key = process.env.DEEPGRAM_API_KEY?.trim() || req.headers.get("x-deepgram-api-key")?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "No Deepgram key. Set DEEPGRAM_API_KEY in .env.local." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const o = (body ?? {}) as Record<string, unknown>;
  const audioBase64 = o.audioBase64;
  const mimeType = o.mimeType;

  if (typeof audioBase64 !== "string" || !audioBase64.trim()) {
    return NextResponse.json({ error: "audioBase64 required" }, { status: 400 });
  }
  if (audioBase64.length > MAX_BASE64_CHARS) {
    return NextResponse.json({ error: "Audio too large" }, { status: 413 });
  }
  if (typeof mimeType !== "string" || !isAllowedMime(mimeType)) {
    return NextResponse.json({ error: "mimeType must be audio/*" }, { status: 400 });
  }

  try {
    const buf = Buffer.from(audioBase64, "base64");
    const audio = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    const { transcript } = await transcribeEnglishAudioWithDeepgram({ apiKey: key, audio, mimeType });
    return NextResponse.json({ transcript });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Transcription failed" },
      { status: 502 },
    );
  }
}
