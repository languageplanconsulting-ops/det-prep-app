import { GoogleGenerativeAI } from "@google/generative-ai";

import { readGeminiUsageFromResponse } from "@/lib/gemini-usage-metadata";
import type { GradingLlmUsage } from "@/types/grading-llm-usage";

const TRANSCRIBE_PROMPT = `Verbatim transcription for a speaking test.

Rules:
- Write exactly what the speaker said in English: same words, same grammar mistakes, same slips. Do NOT correct grammar, spelling, or word choice. Do NOT paraphrase or “clean up” the answer.
- Preserve word endings EXACTLY as pronounced. If a final -s, -es, or -ed sound is not clearly voiced, write the word WITHOUT it (write “deserve”, “match”, not “deserves”, “matches”); if the ending sound IS voiced, keep it. Never add or drop these endings to make the grammar look correct — this is a pronunciation test and the ending sounds are being assessed.
- If they repeat or restart a phrase, reflect what they actually said (you may keep light punctuation so it’s readable).
- Output only the spoken words as plain text. No labels, quotes, or commentary.
- If there is no speech or only silence/noise, output an empty string.`;

export async function transcribeEnglishAudioWithGemini(params: {
  apiKey: string;
  audioBase64: string;
  mimeType: string;
  model?: string;
}): Promise<{ transcript: string; usage: GradingLlmUsage | null }> {
  const modelName = params.model ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const genAI = new GoogleGenerativeAI(params.apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.15,
      maxOutputTokens: 4096,
    },
  });

  const mime = params.mimeType.split(";")[0]!.trim() || "audio/webm";

  const result = await model.generateContent([
    { text: TRANSCRIBE_PROMPT },
    {
      inlineData: {
        mimeType: mime,
        data: params.audioBase64,
      },
    },
  ]);

  const text = result.response.text();
  const usage = readGeminiUsageFromResponse(result.response, modelName);
  return { transcript: text.trim(), usage };
}
