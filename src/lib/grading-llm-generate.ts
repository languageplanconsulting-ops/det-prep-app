import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

import { readGeminiUsageFromResponse } from "@/lib/gemini-usage-metadata";
import { parseGeminiJsonObjectResponse } from "@/lib/parse-gemini-json";
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

/**
 * Provider hiccups that are worth another attempt: overload / rate limit /
 * gateway blips and dropped sockets. A 400 or a bad API key is not retryable —
 * retrying those just burns the learner's wait.
 */
function isTransientProviderError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (typeof status === "number") {
    return status === 408 || status === 429 || (status >= 500 && status <= 599);
  }
  const msg = String((err as Error)?.message ?? err).toLowerCase();
  return (
    msg.includes("overload") ||
    msg.includes("high demand") ||
    msg.includes("rate limit") ||
    msg.includes("service unavailable") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("fetch failed") ||
    msg.includes("socket hang up")
  );
}

const RETRY_BACKOFF_MS = [700, 2200];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type GradingJsonObjectResult = {
  raw: Record<string, unknown>;
  usage: GradingLlmUsage | null;
};

/**
 * Generate AND parse one grading JSON object, retrying the failures that
 * otherwise cost a learner their whole submission.
 *
 * Two things go wrong in production, both of which used to surface as a 500
 * after the learner had already written or recorded their answer:
 *  - the provider is briefly overloaded (Gemini 503 "high demand"),
 *  - the model emits JSON that survives neither JSON.parse nor the repair pass.
 *
 * Both are transient, so we re-ask. Credits are charged by the routes only
 * after grading succeeds, so a retry can never double-charge; the cost of the
 * extra call is a fraction of a satang against losing the learner's work.
 *
 * Prefer this over calling `generateGradingJsonCompletion` + parsing yourself.
 */
export async function generateGradingJsonObject(opts: {
  model: string;
  keys: GradingLlmKeys;
  systemInstruction: string;
  userPayload: string;
  temperature?: number;
  /** Label for logs, e.g. "writing_report". */
  operation?: string;
  /**
   * Absolute wall-clock deadline (Date.now() ms). We never START an attempt we
   * can't plausibly finish before it — being killed mid-attempt by the platform
   * loses the learner's work, which is the exact failure we're removing.
   */
  deadlineAt?: number;
}): Promise<GradingJsonObjectResult> {
  const label = opts.operation ?? "grading";
  let lastError: unknown;
  let lastAttemptMs = 0;

  for (let attempt = 0; attempt <= RETRY_BACKOFF_MS.length; attempt++) {
    if (attempt > 0) {
      const backoff = RETRY_BACKOFF_MS[attempt - 1]!;
      if (!hasTimeForAnotherAttempt(opts.deadlineAt, lastAttemptMs, backoff)) {
        console.warn(`[${label}] out of time budget, not retrying`);
        break;
      }
      await sleep(backoff);
    }
    let usage: GradingLlmUsage | null = null;
    const startedAt = Date.now();
    try {
      const completion = await generateGradingJsonCompletion(opts);
      usage = completion.usage;
      return { raw: parseGeminiJsonObjectResponse(completion.text), usage };
    } catch (err) {
      lastAttemptMs = Date.now() - startedAt;
      lastError = err;
      // A parse failure means we already paid for the tokens — the response
      // just wasn't usable. Both that and a transient provider error are worth
      // one more ask; anything else (bad key, 400) fails fast.
      const retryable = usage != null || isTransientProviderError(err);
      if (!retryable || attempt === RETRY_BACKOFF_MS.length) break;
      console.warn(
        `[${label}] attempt ${attempt + 1} failed (${usage != null ? "unparseable JSON" : "provider error"}), retrying:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  throw lastError;
}

/** Assume a fresh attempt costs at least as long as the last one (min 20s). */
export function hasTimeForAnotherAttempt(
  deadlineAt: number | undefined,
  lastAttemptMs: number,
  extraMs = 0,
): boolean {
  if (deadlineAt == null) return true;
  const need = Math.max(20_000, lastAttemptMs * 1.2) + extraMs;
  return deadlineAt - Date.now() > need;
}
