import Link from "next/link";

import { CourseProductionClient } from "@/components/admin/CourseProductionClient";
import { getProductionSnapshot } from "@/lib/admin-course-production-data";

export const dynamic = "force-dynamic";

export default async function AdminCourseProductionPage() {
  const snapshot = await getProductionSnapshot();

  return (
    <main className="ep-page-shell mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="ep-brutal rounded-sm border-black bg-white p-6">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-red-700">Admin only</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">แผนถ่ายวิดีโอ</h1>
        <p className="mt-2 text-sm text-neutral-600">
          บอร์ดจัดการงานถ่ายทำ — คลิปไหนต้องลบ คลิปไหนยังไม่ได้ถ่าย เขียนสคริปต์ไว้ก่อนถ่ายได้ที่นี่
        </p>
        <p className="mt-3 text-xs text-neutral-500">
          หมายเหตุ: Duolingo ตัด <strong>Read Aloud</strong> และ <strong>Listen, Then Speak</strong>{" "}
          ออกจากข้อสอบเมื่อ 1 ก.ค. 2025 — คลิปที่สอนสองข้อนี้ถูกทำเครื่องหมายว่า &ldquo;ต้องลบ&rdquo;
        </p>

        <p className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/admin/course"
            className="inline-flex items-center rounded-[4px] border-4 border-black bg-white px-4 py-2 text-sm font-black uppercase tracking-wide text-neutral-800 shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            ← คอร์ส
          </Link>
          <Link
            href="/admin"
            className="inline-flex items-center rounded-[4px] border-4 border-black bg-white px-4 py-2 text-sm font-black uppercase tracking-wide text-neutral-800 shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            ← Admin home
          </Link>
        </p>
      </header>

      <CourseProductionClient snapshot={snapshot} />
    </main>
  );
}
