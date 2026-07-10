"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { DailyPracticeRunner } from "@/components/practice/daily-runner/DailyPracticeRunner";
import { DAILY_SKILL_META, type DailyPlanSkill } from "@/lib/study-plan/daily-plan";

const VALID_SKILLS = Object.keys(DAILY_SKILL_META) as DailyPlanSkill[];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isDailyPlanSkill(v: string | null): v is DailyPlanSkill {
  return !!v && (VALID_SKILLS as string[]).includes(v);
}

function DailyRunPageFallback() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="mx-auto h-5 w-40 animate-pulse rounded bg-neutral-100" />
    </div>
  );
}

/**
 * Route for the inline daily-practice runner (mobile-app-parity "play the whole day's plan
 * in one flowing screen" flow). Admin/preview-gated the same way every other new feature in
 * this codebase ships — real users keep seeing the old page-navigation queue via the
 * calendar's existing "เริ่มฝึกวันนี้" flow until the founder flips this on.
 */
export default function DailyRunPage() {
  return (
    <Suspense fallback={<DailyRunPageFallback />}>
      <DailyRunPageInner />
    </Suspense>
  );
}

function DailyRunPageInner() {
  const searchParams = useSearchParams();
  const date = searchParams.get("date");
  const skillParam = searchParams.get("skill");
  const onlySkill = isDailyPlanSkill(skillParam) ? skillParam : undefined;

  const { isAdmin, previewEligible, effectiveTier, loading } = useEffectiveTier();

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto h-5 w-40 animate-pulse rounded bg-neutral-100" />
      </div>
    );
  }

  if (!(isAdmin || previewEligible)) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-2xl">🔒</p>
        <h1 className="mt-2 font-display text-lg font-bold text-slate-900">
          ฟีเจอร์นี้ยังไม่เปิดให้ทุกคน
        </h1>
        <p className="mt-1 text-sm text-neutral-500">เร็ว ๆ นี้ทุกคนจะได้ใช้หน้าฝึกแบบใหม่นี้</p>
        <Link
          href="/study-plan"
          className="mt-4 inline-block rounded-xl bg-ep-blue px-5 py-2.5 text-xs font-bold text-white transition hover:opacity-90"
        >
          กลับไปปฏิทิน
        </Link>
      </div>
    );
  }

  if (!date || !DATE_RE.test(date)) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-2xl">🗓️</p>
        <h1 className="mt-2 font-display text-lg font-bold text-slate-900">ไม่พบวันที่ต้องการฝึก</h1>
        <p className="mt-1 text-sm text-neutral-500">กรุณาเริ่มฝึกจากปฏิทินการเรียน</p>
        <Link
          href="/study-plan"
          className="mt-4 inline-block rounded-xl bg-ep-blue px-5 py-2.5 text-xs font-bold text-white transition hover:opacity-90"
        >
          กลับไปปฏิทิน
        </Link>
      </div>
    );
  }

  return <DailyPracticeRunner date={date} onlySkill={onlySkill} effectiveTier={effectiveTier} />;
}
