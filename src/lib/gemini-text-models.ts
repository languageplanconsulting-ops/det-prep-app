export type GeminiTextModelOption = { id: string; label: string };

/**
 * Curated list for the admin UI — Gemini ids match Google AI; Claude ids match Anthropic Messages API.
 *
 * Google keeps retiring pinned Gemini versions out from under us (gemini-2.5-flash and
 * gemini-2.5-pro now 404 with "no longer available"), which silently breaks every AI-graded
 * part. The default is therefore the `gemini-flash-latest` alias, which Google keeps pointing
 * at the current Flash — it survives retirements. Pinned ids stay in the list for admins who
 * want a fixed version, but only ones that are live today.
 */
export const GEMINI_TEXT_MODEL_OPTIONS: GeminiTextModelOption[] = [
  {
    id: "gemini-flash-latest",
    label: "Gemini Flash (latest, default — auto-follows Google's current Flash)",
  },
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5 (Anthropic — compare with Flash)",
  },
  { id: "gemini-flash-lite-latest", label: "Gemini Flash-Lite (latest, cheapest)" },
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash (pinned)" },
  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash (pinned, newest)" },
  { id: "gemini-pro-latest", label: "Gemini Pro (latest)" },
];

export const DEFAULT_GEMINI_TEXT_MODEL = "gemini-flash-latest";

const ALLOWED_IDS = new Set(GEMINI_TEXT_MODEL_OPTIONS.map((o) => o.id));

export function isAllowedGeminiTextModel(id: string): boolean {
  return ALLOWED_IDS.has(id);
}

export const GEMINI_TEXT_MODEL_ROW_KEY = "gemini_text_model" as const;
