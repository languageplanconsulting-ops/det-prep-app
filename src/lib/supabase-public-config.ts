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
 * Resolves Supabase URL + anon: cookies (from Admin → Supabase or legacy setup) first, then env.
 * Cookie values are set via POST /api/setup/supabase (URL-encoded).
 */
export function mergePublicSupabaseConfig(
  rawCookieUrl: string | undefined,
  rawCookieAnon: string | undefined,
): { url: string; anon: string } | null {
  const url =
    decodeCookiePart(rawCookieUrl)?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon =
    decodeCookiePart(rawCookieAnon)?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return null;
  return { url, anon };
}
