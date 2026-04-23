import "server-only";

import type { Tier } from "@/lib/access-control";
import { resolveEffectiveTierFromProfile } from "@/lib/plan-status";
import { grantCourseVIPByEmail } from "@/lib/vip-access";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  tier: Tier | string;
  tier_expires_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  vip_granted_by_course: boolean | null;
  ai_credits_used: number | null;
  ai_credits_reset_at: string | null;
  lifetime_ai_used: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export async function getUserTier(userId: string): Promise<Tier | null> {
  const supabase = createServiceRoleSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("tier, tier_expires_at, vip_granted_by_course")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[subscription] getUserTier", error.message);
    return null;
  }
  return resolveEffectiveTierFromProfile({
    tier: data?.tier,
    tier_expires_at: (data?.tier_expires_at as string | null | undefined) ?? null,
    vip_granted_by_course: data?.vip_granted_by_course === true,
  });
}

/**
 * True when the user has a paid tier that is still valid by date,
 * or a course-granted VIP without an expiry.
 */
export function isSubscriptionActive(profile: ProfileRow): boolean {
  if (!profile.tier || profile.tier === "free") return false;

  if (profile.tier === "vip" && profile.vip_granted_by_course && !profile.tier_expires_at) {
    return true;
  }

  if (!profile.tier_expires_at) return false;
  return new Date(profile.tier_expires_at) > new Date();
}

export async function grantVIPAccess(email: string): Promise<{ ok: boolean; error?: string }> {
  return grantCourseVIPByEmail(email);
}

export async function revokeVIPAccess(userId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServiceRoleSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({
      tier: "free",
      vip_granted_by_course: false,
      stripe_subscription_id: null,
      tier_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function resetMonthlyCredits(userId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServiceRoleSupabase();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({
      ai_credits_used: 0,
      ai_credits_reset_at: now,
      updated_at: now,
    })
    .eq("id", userId);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
