import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

const MAX_ROWS = 15_000;

type AggRow = {
  userId: string | null;
  totalThb: number;
  totalUsd: number;
  events: number;
  byOperationThb: Record<string, number>;
};

export async function GET(req: Request) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const days = Math.min(366, Math.max(1, Math.floor(Number(url.searchParams.get("days")) || 30)));

  let supabase;
  try {
    supabase = createServiceRoleSupabase();
  } catch {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server." },
      { status: 503 },
    );
  }

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);

  const { data: rows, error } = await supabase
    .from("api_usage_logs")
    .select("user_id, cost_usd, cost_thb, operation, provider, created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);

  if (error) {
    console.error("[api-usage/summary]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const map = new Map<string | null, AggRow>();

  for (const r of rows ?? []) {
    const uid = (r.user_id as string | null) ?? null;
    const thb = Number(r.cost_thb) || 0;
    const usd = Number(r.cost_usd) || 0;
    const cur =
      map.get(uid) ??
      ({
        userId: uid,
        totalThb: 0,
        totalUsd: 0,
        events: 0,
        byOperationThb: {},
      } satisfies AggRow);
    cur.totalThb += thb;
    cur.totalUsd += usd;
    cur.events += 1;
    const op = String(r.operation ?? "unknown");
    cur.byOperationThb[op] = (cur.byOperationThb[op] ?? 0) + thb;
    map.set(uid, cur);
  }

  const userIds = [...map.keys()].filter((x): x is string => typeof x === "string" && x.length > 0);
  const emails = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profs } = await supabase.from("profiles").select("id, email").in("id", userIds);
    for (const p of profs ?? []) {
      emails.set(p.id as string, String((p as { email?: string }).email ?? ""));
    }
  }

  const byUser = [...map.entries()]
    .filter(([uid]) => uid != null)
    .map(([, a]) => ({
      userId: a.userId as string,
      email: emails.get(a.userId!)?.trim() || `${(a.userId as string).slice(0, 8)}…`,
      estimatedTotalThb: Math.round(a.totalThb * 100) / 100,
      estimatedTotalUsd: Math.round(a.totalUsd * 1_000_000) / 1_000_000,
      events: a.events,
      byOperationThb: a.byOperationThb,
    }))
    .sort((x, y) => y.estimatedTotalThb - x.estimatedTotalThb);

  const anon = map.get(null);

  return NextResponse.json({
    days,
    since: since.toISOString(),
    rowCount: rows?.length ?? 0,
    capped: (rows?.length ?? 0) >= MAX_ROWS,
    byUser,
    anonymous: anon
      ? {
          estimatedTotalThb: Math.round(anon.totalThb * 100) / 100,
          estimatedTotalUsd: Math.round(anon.totalUsd * 1_000_000) / 1_000_000,
          events: anon.events,
          byOperationThb: anon.byOperationThb,
        }
      : null,
    envHint: {
      thbPerUsd: process.env.API_COST_THB_PER_USD ?? "35 (default)",
      note:
        "Costs are estimates from token counts and configurable env rates (see src/lib/api-usage-log.ts).",
    },
  });
}
