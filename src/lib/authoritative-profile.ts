import type { SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";

/** Columns needed to resolve effective tier + subscription state. */
export const TIER_PROFILE_COLUMNS =
  "tier, role, vip_granted_by_course, stripe_subscription_id, stripe_customer_id, tier_expires_at";

/**
 * Reads a user's `profiles` row AUTHORITATIVELY (service role, RLS-immune).
 *
 * Server routes normally read the profile through the user's RLS-scoped client, which can
 * return null when that client's access token is stale/expired — collapsing a paying customer
 * to "free". Once a route has already identified the user (getUser), the tier itself is not a
 * secret, so we read the real row by id with the service role and can't be fooled by a token
 * blip. Falls back to the provided user-scoped client only when the service key isn't
 * configured for this environment.
 */
export async function readAuthoritativeProfile(
  userId: string,
  fallback: SupabaseClient,
  columns: string = TIER_PROFILE_COLUMNS,
): Promise<Record<string, unknown> | null> {
  try {
    const admin = createServiceRoleSupabase();
    const { data } = await admin
      .from("profiles")
      .select(columns)
      .eq("id", userId)
      .maybeSingle();
    if (data) return data as unknown as Record<string, unknown>;
  } catch {
    // service key missing / admin client unavailable → fall back below
  }
  const { data } = await fallback
    .from("profiles")
    .select(columns)
    .eq("id", userId)
    .maybeSingle();
  return (data as unknown as Record<string, unknown> | null) ?? null;
}
