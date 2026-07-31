"use client";

import Link from "next/link";

import { StudyPlanCalendarCard } from "@/components/dashboard/StudyPlanCalendarCard";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";

/**
 * Dedicated study-plan / calendar page. The calendar itself is the same
 * StudyPlanCalendarCard shown in the practice hub sidebar — here it gets a full
 * page of its own so it's a real destination (with a nav link), not just a card
 * tucked in a corner.
 *
 * Auth: gate on the app-wide EffectiveTierProvider, which is server-authoritative
 * (`/api/me` with retry + last-known-tier fallback) and hardened against flaky
 * client sessions. Do NOT gate on a one-shot `getBrowserSupabase().auth.getSession()`
 * — that returned null for already-signed-in users on client-side navigation, wrongly
 * showing the "please log in" screen (the calendar "re-login" bug).
 */
export default function StudyPlanPage() {
  const { effectiveTier, loading } = useEffectiveTier();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#004AAD]">Study plan</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">ปฏิทินการเรียนของฉัน</h1>
        <p className="mt-1 text-sm text-slate-500">
          ตั้งวันสอบ แล้วเราจะจัดตารางฝึกให้ทุกวันจนถึงวันสอบ — ฝึกตามแผน เก็บสถิติ และดูว่าพัฒนาตรงไหนบ้าง
        </p>
      </header>

      {loading ? (
        // Never flash the login prompt while auth is still resolving — a logged-in
        // user briefly seeing "please log in" is exactly the bug we're fixing.
        <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
          <div className="h-5 w-40 animate-pulse rounded bg-slate-100" />
          <div className="mt-3 h-24 animate-pulse rounded-xl bg-slate-100" />
        </div>
      ) : (
        // Rendered even when /api/me says "not authenticated": an admin-code
        // session has no Supabase user but IS allowed to preview the plan (the
        // API resolves it to the admin's own account). The card owns the
        // signed-out state — it shows the sign-in prompt only when the API
        // actually answers 401, so this can't lock out a valid previewer.
        <StudyPlanCalendarCard effectiveTier={effectiveTier} />
      )}

      <p className="mt-4 text-center text-xs text-slate-400">
        อยากเลือกฝึกเองไม่ต้องพึ่งแผน?{" "}
        <Link href="/practice" className="font-bold text-[#004AAD] hover:underline">
          ไปหน้าฝึกซ้อม →
        </Link>
      </p>
    </main>
  );
}
