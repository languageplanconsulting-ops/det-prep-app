import { isAnthropicGradingModel } from "@/lib/grading-llm-generate";

export type ResolvedGradingKeys = {
  geminiApiKey: string;
  anthropicApiKey?: string;
};

/**
 * Keys for /api/* report routes: Gemini from env or x-gemini-api-key; Anthropic from env or x-anthropic-api-key.
 */
export function resolveGradingKeysFromRequest(req: Request, model: string): ResolvedGradingKeys {
  const gemini =
    process.env.GEMINI_API_KEY?.trim() || req.headers.get("x-gemini-api-key")?.trim() || "";
  const anthropic =
    process.env.ANTHROPIC_API_KEY?.trim() || req.headers.get("x-anthropic-api-key")?.trim() || "";

  if (isAnthropicGradingModel(model)) {
    if (!anthropic) {
      throw new Error(
        "No Anthropic key. Set ANTHROPIC_API_KEY for Claude grading (or x-anthropic-api-key on the request).",
      );
    }
    return { geminiApiKey: "", anthropicApiKey: anthropic };
  }
  if (!gemini) {
    throw new Error(
      "No Gemini key. Set GEMINI_API_KEY (or x-gemini-api-key) for Gemini grading models.",
    );
  }
  return { geminiApiKey: gemini, anthropicApiKey: anthropic || undefined };
}
