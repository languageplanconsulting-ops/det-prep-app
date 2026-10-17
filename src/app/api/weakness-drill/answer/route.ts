import { NextResponse, type NextRequest } from "next/server";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { getOptionalAuthUserId } from "@/lib/route-auth-user";
import { loadDrillById, toDrillView } from "@/lib/weakness-drill";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Grades step 1. The first answer is final, so reopening the report can't be used to retry for a "correct". */
export async function POST(req: NextRequest) {
  try {
    const userId = await getOptionalAuthUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => null)) as { drillId?: unknown; choiceId?: unknown } | null;
    if (typeof body?.drillId !== "string" || typeof body?.choiceId !== "string") {
      return NextResponse.json({ error: "drillId and choiceId required" }, { status: 400 });
    }

    const row = await loadDrillById(userId, body.drillId);
    if (!row) return NextResponse.json({ error: "Drill not found" }, { status: 404 });
    if (row.step1_choice_id != null) return NextResponse.json({ drill: toDrillView(row) });

    if (!row.choices.some((c) => c.id === body.choiceId)) {
      return NextResponse.json({ error: "Unknown choice" }, { status: 400 });
    }
    const correct = body.choiceId === row.correct_choice_id;
    const supabase = createServiceRoleSupabase();
    const { data, error } = await supabase
      .from("weakness_drills")
      .update({
        step1_choice_id: body.choiceId,
        step1_correct: correct,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("user_id", userId)
      .is("step1_choice_id", null)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    // A concurrent request answered first — return what is stored.
    const final = data ?? (await loadDrillById(userId, row.id)) ?? row;
    return NextResponse.json({ drill: toDrillView(final as typeof row) });
  } catch (e) {
    console.error("[weakness-drill/answer]", e);
    return NextResponse.json({ error: "Could not save answer" }, { status: 500 });
  }
}
