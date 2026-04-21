import { NextResponse } from "next/server";
import type Stripe from "stripe";
import type { Tier } from "@/lib/access-control";
import { getStripe, tierFromStripePriceId } from "@/lib/stripe";
import { currentTierForUser } from "@/lib/addon-credits";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

export const runtime = "nodejs";

function isTier(s: string | undefined): s is Tier {
  return s === "free" || s === "basic" || s === "premium" || s === "vip";
}

/** Stripe 2026+ exposes billing period end on subscription items. */
function subscriptionPeriodEndIso(sub: Stripe.Subscription): string {
  const end = sub.items?.data?.[0]?.current_period_end;
  if (typeof end === "number") {
    return new Date(end * 1000).toISOString();
  }
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 30);
  return fallback.toISOString();
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
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
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

        if (session.mode !== "subscription") break;

        const userId = session.metadata?.userId;
        const tierMeta = session.metadata?.tier;
        if (!userId || !tierMeta || !isTier(tierMeta)) {
          console.error("[stripe] checkout.session.completed: missing userId or tier in metadata");
          break;
        }

        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subRef = session.subscription;
        const subId = typeof subRef === "string" ? subRef : subRef?.id;

        if (!customerId || !subId) {
          console.error("[stripe] checkout.session.completed: missing customer or subscription");
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subId);
        const periodEnd = subscriptionPeriodEndIso(subscription);
        const now = new Date().toISOString();

        const { error } = await updateProfileByUserId(userId, {
          tier: tierMeta,
          stripe_customer_id: customerId,
          stripe_subscription_id: subId,
          tier_expires_at: periodEnd,
          ai_credits_used: 0,
          ai_credits_reset_at: now,
          vip_granted_by_course: false,
        });
        if (error) console.error("[stripe] profile update failed", error);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        const priceId = sub.items.data[0]?.price?.id;
        const tierFromPrice = priceId ? tierFromStripePriceId(priceId) : null;
        const tierMeta = sub.metadata?.tier;
        const tier: Tier | null =
          tierFromPrice ?? (isTier(tierMeta) ? tierMeta : null);

        const periodEnd = subscriptionPeriodEndIso(sub);
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

        if (userId && tier) {
          const { error } = await updateProfileByUserId(userId, {
            tier,
            stripe_subscription_id: sub.id,
            ...(customerId ? { stripe_customer_id: customerId } : {}),
            tier_expires_at: periodEnd,
          });
          if (error) console.error("[stripe] subscription.updated profile update failed", error);
          break;
        }

        if (sub.id) {
          const supabase = createServiceRoleSupabase();
          const { data: row } = await supabase
            .from("profiles")
            .select("id")
            .eq("stripe_subscription_id", sub.id)
            .maybeSingle();
          if (row?.id && tier) {
            const { error } = await updateProfileByUserId(row.id as string, {
              tier,
              stripe_subscription_id: sub.id,
              ...(customerId ? { stripe_customer_id: customerId } : {}),
              tier_expires_at: periodEnd,
            });
            if (error) console.error("[stripe] subscription.updated fallback failed", error);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        let userId: string | undefined = sub.metadata?.userId ?? undefined;
        const supabase = createServiceRoleSupabase();

        if (!userId && sub.id) {
          const { data: row } = await supabase
            .from("profiles")
            .select("id")
            .eq("stripe_subscription_id", sub.id)
            .maybeSingle();
          if (row && typeof row.id === "string") userId = row.id;
        }

        if (!userId) {
          console.error("[stripe] subscription.deleted: could not resolve userId");
          break;
        }

        const { error } = await updateProfileByUserId(userId, {
          tier: "free",
          stripe_subscription_id: null,
          tier_expires_at: null,
          vip_granted_by_course: false,
        });
        if (error) console.error("[stripe] subscription.deleted profile update failed", error);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subRef = (
          invoice as unknown as {
            subscription?: string | { id?: string } | null;
          }
        ).subscription;
        const subId =
          typeof subRef === "string"
            ? subRef
            : subRef && typeof subRef === "object"
              ? (subRef as { id?: string }).id
              : null;
        const amount = invoice.amount_paid ?? 0;
        if (!subId || !amount) break;

        const supabase = createServiceRoleSupabase();
        const { data: row } = await supabase
          .from("profiles")
          .select("id, tier")
          .eq("stripe_subscription_id", subId)
          .maybeSingle();

        if (!row?.id) break;

        const { error: payErr } = await supabase.from("payment_history").insert({
          user_id: row.id as string,
          stripe_invoice_id: invoice.id,
          stripe_subscription_id: subId,
          amount,
          currency: (invoice.currency as string) ?? "thb",
          status: "succeeded",
          tier: (row.tier as string) ?? "premium",
          description:
            invoice.description ??
            `Invoice ${invoice.number ?? invoice.id}`,
          receipt_url:
            (invoice.hosted_invoice_url as string | null) ?? null,
          payment_method: "card",
        });
        if (payErr && payErr.code !== "23505") {
          console.error("[stripe] payment_history insert", payErr.message);
        }
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
