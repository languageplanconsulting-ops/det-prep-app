import { createBrowserClient } from "@supabase/auth-helpers-nextjs";

import {
  COOKIE_SB_ANON,
  COOKIE_SB_URL,
} from "@/lib/supabase-public-config";
import {
  getRuntimeSupabaseAnonKey,
  getRuntimeSupabaseUrl,
} from "@/lib/supabase-runtime-config";

let client: ReturnType<typeof createBrowserClient> | null = null;
/** Fingerprint of url + anon used to build `client` (invalidate on override change). */
let clientConfigKey: string | null = null;

function readBrowserCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

// Env vars (the properly-deployed config) always win when present. The
// localStorage/cookie overrides below exist only to bootstrap a browser when
// NEXT_PUBLIC_* is genuinely missing from the build — if either ever took
// priority over a correctly-configured env, one browser (wherever the
// override was set, even by accident) would silently keep talking to a
// DIFFERENT Supabase project forever, independent of every other browser or
// device signed into the same account.
function resolvePublicConfig(): { url: string; anon: string } | null {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const envAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (envUrl && envAnon) {
    return { url: envUrl, anon: envAnon };
  }
  if (typeof window !== "undefined") {
    const ru = getRuntimeSupabaseUrl();
    const ra = getRuntimeSupabaseAnonKey();
    if (ru && ra) {
      return { url: ru, anon: ra };
    }
    const cu = readBrowserCookie(COOKIE_SB_URL);
    const ca = readBrowserCookie(COOKIE_SB_ANON);
    if (cu && ca) {
      return { url: cu, anon: ca };
    }
  }
  return null;
}

/** True when URL + anon are available (browser localStorage override or env). */
export function isBrowserSupabaseConfigured(): boolean {
  return resolvePublicConfig() !== null;
}

/** Call after changing runtime URL/anon in localStorage so the next getBrowserSupabase() rebuilds. */
export function resetBrowserSupabaseClient(): void {
  client = null;
  clientConfigKey = null;
}

/**
 * Singleton browser Supabase client (auth via cookies).
 * Returns `null` when env vars are missing — callers must handle that (UI preview, dev without .env).
 * Prefer setting NEXT_PUBLIC_* on the server; use Admin → Supabase to store URL + anon in this browser.
 */
export function getBrowserSupabase(): ReturnType<
  typeof createBrowserClient
> | null {
  const cfg = resolvePublicConfig();
  if (!cfg) {
    console.warn(
      "[supabase] Missing Supabase URL and anon key — auth and data features are disabled. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, or an admin can save them under Admin → Supabase.",
    );
    return null;
  }
  const key = `${cfg.url}\0${cfg.anon}`;
  if (client && clientConfigKey === key) {
    return client;
  }
  client = createBrowserClient(cfg.url, cfg.anon);
  clientConfigKey = key;
  return client;
}
