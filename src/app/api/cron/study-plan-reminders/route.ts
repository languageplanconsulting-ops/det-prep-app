import { NextResponse } from "next/server";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";
import { generateCalendar } from "@/lib/study-plan/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
/** The app is Thai-only; reminder_time is stored as local Asia/Bangkok (UTC+7) HH:MM. */
const BANGKOK_UTC_OFFSET_HOURS = 7;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type ScheduleRow = {
  user_id: string;
  exam_date: string;
  cadence_days: number;
  default_duration_minutes: 5 | 10 | 20 | 30;
  reminder_time: string;
};

/**
 * Scheduled study-plan reminder push (Vercel Cron, hourly).
 *
 * For every user with a study_plan_schedules row: if today is a scheduled
 * study day, the user hasn't completed it yet, and the current UTC hour
 * matches their reminder_time (converted from Asia/Bangkok), send an Expo
 * push to every registered device.
 *
 * Auth: same CRON_SECRET bearer pattern as cron/repair-subscriptions.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/study-plan-reminders] CRON_SECRET not set — refusing");
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleSupabase();
  const nowUtcHour = new Date().getUTCHours();
  const today = todayIso();

  const { data: schedules } = await supabase
    .from("study_plan_schedules")
    .select("user_id, exam_date, cadence_days, default_duration_minutes, reminder_time")
    .gte("exam_date", today);

  let sent = 0;
  let skipped = 0;

  for (const row of (schedules ?? []) as ScheduleRow[]) {
    const reminderHourLocal = parseInt(row.reminder_time.slice(0, 2), 10);
    const reminderHourUtc = (reminderHourLocal - BANGKOK_UTC_OFFSET_HOURS + 24) % 24;
    if (reminderHourUtc !== nowUtcHour) { skipped++; continue; }

    const days = generateCalendar({
      startDate: today,
      examDate: row.exam_date,
      cadenceDays: row.cadence_days,
      defaultDurationMinutes: row.default_duration_minutes,
    });
    const todayEntry = days.find((d) => d.date === today);
    if (!todayEntry?.isStudyDay) { skipped++; continue; }

    const { data: completion } = await supabase
      .from("study_plan_completions")
      .select("id")
      .eq("user_id", row.user_id)
      .eq("completion_date", today)
      .limit(1)
      .maybeSingle();
    if (completion) { skipped++; continue; }

    const { data: tokens } = await supabase
      .from("push_tokens")
      .select("expo_push_token")
      .eq("user_id", row.user_id);
    if (!tokens || tokens.length === 0) { skipped++; continue; }

    const title = todayEntry.isMockTestDay ? "ถึงเวลาลองข้อสอบจำลอง 🎯" : "ถึงเวลาฝึกวันนี้แล้ว 📘";
    const body = todayEntry.isMockTestDay
      ? "สัปดาห์นี้ใกล้วันสอบแล้ว ลองข้อสอบจำลองสักชุดกันเถอะ"
      : "แผนการเรียนของคุณมีคิวฝึกวันนี้อยู่ — ใช้เวลาไม่นานหรอก ลุยกันเลย!";

    try {
      await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(
          tokens.map((t) => ({ to: t.expo_push_token, title, body, sound: "default" })),
        ),
      });
      sent++;
    } catch (e) {
      console.error("[cron/study-plan-reminders] push send failed", e);
    }
  }

  const summary = { ok: true, sent, skipped, scanned: (schedules ?? []).length };
  console.log("[cron/study-plan-reminders]", JSON.stringify(summary));
  return NextResponse.json(summary);
}
