import { NextResponse } from "next/server";

import { readAuthoritativeProfile } from "@/lib/authoritative-profile";
import { getStripe } from "@/lib/stripe";
import { reconcileCustomerPaidSessions } from "@/lib/stripe-reconcile";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Self-heal: reconcile the signed-in user's plan from Stripe on demand.
 *
 * The client (useEffectiveTier) calls this once per session when /api/me reports
 * the user is effective-free but has a Stripe customer id and no subscription —
 * the exact fingerprint of "paid but fulfillment never ran" (usually a missed
 * PromptPay async webhook). This lets a stuck customer fix themselves the moment
 * they reopen the app instead of waiting for the daily repair cron or an admin
 * re-sync. The cron and admin tools remain the backstop.
 *
 * Safe + idempotent: reconcileCustomerPaidSessions only grants a plan for a paid
 * Checkout Session whose payment_intent is not already in payment_history, so it
 * can never resurrect a legitimately-expired plan or double-grant.
 */
export async function POST(): Promise<NextResponse> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ ok: false, reconciled: false, reason: "stripe_not_configured" });
  }

  const supabaseAuth = await createRouteHandlerSupabase();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, reconciled: false, reason: "unauthenticated" }, { status: 401 });
  }

  const profile = await readAuthoritativeProfile(user.id, supabaseAuth);
  const customerId = (profile?.stripe_customer_id as string | null) ?? null;
  const hasSubscription = !!profile?.stripe_subscription_id;
  const courseGrant = profile?.vip_granted_by_course === true;

  // Only the "one-time Stripe payer, no active subscription, not a comp" shape is
  // ever eligible to self-heal. Everyone else (never touched Stripe, active sub,
  // course grant) has nothing to reconcile.
  if (!customerId || hasSubscription || courseGrant) {
    return NextResponse.json({ ok: true, reconciled: false, reason: "not_eligible" });
  }

  try {
    const stripe = getStripe();
    const supabase = createServiceRoleSupabase();
    const result = await reconcileCustomerPaidSessions({
      stripe,
      supabase,
      userId: user.id,
      customerId,
    });
    return NextResponse.json({
      ok: true,
      reconciled: result.fulfilled,
      tier: result.fulfilledTier,
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message : "reconcile_failed";
    return NextResponse.json({ ok: false, reconciled: false, reason });
  }
}
