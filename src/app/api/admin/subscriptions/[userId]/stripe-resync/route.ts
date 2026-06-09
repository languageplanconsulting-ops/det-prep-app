import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getAdminAccess } from "@/lib/admin-auth";
import { getStripe } from "@/lib/stripe";
import { fulfillOneTimePlanPurchase } from "@/lib/stripe-fulfillment";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/**
 * Admin tool: re-sync a single user's tier from their Stripe payment history.
 *
 * Why this exists
 * ---------------
 * For Thai PromptPay (and other async payment methods) the customer-side flow
 * settles asynchronously. Fulfillment relies on the Stripe webhook receiving
 * `checkout.session.async_payment_succeeded` (or our newer
 * `payment_intent.succeeded` fallback). If the webhook is misconfigured in the
 * Stripe Dashboard, or the event was missed for any reason, the customer's
 * money is taken but their tier is never granted.
 *
 * This endpoint pulls the customer's Checkout Sessions from Stripe directly
 * and runs fulfillment for any session that:
 *   1. has `mode === "payment"` and `purchaseKind === "plan"` metadata
 *   2. has `payment_status === "paid"`
 *
 * Fulfillment is idempotent — `payment_history` is keyed on
 * `stripe_payment_intent_id`, so running this twice for the same payment will
 * not double-grant or double-charge.
 *
 * POST /api/admin/subscriptions/[userId]/stripe-resync
 * → { ok, processed: [{ sessionId, tier, paymentIntentId, fulfilled }], reason? }
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ userId: string }> },
): Promise<NextResponse> {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { userId } = await ctx.params;
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const supabase = createServiceRoleSupabase();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, stripe_customer_id, tier, tier_expires_at")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  if (!profile.stripe_customer_id) {
    return NextResponse.json(
      { ok: false, reason: "no_stripe_customer_id" },
      { status: 200 },
    );
  }

  const stripe = getStripe();

  // Pull recent checkout sessions for the customer.
  const sessions = await stripe.checkout.sessions.list({
    customer: profile.stripe_customer_id as string,
    limit: 20,
  });

  const processed: {
    sessionId: string;
    paymentIntentId: string | null;
    tier: string | null;
    paymentStatus: string;
    paymentFlow: string | null;
    fulfilled: boolean;
    reason?: string;
  }[] = [];

  for (const session of sessions.data) {
    const meta = session.metadata ?? {};
    const eligible =
      session.mode === "payment" &&
      meta.purchaseKind === "plan" &&
      meta.userId === userId;
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    if (!eligible) {
      processed.push({
        sessionId: session.id,
        paymentIntentId,
        tier: typeof meta.tier === "string" ? meta.tier : null,
        paymentStatus: session.payment_status,
        paymentFlow: typeof meta.paymentFlow === "string" ? meta.paymentFlow : null,
        fulfilled: false,
        reason: "not_a_plan_payment_for_this_user",
      });
      continue;
    }
    if (session.payment_status !== "paid") {
      processed.push({
        sessionId: session.id,
        paymentIntentId,
        tier: typeof meta.tier === "string" ? meta.tier : null,
        paymentStatus: session.payment_status,
        paymentFlow: typeof meta.paymentFlow === "string" ? meta.paymentFlow : null,
        fulfilled: false,
        reason: "payment_not_settled",
      });
      continue;
    }

    // Stripe's basic list does not expand payment_intent. Re-retrieve to expose it.
    const full = (await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["payment_intent", "customer"],
    })) as Stripe.Checkout.Session;

    const result = await fulfillOneTimePlanPurchase(full);
    processed.push({
      sessionId: session.id,
      paymentIntentId:
        typeof full.payment_intent === "string"
          ? full.payment_intent
          : full.payment_intent?.id ?? null,
      tier: result.tier,
      paymentStatus: full.payment_status,
      paymentFlow: typeof meta.paymentFlow === "string" ? meta.paymentFlow : null,
      fulfilled: result.ok,
      ...(result.ok ? {} : { reason: "fulfillment_returned_not_ok" }),
    });
  }

  return NextResponse.json({
    ok: true,
    userId,
    customerId: profile.stripe_customer_id,
    processed,
  });
}
