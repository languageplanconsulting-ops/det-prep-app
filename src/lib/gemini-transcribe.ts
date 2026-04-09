import { GoogleGenerativeAI } from "@google/generative-ai";

const TRANSCRIBE_PROMPT = `Transcribe this audio. The speaker is answering an English exam question in English.
Output only the spoken words as plain text. Use normal punctuation. Do not add labels, quotes, or commentary.
If there is no speech or only silence/noise, output an empty string.`;

export async function transcribeEnglishAudioWithGemini(params: {
  apiKey: string;
  audioBase64: string;
  mimeType: string;
  model?: string;
}): Promise<string> {
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
  return text.trim();
}
