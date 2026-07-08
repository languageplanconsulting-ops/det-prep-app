/** Cookie names for optional browser-set Supabase public URL + anon key (same-site, not httpOnly). */
export const COOKIE_SB_URL = "ep_sb_url";
export const COOKIE_SB_ANON = "ep_sb_anon";

/** Short-lived post-OAuth path (so redirectTo can stay exactly `/api/auth/callback` for Supabase allowlists). */
export const COOKIE_AUTH_NEXT = "ep_auth_next";

export function decodeCookiePart(s: string | undefined): string | null {
  if (!s) return null;
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * Resolves Supabase URL + anon: env vars (the properly-deployed config) first,
 * falling back to cookies (from Admin → Supabase / legacy bootstrap setup)
 * ONLY when env vars are missing entirely. Cookie values are set via
 * POST /api/setup/supabase and persist for a year — if they ever took
 * priority over env vars, a single browser that once had them set (even by
 * accident, e.g. during initial setup) would silently keep talking to a
 * DIFFERENT Supabase project than every other browser/device forever,
 * which reads as "my data is never the same across browsers."
 */
export function mergePublicSupabaseConfig(
  rawCookieUrl: string | undefined,
  rawCookieAnon: string | undefined,
): { url: string; anon: string } | null {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    decodeCookiePart(rawCookieUrl)?.trim();
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    decodeCookiePart(rawCookieAnon)?.trim();
  if (!url || !anon) return null;
  return { url, anon };
}
