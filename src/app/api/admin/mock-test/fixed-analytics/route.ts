import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

const ATTEMPT_LIMIT = 1000;

async function ensureAdmin() {
  const access = await getAdminAccess();
  if (!access.ok) {
    return { error: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  }
  if (access.simple) {
    return { supabase: createServiceRoleSupabase() };
  }
  const supabase = await createRouteHandlerSupabase();
  return { supabase };
}

type FixedResultRow = {
  id: string;
  session_id: string;
  user_id: string;
  set_id: string;
  created_at: string;
  actual_total: number | null;
  actual_listening: number | null;
  actual_speaking: number | null;
  actual_reading: number | null;
  actual_writing: number | null;
  report_payload: Record<string, unknown> | null;
};

export async function GET() {
  const auth = await ensureAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const [setsRes, resultsRes] = await Promise.all([
    supabase
      .from("mock_fixed_sets")
      .select("id,internal_name,user_title,name,created_at,is_active,mock_fixed_set_items(count)")
      .order("created_at", { ascending: false }),
    supabase
      .from("mock_fixed_results")
      .select(
        "id,session_id,user_id,set_id,created_at,actual_total,actual_listening,actual_speaking,actual_reading,actual_writing,report_payload",
      )
      .order("created_at", { ascending: false })
      .limit(ATTEMPT_LIMIT),
  ]);

  if (setsRes.error) return NextResponse.json({ error: setsRes.error.message }, { status: 500 });
  if (resultsRes.error) return NextResponse.json({ error: resultsRes.error.message }, { status: 500 });

  const sets = (setsRes.data ?? []).map((row: any) => ({
    id: row.id as string,
    internalName: (row.internal_name as string) || (row.name as string),
    userTitle: (row.user_title as string) || (row.name as string),
    isActive: row.is_active === true,
    createdAt: row.created_at as string,
    stepCount: row.mock_fixed_set_items?.[0]?.count ?? 0,
  }));

  const results = (resultsRes.data ?? []) as FixedResultRow[];
  const userIds = [...new Set(results.map((r) => r.user_id))];
  const setStatsMap = new Map<string, { attempts: number; avgTotal: number; bestTotal: number }>();

  for (const r of results) {
    const prev = setStatsMap.get(r.set_id) ?? { attempts: 0, avgTotal: 0, bestTotal: 0 };
    const score = Number(r.actual_total ?? 0);
    const attempts = prev.attempts + 1;
    const avgTotal = (prev.avgTotal * prev.attempts + score) / attempts;
    setStatsMap.set(r.set_id, {
      attempts,
      avgTotal,
      bestTotal: Math.max(prev.bestTotal, score),
    });
  }

  let profilesById = new Map<string, { email: string; full_name: string | null }>();
  if (userIds.length > 0) {
    const { data: profRows } = await supabase
      .from("profiles")
      .select("id,email,full_name")
      .in("id", userIds);
    profilesById = new Map(
      (profRows ?? []).map((p: any) => [
        p.id as string,
        { email: String(p.email ?? ""), full_name: (p.full_name as string | null) ?? null },
      ]),
    );
  }

  const rankedAttempts = results
    .map((r) => {
      const prof = profilesById.get(r.user_id);
      return {
        id: r.id,
        setId: r.set_id,
        userId: r.user_id,
        username: prof?.full_name ?? "-",
        email: prof?.email ?? "-",
        dateTaken: r.created_at,
        total: r.actual_total ?? 0,
        listening: r.actual_listening ?? 0,
        speaking: r.actual_speaking ?? 0,
        reading: r.actual_reading ?? 0,
        writing: r.actual_writing ?? 0,
        submission: r.report_payload ?? null,
      };
    })
    .sort((a, b) => b.total - a.total || a.dateTaken.localeCompare(b.dateTaken));

  const setsWithStats = sets.map((s) => {
    const stat = setStatsMap.get(s.id) ?? { attempts: 0, avgTotal: 0, bestTotal: 0 };
    return {
      ...s,
      attempts: stat.attempts,
      avgTotal: Math.round(stat.avgTotal),
      bestTotal: Math.round(stat.bestTotal),
    };
  });

  return NextResponse.json({
    sets: setsWithStats,
    rankedAttempts,
  });
}
