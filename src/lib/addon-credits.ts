import "server-only";

import { AI_MONTHLY_LIMIT, type Tier } from "@/lib/access-control";
import { resolveEffectiveTierFromProfile } from "@/lib/plan-status";
import { ADD_ON_CATALOG, type AddOnSku } from "@/lib/paywall-upsell";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

export type AddOnCreditKind = "mock" | "feedback";
export type FeedbackSurface =
  | "write_about_photo"
  | "speak_about_photo"
  | "read_then_write"
  | "interactive_speaking"
  | "read_then_speak"
  | "dialogue_summary";

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
  role: string | null;
  tier_expires_at: string | null;
  vip_granted_by_course?: boolean | null;
  ai_credits_used: number | null;
  lifetime_ai_used: boolean | null;
};

type InteractiveSpeakingCreditLockRow = {
  attempt_id: string;
  user_id: string;
  scenario_id: string | null;
  status: "pending" | "charged";
  charge_source: "plan" | "addon" | null;
};

const FREE_FEEDBACK_ALLOWED_SURFACES = new Set<FeedbackSurface>([
  "write_about_photo",
  "speak_about_photo",
  "read_then_write",
  "interactive_speaking",
]);

function freeFeedbackLockedReason(surface: FeedbackSurface): string {
  if (FREE_FEEDBACK_ALLOWED_SURFACES.has(surface)) {
    return "You already used your one free personalized feedback. / คุณใช้สิทธิ์ Personalized Feedback ฟรี 1 ครั้งครบแล้ว";
  }
  return "Free users can use personalized feedback one time on Write about photo, Speak about photo, Read then write, or Interactive speaking only. / ผู้ใช้ฟรีสามารถใช้ Personalized Feedback ได้ 1 ครั้ง เฉพาะ Write about photo, Speak about photo, Read then write หรือ Interactive speaking เท่านั้น";
}

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

