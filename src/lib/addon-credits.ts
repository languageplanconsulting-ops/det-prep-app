import "server-only";

import { AI_MONTHLY_LIMIT, type Tier } from "@/lib/access-control";
import { ADD_ON_CATALOG, type AddOnSku } from "@/lib/paywall-upsell";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

export type AddOnCreditKind = "mock" | "feedback";

type AddOnRow = {
  id: string;
  kind: AddOnCreditKind;
  credits_granted: number;
  credits_used: number;
  status: string;
  expires_at: string | null;
  created_at: string;
};

type ProfileLite = {
  tier: Tier | string | null;
  tier_expires_at: string | null;
  ai_credits_used: number | null;
  lifetime_ai_used: boolean | null;
};

export function creditsGrantedForSku(sku: AddOnSku): number {
  if (sku === "mock_1") return 1;
  if (sku === "mock_2") return 2;
  if (sku === "feedback_1") return 1;
  if (sku === "feedback_3") return 3;
  return 5;
}

export function cycleExpiryIso(tierExpiresAt: string | null | undefined, now = new Date()): string {
  if (tierExpiresAt) {
    const d = new Date(tierExpiresAt);
    if (Number.isFinite(d.getTime()) && d.getTime() > now.getTime()) {
      return d.toISOString();
    }
  }
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return end.toISOString();
}

export async function getAddonBalancesForUser(userId: string): Promise<{
  mockRemaining: number;
  feedbackRemaining: number;
  rows: AddOnRow[];
}> {
  const supabase = createServiceRoleSupabase();
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("addon_credit_purchases")
    .select("id, kind, credits_granted, credits_used, status, expires_at, created_at")
    .eq("user_id", userId)
    .eq("status", "paid")
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("created_at", { ascending: true });

  const rows = ((data ?? []) as AddOnRow[]).filter(
    (row) => Math.max(0, Number(row.credits_granted) - Number(row.credits_used)) > 0,
  );
  let mockRemaining = 0;
  let feedbackRemaining = 0;
  for (const row of rows) {
    const remaining = Math.max(0, Number(row.credits_granted) - Number(row.credits_used));
    if (row.kind === "mock") mockRemaining += remaining;
    if (row.kind === "feedback") feedbackRemaining += remaining;
  }
  return { mockRemaining, feedbackRemaining, rows };
}

export async function consumeAddonCreditsForUser(
  userId: string,
  kind: AddOnCreditKind,
  amount = 1,
): Promise<{ ok: boolean; consumed: number }> {
  const supabase = createServiceRoleSupabase();
  const { rows } = await getAddonBalancesForUser(userId);
  const eligible = rows.filter((row) => row.kind === kind);
  let remainingToConsume = amount;
  let consumed = 0;

  for (const row of eligible) {
    if (remainingToConsume <= 0) break;
    const available = Math.max(0, Number(row.credits_granted) - Number(row.credits_used));
    if (available <= 0) continue;
    const useNow = Math.min(available, remainingToConsume);
    const { error } = await supabase
      .from("addon_credit_purchases")
      .update({
        credits_used: Number(row.credits_used) + useNow,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (error) {
      return { ok: false, consumed };
    }
    remainingToConsume -= useNow;
    consumed += useNow;
  }

  return { ok: remainingToConsume <= 0, consumed };
}

function normalizeTier(raw: unknown): Tier {
  return raw === "basic" || raw === "premium" || raw === "vip" ? raw : "free";
}

export async function getAiCreditStateForUser(userId: string): Promise<{
  allowed: boolean;
  reason: string | null;
  tier: Tier;
  planRemaining: number;
  addonRemaining: number;
}> {
  const supabase = createServiceRoleSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, ai_credits_used, lifetime_ai_used")
    .eq("id", userId)
    .maybeSingle();

  const tier = normalizeTier(profile?.tier);
  const used = Math.max(0, Number(profile?.ai_credits_used ?? 0));
  const lifetimeUsed = profile?.lifetime_ai_used === true;
  const { feedbackRemaining } = await getAddonBalancesForUser(userId);

  if (tier === "free") {
    if (!lifetimeUsed) {
      return {
        allowed: true,
        reason: null,
        tier,
        planRemaining: 1,
        addonRemaining: feedbackRemaining,
      };
    }
    if (feedbackRemaining > 0) {
      return {
        allowed: true,
        reason: null,
        tier,
        planRemaining: 0,
        addonRemaining: feedbackRemaining,
      };
    }
    return {
      allowed: false,
      reason: "AI feedback quota reached. Upgrade or buy a feedback add-on.",
      tier,
      planRemaining: 0,
      addonRemaining: 0,
    };
  }

  const limit = AI_MONTHLY_LIMIT[tier];
  const planRemaining = Math.max(0, limit - used);
  if (planRemaining > 0 || feedbackRemaining > 0) {
    return {
      allowed: true,
      reason: null,
      tier,
      planRemaining,
      addonRemaining: feedbackRemaining,
    };
  }

  return {
    allowed: false,
    reason: "AI feedback quota reached. Upgrade or buy a feedback add-on.",
    tier,
    planRemaining: 0,
    addonRemaining: 0,
  };
}

export async function chargeAiCreditForUser(userId: string): Promise<{
  ok: boolean;
  source: "plan" | "addon" | null;
}> {
  const supabase = createServiceRoleSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, ai_credits_used, lifetime_ai_used")
    .eq("id", userId)
    .maybeSingle<ProfileLite>();

  const tier = normalizeTier(profile?.tier);
  const used = Math.max(0, Number(profile?.ai_credits_used ?? 0));
  const lifetimeUsed = profile?.lifetime_ai_used === true;

  if (tier === "free") {
    if (!lifetimeUsed) {
      const { error } = await supabase
        .from("profiles")
        .update({
          lifetime_ai_used: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      return { ok: !error, source: !error ? "plan" : null };
    }
    const consumed = await consumeAddonCreditsForUser(userId, "feedback", 1);
    return { ok: consumed.ok, source: consumed.ok ? "addon" : null };
  }

  const limit = AI_MONTHLY_LIMIT[tier];
  if (used < limit) {
    const { error } = await supabase
      .from("profiles")
      .update({
        ai_credits_used: used + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    return { ok: !error, source: !error ? "plan" : null };
  }

  const consumed = await consumeAddonCreditsForUser(userId, "feedback", 1);
  return { ok: consumed.ok, source: consumed.ok ? "addon" : null };
}

export async function currentTierForUser(userId: string): Promise<Tier> {
  const supabase = createServiceRoleSupabase();
  const { data } = await supabase.from("profiles").select("tier").eq("id", userId).maybeSingle();
  return normalizeTier(data?.tier);
}

export async function ensureStripeCustomerIdForUser(userId: string, email: string): Promise<string> {
  const supabase = createServiceRoleSupabase();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (profile?.stripe_customer_id) return String(profile.stripe_customer_id);

  const { getStripe } = await import("@/lib/stripe");
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: email.trim(),
    metadata: { userId },
  });

  const { error: upErr } = await supabase
    .from("profiles")
    .update({ stripe_customer_id: customer.id, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (upErr) throw new Error(upErr.message);
  return customer.id;
}
