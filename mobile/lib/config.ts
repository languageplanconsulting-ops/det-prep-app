import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;

function isPlaceholder(value: string | undefined): boolean {
  return !value || value.includes("${");
}

/**
 * EXPO_PUBLIC_* from mobile/.env wins: it is inlined into the bundle at build time. `extra` comes
 * from app.config.js, which under SDK 58 can be evaluated without .env loaded — it then holds the
 * production fallback and would silently point a local build at the live API.
 */
function pickConfig(extraVal: string | undefined, envVal: string | undefined): string {
  if (envVal && !isPlaceholder(envVal)) return envVal;
  if (!isPlaceholder(extraVal) && extraVal) return extraVal;
  return extraVal ?? "";
}

export const SUPABASE_URL = pickConfig(
  extra?.supabaseUrl,
  process.env.EXPO_PUBLIC_SUPABASE_URL,
);
export const SUPABASE_ANON_KEY = pickConfig(
  extra?.supabaseAnonKey,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);
export const API_BASE_URL = (
  pickConfig(extra?.apiBaseUrl, process.env.EXPO_PUBLIC_API_BASE_URL) ||
  "https://www.languageplanprep.co"
).replace(/\/$/, "");

export function assertMobileConfig(): void {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in mobile/.env",
    );
  }
}
