import { NextResponse } from "next/server";
import { scheduleApiUsageLog } from "@/lib/api-usage-log";
import { resolveTranscriptionGeminiModel } from "@/lib/gemini-model-resolve";
import { transcribeEnglishAudioWithGemini } from "@/lib/gemini-transcribe";
import { getOptionalAuthUserId } from "@/lib/route-auth-user";

export const maxDuration = 120;

/** ~8 MiB raw binary cap (base64 is ~33% larger) */
const MAX_BASE64_CHARS = 12_000_000;

function isAllowedMime(mime: string): boolean {
  const base = mime.split(";")[0]!.trim().toLowerCase();
  return base.startsWith("audio/");
}

export async function POST(req: Request) {
  const fromEnv = process.env.GEMINI_API_KEY?.trim();
  const fromHeader = req.headers.get("x-gemini-api-key")?.trim();
  const key = fromEnv || fromHeader;
  if (!key) {
    return NextResponse.json(
      {
        error:
          "No Gemini key. Set GEMINI_API_KEY in .env.local (or your server environment).",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Expected JSON object" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const audioBase64 = o.audioBase64;
  const mimeType = o.mimeType;

  if (typeof audioBase64 !== "string" || !audioBase64.trim()) {
    return NextResponse.json({ error: "audioBase64 required" }, { status: 400 });
  }
  if (audioBase64.length > MAX_BASE64_CHARS) {
    return NextResponse.json({ error: "Audio too large" }, { status: 413 });
  }
  if (typeof mimeType !== "string" || !mimeType.trim()) {
    return NextResponse.json({ error: "mimeType required" }, { status: 400 });
  }
  if (!isAllowedMime(mimeType)) {
    return NextResponse.json(
      { error: `Unsupported mimeType: ${mimeType.split(";")[0]}` },
      { status: 400 },
    );
  }

  try {
    const model = await resolveTranscriptionGeminiModel();
    const userId = await getOptionalAuthUserId();
    const { transcript, usage } = await transcribeEnglishAudioWithGemini({
      apiKey: key,
      model,
      audioBase64: audioBase64.trim(),
      mimeType: mimeType.trim(),
    });
    if (usage) {
      scheduleApiUsageLog({
        userId,
        operation: "speech_transcribe",
        provider: "gemini",
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      });
    } else {
      scheduleApiUsageLog({
        userId,
        operation: "speech_transcribe",
        provider: "gemini",
        model,
        charsIn: Math.floor(audioBase64.trim().length / 4),
        meta: { note: "no_usage_metadata" },
      });
    }
    return NextResponse.json({ transcript });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Transcription failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
