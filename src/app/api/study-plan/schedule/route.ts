import { NextResponse } from "next/server";

import { createRequestSupabase } from "@/lib/supabase-request-client";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

/** GET/POST /api/study-plan/schedule — the caller's own study_plan_schedules row. */
export async function GET(req: Request) {
  const supabase = await createRequestSupabase(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const { data } = await supabase
    .from("study_plan_schedules")
    .select("exam_date, cadence_days, default_duration_minutes, reminder_time")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ schedule: data ?? null }, { headers: NO_STORE_HEADERS });
}

export async function POST(req: Request) {
  const supabase = await createRequestSupabase(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: NO_STORE_HEADERS });
  }
  const o = (body ?? {}) as Record<string, unknown>;
  const examDate = o.examDate;
  const cadenceDays = o.cadenceDays;
  const defaultDurationMinutes = o.defaultDurationMinutes;
  const reminderTime = typeof o.reminderTime === "string" ? o.reminderTime : "19:00";

  if (typeof examDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
    return NextResponse.json({ error: "examDate must be YYYY-MM-DD" }, { status: 400, headers: NO_STORE_HEADERS });
  }
  if (typeof cadenceDays !== "number" || cadenceDays < 1 || cadenceDays > 7) {
    return NextResponse.json({ error: "cadenceDays must be 1-7" }, { status: 400, headers: NO_STORE_HEADERS });
  }
  if (![5, 10, 20, 30].includes(defaultDurationMinutes as number)) {
    return NextResponse.json({ error: "defaultDurationMinutes must be 5, 10, 20, or 30" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const { error } = await supabase.from("study_plan_schedules").upsert({
    user_id: user.id,
    exam_date: examDate,
    cadence_days: cadenceDays,
    default_duration_minutes: defaultDurationMinutes,
    reminder_time: reminderTime,
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });

  return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
