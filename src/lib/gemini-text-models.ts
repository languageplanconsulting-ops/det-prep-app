export type GeminiTextModelOption = { id: string; label: string };

/** Curated list for the admin UI — Gemini ids match Google AI; Claude ids match Anthropic Messages API. */
export const GEMINI_TEXT_MODEL_OPTIONS: GeminiTextModelOption[] = [
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash (default, fast — compare with Haiku)",
  },
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5 (Anthropic — compare with Flash)",
  },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "gemini-3-flash-preview", label: "Gemini 3 Flash (preview)" },
  { id: "gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash-Lite (preview)" },
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview" },
];

export const DEFAULT_GEMINI_TEXT_MODEL = "gemini-2.5-flash";

const ALLOWED_IDS = new Set(GEMINI_TEXT_MODEL_OPTIONS.map((o) => o.id));

export function isAllowedGeminiTextModel(id: string): boolean {
  return ALLOWED_IDS.has(id);
}

export const GEMINI_TEXT_MODEL_ROW_KEY = "gemini_text_model" as const;
