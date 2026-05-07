import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { fulfillAddonPurchase, fulfillOneTimePlanPurchase } from "@/lib/stripe-fulfillment";

export const runtime = "nodejs";

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
          await fulfillAddonPurchase(session);
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
