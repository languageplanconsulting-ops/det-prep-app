import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

import {
  COOKIE_SB_ANON,
  COOKIE_SB_URL,
  mergePublicSupabaseConfig,
} from "@/lib/supabase-public-config";

/**
 * Supabase browser-auth client for Route Handlers (reads session from cookies).
 */
export async function createRouteHandlerSupabase() {
  const cookieStore = await cookies();
  const cfg = mergePublicSupabaseConfig(
    cookieStore.get(COOKIE_SB_URL)?.value,
    cookieStore.get(COOKIE_SB_ANON)?.value,
  );
  if (!cfg) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createServerClient(cfg.url, cfg.anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* ignore when called from a context that cannot set cookies */
        }
      },
    },
  });
}
