import { NextResponse } from "next/server";
import { synthesizeEnglishSpeechWithElevenLabs } from "@/lib/elevenlabs-synthesize";
import { synthesizeEnglishSpeechWithGemini } from "@/lib/gemini-synthesize";
import { SPEECH_SYNTHESIS_MAX_CHARS } from "@/lib/speech-api-limits";

export const maxDuration = 120;

function errorHttpStatus(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const s = (err as { httpStatus?: unknown }).httpStatus;
  return typeof s === "number" && s >= 400 && s < 600 ? s : undefined;
}

export async function POST(req: Request) {
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
  const text = o.text;
  const providerRaw = o.provider;
  const provider =
    providerRaw === "elevenlabs" || providerRaw === "gemini" ? providerRaw : "gemini";
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }
  if (text.length > SPEECH_SYNTHESIS_MAX_CHARS) {
    return NextResponse.json(
      { error: `text too long (max ${SPEECH_SYNTHESIS_MAX_CHARS} chars)` },
      { status: 400 },
    );
  }

  try {
    const out =
      provider === "elevenlabs"
        ? await synthesizeEnglishSpeechWithElevenLabs({
            apiKey:
              process.env.ELEVENLABS_API_KEY?.trim() ||
              req.headers.get("x-elevenlabs-api-key")?.trim() ||
              "",
            text: text.trim(),
          })
        : await synthesizeEnglishSpeechWithGemini({
            apiKey:
              process.env.GEMINI_API_KEY?.trim() ||
              req.headers.get("x-gemini-api-key")?.trim() ||
              "",
            text: text.trim(),
          });
    if (!out.audioBase64) {
      throw new Error("Synthesis returned no audio.");
    }
    return NextResponse.json(out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Synthesis failed";
    const upstream = errorHttpStatus(e);
    if (upstream != null) {
      return NextResponse.json(
        { error: msg.length > 600 ? `${msg.slice(0, 600)}…` : msg },
        { status: upstream },
      );
    }
    if (provider === "elevenlabs" && !process.env.ELEVENLABS_API_KEY?.trim()) {
      return NextResponse.json(
        { error: "No ElevenLabs key. Set ELEVENLABS_API_KEY in .env.local." },
        { status: 503 },
      );
    }
    if (provider === "gemini" && !process.env.GEMINI_API_KEY?.trim() && !req.headers.get("x-gemini-api-key")) {
      return NextResponse.json(
        {
          error:
            "No Gemini key. Set GEMINI_API_KEY in .env.local (or your server environment).",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

