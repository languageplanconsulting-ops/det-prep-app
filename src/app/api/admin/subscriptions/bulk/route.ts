import { NextResponse } from "next/server";

import { getAdminAccess, logAdminAction } from "@/lib/admin-auth";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

type Body = {
  emails?: string[];
  action?: "change_tier" | "extend_expiry" | "set_expiry_date";
  tier?: string;
  days?: number;
  reason?: string;
  fromTier?: string;
  /** ISO 8601 string, or `null` to clear expiry */
  tier_expires_at?: string | null;
  /** `all` = every profile (optionally filtered by tier_filter); `list` = emails only */
  scope?: "all" | "list";
  /** When scope is `all`, limit to this tier, or omit / `"all"` for every tier */
  tier_filter?: string;
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

  if (body.action === "set_expiry_date") {
    const hasKey = Object.prototype.hasOwnProperty.call(body, "tier_expires_at");
    if (!hasKey) {
      return NextResponse.json(
        { error: "tier_expires_at required (ISO string or null)" },
        { status: 400 },
      );
    }
    const nextExpiry =
      body.tier_expires_at === null
        ? null
        : typeof body.tier_expires_at === "string"
          ? body.tier_expires_at
          : null;
    if (body.tier_expires_at !== null && typeof body.tier_expires_at !== "string") {
      return NextResponse.json({ error: "tier_expires_at must be string or null" }, { status: 400 });
    }

    const scope = body.scope ?? "list";
    const tierFilter =
      body.tier_filter && body.tier_filter !== "all" ? body.tier_filter : null;
    const nowIso = new Date().toISOString();

    const applyFromRow = async (row: {
      id: string;
      email: string | null;
      tier_expires_at: unknown;
    }) => {
      const userId = row.id;
      const email = row.email ?? "";
      const { error } = await supabase
        .from("profiles")
        .update({
          tier_expires_at: nextExpiry,
          updated_at: nowIso,
        })
        .eq("id", userId);
      if (error) {
        failed.push(email || userId);
        return;
      }
      await logAdminAction({
        adminId,
        targetUserId: userId,
        action: "bulk_set_expiry_date",
        previousValue: { tier_expires_at: row.tier_expires_at },
        newValue: { tier_expires_at: nextExpiry },
        reason: body.reason,
      });
      success.push(email || userId);
    };

    if (scope === "all") {
      const pageSize = 500;
      let from = 0;
      for (;;) {
        let q = supabase
          .from("profiles")
          .select("id, email, tier_expires_at")
          .order("created_at", { ascending: true });
        if (tierFilter) {
          q = q.eq("tier", tierFilter);
        }
        const { data: page } = await q.range(from, from + pageSize - 1);
        const rows = page ?? [];
        if (rows.length === 0) break;
        for (const row of rows) {
          await applyFromRow({
            id: row.id as string,
            email: (row.email as string | null) ?? null,
            tier_expires_at: row.tier_expires_at,
          });
        }
        if (rows.length < pageSize) break;
        from += pageSize;
      }

      return NextResponse.json({
        ok: true,
        success,
        failed,
        count: success.length,
      });
    }

    const emails = (body.emails ?? []).map(normalizeEmail).filter(Boolean);
    if (emails.length === 0) {
      return NextResponse.json(
        { error: "emails required when scope is list" },
        { status: 400 },
      );
    }
    for (const email of emails) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, tier_expires_at")
        .eq("email", email)
        .maybeSingle();
      if (!profile?.id) {
        failed.push(email);
        continue;
      }
      await applyFromRow({
        id: profile.id as string,
        email: (profile.email as string | null) ?? null,
        tier_expires_at: profile.tier_expires_at,
      });
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
