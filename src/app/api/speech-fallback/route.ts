import { NextResponse } from "next/server";
import { scheduleApiUsageLog } from "@/lib/api-usage-log";
import {
  DEEPGRAM_TTS_MAX_CHARS,
  synthesizeEnglishSpeechWithDeepgram,
} from "@/lib/deepgram-synthesize";
import { synthesizeEnglishSpeechWithElevenLabs } from "@/lib/elevenlabs-synthesize";
import { synthesizeEnglishSpeechWithGemini } from "@/lib/gemini-synthesize";
import { INWORLD_MAX_CHARS, synthesizeEnglishSpeechWithInworld } from "@/lib/inworld-synthesize";
import { getOptionalAuthUserId } from "@/lib/route-auth-user";
import { SPEECH_SYNTHESIS_MAX_CHARS } from "@/lib/speech-api-limits";

export const maxDuration = 120;

export async function POST(req: Request) {
  const elevenKey = process.env.ELEVENLABS_API_KEY?.trim();
  const geminiEnv = process.env.GEMINI_API_KEY?.trim();
  const geminiHeader = req.headers.get("x-gemini-api-key")?.trim();
  const geminiKey = geminiEnv || geminiHeader;
  const inworldKey = process.env.INWORLD_API_KEY?.trim() || req.headers.get("x-inworld-api-key")?.trim();
  const deepgramKey = process.env.DEEPGRAM_API_KEY?.trim() || req.headers.get("x-deepgram-api-key")?.trim();

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
    providerRaw === "elevenlabs" ||
    providerRaw === "gemini" ||
    providerRaw === "inworld" ||
    providerRaw === "deepgram"
      ? providerRaw
      : providerRaw === "polly"
        ? "inworld"
        : undefined;

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
  const userId = await getOptionalAuthUserId();

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
    const raw = await synthesizeEnglishSpeechWithGemini({
      apiKey: geminiKey,
      text: trimmed,
    });
    const { usage, ...out } = raw;
    if (usage) {
      scheduleApiUsageLog({
        userId,
        operation: "speech_tts_fallback",
        provider: "gemini",
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        charsIn: trimmed.length,
      });
    } else {
      scheduleApiUsageLog({
        userId,
        operation: "speech_tts_fallback",
        provider: "gemini",
        model: process.env.GEMINI_TTS_MODEL ?? "gemini-2.5-flash-preview-tts",
        charsIn: trimmed.length,
      });
    }
    return NextResponse.json(out);
  };

  try {
    if (provider === "deepgram") {
      if (!deepgramKey) {
        return NextResponse.json(
          { error: "No Deepgram key. Set DEEPGRAM_API_KEY in .env.local." },
          { status: 503 },
        );
      }
      if (trimmed.length > DEEPGRAM_TTS_MAX_CHARS) {
        return await runGemini();
      }
      const out = await synthesizeEnglishSpeechWithDeepgram({
        apiKey: deepgramKey,
        text: trimmed,
      });
      scheduleApiUsageLog({
        userId,
        operation: "speech_tts_fallback",
        provider: "deepgram",
        charsIn: trimmed.length,
      });
      return NextResponse.json(out);
    }

    if (provider === "elevenlabs") {
      if (!elevenKey) {
        return NextResponse.json(
          { error: "No ElevenLabs key. Set ELEVENLABS_API_KEY in .env.local." },
          { status: 503 },
        );
      }
      const out = await synthesizeEnglishSpeechWithElevenLabs({
        apiKey: elevenKey,
        text: trimmed,
      });
      scheduleApiUsageLog({
        userId,
        operation: "speech_tts_fallback",
        provider: "elevenlabs",
        charsIn: trimmed.length,
      });
      return NextResponse.json(out);
    }

    if (provider === "gemini") {
      return await runGemini();
    }

    if (provider === "inworld") {
      if (!inworldKey) {
        return NextResponse.json(
          {
            error:
              "Inworld TTS not configured. Set INWORLD_API_KEY in .env.local (or x-inworld-api-key).",
          },
          { status: 503 },
        );
      }
      if (trimmed.length > INWORLD_MAX_CHARS) {
        return await runGemini();
      }
      const out = await synthesizeEnglishSpeechWithInworld({
        text: trimmed,
        apiKey: inworldKey,
      });
      scheduleApiUsageLog({
        userId,
        operation: "speech_tts_fallback",
        provider: "inworld",
        charsIn: trimmed.length,
      });
      return NextResponse.json(out);
    }

    if (deepgramKey && trimmed.length <= DEEPGRAM_TTS_MAX_CHARS) {
      try {
        const out = await synthesizeEnglishSpeechWithDeepgram({
          text: trimmed,
          apiKey: deepgramKey,
        });
        scheduleApiUsageLog({
          userId,
          operation: "speech_tts_fallback",
          provider: "deepgram",
          charsIn: trimmed.length,
        });
        return NextResponse.json(out);
      } catch {
        /* fall through */
      }
    }

    if (inworldKey && trimmed.length <= INWORLD_MAX_CHARS) {
      try {
        const out = await synthesizeEnglishSpeechWithInworld({
          text: trimmed,
          apiKey: inworldKey,
        });
        scheduleApiUsageLog({
          userId,
          operation: "speech_tts_fallback",
          provider: "inworld",
          charsIn: trimmed.length,
        });
        return NextResponse.json(out);
      } catch {
        /* fall through */
      }
    }

    return await runGemini();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Synthesis failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
