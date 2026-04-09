import Stripe from "stripe";
import type { Tier } from "@/lib/access-control";

export type PaidTier = "basic" | "premium" | "vip";

/** Placeholders — replace with real Price IDs from Stripe Dashboard (THB recurring). */
export const STRIPE_PRICE_BASIC = "STRIPE_PRICE_BASIC";
export const STRIPE_PRICE_PREMIUM = "STRIPE_PRICE_PREMIUM";
export const STRIPE_PRICE_VIP = "STRIPE_PRICE_VIP";

export const STRIPE_PLANS: Record<PaidTier, string> = {
  basic: process.env.STRIPE_PRICE_BASIC ?? STRIPE_PRICE_BASIC,
  premium: process.env.STRIPE_PRICE_PREMIUM ?? STRIPE_PRICE_PREMIUM,
  vip: process.env.STRIPE_PRICE_VIP ?? STRIPE_PRICE_VIP,
};

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    });
  }
  return stripeSingleton;
}

export function tierFromStripePriceId(priceId: string): Tier | null {
  if (!priceId) return null;
  if (priceId === STRIPE_PLANS.basic) return "basic";
  if (priceId === STRIPE_PLANS.premium) return "premium";
  if (priceId === STRIPE_PLANS.vip) return "vip";
  return null;
}
