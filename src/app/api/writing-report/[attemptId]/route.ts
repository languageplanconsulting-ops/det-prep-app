import { NextResponse } from "next/server";

import { createRouteHandlerSupabase } from "@/lib/supabase-route";
import type { WritingAttemptReport } from "@/types/writing";

function looksLikeWritingReport(value: unknown): value is WritingAttemptReport {
  if (!value || typeof value !== "object") return false;
  const report = value as Record<string, unknown>;
  return (
    typeof report.attemptId === "string" &&
    typeof report.topicId === "string" &&
    typeof report.score160 === "number"
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  try {
    const { attemptId } = await params;
    if (!attemptId) {
      return NextResponse.json({ error: "attemptId required" }, { status: 400 });
    }

    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("study_sessions")
      .select("report_payload, ended_at")
      .eq("user_id", user.id)
      .eq("exercise_type", "read_then_write")
      .not("report_payload", "is", null)
      .order("ended_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[writing-report/:attemptId] list study sessions", error.message);
      return NextResponse.json({ error: "Could not load report" }, { status: 500 });
    }

    const match = (data ?? [])
      .map((row) => row.report_payload)
      .find((payload) => {
        if (!looksLikeWritingReport(payload)) return false;
        return payload.attemptId === attemptId;
      });

    if (!match) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json(match);
  } catch (e) {
    console.error("[writing-report/:attemptId] GET", e);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
