import Link from "next/link";

import { CourseAdminClient } from "@/components/admin/CourseAdminClient";
import { getCourseSnapshot } from "@/lib/admin-course-data";

export const dynamic = "force-dynamic";

const COURSE_SLUG = "duolingo-fast-track";

export default async function AdminCoursePage() {
  const snapshot = await getCourseSnapshot(COURSE_SLUG);

  return (
    <main className="ep-page-shell mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="ep-brutal rounded-sm border-black bg-white p-6">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-red-700">
          Admin only
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          {snapshot?.title ?? "Course"}
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          คอร์สที่ย้ายมาจาก Thinkific — โครงสร้างบท/บทเรียน + วิดีโอบน Bunny Stream
        </p>

        {snapshot && snapshot.deployed && (
          <dl className="mt-4 flex flex-wrap gap-4 text-sm">
            <Stat label="บท" value={snapshot.totals.chapters} />
            <Stat label="บทเรียน" value={snapshot.totals.lessons} />
            <Stat label="มีวิดีโอแล้ว" value={snapshot.totals.withVideo} />
            <Stat label="รอย้าย" value={snapshot.totals.pending} />
            <Stat label="ล้มเหลว" value={snapshot.totals.failed} tone="danger" />
          </dl>
        )}

        <p className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/admin/course/production"
            className="inline-flex items-center rounded-[4px] border-4 border-black bg-amber-300 px-4 py-2 text-sm font-black uppercase tracking-wide text-neutral-900 shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            🎬 แผนถ่ายวิดีโอ
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

      {!snapshot ? (
        <NoticePanel
          title="ยังไม่มีข้อมูลคอร์ส"
          body={`ตาราง courses ถูกสร้างแล้ว แต่ยังไม่มีคอร์ส slug "${COURSE_SLUG}" — รัน scripts/thinkific-to-bunny.mjs เพื่อ seed โครงสร้างจาก Thinkific`}
        />
      ) : !snapshot.deployed ? (
        <NoticePanel
          title="ยังไม่ได้ deploy migration"
          body="รัน supabase/migrations/038_courses.sql บน live DB ก่อน จึงจะเห็นข้อมูลคอร์สในหน้านี้"
        />
      ) : (
        <CourseAdminClient snapshot={snapshot} />
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "danger";
}) {
  return (
    <div className="border-2 border-black bg-neutral-50 px-3 py-1.5">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">{label}</dt>
      <dd
        className={`text-lg font-black ${
          tone === "danger" && value > 0 ? "text-red-700" : "text-neutral-900"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function NoticePanel({ title, body }: { title: string; body: string }) {
  return (
    <section className="ep-brutal rounded-sm border-black bg-amber-50 p-6">
      <h2 className="text-lg font-black tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-neutral-700">{body}</p>
    </section>
  );
}
