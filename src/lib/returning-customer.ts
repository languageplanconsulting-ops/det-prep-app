import "server-only";

import { normalizeTier } from "@/lib/plan-status";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

/**
 * Self-serve purchasing is closed to the public: access now ships with the course
 * (see the Fast Track VIP grant on the landing page), not with a Stripe checkout.
 *
 * The one exception is people who ALREADY bought a package. They keep the right to
 * renew, extend and buy add-on credits, so /pricing and the Stripe routes stay open
 * to them and to nobody else.
 *
 * The gate is deliberately "have they ever been a customer", NOT "is their plan
 * active" — an expired payer is exactly the person who needs to reach the renew
 * button, so gating on the effective tier would lock out the only group still
 * allowed to pay.
 */
export type CustomerHistoryProfile = {
  tier?: unknown;
  tier_expires_at?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  vip_granted_by_course?: boolean | null;
};

export function isReturningCustomerProfile(profile: CustomerHistoryProfile | null | undefined): boolean {
  if (!profile) return false;

  // Any Stripe footprint means they went down the paying path at least once.
  // create-checkout writes stripe_customer_id *before* payment completes, so this
  // also matches a historical abandoned checkout. That's the intended bias: letting
  // one old window-shopper buy costs nothing, locking out a real payer costs a customer.
  if (profile.stripe_subscription_id) return true;
  if (profile.stripe_customer_id) return true;

  // A course comp is not a purchase. It sets tier=vip with a 6-month expiry, so it has
  // to be ruled out before the expiry/tier signals below — otherwise every course
  // student would be treated as a returning payer.
  if (profile.vip_granted_by_course === true) return false;

  // An expiry date is only ever written when a plan is fulfilled. This deliberately
  // still matches rows the old downgrade bug reset to tier:"free" while leaving
  // tier_expires_at intact (see repair-missing-expiry.ts) — those are real payers.
  if (profile.tier_expires_at) return true;

  // Manually granted paid tiers are first-class customers even with no Stripe record
  // and no expiry (permanent access).
  return normalizeTier(profile.tier) !== "free";
}

/** Service-role lookup — RLS-immune, so a stale user token can never demote a payer. */
export async function isReturningCustomer(userId: string): Promise<boolean> {
  const supabase = createServiceRoleSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("tier, tier_expires_at, stripe_customer_id, stripe_subscription_id, vip_granted_by_course")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[returning-customer] lookup failed", error.message);
    return false;
  }
  return isReturningCustomerProfile(data);
}
