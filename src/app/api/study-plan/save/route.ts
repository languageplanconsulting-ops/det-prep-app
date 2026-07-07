import { NextResponse } from "next/server";

import { getOptionalAuthUserId } from "@/lib/route-auth-user";
import { createRouteHandlerSupabase } from "@/lib/supabase-route";

// POST { target, predicted, report, answers } → persists the diagnostic result.
// Returns { id, freeUser } so the client can lock/unlock the plan by the real tier.
export async function POST(req: Request) {
  const userId = await getOptionalAuthUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบเพื่อบันทึกผล", needsAuth: true }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const o = (body ?? {}) as Record<string, unknown>;
  const target = Number(o.target);
  const predicted = Number(o.predicted);
  if (!Number.isFinite(target) || !Number.isFinite(predicted) || typeof o.report !== "object") {
    return NextResponse.json({ error: "target, predicted, report required" }, { status: 400 });
  }

  const supabase = await createRouteHandlerSupabase();
  const { data: prof } = await supabase.from("profiles").select("tier").eq("id", userId).single();
  const tier = (prof?.tier as string | undefined) ?? "free";

  const { data, error } = await supabase
    .from("study_plan_results")
    .insert({ user_id: userId, target: Math.round(target), predicted: Math.round(predicted), report: o.report, answers: o.answers ?? {} })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data.id, freeUser: tier === "free" });
}
