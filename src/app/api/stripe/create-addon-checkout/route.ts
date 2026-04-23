import { NextResponse } from "next/server";

import type { AddOnSku } from "@/lib/paywall-upsell";
import { ADD_ON_CATALOG } from "@/lib/paywall-upsell";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";
import { getStripe } from "@/lib/stripe";
import {
  creditsGrantedForSku,
  currentTierForUser,
  cycleExpiryIso,
  ensureStripeCustomerIdForUser,
} from "@/lib/addon-credits";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function isAddonSku(value: unknown): value is AddOnSku {
  return value === "mock_1" || value === "mock_2" || value === "feedback_1" || value === "feedback_3" || value === "feedback_5";
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

  const sku = body && typeof body === "object" ? (body as Record<string, unknown>).sku : null;
  if (!isAddonSku(sku)) {
    return NextResponse.json({ error: "Invalid add-on sku" }, { status: 400 });
  }

  const supabaseAuth = await createRouteHandlerSupabase();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user?.id || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stripe = getStripe();
    const customerId = await ensureStripeCustomerIdForUser(user.id, user.email);
    const item = ADD_ON_CATALOG[sku];
    const creditsGranted = creditsGrantedForSku(sku);
    const tier = await currentTierForUser(user.id);
    const admin = createServiceRoleSupabase();
    const { data: profile } = await admin
      .from("profiles")
      .select("tier_expires_at")
      .eq("id", user.id)
      .maybeSingle();
    const expiresAt = cycleExpiryIso((profile?.tier_expires_at as string | null) ?? null);

    const base = siteUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      locale: "auto",
      customer: customerId,
      payment_method_types: ["card", "promptpay"],
      allow_promotion_codes: true,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "thb",
            unit_amount: item.priceThb * 100,
            product_data: {
              name: item.labelEn,
              description: item.labelTh,
            },
          },
        },
      ],
      success_url: `${base}/pricing?checkout=success&focus=addons&sku=${encodeURIComponent(sku)}`,
      cancel_url: `${base}/pricing?checkout=cancel&focus=addons&sku=${encodeURIComponent(sku)}`,
      metadata: {
        userId: user.id,
        addonSku: sku,
        addonKind: item.kind,
        creditsGranted: String(creditsGranted),
      },
    });

    if (!session.id || !session.url) {
      return NextResponse.json({ error: "Checkout session did not return a URL" }, { status: 500 });
    }

    const { error } = await admin.from("addon_credit_purchases").insert({
      user_id: user.id,
      kind: item.kind,
      sku,
      credits_granted: creditsGranted,
      credits_used: 0,
      amount: item.priceThb * 100,
      currency: "thb",
      status: "pending",
      stripe_checkout_session_id: session.id,
      expires_at: expiresAt,
      metadata: { tier_at_purchase: tier },
      updated_at: new Date().toISOString(),
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
