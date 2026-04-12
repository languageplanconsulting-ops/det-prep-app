import { NextResponse } from "next/server";
import { synthesizeEnglishSpeechWithElevenLabs } from "@/lib/elevenlabs-synthesize";
import { synthesizeEnglishSpeechWithGemini } from "@/lib/gemini-synthesize";
import {
  INWORLD_MAX_CHARS,
  isInworldEnvConfigured,
  synthesizeEnglishSpeechWithInworld,
} from "@/lib/inworld-synthesize";
import { SPEECH_SYNTHESIS_MAX_CHARS } from "@/lib/speech-api-limits";

export const maxDuration = 120;

function errorHttpStatus(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const s = (err as { httpStatus?: unknown }).httpStatus;
  return typeof s === "number" && s >= 400 && s < 600 ? s : undefined;
}

type TtsProvider = "inworld" | "elevenlabs" | "gemini";

function resolveProvider(raw: unknown): TtsProvider {
  if (raw === "polly") return "inworld";
  if (raw === "inworld" || raw === "elevenlabs" || raw === "gemini") return raw;
  return isInworldEnvConfigured() ? "inworld" : "gemini";
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
  const provider = resolveProvider(o.provider);
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }
  if (text.length > SPEECH_SYNTHESIS_MAX_CHARS) {
    return NextResponse.json(
      { error: `text too long (max ${SPEECH_SYNTHESIS_MAX_CHARS} chars)` },
      { status: 400 },
    );
  }

  const trimmed = text.trim();

  const geminiKey =
    process.env.GEMINI_API_KEY?.trim() || req.headers.get("x-gemini-api-key")?.trim() || "";

  const inworldKey =
    process.env.INWORLD_API_KEY?.trim() || req.headers.get("x-inworld-api-key")?.trim() || "";

  const runGemini = async () => {
    if (!geminiKey) {
      return NextResponse.json(
        {
          error:
            "No Gemini key. Set GEMINI_API_KEY in .env.local (or your server environment).",
        },
        { status: 503 },
      );
    }
    const out = await synthesizeEnglishSpeechWithGemini({
      apiKey: geminiKey,
      text: trimmed,
    });
    return NextResponse.json(out);
  };

  try {
    if (provider === "elevenlabs") {
      const out = await synthesizeEnglishSpeechWithElevenLabs({
        apiKey:
          process.env.ELEVENLABS_API_KEY?.trim() ||
          req.headers.get("x-elevenlabs-api-key")?.trim() ||
          "",
        text: trimmed,
      });
      if (!out.audioBase64) {
        throw new Error("Synthesis returned no audio.");
      }
      return NextResponse.json(out);
    }

    if (provider === "inworld") {
      if (!inworldKey) {
        return NextResponse.json(
          {
            error:
              "Inworld TTS not configured. Set INWORLD_API_KEY in .env.local (optional header x-inworld-api-key).",
          },
          { status: 503 },
        );
      }
      if (trimmed.length > INWORLD_MAX_CHARS) {
        return runGemini();
      }
      const out = await synthesizeEnglishSpeechWithInworld({
        text: trimmed,
        apiKey: inworldKey,
      });
      return NextResponse.json(out);
    }

    /* gemini */
    return await runGemini();
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
    if (provider === "gemini" && !geminiKey) {
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
