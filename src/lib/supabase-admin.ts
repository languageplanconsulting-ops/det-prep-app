import { createClient } from "@supabase/supabase-js";

export type ServiceRoleOptions = {
  /** When set (e.g. URL from browser override cookies), overrides NEXT_PUBLIC_SUPABASE_URL. */
  supabaseUrl?: string;
};

/**
 * Server-only Supabase client with the service role key (bypasses RLS).
 * Use only in Route Handlers, Server Actions, or webhooks — never in the browser.
 */
export function createServiceRoleSupabase(options?: ServiceRoleOptions) {
  const url =
    options?.supabaseUrl?.trim() ?? process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for admin client.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
