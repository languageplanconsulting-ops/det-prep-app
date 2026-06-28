import { NextResponse } from "next/server";

import { getAdminAccess, logAdminAction } from "@/lib/admin-auth";
import {
  isBillableMockFixedSession,
  mockFixedMonthStartIso,
} from "@/lib/mock-test/mock-fixed-quota";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";

type Ctx = { params: Promise<{ userId: string }> };

/**
 * Clears a user's mock-test usage for the CURRENT calendar month by flagging
 * this month's billable fixed-mock sessions as `quotaExempt`. The base monthly
 * cap (2/4/6) still renews automatically on the 1st; this is a manual top-up for
 * cases like post-testing cleanup or a goodwill reset. Attempt history/results
 * are untouched — only the quota flag changes.
 */
export async function POST(request: Request, ctx: Ctx) {
  const auth = await getAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const adminId = auth.adminUserId;

  const { userId } = await ctx.params;
  const body = (await request.json().catch(() => null)) as {
    reason?: string;
  } | null;

  const supabase = createServiceRoleSupabase();
  const monthStart = mockFixedMonthStartIso();

  const { data: rows, error: fetchError } = await supabase
    .from("mock_fixed_sessions")
    .select("id, targets")
    .eq("user_id", userId)
    .gte("started_at", monthStart);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const toExempt = (rows ?? []).filter((r) =>
    isBillableMockFixedSession((r as { targets?: unknown }).targets),
  );

  let cleared = 0;
  for (const row of toExempt) {
    const targets =
      (row as { targets?: Record<string, unknown> | null }).targets ?? {};
    const nextTargets = { ...targets, quotaExempt: true };
    const { error: updateError } = await supabase
      .from("mock_fixed_sessions")
      .update({ targets: nextTargets })
      .eq("id", (row as { id: string }).id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    cleared += 1;
  }

  await logAdminAction({
    adminId,
    targetUserId: userId,
    action: "reset_mock_quota",
    previousValue: { billableThisMonth: toExempt.length },
    newValue: { quotaExemptApplied: cleared },
    reason: typeof body?.reason === "string" ? body.reason : null,
  });

  return NextResponse.json({ ok: true, cleared });
}
