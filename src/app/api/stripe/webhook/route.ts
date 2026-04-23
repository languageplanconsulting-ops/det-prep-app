import { NextResponse } from "next/server";
import type Stripe from "stripe";
import type { Tier } from "@/lib/access-control";
import { getStripe } from "@/lib/stripe";
import { currentTierForUser } from "@/lib/addon-credits";
import { nextMonthlyExpiryIso } from "@/lib/plan-status";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

export const runtime = "nodejs";

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

  // Missing profile row (e.g. signup confirmation flow) -> backfill from auth user.
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

async function fulfillOneTimePlanPurchase(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.metadata?.userId;
  const tierMeta = session.metadata?.tier;
  const paymentFlow = session.metadata?.paymentFlow ?? "card_checkout";
  if (!userId || !tierMeta || !isTier(tierMeta) || session.payment_status !== "paid") {
    return;
  }

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const supabase = createServiceRoleSupabase();
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

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not set" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "payment" && session.metadata?.purchaseKind === "plan") {
          await fulfillOneTimePlanPurchase(session);
          break;
        }
        if (session.mode === "payment") {
          const userId = session.metadata?.userId;
          const addonSku = session.metadata?.addonSku;
          const paymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? null;

          if (!userId || !addonSku || session.payment_status !== "paid") {
            break;
          }

          const supabase = createServiceRoleSupabase();
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
            payment_method: "card",
            description: `Add-on purchase: ${addonSku}`,
            receipt_url: null,
          });
          if (payErr && payErr.code !== "23505") {
            console.error("[stripe] add-on payment_history insert", payErr.message);
          }
          break;
        }
        break;
      }

      case "invoice.payment_succeeded": {
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subParent = invoice.parent?.subscription_details?.subscription;
        const subscriptionId =
          typeof subParent === "string" ? subParent : subParent?.id ?? null;
        console.log("[stripe] invoice.payment_failed", {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          subscriptionId,
          amountDue: invoice.amount_due,
          currency: invoice.currency,
        });
        break;
      }

      default:
        break;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Webhook handler error";
    console.error("[stripe] webhook handler", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
