import { NextResponse } from "next/server";
import { synthesizeEnglishSpeechWithElevenLabs } from "@/lib/elevenlabs-synthesize";
import { synthesizeEnglishSpeechWithGemini } from "@/lib/gemini-synthesize";
import { SPEECH_SYNTHESIS_MAX_CHARS } from "@/lib/speech-api-limits";

export const maxDuration = 120;

export async function POST(req: Request) {
  const elevenKey = process.env.ELEVENLABS_API_KEY?.trim();
  const geminiEnv = process.env.GEMINI_API_KEY?.trim();
  const geminiHeader = req.headers.get("x-gemini-api-key")?.trim();
  const geminiKey = geminiEnv || geminiHeader;

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
    providerRaw === "elevenlabs" || providerRaw === "gemini" ? providerRaw : undefined;

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
      return NextResponse.json(out);
    }

    if (provider === "gemini") {
      return await runGemini();
    }

    if (elevenKey) {
      try {
        const out = await synthesizeEnglishSpeechWithElevenLabs({
          apiKey: elevenKey,
          text: trimmed,
        });
        return NextResponse.json(out);
      } catch {
        /* fall through to Gemini when both keys may exist */
      }
    }

    return await runGemini();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Synthesis failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

