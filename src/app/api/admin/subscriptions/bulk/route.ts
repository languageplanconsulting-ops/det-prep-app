import { NextResponse } from "next/server";

import { getAdminAccess, logAdminAction } from "@/lib/admin-auth";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

type Body = {
  emails?: string[];
  action?: "change_tier" | "extend_expiry";
  tier?: string;
  days?: number;
  reason?: string;
  fromTier?: string;
};

function normalizeEmail(e: string) {
  return e.trim().toLowerCase();
}

export async function POST(request: Request) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const adminId = auth.adminUserId;

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body?.reason?.trim()) {
    return NextResponse.json({ error: "reason required" }, { status: 400 });
  }

  const supabase = createServiceRoleSupabase();
  const success: string[] = [];
  const failed: string[] = [];

  if (body.action === "change_tier") {
    const targetTier = body.tier;
    if (!targetTier) {
      return NextResponse.json({ error: "tier required" }, { status: 400 });
    }

    let emails = (body.emails ?? []).map(normalizeEmail).filter(Boolean);

    if (body.fromTier && body.fromTier !== "all") {
      const { data: rows } = await supabase
        .from("profiles")
        .select("id, email, tier")
        .eq("tier", body.fromTier);
      emails = [
        ...new Set([
          ...emails,
          ...(rows ?? []).map((r) => normalizeEmail(r.email as string)),
        ]),
      ];
    }

    for (const email of emails) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email)
        .maybeSingle();
      if (!profile) {
        failed.push(email);
        continue;
      }
      const before = { ...profile };
      const { error } = await supabase
        .from("profiles")
        .update({
          tier: targetTier,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) {
        failed.push(email);
        continue;
      }
      await logAdminAction({
        adminId,
        targetUserId: profile.id as string,
        action: "bulk_change_tier",
        previousValue: before,
        newValue: { tier: targetTier },
        reason: body.reason,
      });
      success.push(email);
    }

    return NextResponse.json({
      ok: true,
      success,
      failed,
      count: success.length,
    });
  }

  if (body.action === "extend_expiry") {
    const days = Number(body.days ?? 30);
    const emails = (body.emails ?? []).map(normalizeEmail).filter(Boolean);

    for (const email of emails) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email)
        .maybeSingle();
      if (!profile) {
        failed.push(email);
        continue;
      }
      const base = profile.tier_expires_at
        ? new Date(profile.tier_expires_at as string)
        : new Date();
      const d = new Date(base);
      d.setDate(d.getDate() + days);
      const next = d.toISOString();

      const { error } = await supabase
        .from("profiles")
        .update({
          tier_expires_at: next,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) {
        failed.push(email);
        continue;
      }
      await logAdminAction({
        adminId,
        targetUserId: profile.id as string,
        action: "bulk_extend_expiry",
        previousValue: { tier_expires_at: profile.tier_expires_at },
        newValue: { tier_expires_at: next, days },
        reason: body.reason,
      });
      success.push(email);
    }

    return NextResponse.json({
      ok: true,
      success,
      failed,
      count: success.length,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
