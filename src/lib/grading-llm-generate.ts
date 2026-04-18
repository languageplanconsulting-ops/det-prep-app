import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

import { readGeminiUsageFromResponse } from "@/lib/gemini-usage-metadata";
import type { GradingLlmUsage } from "@/types/grading-llm-usage";

/** True when admin-selected model is served by Anthropic (Claude). */
export function isAnthropicGradingModel(model: string): boolean {
  return model.trim().startsWith("claude-");
}

/** True when admin-selected model is served by OpenAI (ChatGPT family). */
export function isOpenAiGradingModel(model: string): boolean {
  const m = model.trim().toLowerCase();
  return m.startsWith("gpt-") || m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4");
}

export type GradingLlmKeys = {
  /** Google AI key (Gemini). Required when model is a Gemini id. */
  geminiApiKey: string;
  /** Required when `model` is a Claude id. */
  anthropicApiKey?: string;
  /** Required when `model` is an OpenAI id. */
  openAiApiKey?: string;
};

export type GradingJsonCompletionResult = {
  text: string;
  usage: GradingLlmUsage | null;
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
}): Promise<GradingJsonCompletionResult> {
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
    const usage: GradingLlmUsage | null =
      msg.usage != null
        ? {
            provider: "anthropic",
            model,
            inputTokens: msg.usage.input_tokens,
            outputTokens: msg.usage.output_tokens,
          }
        : null;
    return { text: block.text, usage };
  }

  if (isOpenAiGradingModel(model)) {
    const ok = opts.keys.openAiApiKey?.trim();
    if (!ok) {
      throw new Error(
        "OpenAI API key required for ChatGPT grading models. Set OPENAI_API_KEY (or pass x-openai-api-key).",
      );
    }
    const client = new OpenAI({ apiKey: ok });
    const msg = await client.chat.completions.create({
      model,
      temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: opts.systemInstruction },
        { role: "user", content: opts.userPayload },
      ],
    });
    const text = msg.choices[0]?.message?.content ?? "";
    if (!text) {
      throw new Error("OpenAI returned an empty response.");
    }
    const usage: GradingLlmUsage | null =
      msg.usage != null
        ? {
            provider: "openai",
            model,
            inputTokens: msg.usage.prompt_tokens ?? 0,
            outputTokens: msg.usage.completion_tokens ?? 0,
          }
        : null;
    return { text, usage };
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
  const text = result.response.text();
  const usage = readGeminiUsageFromResponse(result.response, model);
  return { text, usage };
}
