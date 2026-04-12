import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { isAnthropicGradingModel } from "@/lib/grading-llm-generate";
import {
  DEFAULT_GEMINI_TEXT_MODEL,
  GEMINI_TEXT_MODEL_ROW_KEY,
  isAllowedGeminiTextModel,
} from "@/lib/gemini-text-models";

export async function getPersistedGeminiTextModel(): Promise<string | null> {
  try {
    const supabase = createServiceRoleSupabase();
    const { data, error } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", GEMINI_TEXT_MODEL_ROW_KEY)
      .maybeSingle();
    if (error) {
      console.warn("[gemini-model] admin_settings read:", error.message);
      return null;
    }
    const v = typeof data?.value === "string" ? data.value.trim() : "";
    if (!v || !isAllowedGeminiTextModel(v)) return null;
    return v;
  } catch (e) {
    console.warn("[gemini-model] admin_settings unavailable:", e);
    return null;
  }
}

/** Model used for text grading (Gemini or Claude per admin). */
export async function resolveGeminiTextModel(): Promise<string> {
  const persisted = await getPersistedGeminiTextModel();
  if (persisted) return persisted;
  const env = process.env.GEMINI_MODEL?.trim();
  if (env) return env;
  return DEFAULT_GEMINI_TEXT_MODEL;
}

/**
 * Speech transcription must use a Gemini multimodal model — never Claude.
 * If admin picked Claude for grading, fall back to env or default Gemini.
 */
export async function resolveTranscriptionGeminiModel(): Promise<string> {
  const persisted = await getPersistedGeminiTextModel();
  if (persisted && !isAnthropicGradingModel(persisted)) return persisted;
  const env = process.env.GEMINI_MODEL?.trim();
  if (env && !isAnthropicGradingModel(env)) return env;
  return DEFAULT_GEMINI_TEXT_MODEL;
}

export type GeminiTextModelSource = "database" | "env" | "default";

export type ResolveGeminiTextModelMeta = {
  effectiveModel: string;
  persistedModel: string | null;
  source: GeminiTextModelSource;
};

export async function resolveGeminiTextModelWithMeta(): Promise<ResolveGeminiTextModelMeta> {
  const persisted = await getPersistedGeminiTextModel();
  if (persisted) {
    return { effectiveModel: persisted, persistedModel: persisted, source: "database" };
  }
  const env = process.env.GEMINI_MODEL?.trim();
  if (env) {
    return { effectiveModel: env, persistedModel: null, source: "env" };
  }
  return {
    effectiveModel: DEFAULT_GEMINI_TEXT_MODEL,
    persistedModel: null,
    source: "default",
  };
}

export async function persistGeminiTextModel(
  model: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = model.trim();
  if (!isAllowedGeminiTextModel(trimmed)) {
    return { ok: false, message: "Unknown or unsupported model id." };
  }
  try {
    const supabase = createServiceRoleSupabase();
    const { error } = await supabase.from("admin_settings").upsert(
      {
        key: GEMINI_TEXT_MODEL_ROW_KEY,
        value: trimmed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Database unavailable (check migration + service role).";
    return { ok: false, message };
  }
}
