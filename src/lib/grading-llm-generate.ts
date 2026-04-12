import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

/** True when admin-selected model is served by Anthropic (Claude). */
export function isAnthropicGradingModel(model: string): boolean {
  return model.trim().startsWith("claude-");
}

export type GradingLlmKeys = {
  /** Google AI key (Gemini). Required when model is a Gemini id. */
  geminiApiKey: string;
  /** Required when `model` is a Claude id. */
  anthropicApiKey?: string;
};

/**
 * Single JSON completion for report-style grading (Gemini JSON MIME or Claude text → parse as JSON).
 */
export async function generateGradingJsonCompletion(opts: {
  model: string;
  keys: GradingLlmKeys;
  systemInstruction: string;
  userPayload: string;
  temperature?: number;
}): Promise<string> {
  const temperature = opts.temperature ?? 0.35;
  const model = opts.model.trim();

  if (isAnthropicGradingModel(model)) {
    const ak = opts.keys.anthropicApiKey?.trim();
    if (!ak) {
      throw new Error(
        "Anthropic API key required for Claude grading models. Set ANTHROPIC_API_KEY (or pass x-anthropic-api-key).",
      );
    }
    const client = new Anthropic({ apiKey: ak });
    const msg = await client.messages.create({
      model,
      max_tokens: 16384,
      temperature,
      system: opts.systemInstruction,
      messages: [{ role: "user", content: opts.userPayload }],
    });
    const block = msg.content[0];
    if (!block || block.type !== "text") {
      throw new Error("Claude returned a non-text response.");
    }
    return block.text;
  }

  const gk = opts.keys.geminiApiKey.trim();
  if (!gk) {
    throw new Error("Gemini API key required for Gemini grading models.");
  }
  const genAI = new GoogleGenerativeAI(gk);
  const m = genAI.getGenerativeModel({
    model,
    systemInstruction: opts.systemInstruction,
    generationConfig: {
      temperature,
      responseMimeType: "application/json",
    },
  });
  const result = await m.generateContent(opts.userPayload);
  return result.response.text();
}
