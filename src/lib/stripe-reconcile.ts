import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import type { Tier } from "@/lib/access-control";
import { selectSessionToFulfill, type ReconcilableSession } from "@/lib/stripe-reconcile-select";
import { fulfillOneTimePlanPurchase } from "@/lib/stripe-fulfillment";

/**
 * Only honor a never-fulfilled paid session this recent. Plans are 30-day
 * one-time purchases, so a paid session older than this represents a cycle that
 * has already fully lapsed — silently granting a fresh 30 days for it would be
 * wrong. Those are counted in `tooOld` and left for a deliberate manual admin
 * re-sync rather than auto-granted. Generous enough to honor a genuinely missed
 * payment that the customer only comes back to claim a couple of weeks later.
 */
export const RECONCILE_WINDOW_DAYS = 45;

export type CustomerReconcileResult = {
  /** Tier granted this run, or null if nothing was fulfilled. */
  fulfilledTier: Tier | null;
  fulfilled: boolean;
  /** Paid plan Checkout Sessions seen for this customer. */
  paidSessionsSeen: number;
  /** Paid sessions skipped because their payment was already on record. */
  alreadyRecorded: number;
  /** Paid, unrecorded sessions skipped for being older than the window. */
  tooOld: number;
};

/**
 * The single safe reconciliation primitive shared by the daily cron, the admin
 * bulk re-sync, and the per-user self-heal endpoint.
 *
 * It grants a plan ONLY for a paid Checkout Session whose `payment_intent` is
 * NOT already in `payment_history` — i.e. a payment we truly never fulfilled.
 * That single rule is what makes it safe to run on ANY customer regardless of
 * their current tier / expiry:
 *
 *   - A legitimately-expired customer who simply hasn't paid again has their old
 *     payment_intent already on record, so it is skipped and their lapsed plan is
 *     NOT wrongly resurrected (important, because fulfillment extends the expiry
 *     from `now` when the current one is past — see nextMonthlyExpiryIso).
 *   - A RETURNING customer whose renewal webhook was missed has a NEW
 *     payment_intent not yet on record, so it IS fulfilled. This is the case the
 *     old `tier='free' AND tier_expires_at IS NULL` scan silently missed.
 *
 * Idempotent: re-running for an already-fixed user finds every paid session
 * already recorded and does nothing.
 */
export async function reconcileCustomerPaidSessions(params: {
  stripe: Stripe;
  supabase: SupabaseClient;
  userId: string;
  customerId: string;
  windowDays?: number;
}): Promise<CustomerReconcileResult> {
  const { stripe, supabase, userId, customerId } = params;
  const windowDays = params.windowDays ?? RECONCILE_WINDOW_DAYS;
  const cutoffSec = Math.floor(Date.now() / 1000) - windowDays * 86_400;

  const { data: history } = await supabase
    .from("payment_history")
    .select("stripe_payment_intent_id")
    .eq("user_id", userId);
  const recorded = new Set(
    (history ?? [])
      .map((r) => (r.stripe_payment_intent_id as string | null) ?? null)
      .filter((v): v is string => !!v),
  );

  // Stripe lists newest-first. The most recent paid + unfulfilled session is the
  // one the customer is waiting on.
  const sessions = await stripe.checkout.sessions.list({ customer: customerId, limit: 20 });
  const flattened: ReconcilableSession[] = sessions.data.map((session) => ({
    id: session.id,
    mode: session.mode ?? null,
    paymentStatus: session.payment_status ?? null,
    purchaseKind: session.metadata?.purchaseKind ?? null,
    metaUserId: session.metadata?.userId ?? null,
    paymentIntentId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null,
    createdSec: typeof session.created === "number" ? session.created : null,
  }));

  const selection = selectSessionToFulfill(flattened, recorded, userId, cutoffSec);

  const result: CustomerReconcileResult = {
    fulfilledTier: null,
    fulfilled: false,
    paidSessionsSeen: selection.paidSessionsSeen,
    alreadyRecorded: selection.alreadyRecorded,
    tooOld: selection.tooOld,
  };

  if (!selection.sessionId) {
    return result;
  }

  // Stripe's list does not expand payment_intent; re-retrieve so fulfillment can
  // read it (and the customer) the same way the webhook does.
  const full = (await stripe.checkout.sessions.retrieve(selection.sessionId, {
    expand: ["payment_intent", "customer"],
  })) as Stripe.Checkout.Session;

  const outcome = await fulfillOneTimePlanPurchase(full);
  if (outcome.ok) {
    result.fulfilled = true;
    result.fulfilledTier = outcome.tier;
  }

  return result;
}