export async function getAiCreditStateForUser(
  userId: string,
  surface: FeedbackSurface = "read_then_write",
): Promise<{
  allowed: boolean;
  reason: string | null;
  tier: Tier;
  planRemaining: number;
  addonRemaining: number;
}> {
  const supabase = createServiceRoleSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, role, tier_expires_at, vip_granted_by_course, ai_credits_used, lifetime_ai_used")
    .eq("id", userId)
    .maybeSingle();

  const tier = resolveEffectiveTierFromProfile({
    tier: profile?.tier,
    tier_expires_at: (profile?.tier_expires_at as string | null | undefined) ?? null,
    vip_granted_by_course: profile?.vip_granted_by_course === true,
  });
  const isAdmin = profile?.role === "admin";
  const used = Math.max(0, Number(profile?.ai_credits_used ?? 0));
  const lifetimeUsed = profile?.lifetime_ai_used === true;
  const { feedbackRemaining } = await getAddonBalancesForUser(userId);

  if (isAdmin) {
    return {
      allowed: true,
      reason: null,
      tier,
      planRemaining: Number.POSITIVE_INFINITY,
      addonRemaining: feedbackRemaining,
    };
  }

  if (tier === "free") {
    if (!FREE_FEEDBACK_ALLOWED_SURFACES.has(surface)) {
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
        reason: freeFeedbackLockedReason(surface),
        tier,
        planRemaining: 0,
        addonRemaining: 0,
      };
    }
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
      reason: freeFeedbackLockedReason(surface),
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

export async function chargeAiCreditForUser(
  userId: string,
  surface: FeedbackSurface = "read_then_write",
): Promise<{
  ok: boolean;
  source: "plan" | "addon" | null;
}> {
  const supabase = createServiceRoleSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, role, tier_expires_at, vip_granted_by_course, ai_credits_used, lifetime_ai_used")
    .eq("id", userId)
    .maybeSingle<ProfileLite>();

  const tier = resolveEffectiveTierFromProfile({
    tier: profile?.tier,
    tier_expires_at: profile?.tier_expires_at ?? null,
    vip_granted_by_course: profile?.vip_granted_by_course === true,
  });
  const isAdmin = profile?.role === "admin";
  const used = Math.max(0, Number(profile?.ai_credits_used ?? 0));
  const lifetimeUsed = profile?.lifetime_ai_used === true;

  if (isAdmin) {
    return { ok: true, source: "plan" };
  }

  if (tier === "free") {
    if (!FREE_FEEDBACK_ALLOWED_SURFACES.has(surface)) {
      const consumed = await consumeAddonCreditsForUser(userId, "feedback", 1);
      return { ok: consumed.ok, source: consumed.ok ? "addon" : null };
    }
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

export async function getInteractiveSpeakingCreditLockForAttempt(
  userId: string,
  attemptId: string,
): Promise<InteractiveSpeakingCreditLockRow | null> {
  const supabase = createServiceRoleSupabase();
  const { data, error } = await supabase
    .from("interactive_speaking_credit_locks")
    .select("attempt_id, user_id, scenario_id, status, charge_source")
    .eq("attempt_id", attemptId)
    .eq("user_id", userId)
    .maybeSingle<InteractiveSpeakingCreditLockRow>();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function reserveInteractiveSpeakingCreditForAttempt(args: {
  userId: string;
  attemptId: string;
  scenarioId: string;
}): Promise<{
  ok: boolean;
  reason?: string;
  source: "plan" | "addon" | null;
  alreadyReserved?: boolean;
}> {
  const { userId, attemptId, scenarioId } = args;
  const existing = await getInteractiveSpeakingCreditLockForAttempt(userId, attemptId);
  if (existing) {
    return {
      ok: true,
      source: existing.charge_source,
      alreadyReserved: true,
    };
  }

  const credit = await getAiCreditStateForUser(userId, "interactive_speaking");
  if (!credit.allowed) {
    return {
      ok: false,
      reason: credit.reason ?? "AI feedback quota reached",
      source: null,
    };
  }

  const supabase = createServiceRoleSupabase();
  const nowIso = new Date().toISOString();
  const { error: insertError } = await supabase
    .from("interactive_speaking_credit_locks")
    .insert({
      attempt_id: attemptId,
      user_id: userId,
      scenario_id: scenarioId,
      status: "pending",
      updated_at: nowIso,
    });

  if (insertError) {
    const retryExisting = await getInteractiveSpeakingCreditLockForAttempt(userId, attemptId);
    if (retryExisting) {
      return {
        ok: true,
        source: retryExisting.charge_source,
        alreadyReserved: true,
      };
    }
    return { ok: false, reason: insertError.message, source: null };
  }

  const charged = await chargeAiCreditForUser(userId, "interactive_speaking");
  if (!charged.ok) {
    await supabase.from("interactive_speaking_credit_locks").delete().eq("attempt_id", attemptId);
    return {
      ok: false,
      reason: "AI feedback quota reached. Upgrade or buy a feedback add-on.",
      source: null,
    };
  }

  const { error: updateError } = await supabase
    .from("interactive_speaking_credit_locks")
    .update({
      status: "charged",
      charge_source: charged.source,
      updated_at: new Date().toISOString(),
    })
    .eq("attempt_id", attemptId);

  if (updateError) {
    return { ok: true, source: charged.source };
  }

  return { ok: true, source: charged.source };
}

export async function currentTierForUser(userId: string): Promise<Tier> {
  const supabase = createServiceRoleSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("tier, tier_expires_at, vip_granted_by_course")
    .eq("id", userId)
    .maybeSingle();
  return resolveEffectiveTierFromProfile({
    tier: data?.tier,
    tier_expires_at: (data?.tier_expires_at as string | null | undefined) ?? null,
    vip_granted_by_course: data?.vip_granted_by_course === true,
  });
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
