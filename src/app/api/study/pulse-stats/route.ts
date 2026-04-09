import { NextResponse } from "next/server";

import { createRouteHandlerSupabase } from "@/lib/supabase-route";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function dayKeyInTimeZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/**
 * Query: timeZone (IANA), days=comma-separated YYYY-MM-DD (usually 7 local days, oldest first).
 * Returns per-day minutes in that window plus all-time total minutes (same rules as /time-by-skill).
 */
export async function GET(req: Request) {
  try {
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const timeZone = url.searchParams.get("timeZone")?.trim() || "UTC";
    try {
      Intl.DateTimeFormat(undefined, { timeZone });
    } catch {
      return NextResponse.json({ error: "Invalid timeZone" }, { status: 400 });
    }

    const daysRaw = url.searchParams.get("days")?.trim();
    if (!daysRaw) {
      return NextResponse.json({ error: "days parameter required" }, { status: 400 });
    }
    const dayList = daysRaw.split(",").map((s) => s.trim()).filter(Boolean);
    if (dayList.length === 0 || dayList.some((d) => !DAY_RE.test(d))) {
      return NextResponse.json({ error: "Invalid days list" }, { status: 400 });
    }

    const daySet = new Set(dayList);
    const sorted = [...dayList].sort();
    const minDay = sorted[0]!;
    const maxDay = sorted[sorted.length - 1]!;
    const rangeStart = new Date(`${minDay}T00:00:00.000Z`);
    rangeStart.setUTCDate(rangeStart.getUTCDate() - 2);
    const rangeEnd = new Date(`${maxDay}T23:59:59.999Z`);
    rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 2);

    const { data: windowRows, error: winErr } = await supabase
      .from("study_sessions")
      .select("ended_at, duration_seconds")
      .eq("user_id", user.id)
      .not("ended_at", "is", null)
      .gt("duration_seconds", 0)
      .gte("ended_at", rangeStart.toISOString())
      .lte("ended_at", rangeEnd.toISOString());

    if (winErr) {
      console.error("[study/pulse-stats] window", winErr.message);
      return NextResponse.json({ error: "Could not load sessions" }, { status: 500 });
    }

    const secondsPerDay = new Map<string, number>();
    for (const d of dayList) secondsPerDay.set(d, 0);

    for (const row of windowRows ?? []) {
      if (!row.ended_at) continue;
      const key = dayKeyInTimeZone(row.ended_at, timeZone);
      if (!daySet.has(key)) continue;
      const sec = Math.max(0, Math.floor(Number(row.duration_seconds) || 0));
      secondsPerDay.set(key, (secondsPerDay.get(key) ?? 0) + sec);
    }

    const minutesPerDay: Record<string, number> = {};
    for (const d of dayList) {
      minutesPerDay[d] = Math.round((secondsPerDay.get(d) ?? 0) / 60);
    }

    const { data: allRows, error: allErr } = await supabase
      .from("study_sessions")
      .select("duration_seconds")
      .eq("user_id", user.id)
      .not("ended_at", "is", null)
      .gt("duration_seconds", 0);

    if (allErr) {
      console.error("[study/pulse-stats] total", allErr.message);
      return NextResponse.json({ error: "Could not load totals" }, { status: 500 });
    }

    const totalSeconds = (allRows ?? []).reduce(
      (a, r) => a + Math.max(0, Math.floor(Number(r.duration_seconds) || 0)),
      0,
    );
    const totalMinutes = Math.round(totalSeconds / 60);

    return NextResponse.json({
      dayList,
      minutesPerDay,
      totalMinutes,
    });
  } catch (e) {
    console.error("[study/pulse-stats]", e);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
