/**
 * Pure, dependency-free selection logic for Stripe plan reconciliation.
 *
 * Isolated from stripe-reconcile.ts (which pulls in Stripe + Supabase + the
 * fulfillment chain) so this — the one genuinely tricky, correctness-critical
 * decision — can be unit-tested in isolation. This is the rule that stops a
 * legitimately-expired customer from having an old plan wrongly resurrected while
 * still honoring a returning customer's genuinely-unfulfilled new payment.
 */

/** A Checkout Session flattened to just the fields the decision needs. */
export type ReconcilableSession = {
  id: string;
  mode: string | null;
  paymentStatus: string | null;
  purchaseKind: string | null;
  metaUserId: string | null;
  paymentIntentId: string | null;
  /** Unix seconds (Stripe `session.created`), or null if unknown. */
  createdSec: number | null;
};

export type SelectionOutcome = {
  /** Session to fulfill, or null when none qualifies. */
  sessionId: string | null;
  /** Paid plan sessions belonging to this user that were considered. */
  paidSessionsSeen: number;
  /** Paid sessions skipped because their payment was already on record. */
  alreadyRecorded: number;
  /** Paid, unrecorded sessions skipped for being older than the window. */
  tooOld: number;
};

/**
 * Picks which paid Checkout Session (if any) to fulfill for a customer.
 *
 * `sessions` MUST be newest-first (Stripe's default list order). Returns the
 * first paid plan session for this user whose `paymentIntentId` is NOT already in
 * `recordedPaymentIntents` and whose `createdSec` is within the window
 * (>= `cutoffSec`), plus skip counters for observability. Returning early on the
 * chosen session mirrors the caller's fulfill-and-stop behavior, so the counters
 * describe everything considered up to (and including) that point.
 */
export function selectSessionToFulfill(
  sessions: ReconcilableSession[],
  recordedPaymentIntents: ReadonlySet<string>,
  userId: string,
  cutoffSec: number,
): SelectionOutcome {
  let paidSessionsSeen = 0;
  let alreadyRecorded = 0;
  let tooOld = 0;

  for (const s of sessions) {
    const eligible =
      s.mode === "payment" &&
      s.purchaseKind === "plan" &&
      s.metaUserId === userId &&
      s.paymentStatus === "paid";
    if (!eligible) continue;

    paidSessionsSeen += 1;

    if (s.paymentIntentId && recordedPaymentIntents.has(s.paymentIntentId)) {
      alreadyRecorded += 1;
      continue; // already fulfilled once — must NOT re-extend an old/expired cycle
    }
    if (typeof s.createdSec === "number" && s.createdSec < cutoffSec) {
      tooOld += 1;
      continue;
    }

    return { sessionId: s.id, paidSessionsSeen, alreadyRecorded, tooOld };
  }

  return { sessionId: null, paidSessionsSeen, alreadyRecorded, tooOld };
}
