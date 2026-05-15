import type Stripe from "stripe";

import type { Tier } from "@/lib/access-control";
import { currentTierForUser } from "@/lib/addon-credits";
import { recordBusinessEvent } from "@/lib/business-events";
import { nextMonthlyExpiryIso } from "@/lib/plan-status";
import { getStripe } from "@/lib/stripe";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

function isTier(s: string | undefined): s is Tier {
  return s === "free" || s === "basic" || s === "premium" || s === "vip";
}

function stripUndefined<T extends Record<string, unknown>>(patch: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

async function updateProfileByUserId(
  userId: string,
  patch: Record<string, unknown>,
): Promise<{ error: string | null }> {
  const supabase = createServiceRoleSupabase();
  const normalizedPatch = stripUndefined(patch);
  const { data: updatedRow, error } = await supabase
    .from("profiles")
    .update({
      ...normalizedPatch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id")
    .maybeSingle();
  if (error) {
    return { error: error.message ?? null };
  }
  if (updatedRow?.id) {
    return { error: null };
  }

  const { data: authUserData, error: authErr } =
    await supabase.auth.admin.getUserById(userId);
  if (authErr) {
    return { error: authErr.message ?? null };
  }

  const email = authUserData.user?.email ?? null;
  if (!email) {
    return { error: "Missing auth user email for profile backfill" };
  }

  const { error: insertErr } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email: email.toLowerCase(),
      ...normalizedPatch,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  return { error: insertErr?.message ?? null };
}

export async function paymentMethodForCheckoutSession(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
): Promise<"card" | "promptpay"> {
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  if (!paymentIntentId) {
    return "card";
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["payment_method"],
    });
    const paymentMethod = paymentIntent.payment_method;
    if (paymentMethod && typeof paymentMethod !== "string") {
      if (paymentMethod.type === "promptpay") return "promptpay";
      if (paymentMethod.type === "card") return "card";
    }
  } catch (error) {
    console.error("[stripe] payment method detection failed", error);
  }

  return "card";
}

export async function fulfillOneTimePlanPurchase(
  session: Stripe.Checkout.Session,
): Promise<{ ok: boolean; userId: string | null; tier: Tier | null }> {
  const userId = session.metadata?.userId ?? null;
  const tierMeta = session.metadata?.tier;
  const paymentFlow = session.metadata?.paymentFlow ?? "card_checkout";

  if (!userId || !tierMeta || !isTier(tierMeta) || session.payment_status !== "paid") {
    return { ok: false, userId, tier: null };
  }

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const supabase = createServiceRoleSupabase();
  const { data: existingPayment } = paymentIntentId
    ? await supabase
        .from("payment_history")
        .select("id")
        .eq("stripe_payment_intent_id", paymentIntentId)
        .maybeSingle()
    : { data: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier_expires_at")
    .eq("id", userId)
    .maybeSingle();

  const nextExpiry = nextMonthlyExpiryIso((profile?.tier_expires_at as string | null) ?? null);
  const now = new Date().toISOString();

  const { error } = await updateProfileByUserId(userId, {
    tier: tierMeta,
    ...(customerId ? { stripe_customer_id: customerId } : {}),
    stripe_subscription_id: null,
    tier_expires_at: nextExpiry,
    ai_credits_used: 0,
    ai_credits_reset_at: now,
    ai_quota_mode: "default",
    ai_monthly_limit_override: null,
    vip_granted_by_course: false,
  });
  if (error) {
    console.error("[stripe] one-time plan profile update failed", error);
  }

  const paymentMethod = paymentFlow === "promptpay_checkout" ? "promptpay" : "card";
  const description =
    session.metadata?.purchaseKind === "plan"
      ? `${tierMeta} monthly access`
      : `Payment ${session.id}`;

  if (!existingPayment?.id) {
    const { error: payErr } = await supabase.from("payment_history").insert({
      user_id: userId,
      stripe_payment_intent_id: paymentIntentId,
      amount: Number(session.amount_total ?? 0),
      currency: String(session.currency ?? "thb"),
      status: "succeeded",
      tier: tierMeta,
      payment_method: paymentMethod,
      description,
      receipt_url: null,
    });
    if (payErr && payErr.code !== "23505") {
      console.error("[stripe] one-time plan payment_history insert", payErr.message);
    }
  }

  await recordBusinessEvent({
    userId,
    email: session.customer_details?.email ?? session.customer_email ?? null,
    eventType: "plan_purchased",
    eventSource: paymentFlow,
    eventLabel: tierMeta,
    eventValue: Number(session.amount_total ?? 0),
    eventCurrency: String(session.currency ?? "thb"),
    dedupeKey: `plan_purchase:${session.id}`,
    metadata: {
      stripeSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
      paymentMethod,
      nextExpiry,
    },
  });

  return { ok: !error, userId, tier: tierMeta };
}

export async function fulfillAddonPurchase(
  session: Stripe.Checkout.Session,
): Promise<{ ok: boolean; userId: string | null; addonSku: string | null }> {
  const userId = session.metadata?.userId ?? null;
  const addonSku = session.metadata?.addonSku ?? null;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  if (!userId || !addonSku || session.payment_status !== "paid") {
    return { ok: false, userId, addonSku };
  }

  const supabase = createServiceRoleSupabase();
  const stripe = getStripe();
  const paymentMethod = await paymentMethodForCheckoutSession(stripe, session);
  const { data: purchase } = await supabase
    .from("addon_credit_purchases")
    .select("id, amount, currency, status")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  if (purchase?.id && purchase.status !== "paid") {
    const { error: upErr } = await supabase
      .from("addon_credit_purchases")
      .update({
        status: "paid",
        stripe_payment_intent_id: paymentIntentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", purchase.id);
    if (upErr) console.error("[stripe] addon purchase update failed", upErr.message);
  }

  const tier = await currentTierForUser(userId);
  const { error: payErr } = await supabase.from("payment_history").insert({
    user_id: userId,
    stripe_payment_intent_id: paymentIntentId,
    amount: Number(session.amount_total ?? purchase?.amount ?? 0),
    currency: String(session.currency ?? purchase?.currency ?? "thb"),
    status: "succeeded",
    tier,
    payment_method: paymentMethod,
    description: `Add-on purchase: ${addonSku}`,
    receipt_url: null,
  });
  if (payErr && payErr.code !== "23505") {
    console.error("[stripe] add-on payment_history insert", payErr.message);
  }

  await recordBusinessEvent({
    userId,
    email: session.customer_details?.email ?? session.customer_email ?? null,
    eventType: "addon_purchased",
    eventSource: paymentMethod,
    eventLabel: addonSku,
    eventValue: Number(session.amount_total ?? purchase?.amount ?? 0),
    eventCurrency: String(session.currency ?? purchase?.currency ?? "thb"),
    dedupeKey: `addon_purchase:${session.id}`,
    metadata: {
      stripeSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
      paymentMethod,
      tierAtPurchase: tier,
      creditsGranted:
        typeof session.metadata?.creditsGranted === "string"
          ? Number(session.metadata.creditsGranted)
          : null,
    },
  });

  return { ok: true, userId, addonSku };
}
