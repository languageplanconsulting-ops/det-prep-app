import type { Tier } from "@/lib/access-control";

export function normalizeTier(raw: unknown): Tier {
  return raw === "basic" || raw === "premium" || raw === "vip" ? raw : "free";
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
  if (tier === "vip" && input.vip_granted_by_course === true && !input.tier_expires_at) {
    return "vip";
  }
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
