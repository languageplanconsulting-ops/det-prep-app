import type { GradingLlmUsage } from "@/types/grading-llm-usage";

/** Read token counts from @google/generative-ai generateContent response when present. */
export function readGeminiUsageFromResponse(
  response: unknown,
  model: string,
): GradingLlmUsage | null {
  const um = (
    response as {
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    }
  )?.usageMetadata;
  const inputTokens = typeof um?.promptTokenCount === "number" ? um.promptTokenCount : 0;
  const outputTokens =
    typeof um?.candidatesTokenCount === "number"
      ? um.candidatesTokenCount
      : typeof um?.totalTokenCount === "number" && inputTokens > 0
        ? Math.max(0, um.totalTokenCount - inputTokens)
        : 0;
  if (inputTokens + outputTokens <= 0) return null;
  return { provider: "gemini", model, inputTokens, outputTokens };
}
