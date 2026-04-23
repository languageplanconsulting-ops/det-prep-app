import { NextResponse } from "next/server";
import type Stripe from "stripe";

import type { PaidTier } from "@/lib/stripe";
import { getStripe, STRIPE_PLANS } from "@/lib/stripe";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

const PAID: PaidTier[] = ["basic", "premium", "vip"];

function isPaidTier(t: string): t is PaidTier {
  return PAID.includes(t as PaidTier);
}

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe is not configured (STRIPE_SECRET_KEY)." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Expected JSON object" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const tierRaw = o.tier;
  const userId = o.userId;
  const email = o.email;

  if (typeof tierRaw !== "string" || !isPaidTier(tierRaw)) {
    return NextResponse.json({ error: "tier must be one of: basic, premium, vip" }, { status: 400 });
  }
  if (typeof userId !== "string" || !userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const priceId = STRIPE_PLANS[tierRaw];
  if (!priceId || priceId.startsWith("STRIPE_PRICE_")) {
    return NextResponse.json(
      { error: "Stripe price IDs are not configured. Set STRIPE_PRICE_BASIC, STRIPE_PRICE_PREMIUM, STRIPE_PRICE_VIP." },
      { status: 503 },
    );
  }

  const supabaseAuth = await createRouteHandlerSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.id !== userId) {
    return NextResponse.json({ error: "Forbidden: userId does not match session" }, { status: 403 });
  }
  if (user.email?.toLowerCase() !== email.trim().toLowerCase()) {
    return NextResponse.json({ error: "Forbidden: email does not match session" }, { status: 403 });
  }

  try {
    const admin = createServiceRoleSupabase();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const stripe = getStripe();
    let customerId = profile?.stripe_customer_id as string | null | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email.trim(),
        metadata: { userId },
      });
      customerId = customer.id;
      const { error: upErr } = await admin
        .from("profiles")
        .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
        .eq("id", userId);
      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      collection_method: "send_invoice",
      days_until_due: 1,
      metadata: {
        userId,
        tier: tierRaw,
        billingFlow: "promptpay_invoice",
      },
      payment_settings: {
        payment_method_types: ["promptpay"],
      },
      expand: ["latest_invoice"],
    });

    const latestInvoiceValue = subscription.latest_invoice;
    let invoice: Stripe.Invoice | null =
      latestInvoiceValue && typeof latestInvoiceValue !== "string"
        ? latestInvoiceValue
        : typeof latestInvoiceValue === "string"
          ? await stripe.invoices.retrieve(latestInvoiceValue)
          : null;

    if (invoice?.status === "draft") {
      invoice = await stripe.invoices.finalizeInvoice(invoice.id);
    }

    const hostedUrl = invoice?.hosted_invoice_url;
    if (!hostedUrl) {
      return NextResponse.json({ error: "Could not generate a hosted invoice URL for PromptPay." }, { status: 500 });
    }

    return NextResponse.json({
      url: hostedUrl,
      flow: "promptpay_invoice",
      note:
        "PromptPay for plans uses Stripe's hosted invoice page. PromptPay must be enabled in your Stripe Dashboard.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "PromptPay invoice creation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
