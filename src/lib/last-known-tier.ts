"use client";

import type { Tier } from "@/lib/access-control";
import { hasValidPlanExpiry } from "@/lib/plan-status";

/**
 * Browser memory of the last CONFIRMED paid tier, per user.
 *
 * Purpose: guarantee that a paying customer is never shown the free-user UI just because a
 * live profile read hiccupped (stale token, RLS blip, /api/me network error). When a trusted
 * read confirms a paid tier we remember it here; when the current reads can't positively
 * confirm the account, we fall back to this memory.
 *
 * This can NEVER over-grant access:
 *  - it is scoped to a specific user id (a different login ignores it),
 *  - it still honors plan expiry (a lapsed plan resolves to free), and
 *  - it is only consulted when the live reads failed to confirm — a trusted read that says
 *    "free"/expired clears it.
 */

const KEY = "ep_last_paid_tier_v1";

type Entry = {
  userId: string;
  tier: Tier;
  expiresAt: string | null;
  savedAt: number;
};

/** Record (or clear, when free) the confirmed paid tier for this user. */
export function rememberConfirmedTier(
  userId: string | null,
  tier: Tier,
  expiresAt: string | null,
): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    if (tier === "free") {
      window.localStorage.removeItem(KEY);
      return;
    }
    const entry: Entry = {
      userId,
      tier,
      expiresAt: expiresAt ?? null,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(KEY, JSON.stringify(entry));
  } catch {
    /* storage blocked — safe to skip; the live reads still gate access */
  }
}

/**
 * The remembered paid tier for this user IF it is still valid (not expired), else null.
 * Returns null for a different user, a free memory, or a lapsed plan.
 */
export function readValidConfirmedTier(
  userId: string | null,
  now = new Date(),
): Tier | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Partial<Entry>;
    if (entry.userId !== userId) return null;
    if (
      entry.tier !== "basic" &&
      entry.tier !== "premium" &&
      entry.tier !== "vip"
    ) {
      return null;
    }
    // Honor expiry: a lapsed plan must still fall to free.
    if (entry.expiresAt && !hasValidPlanExpiry(entry.expiresAt, now)) return null;
    return entry.tier;
  } catch {
    return null;
  }
}
