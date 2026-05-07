import { NextResponse } from "next/server";

import { fulfillAddonPurchase, fulfillOneTimePlanPurchase } from "@/lib/stripe-fulfillment";
import { getStripe } from "@/lib/stripe";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

export const runtime = "nodejs";

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

  const sessionId =
    body && typeof body === "object" ? (body as Record<string, unknown>).sessionId : null;
  if (typeof sessionId !== "string" || !sessionId.trim()) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "customer"],
    });

    if (session.mode !== "payment") {
      return NextResponse.json({ error: "Unsupported checkout session mode" }, { status: 400 });
    }

    if (session.metadata?.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        {
          ok: false,
          status: session.payment_status,
          pending: true,
        },
        { status: 202 },
      );
    }

    if (session.metadata?.purchaseKind === "plan") {
      const result = await fulfillOneTimePlanPurchase(session);
      return NextResponse.json({
        ok: result.ok,
        kind: "plan",
        tier: result.tier,
      });
    }

    if (session.metadata?.addonSku) {
      const result = await fulfillAddonPurchase(session);
      return NextResponse.json({
        ok: result.ok,
        kind: "addon",
        addonSku: result.addonSku,
      });
    }

    return NextResponse.json({ error: "Unknown checkout session type" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Session confirmation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
