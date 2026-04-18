import { GoogleGenerativeAI } from "@google/generative-ai";

import { readGeminiUsageFromResponse } from "@/lib/gemini-usage-metadata";
import type { GradingLlmUsage } from "@/types/grading-llm-usage";

function extractAudioFromResponse(resp: unknown): { audioBase64: string; mimeType: string } | null {
  const r = resp as Record<string, unknown>;
  const candidates =
    (r?.candidates as Array<Record<string, unknown>> | undefined) ??
    [];
  const first = candidates[0] as Record<string, unknown> | undefined;
  const content = (first?.content as Record<string, unknown> | undefined) ?? {};
  const parts =
    (content.parts as Array<Record<string, unknown>> | undefined) ??
    [];
  for (const p of parts) {
    const inline =
      (p.inlineData as Record<string, unknown> | undefined) ??
      (p.inline_data as Record<string, unknown> | undefined) ??
      (p.audio as Record<string, unknown> | undefined);
    const d = inline?.data;
    if (typeof d === "string" && d.trim()) {
      return {
        audioBase64: d,
        mimeType:
          (typeof inline?.mimeType === "string" && inline.mimeType.trim()) ||
          (typeof inline?.mime_type === "string" && inline.mime_type.trim()) ||
          "audio/wav",
      };
    }
  }
  return null;
}

export async function synthesizeEnglishSpeechWithGemini(params: {
  apiKey: string;
  text: string;
  model?: string;
}): Promise<{ audioBase64: string; mimeType: string; usage: GradingLlmUsage | null }> {
  const modelName = params.model ?? process.env.GEMINI_TTS_MODEL ?? "gemini-2.5-flash-preview-tts";
  const genAI = new GoogleGenerativeAI(params.apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.1,
      // Gemini TTS fields are not fully typed in current SDK.
      ...( {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      } as Record<string, unknown>),
    },
  });

  const prompt = `Read this sentence exactly as written, in clear natural English. Do not add or omit words:\n\n${params.text.trim()}`;
  const result = await model.generateContent(prompt);
  const usage = readGeminiUsageFromResponse(result.response, modelName);
  const audio = extractAudioFromResponse(result.response);
  if (!audio) {
    const fallbackText = result.response.text?.().trim?.() ?? "";
    throw new Error(
      fallbackText
        ? `Gemini returned text instead of audio: ${fallbackText.slice(0, 160)}`
        : "Gemini did not return audio for this sentence (check TTS model/key).",
    );
  }
  return { ...audio, usage };
}

