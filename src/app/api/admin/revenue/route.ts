import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/admin-auth";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { fetchRevenueAnalytics } from "@/lib/admin-subscription-data";

export async function GET(request: Request) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "monthly";

  const supabase = createServiceRoleSupabase();
  const analytics = await fetchRevenueAnalytics();

  const { data: payments } = await supabase
    .from("payment_history")
    .select("id, user_id, amount, status, tier, description, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const userIds = [
    ...new Set((payments ?? []).map((p) => p.user_id as string).filter(Boolean)),
  ];
  const names = new Map<string, string>();
  if (userIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);
    for (const p of profs ?? []) {
      names.set(
        p.id as string,
        ((p.full_name as string)?.trim() || (p.email as string)) ?? "",
      );
    }
  }

  const events = (payments ?? []).map((p) => ({
    id: p.id,
    date: p.created_at,
    userId: p.user_id,
    userName: p.user_id ? names.get(p.user_id as string) ?? "—" : "—",
    event: "payment_succeeded",
    tier: p.tier,
    amount: p.amount,
    status: p.status,
  }));

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = monthStart;

  const { data: thisMonthPays } = await supabase
    .from("payment_history")
    .select("amount, status")
    .gte("created_at", monthStart.toISOString());

  const { data: prevMonthPays } = await supabase
    .from("payment_history")
    .select("amount, status")
    .gte("created_at", prevMonthStart.toISOString())
    .lt("created_at", prevMonthEnd.toISOString());

  let mrrThis = 0;
  for (const p of thisMonthPays ?? []) {
    if (p.status === "succeeded") mrrThis += (p.amount as number) ?? 0;
  }
  let mrrPrev = 0;
  for (const p of prevMonthPays ?? []) {
    if (p.status === "succeeded") mrrPrev += (p.amount as number) ?? 0;
  }
  const mrrDelta = mrrThis - mrrPrev;
  const mrrPct =
    mrrPrev > 0 ? Math.round((mrrDelta / mrrPrev) * 1000) / 10 : 0;

  const { data: churnActions } = await supabase
    .from("admin_actions")
    .select("id")
    .gte("created_at", monthStart.toISOString())
    .or("action.eq.stripe_subscription_cancelled,action.eq.revoke_access");

  return NextResponse.json({
    period,
    analytics,
    mrr: {
      satang: mrrThis,
      deltaSatang: mrrDelta,
      deltaPct: mrrPct,
    },
    churnCountThisMonth: (churnActions ?? []).length,
    paymentEvents: events,
  });
}
