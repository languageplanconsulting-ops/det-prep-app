"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { MOCK_TEST_MONTHLY_LIMIT } from "@/lib/access-control";
import {
  isMockTestAvailableNow,
  MOCK_TEST_LAUNCH_MESSAGE_EN,
  MOCK_TEST_LAUNCH_MESSAGE_TH,
} from "@/lib/mock-test/mock-test-availability";
import { mt } from "@/lib/mock-test/mock-test-styles";
import { getBrowserSupabase } from "@/lib/supabase-browser";

function monthStartIso(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function MockTestStartClient() {
  const router = useRouter();
  const launchLive = isMockTestAvailableNow();
  const { effectiveTier, loading: tierLoading, isPreviewMode } = useEffectiveTier();
  const [hasUser, setHasUser] = useState<boolean | null>(null);
  const [used, setUsed] = useState(0);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!launchLive) return;
    void (async () => {
      const supabase = getBrowserSupabase();
      if (!supabase) {
        setHasUser(false);
        setUsed(0);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setHasUser(false);
        setUsed(0);
        return;
      }
      setHasUser(true);
      const { count } = await supabase
        .from("mock_test_results")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", monthStartIso());
      setUsed(count ?? 0);
    })();
  }, [launchLive]);

  const baseLimit = MOCK_TEST_MONTHLY_LIMIT[effectiveTier];
  const limit =
    isPreviewMode && baseLimit === 0 ? 1 : baseLimit;
  const unlimited = !Number.isFinite(limit);
  const remaining = unlimited
    ? "ไม่จำกัด / Unlimited"
    : `${Math.max(0, (limit as number) - used)} / ${limit} เหลือ this month`;

  const canStart =
    launchLive &&
    hasUser === true &&
    limit > 0 &&
    (unlimited || used < (limit as number));

  const start = async () => {
    if (!canStart) return;
    setStarting(true);
    const res = await fetch("/api/mock-test/session", {
      method: "POST",
      credentials: "same-origin",
    });
    if (!res.ok) {
      setStarting(false);
      return;
    }
    const { sessionId } = (await res.json()) as { sessionId: string };
    router.push(`/mock-test/${sessionId}`);
  };

  if (!launchLive) {
    return (
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <header
          className={`${mt.gridBg} ${mt.border} ${mt.shadow} rounded-[4px] p-8`}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-[#004AAD]">
            DET Mock Test
          </p>
          <h1
            className="mt-2 text-3xl font-black text-neutral-900"
            style={{ fontFamily: "var(--font-inter), system-ui" }}
          >
            แบบทดสอบจำลอง — เร็ว ๆ นี้
          </h1>
          <p className="mt-1 text-sm text-neutral-600">COMING SOON · 22 APRIL 2026</p>
        </header>

        <section className={`${mt.border} ${mt.shadow} bg-white p-6`}>
          <p className="text-base font-bold text-neutral-900">{MOCK_TEST_LAUNCH_MESSAGE_TH}</p>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">{MOCK_TEST_LAUNCH_MESSAGE_EN}</p>
        </section>

        <Link
          href="/practice"
          className="inline-block rounded-[4px] border-4 border-black bg-white px-6 py-4 text-sm font-bold shadow-[4px_4px_0_0_#000]"
        >
          กลับ / Back to practice
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <header
        className={`${mt.gridBg} ${mt.border} ${mt.shadow} rounded-[4px] p-8`}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-[#004AAD]">
          DET Mock Test
        </p>
        <h1
          className="mt-2 text-3xl font-black text-neutral-900"
          style={{ fontFamily: "var(--font-inter), system-ui" }}
        >
          แบบทดสอบจำลอง 9 เฟส
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          9 phases · ~55 minutes total · hard time limits per section
        </p>
      </header>

      <section className={`${mt.border} ${mt.shadow} bg-white p-6`}>
        <p className="text-base font-bold text-neutral-900">
          อย่าปิดเบราว์เซอร์ระหว่างทำข้อสอบ
        </p>
        <p className="text-sm text-neutral-600">
          Do not close your browser during the test.
        </p>
      </section>

      <section className={`${mt.border} ${mt.shadow} bg-white p-6`}>
        <p className="text-sm font-bold">สิทธิ์ตามแพ็กเกจ / Tier usage</p>
        <p className="mt-2 font-mono text-lg font-black text-[#004AAD]">
          {tierLoading ? "…" : remaining}
        </p>
        {hasUser === false ? (
          <p className="mt-2 text-sm text-amber-900">
            Sign in with a student account to start a mock test. Tier limits (including admin preview)
            apply once you&apos;re signed in.
          </p>
        ) : hasUser === true && !canStart && limit > 0 ? (
          <p className="mt-2 text-sm font-bold text-red-700">
            สิทธิ์เต็มแล้ว — อัปเกรดแพ็กเกจ / No mock tests remaining this month.
          </p>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={
            hasUser !== true || !canStart || starting || tierLoading
          }
          onClick={() => void start()}
          className="rounded-[4px] border-4 border-black bg-[#004AAD] px-8 py-4 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000] disabled:opacity-50"
        >
          {starting ? "กำลังเริ่ม…" : "Start Test / เริ่มสอบ"}
        </button>
        <Link
          href="/practice"
          className="rounded-[4px] border-4 border-black bg-white px-6 py-4 text-sm font-bold shadow-[4px_4px_0_0_#000]"
        >
          กลับ / Back
        </Link>
      </div>
    </main>
  );
}
