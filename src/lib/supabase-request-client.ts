import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { mergePublicSupabaseConfig } from "@/lib/supabase-public-config";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

/**
 * Supabase client for Route Handlers: cookie session (web) or Bearer JWT (mobile app).
 */
export async function createRequestSupabase(request?: Request): Promise<SupabaseClient> {
  const bearer = request?.headers.get("authorization");
  const token = bearer?.startsWith("Bearer ") ? bearer.slice(7).trim() : null;

  if (token) {
    const cfg = mergePublicSupabaseConfig(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
    if (!cfg) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    }
    return createClient(cfg.url, cfg.anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return createRouteHandlerSupabase();
}

export async function getRequestAuthUser(request?: Request) {
  const supabase = await createRequestSupabase(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}
