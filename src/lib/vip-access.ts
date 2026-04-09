import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import {
  sendVIPGrantEmail,
  sendVIPRevokeEmail,
} from "@/lib/notifications";
import { provisionCourseStudentAuth } from "@/lib/vip-auth-provision";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type VIPGrant = {
  id: string;
  email: string;
  granted_at: string | null;
  granted_by: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string | null;
  full_name: string | null;
  tier: string | null;
  vip_granted_by_course: boolean | null;
  /** User has a profiles row */
  is_registered: boolean;
};

export type BulkResult = {
  success: string[];
  failed: string[];
  alreadyVIP: string[];
  /** Profiles updated to VIP immediately */
  immediateGranted: string[];
  /** Grant rows created for emails with no profile yet */
  pendingCreated: string[];
};

/**
 * Legacy / webhook helper: ensure a course grant row exists and upgrade profile if present.
 * Does not require an admin id (granted_by may remain null until an admin edits the row).
 */
/** 6-month VIP for Duolingo Fast Track self-serve enrollment (API + secret). */
export async function grantDuolingoFastTrackVIP(
  email: string,
  fullName: string | null,
  months = 6,
): Promise<{ ok: true; expiresAt: string } | { ok: false; error: string }> {
  const supabase = createServiceRoleSupabase();
  const norm = normalizeEmail(email);
  const expires = new Date();
  expires.setMonth(expires.getMonth() + months);
  const expiresAt = expires.toISOString();
  const notes = `Duolingo Fast Track (self-serve)${fullName?.trim() ? ` — ${fullName.trim()}` : ""}`;

  const { error: upsertError } = await supabase.from("vip_course_grants").upsert(
    {
      email: norm,
      is_active: true,
      revoked_at: null,
      revoked_by: null,
      granted_at: new Date().toISOString(),
      granted_by: null,
      notes,
      grant_expires_at: expiresAt,
    },
    { onConflict: "email" },
  );

  if (upsertError) {
    return { ok: false, error: upsertError.message };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", norm)
    .maybeSingle();

  if (profile) {
    const patch: Record<string, unknown> = {
      tier: "vip",
      vip_granted_by_course: true,
      tier_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    };
    if (fullName?.trim()) {
      patch.full_name = fullName.trim();
    }
    const { error } = await supabase.from("profiles").update(patch).eq("id", profile.id);
    if (error) {
      return { ok: false, error: error.message };
    }
    // Fast Track: no notification email — students go straight to sign-in and use VIP in-app.
  }

  return { ok: true, expiresAt };
}

export async function grantCourseVIPByEmail(
  email: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServiceRoleSupabase();
  const norm = normalizeEmail(email);

  const { error: upsertError } = await supabase.from("vip_course_grants").upsert(
    {
      email: norm,
      is_active: true,
      revoked_at: null,
      revoked_by: null,
      granted_at: new Date().toISOString(),
      grant_expires_at: null,
    },
    { onConflict: "email" },
  );

  if (upsertError) {
    return { ok: false, error: upsertError.message };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", norm)
    .maybeSingle();

  if (profile) {
    const { error } = await supabase
      .from("profiles")
      .update({
        tier: "vip",
        vip_granted_by_course: true,
        tier_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (error) {
      return { ok: false, error: error.message };
    }
    await sendVIPGrantEmail(norm);
  }

  return { ok: true };
}

export async function checkVIPEligibility(email: string): Promise<boolean> {
  const supabase = createServiceRoleSupabase();
  const norm = normalizeEmail(email);
  const { data, error } = await supabase
    .from("vip_course_grants")
    .select("id, grant_expires_at")
    .eq("email", norm)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[vip-access] checkVIPEligibility", error.message);
    return false;
  }
  if (!data) return false;
  const exp = data.grant_expires_at as string | null | undefined;
  if (exp && new Date(exp) <= new Date()) return false;
  return true;
}

type ProfileVIPOutcome = "immediate" | "pending" | { error: string };

async function applyProfileVIPAfterGrant(
  norm: string,
  initialPassword: string | null,
): Promise<ProfileVIPOutcome> {
  const supabase = createServiceRoleSupabase();
  let authUserId: string | null = null;
  if (initialPassword?.trim()) {
    const r = await provisionCourseStudentAuth(norm, initialPassword.trim());
    if (!r.ok) return { error: r.error };
    authUserId = r.userId;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", norm)
    .maybeSingle();

  if (profile) {
    const { error } = await supabase
      .from("profiles")
      .update({
        tier: "vip",
        vip_granted_by_course: true,
        tier_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (error) {
      console.error("[vip-access] applyProfileVIPAfterGrant update", error.message);
      return { error: error.message };
    }
    await sendVIPGrantEmail(norm);
    return "immediate";
  }

  if (authUserId) {
    const { error } = await supabase.from("profiles").upsert(
      {
        id: authUserId,
        email: norm,
        tier: "vip",
        vip_granted_by_course: true,
        tier_expires_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (error) {
      console.error("[vip-access] applyProfileVIPAfterGrant upsert", error.message);
      return { error: error.message };
    }
    await sendVIPGrantEmail(norm);
    return "immediate";
  }

  return "pending";
}

export async function grantVIPOnSignup(
  userId: string,
  email: string,
): Promise<void> {
  const supabase = createServiceRoleSupabase();
  const norm = normalizeEmail(email);
  const eligible = await checkVIPEligibility(email);

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id, tier")
    .eq("id", userId)
    .maybeSingle();

  if (eligible) {
    const { data: grant } = await supabase
      .from("vip_course_grants")
      .select("grant_expires_at, notes")
      .eq("email", norm)
      .eq("is_active", true)
      .maybeSingle();
    const grantExp = grant?.grant_expires_at as string | null | undefined;
    const tierExpiresAt =
      grantExp && new Date(grantExp) > new Date() ? grantExp : null;

    const { error } = await supabase
      .from("profiles")
      .update({
        tier: "vip",
        vip_granted_by_course: true,
        tier_expires_at: tierExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("[vip-access] grantVIPOnSignup update", error.message);
      return;
    }
    console.log(`VIP granted to ${norm} via course enrollment`);
    const fastTrackSelfServe =
      typeof grant?.notes === "string" &&
      grant.notes.includes("Duolingo Fast Track (self-serve)");
    if (!fastTrackSelfServe) {
      await sendVIPGrantEmail(norm);
    }
    return;
  }

  if (!profile?.stripe_subscription_id) {
    const { error } = await supabase
      .from("profiles")
      .update({
        tier: "free",
        vip_granted_by_course: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("[vip-access] grantVIPOnSignup free tier", error.message);
    }
  }
}

export async function grantVIPManually(
  email: string,
  adminId: string | null,
  notes?: string | null,
  initialPassword?: string | null,
): Promise<void> {
  const supabase = createServiceRoleSupabase();
  const norm = normalizeEmail(email);
  const pwt = initialPassword?.trim() ?? "";
  if (pwt && pwt.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const { error: upsertError } = await supabase.from("vip_course_grants").upsert(
    {
      email: norm,
      granted_by: adminId,
      is_active: true,
      revoked_at: null,
      revoked_by: null,
      granted_at: new Date().toISOString(),
      notes: notes ?? null,
      grant_expires_at: null,
    },
    { onConflict: "email" },
  );

  if (upsertError) {
    console.error("[vip-access] grantVIPManually upsert", upsertError.message);
    throw new Error(upsertError.message);
  }

  const outcome = await applyProfileVIPAfterGrant(norm, pwt || null);
  if (typeof outcome === "object" && "error" in outcome) {
    throw new Error(outcome.error);
  }
}

export async function revokeVIPAccess(
  email: string,
  adminId: string | null,
): Promise<void> {
  const supabase = createServiceRoleSupabase();
  const norm = normalizeEmail(email);
  const now = new Date().toISOString();

  const { error: grantError } = await supabase
    .from("vip_course_grants")
    .update({
      is_active: false,
      revoked_at: now,
      revoked_by: adminId,
    })
    .eq("email", norm);

  if (grantError) {
    console.error("[vip-access] revokeVIPAccess grant row", grantError.message);
    throw new Error(grantError.message);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, stripe_subscription_id, full_name")
    .eq("email", norm)
    .maybeSingle();

  if (!profile) {
    return;
  }

  if (profile.stripe_subscription_id) {
    await supabase
      .from("profiles")
      .update({
        vip_granted_by_course: false,
        updated_at: now,
      })
      .eq("id", profile.id);
  } else {
    await supabase
      .from("profiles")
      .update({
        tier: "free",
        vip_granted_by_course: false,
        tier_expires_at: null,
        updated_at: now,
      })
      .eq("id", profile.id);
  }

  await sendVIPRevokeEmail(norm, profile.full_name ?? undefined);
}

export async function bulkGrantVIP(
  emails: string[],
  adminId: string | null,
  notes?: string | null,
  initialPassword?: string | null,
): Promise<BulkResult> {
  const pwt = initialPassword?.trim() ?? "";
  if (pwt && pwt.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const success: string[] = [];
  const failed: string[] = [];
  const alreadyVIP: string[] = [];
  const immediateGranted: string[] = [];
  const pendingCreated: string[] = [];
  const supabase = createServiceRoleSupabase();

  for (const raw of emails) {
    const norm = normalizeEmail(raw);
    if (!norm.includes("@")) {
      failed.push(raw);
      continue;
    }

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, tier, vip_granted_by_course")
        .eq("email", norm)
        .maybeSingle();

      const { data: existingGrant } = await supabase
        .from("vip_course_grants")
        .select("id, is_active")
        .eq("email", norm)
        .maybeSingle();

      if (
        profile &&
        profile.tier === "vip" &&
        profile.vip_granted_by_course === true &&
        existingGrant?.is_active === true
      ) {
        alreadyVIP.push(norm);
        continue;
      }

      const { error: upsertError } = await supabase
        .from("vip_course_grants")
        .upsert(
          {
            email: norm,
            granted_by: adminId,
            is_active: true,
            revoked_at: null,
            revoked_by: null,
            granted_at: new Date().toISOString(),
            notes: notes ?? null,
            grant_expires_at: null,
          },
          { onConflict: "email" },
        );

      if (upsertError) {
        failed.push(norm);
        continue;
      }

      const outcome = await applyProfileVIPAfterGrant(norm, pwt || null);
      if (typeof outcome === "object" && "error" in outcome) {
        failed.push(norm);
        continue;
      }
      if (outcome === "immediate") {
        immediateGranted.push(norm);
      } else {
        pendingCreated.push(norm);
      }

      success.push(norm);
    } catch {
      failed.push(raw);
    }
  }

  return { success, failed, alreadyVIP, immediateGranted, pendingCreated };
}

export async function getVIPGrantList(): Promise<VIPGrant[]> {
  const supabase = createServiceRoleSupabase();
  const { data: grants, error } = await supabase
    .from("vip_course_grants")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[vip-access] getVIPGrantList", error.message);
    return [];
  }

  const rows = grants ?? [];
  const out: VIPGrant[] = [];

  for (const g of rows) {
    const norm = normalizeEmail(g.email as string);
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, tier, vip_granted_by_course")
      .eq("email", norm)
      .maybeSingle();

    out.push({
      id: g.id as string,
      email: g.email as string,
      granted_at: g.granted_at as string | null,
      granted_by: g.granted_by as string | null,
      revoked_at: g.revoked_at as string | null,
      revoked_by: g.revoked_by as string | null,
      is_active: g.is_active as boolean,
      notes: g.notes as string | null,
      created_at: g.created_at as string | null,
      full_name: profile?.full_name ?? null,
      tier: profile?.tier ?? null,
      vip_granted_by_course: profile?.vip_granted_by_course ?? null,
      is_registered: !!profile,
    });
  }

  return out;
}

export type VIPGrantStats = {
  totalGrantsAllTime: number;
  activeGrants: number;
  courseVipUsers: number;
  paidStripeVipUsers: number;
  pendingGrants: number;
  revokedGrants: number;
};

export type VIPActivityRow = {
  email: string;
  action: "grant" | "revoke";
  at: string;
  adminId: string | null;
  adminName: string | null;
};

export type BulkPreviewRow = {
  email: string;
  registered: boolean;
  tier: string | null;
  vipGrantedByCourse: boolean;
};

export async function previewBulkGrantEmails(
  emails: string[],
): Promise<BulkPreviewRow[]> {
  const supabase = createServiceRoleSupabase();
  const rows: BulkPreviewRow[] = [];
  for (const raw of emails) {
    const norm = normalizeEmail(raw);
    if (!norm.includes("@")) continue;
    const { data: profile } = await supabase
      .from("profiles")
      .select("tier, vip_granted_by_course")
      .eq("email", norm)
      .maybeSingle();
    rows.push({
      email: norm,
      registered: !!profile,
      tier: profile?.tier ?? null,
      vipGrantedByCourse: profile?.vip_granted_by_course ?? false,
    });
  }
  return rows;
}

export async function getVIPGrantStats(): Promise<VIPGrantStats> {
  const supabase = createServiceRoleSupabase();

  const totalRes = await supabase
    .from("vip_course_grants")
    .select("*", { count: "exact", head: true });
  if (totalRes.error) {
    console.error("[vip-access] getVIPGrantStats total", totalRes.error.message);
  }
  const activeRes = await supabase
    .from("vip_course_grants")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);
  if (activeRes.error) {
    console.error("[vip-access] getVIPGrantStats active", activeRes.error.message);
  }
  const revokedRes = await supabase
    .from("vip_course_grants")
    .select("*", { count: "exact", head: true })
    .eq("is_active", false);
  if (revokedRes.error) {
    console.error("[vip-access] getVIPGrantStats revoked", revokedRes.error.message);
  }

  const totalGrantsAllTime = totalRes.error ? 0 : (totalRes.count ?? 0);
  const activeGrants = activeRes.error ? 0 : (activeRes.count ?? 0);
  const revokedGrants = revokedRes.error ? 0 : (revokedRes.count ?? 0);

  let courseVipUsers = 0;
  let paidStripeVipUsers = 0;
  {
    const r1 = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("vip_granted_by_course", true);
    if (r1.error) {
      console.error("[vip-access] getVIPGrantStats courseVipUsers", r1.error.message);
    } else {
      courseVipUsers = r1.count ?? 0;
    }
    const r2 = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .not("stripe_subscription_id", "is", null)
      .eq("tier", "vip");
    if (r2.error) {
      console.error("[vip-access] getVIPGrantStats paidStripeVipUsers", r2.error.message);
    } else {
      paidStripeVipUsers = r2.count ?? 0;
    }
  }

  const { data: activeGrantsRows, error: activeErr } = await supabase
    .from("vip_course_grants")
    .select("email")
    .eq("is_active", true);
  if (activeErr) {
    console.error("[vip-access] getVIPGrantStats active emails", activeErr.message);
  }

  let pendingGrants = 0;
  const emails = (activeGrantsRows ?? []).map((r) => normalizeEmail(r.email as string));
  for (const e of emails) {
    const { data: p, error: pe } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", e)
      .maybeSingle();
    if (pe) {
      console.error("[vip-access] getVIPGrantStats pending check", pe.message);
      continue;
    }
    if (!p) pendingGrants += 1;
  }

  return {
    totalGrantsAllTime,
    activeGrants,
    courseVipUsers,
    paidStripeVipUsers,
    pendingGrants,
    revokedGrants,
  };
}

export async function getRecentVIPActivity(
  limit = 10,
): Promise<VIPActivityRow[]> {
  const supabase = createServiceRoleSupabase();
  const { data: grants } = await supabase
    .from("vip_course_grants")
    .select("email, granted_at, revoked_at, granted_by, revoked_by, is_active")
    .order("created_at", { ascending: false })
    .limit(80);

  const events: VIPActivityRow[] = [];
  for (const g of grants ?? []) {
    const email = g.email as string;
    if (g.granted_at) {
      events.push({
        email,
        action: "grant",
        at: g.granted_at as string,
        adminId: (g.granted_by as string | null) ?? null,
        adminName: null,
      });
    }
    if (g.revoked_at && g.is_active === false) {
      events.push({
        email,
        action: "revoke",
        at: g.revoked_at as string,
        adminId: (g.revoked_by as string | null) ?? null,
        adminName: null,
      });
    }
  }

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const sliced = events.slice(0, limit);
  const adminIds = [
    ...new Set(sliced.map((e) => e.adminId).filter(Boolean) as string[]),
  ];
  const nameById = new Map<string, string>();
  if (adminIds.length) {
    const { data: admins } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", adminIds);
    for (const a of admins ?? []) {
      const label =
        (a.full_name as string | null)?.trim() ||
        (a.email as string | null) ||
        null;
      if (label) nameById.set(a.id as string, label);
    }
  }
  return sliced.map((e) => ({
    ...e,
    adminName: e.adminId ? nameById.get(e.adminId) ?? null : null,
  }));
}
