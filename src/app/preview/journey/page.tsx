import Link from "next/link";

import { JourneyPreviewClient } from "@/components/study-plan/JourneyPreviewClient";

export const dynamic = "force-dynamic";

/**
 * Full-journey preview: what a learner sees day by day, week by week, across a
 * 1/3/6-month plan — video + estimated minutes + exercises.
 *
 * Preview only. The shipped daily plan is exercises-only; the video slot shown
 * here is a proposal for wiring into src/lib/study-plan/daily-plan.ts.
 */
export default function JourneyPreviewPage() {
  // Bangkok (+07:00) calendar date, matching todayIso() in the calendar card.
  const startDate = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-500">
            Preview · ยังไม่ใช่ของจริงในแอป
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
            เส้นทางการเรียนทั้งหมด
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            นักเรียนล็อกอินแล้วเห็นอะไรในแต่ละวัน — คลิปที่ต้องดู เวลาที่ใช้ และโจทย์ที่ต้องทำ
            ลองเปลี่ยนระยะเวลาแผนกับเวลาต่อวันดูได้
          </p>
          <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-200">
            <strong>หมายเหตุ:</strong> แผนรายวันที่ใช้งานจริงตอนนี้มีแค่ &ldquo;โจทย์&rdquo; ยังไม่มีช่องคลิป —
            หน้านี้แสดงว่า <em>ถ้าเพิ่มคลิปเข้าไป</em> จะหน้าตาเป็นแบบไหน ตัวคลิปดึงมาจากแผนถ่ายจริงที่{" "}
            <Link href="/admin/course/production" className="font-black underline">
              /admin/course/production
            </Link>
          </div>
        </header>

        <JourneyPreviewClient startDate={startDate} />

        <footer className="rounded-2xl bg-white p-4 text-xs text-slate-500 shadow-sm ring-1 ring-slate-200">
          ปฏิทินและลำดับโจทย์มาจากเครื่องมือจริงในแอป (generateCalendar, buildDailyPlanItems) —
          ไม่ได้ทำข้อมูลปลอมขึ้นมาใหม่
        </footer>
      </div>
    </main>
  );
}
