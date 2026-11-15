import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import type { GradingLlmUsage } from "@/types/grading-llm-usage";

export type { GradingLlmUsage } from "@/types/grading-llm-usage";

function parseUsdPerM(env: string | undefined, fallback: number): number {
  const n = env != null && env.trim() !== "" ? Number(env) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function thbPerUsd(): number {
  return parseUsdPerM(process.env.API_COST_THB_PER_USD, 35);
}

type UsdPerM = { input: number; output: number };

/**
 * Gemini list prices (USD per 1M tokens, paid tier, prompts ≤200k). Output includes
 * thinking tokens — Google bills them at the output rate. Checked in order: the first
 * pattern that matches the model id wins, so put more specific patterns first.
 * Verify against https://ai.google.dev/gemini-api/docs/pricing when models change.
 */
const GEMINI_PRICES: Array<[RegExp, UsdPerM]> = [
  [/2\.5-flash-lite|2\.0-flash-lite|1\.5-flash/, { input: 0.1, output: 0.4 }],
  [/2\.0-flash/, { input: 0.1, output: 0.4 }],
  [/2\.5-flash/, { input: 0.3, output: 2.5 }],
  [/2\.5-pro/, { input: 1.25, output: 10.0 }],
  [/pro/, { input: 2.0, output: 12.0 }], // gemini-3-pro / 3.1-pro and newer
  // gemini-3.x flash-lite and the `gemini-flash-lite-latest` alias
  [/flash-lite/, { input: 0.25, output: 1.5 }],
  // gemini-3-flash(-preview), newer flash, and the `gemini-flash-latest` alias
  [/flash/, { input: 0.5, output: 3.0 }],
];
const GEMINI_UNKNOWN_MODEL: UsdPerM = { input: 0.5, output: 3.0 };

function geminiRates(model: string | null | undefined): UsdPerM {
  const id = (model ?? "").toLowerCase();
  const match = GEMINI_PRICES.find(([re]) => re.test(id))?.[1] ?? GEMINI_UNKNOWN_MODEL;
  // Env vars still win, so a deployment can pin rates to its invoice.
  return {
    input: parseUsdPerM(process.env.API_GEMINI_USD_PER_M_INPUT, match.input),
    output: parseUsdPerM(process.env.API_GEMINI_USD_PER_M_OUTPUT, match.output),
  };
}

/**
 * USD from token counts. Gemini is priced per model (see GEMINI_PRICES); Claude uses
 * Sonnet-class defaults. Env vars override either.
 */
export function estimateUsdFromTokens(
  provider: GradingLlmUsage["provider"],
  inputTokens: number,
  outputTokens: number,
  model?: string | null,
): number {
  const inM = Math.max(0, inputTokens) / 1_000_000;
  const outM = Math.max(0, outputTokens) / 1_000_000;
  if (provider === "anthropic") {
    const inRate = parseUsdPerM(process.env.API_ANTHROPIC_USD_PER_M_INPUT, 3.0);
    const outRate = parseUsdPerM(process.env.API_ANTHROPIC_USD_PER_M_OUTPUT, 15.0);
    return inM * inRate + outM * outRate;
  }
  const rates = geminiRates(model);
  return inM * rates.input + outM * rates.output;
}

/** Non-LLM calls (TTS, STT): optional flat USD per request or per 1k chars. */
export function estimateUsdFromChars(provider: string, charCount: number): number {
  const n = Math.max(0, charCount);
  const per1k =
    provider === "deepgram"
      ? parseUsdPerM(process.env.API_DEEPGRAM_USD_PER_1K_CHARS, 0.0002)
      : provider === "elevenlabs"
        ? parseUsdPerM(process.env.API_ELEVENLABS_USD_PER_1K_CHARS, 0.003)
        : provider === "inworld"
          ? parseUsdPerM(process.env.API_INWORLD_USD_PER_1K_CHARS, 0.0003)
          : parseUsdPerM(process.env.API_GEMINI_TTS_USD_PER_1K_CHARS, 0.00015);
  return (n / 1000) * per1k;
}

export function estimateUsdFromGeminiTokensOrChars(params: {
  inputTokens: number;
  outputTokens: number;
  charFallback: number;
}): number {
  const t = params.inputTokens + params.outputTokens;
  if (t > 0) {
    return estimateUsdFromTokens("gemini", params.inputTokens, params.outputTokens);
  }
  return estimateUsdFromChars("gemini", params.charFallback);
}

export type ApiUsageLogInput = {
  userId: string | null;
  operation: string;
  provider: string;
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  charsIn?: number | null;
  costUsd?: number;
  meta?: Record<string, unknown>;
};

/**
 * Inserts one usage row (service role). Safe to fire-and-forget from route handlers.
 */
export async function logApiUsageEvent(input: ApiUsageLogInput): Promise<void> {
  let supabase;
  try {
    supabase = createServiceRoleSupabase();
  } catch (e) {
    console.warn("[api_usage_logs] skip (no service role)", e instanceof Error ? e.message : e);
    return;
  }

  let costUsd = input.costUsd;
  if (costUsd === undefined) {
    const it = input.inputTokens ?? 0;
    const ot = input.outputTokens ?? 0;
    const ch = input.charsIn ?? 0;
    if (input.provider === "gemini" || input.provider === "anthropic") {
      costUsd =
        it + ot > 0
          ? estimateUsdFromTokens(
              input.provider === "anthropic" ? "anthropic" : "gemini",
              it,
              ot,
              input.model,
            )
          : estimateUsdFromGeminiTokensOrChars({
              inputTokens: it,
              outputTokens: ot,
              charFallback: ch,
            });
    } else {
      costUsd = estimateUsdFromChars(input.provider, ch);
    }
  }

  const costThb = Math.round(costUsd * thbPerUsd() * 10000) / 10000;

  const { error } = await supabase.from("api_usage_logs").insert({
    user_id: input.userId,
    operation: input.operation,
    provider: input.provider,
    model: input.model ?? null,
    input_tokens: input.inputTokens ?? null,
    output_tokens: input.outputTokens ?? null,
    chars_in: input.charsIn ?? null,
    cost_usd: costUsd,
    cost_thb: costThb,
    meta: input.meta ?? {},
  });

  if (error) {
    console.error("[api_usage_logs] insert", error.message);
  }
}

export function scheduleApiUsageLog(input: ApiUsageLogInput): void {
  void logApiUsageEvent(input).catch((e) =>
    console.error("[api_usage_logs] async", e instanceof Error ? e.message : e),
  );
}
