import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import {
  DEEPGRAM_TTS_MAX_CHARS,
  isDeepgramTtsConfigured,
  synthesizeEnglishSpeechWithDeepgram,
} from "@/lib/deepgram-synthesize";
import { synthesizeEnglishSpeechWithElevenLabs } from "@/lib/elevenlabs-synthesize";
import { synthesizeEnglishSpeechWithGemini } from "@/lib/gemini-synthesize";
import {
  INWORLD_MAX_CHARS,
  isInworldEnvConfigured,
  synthesizeEnglishSpeechWithInworld,
} from "@/lib/inworld-synthesize";
import { SPEECH_SYNTHESIS_MAX_CHARS } from "@/lib/speech-api-limits";

export const maxDuration = 120;

const DEFAULT_SAMPLE =
  "Hello. This is a short text-to-speech test from your admin panel.";

type Provider = "deepgram" | "inworld" | "gemini" | "elevenlabs";

function errorHttpStatus(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const s = (err as { httpStatus?: unknown }).httpStatus;
  return typeof s === "number" && s >= 400 && s < 600 ? s : undefined;
}

export async function GET() {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    deepgram: {
      keyConfigured: isDeepgramTtsConfigured(),
      model:
        process.env.DEEPGRAM_TTS_MODEL?.trim() || "aura-2-thalia-en",
      maxChars: DEEPGRAM_TTS_MAX_CHARS,
    },
    inworld: {
      keyConfigured: isInworldEnvConfigured(),
      voiceId: process.env.INWORLD_VOICE_ID?.trim() || "Sarah (default)",
      modelId:
        process.env.INWORLD_TTS_MODEL_ID?.trim() || "inworld-tts-1.5-max",
      maxChars: INWORLD_MAX_CHARS,
    },
    gemini: {
      keyConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      ttsModel:
        process.env.GEMINI_TTS_MODEL?.trim() || "gemini-2.5-flash-preview-tts",
    },
    elevenlabs: {
      keyConfigured: Boolean(process.env.ELEVENLABS_API_KEY?.trim()),
    },
    sampleDefault: DEFAULT_SAMPLE,
    maxCharsGlobal: SPEECH_SYNTHESIS_MAX_CHARS,
  });
}

export async function POST(req: Request) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Expected JSON object" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const providerRaw = o.provider;
  const includeAudio = o.includeAudio !== false;

  const providers: Provider[] = ["deepgram", "inworld", "gemini", "elevenlabs"];
  if (typeof providerRaw !== "string" || !providers.includes(providerRaw as Provider)) {
    return NextResponse.json(
      { error: "provider must be deepgram | inworld | gemini | elevenlabs" },
      { status: 400 },
    );
  }
  const provider = providerRaw as Provider;

  let text =
    typeof o.text === "string" && o.text.trim()
      ? o.text.trim()
      : DEFAULT_SAMPLE;
  if (text.length > SPEECH_SYNTHESIS_MAX_CHARS) {
    return NextResponse.json(
      {
        ok: false as const,
        provider,
        step: "validation" as const,
        message: `Text exceeds ${SPEECH_SYNTHESIS_MAX_CHARS} characters.`,
      },
      { status: 200 },
    );
  }

  const started = Date.now();

  const deepgramKey = process.env.DEEPGRAM_API_KEY?.trim() || "";
  const inworldKey = process.env.INWORLD_API_KEY?.trim() || "";
  const geminiKey = process.env.GEMINI_API_KEY?.trim() || "";
  const elevenKey = process.env.ELEVENLABS_API_KEY?.trim() || "";

  const fail = (params: {
    step: "missing_key" | "upstream" | "empty_audio" | "exception" | "validation";
    message: string;
    httpStatus?: number;
  }) =>
    NextResponse.json(
      {
        ok: false as const,
        provider,
        durationMs: Date.now() - started,
        ...params,
      },
      { status: 200 },
    );

  try {
    if (provider === "deepgram") {
      if (!deepgramKey) {
        return fail({
          step: "missing_key",
          message:
            "DEEPGRAM_API_KEY is not set (or empty) in the server environment.",
        });
      }
      if (text.length > DEEPGRAM_TTS_MAX_CHARS) {
        return fail({
          step: "validation",
          message: `Text is ${text.length} chars; Deepgram allows at most ${DEEPGRAM_TTS_MAX_CHARS}.`,
        });
      }
      const out = await synthesizeEnglishSpeechWithDeepgram({
        apiKey: deepgramKey,
        text,
      });
      const audioBytes = Buffer.from(out.audioBase64, "base64").length;
      return NextResponse.json({
        ok: true as const,
        provider,
        durationMs: Date.now() - started,
        mimeType: out.mimeType,
        audioBytes,
        ...(includeAudio ? { audioBase64: out.audioBase64 } : {}),
      });
    }

    if (provider === "inworld") {
      if (!inworldKey) {
        return fail({
          step: "missing_key",
          message:
            "INWORLD_API_KEY is not set (or empty) in the server environment. INWORLD_VOICE_ID alone is not enough.",
        });
      }
      if (text.length > INWORLD_MAX_CHARS) {
        return fail({
          step: "validation",
          message: `Text is ${text.length} chars; Inworld allows at most ${INWORLD_MAX_CHARS}.`,
        });
      }
      const out = await synthesizeEnglishSpeechWithInworld({
        apiKey: inworldKey,
        text,
      });
      const audioBytes = Buffer.from(out.audioBase64, "base64").length;
      return NextResponse.json({
        ok: true as const,
        provider,
        durationMs: Date.now() - started,
        mimeType: out.mimeType,
        audioBytes,
        ...(includeAudio ? { audioBase64: out.audioBase64 } : {}),
      });
    }

    if (provider === "gemini") {
      if (!geminiKey) {
        return fail({
          step: "missing_key",
          message:
            "GEMINI_API_KEY is not set (or empty) in the server environment.",
        });
      }
      const out = await synthesizeEnglishSpeechWithGemini({
        apiKey: geminiKey,
        text,
      });
      const audioBytes = Buffer.from(out.audioBase64, "base64").length;
      return NextResponse.json({
        ok: true as const,
        provider,
        durationMs: Date.now() - started,
        mimeType: out.mimeType,
        audioBytes,
        ...(includeAudio ? { audioBase64: out.audioBase64 } : {}),
      });
    }

    /* elevenlabs */
    if (!elevenKey) {
      return fail({
        step: "missing_key",
        message:
          "ELEVENLABS_API_KEY is not set (or empty) in the server environment.",
      });
    }
    const out = await synthesizeEnglishSpeechWithElevenLabs({
      apiKey: elevenKey,
      text,
    });
    if (!out.audioBase64) {
      return fail({
        step: "empty_audio",
        message: "ElevenLabs returned no audio payload.",
      });
    }
    const audioBytes = Buffer.from(out.audioBase64, "base64").length;
    return NextResponse.json({
      ok: true as const,
      provider,
      durationMs: Date.now() - started,
      mimeType: out.mimeType,
      audioBytes,
      ...(includeAudio ? { audioBase64: out.audioBase64 } : {}),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const httpStatus = errorHttpStatus(e);
    const clipped = msg.length > 8000 ? `${msg.slice(0, 8000)}…` : msg;
    return fail({
      step: httpStatus != null ? "upstream" : "exception",
      message: clipped,
      ...(httpStatus != null ? { httpStatus } : {}),
    });
  }
}
