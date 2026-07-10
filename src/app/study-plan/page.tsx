"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { StudyPlanCalendarCard } from "@/components/dashboard/StudyPlanCalendarCard";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { getBrowserSupabase } from "@/lib/supabase-browser";

/**
 * Dedicated study-plan / calendar page. The calendar itself is the same
 * StudyPlanCalendarCard shown in the practice hub sidebar — here it gets a full
 * page of its own so it's a real destination (with a nav link), not just a card
 * tucked in a corner. Client component: the card fetches its own data and needs
 * the caller's effective tier for difficulty gating on the "start today" flow.
 */
export default function StudyPlanPage() {
  const { effectiveTier } = useEffectiveTier();
  const [authState, setAuthState] = useState<"checking" | "in" | "out">("checking");

  useEffect(() => {
    let alive = true;
    void (async () => {
      const supabase = getBrowserSupabase();
      if (!supabase) {
        if (alive) setAuthState("out");
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (alive) setAuthState(session ? "in" : "out");
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#004AAD]">Study plan</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">ปฏิทินการเรียนของฉัน</h1>
        <p className="mt-1 text-sm text-slate-500">
          ตั้งวันสอบ แล้วเราจะจัดตารางฝึกให้ทุกวันจนถึงวันสอบ — ฝึกตามแผน เก็บสถิติ และดูว่าพัฒนาตรงไหนบ้าง
        </p>
      </header>

      {authState === "out" ? (
        <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
          <p className="text-2xl">🗓️</p>
          <h2 className="mt-2 text-lg font-bold text-slate-900">เข้าสู่ระบบเพื่อสร้างแผนการเรียน</h2>
          <p className="mt-1 text-sm text-slate-500">
            แผนการเรียนและปฏิทินฝึกจะบันทึกไว้ในบัญชีของคุณ ใช้ได้ทั้งบนเว็บและแอปมือถือ
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link
              href="/login"
              className="rounded-xl bg-[#004AAD] px-5 py-2.5 text-sm font-bold text-[#FFCC00] transition hover:opacity-90"
            >
              เข้าสู่ระบบ
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-slate-50 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
            >
              สมัครฟรี
            </Link>
          </div>
        </div>
      ) : (
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
