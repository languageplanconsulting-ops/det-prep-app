import { NextResponse } from "next/server";

import { createRequestSupabase } from "@/lib/supabase-request-client";
import { getAdminAccess } from "@/lib/admin-auth";
import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { stripAdaptiveBank } from "@/lib/mock-test/adaptive-dictation";

type ReportItem = {
  step_index: number;
  task_type: string;
  content?: Record<string, unknown> | null;
  correct_answer?: unknown;
};

/**
 * Adaptive dictation: each learner heard a different sentence per dictation
 * step, recorded on their response. Show THAT sentence in the report (not the
 * set's default one), and never ship the sentence bank.
 */
function reportItems(result: { report_payload?: unknown }, items: ReportItem[]): ReportItem[] {
  const responses = (result.report_payload as { responses?: unknown } | null)?.responses;
  const served = new Map<number, string>();
  if (Array.isArray(responses)) {
    for (const r of responses as Array<{ step_index?: number; adaptive?: { sentence?: unknown } }>) {
      const sentence = r?.adaptive?.sentence;
      if (typeof sentence === "string" && sentence) served.set(Number(r.step_index), sentence);
    }
  }
  return stripAdaptiveBank(items).map((item) => {
    const sentence = item.task_type === "dictation" ? served.get(item.step_index) : undefined;
    if (!sentence) return item;
    return {
      ...item,
      content: { ...(item.content ?? {}), reference_sentence: sentence },
      correct_answer: { answer: sentence },
    };
  });
}

export async function GET(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;

  const access = await getAdminAccess();
  if (access.ok && access.simple === true) {
    const supabase = createServiceRoleSupabase();
    const { data, error } = await supabase
      .from("mock_fixed_results")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { data: items, error: itemsErr } = await supabase
      .from("mock_fixed_set_items")
      .select("step_index,task_type,content,correct_answer")
      .eq("set_id", data.set_id)
      .order("step_index", { ascending: true });
    if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    return NextResponse.json({ result: data, stepItems: reportItems(data, items ?? []) });
  }

  const supabase = await createRequestSupabase(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("mock_fixed_results")
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data: items, error: itemsErr } = await supabase
    .from("mock_fixed_set_items")
    .select("step_index,task_type,content,correct_answer")
    .eq("set_id", data.set_id)
    .order("step_index", { ascending: true });
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  return NextResponse.json({ result: data, stepItems: reportItems(data, items ?? []) });
}
