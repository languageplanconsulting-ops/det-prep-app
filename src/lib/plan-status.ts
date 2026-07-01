import { TIER_ORDER, type Tier } from "@/lib/access-control";

export function normalizeTier(raw: unknown): Tier {
  return raw === "basic" || raw === "premium" || raw === "vip" ? raw : "free";
}

/**
 * Returns the more privileged of two tiers (free < basic < premium < vip).
 *
 * Both the client and the server resolve tier by reading the SAME RLS-protected
 * `profiles` row, so neither can ever report a tier higher than the user truly has.
 * That makes "take the highest" safe *and* correct: a transient null/expired-token
 * read on one side (which collapses to "free") can never demote a paying user as
 * long as the other side read the real row. A false "free" locks out a customer who
 * paid; a false "paid" is impossible here — so we always bias toward access.
 */
export function mostPrivilegedTier(a: Tier, b: Tier): Tier {
  return TIER_ORDER.indexOf(a) >= TIER_ORDER.indexOf(b) ? a : b;
}

export function hasValidPlanExpiry(expiresAt: string | null | undefined, now = new Date()): boolean {
  if (!expiresAt) return false;
  const ts = new Date(expiresAt).getTime();
  return Number.isFinite(ts) && ts > now.getTime();
}

export function resolveEffectiveTierFromProfile(input: {
  tier: unknown;
  tier_expires_at?: string | null;
  vip_granted_by_course?: boolean | null;
}): Tier {
  const tier = normalizeTier(input.tier);
  if (tier === "free") return "free";
  // A paid tier with NO expiry date = permanent access. This covers course VIP
  // grants and manual admin/DB upgrades where tier is set without tier_expires_at.
  // Normal purchases always store a future expiry; expired plans store a *past*
  // date (not null), so they still correctly fall through to "free" below.
  if (!input.tier_expires_at) return tier;
  return hasValidPlanExpiry(input.tier_expires_at) ? tier : "free";
}

export function hasActivePaidPlan(input: {
  tier: unknown;
  tier_expires_at?: string | null;
  vip_granted_by_course?: boolean | null;
}): boolean {
  return resolveEffectiveTierFromProfile(input) !== "free";
}

export function nextMonthlyExpiryIso(currentExpiry: string | null | undefined, now = new Date()): string {
  const base = hasValidPlanExpiry(currentExpiry, now) ? new Date(currentExpiry as string) : new Date(now);
  base.setDate(base.getDate() + 30);
  return base.toISOString();
}
