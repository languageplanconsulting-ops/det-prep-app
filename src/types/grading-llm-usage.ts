export type GradingLlmUsage = {
  provider: "gemini" | "anthropic" | "openai";
  model: string;
  inputTokens: number;
  outputTokens: number;
};
