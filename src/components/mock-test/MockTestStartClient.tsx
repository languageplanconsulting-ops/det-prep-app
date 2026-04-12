"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { MOCK_TEST_MONTHLY_LIMIT } from "@/lib/access-control";
import { MOCK_TEST_PHASE_COUNT } from "@/lib/mock-test/constants";
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
  const { effectiveTier, loading: tierLoading, isPreviewMode, isAdmin } = useEffectiveTier();
  const [hasUser, setHasUser] = useState<boolean | null>(null);
  const [used, setUsed] = useState(0);
  const [starting, setStarting] = useState(false);

  const trackUsage = launchLive || isAdmin;

  useEffect(() => {
    if (!trackUsage) return;
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
  }, [trackUsage]);

  const baseLimit = MOCK_TEST_MONTHLY_LIMIT[effectiveTier];
  const limit = isPreviewMode && baseLimit === 0 ? 1 : baseLimit;
  const unlimited = !Number.isFinite(limit);
  const remaining = unlimited
    ? "ไม่จำกัด / Unlimited"
    : `${Math.max(0, (limit as number) - used)} / ${limit} เหลือ this month`;

  const tierOk = unlimited || used < (limit as number);
  /** After public launch, learners need tier. Admins may start anytime (preview + QA). */
  const canStart = hasUser === true && (isAdmin || (launchLive && tierOk));

  const start = async () => {
    if (!canStart) return;
    setStarting(true);
    const v2 = process.env.NEXT_PUBLIC_MOCK_TEST_ENGINE_V2 === "true";
    const res = await fetch(v2 ? "/api/mock-test/v2/session" : "/api/mock-test/session", {
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

  if (!launchLive && !isAdmin) {
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
          <p className="mt-1 text-sm text-neutral-600">COMING SOON</p>
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
          แบบทดสอบจำลอง {MOCK_TEST_PHASE_COUNT} เฟส
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          {MOCK_TEST_PHASE_COUNT} phases · separate mock-only question bank (not practice tiles) · hard
          time limits per section
        </p>
        {!launchLive && isAdmin ? (
          <p className="mt-3 rounded-[4px] border-2 border-amber-600 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950">
            Admin preview: learners still see “coming soon” until you set{" "}
            <code className="font-mono">NEXT_PUBLIC_MOCK_TEST_CLOSED=false</code> (and launch date /{" "}
            <code className="font-mono">NEXT_PUBLIC_MOCK_TEST_PUBLIC_LAUNCH</code>).
          </p>
        ) : null}
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
            Sign in to start. Admins: use your admin account to preview the full flow.
          </p>
        ) : hasUser === true && !canStart && !isAdmin ? (
          <p className="mt-2 text-sm font-bold text-red-700">
            สิทธิ์เต็มแล้ว — อัปเกรดแพ็กเกจ / No mock tests remaining this month.
          </p>
        ) : null}
      </section>

      {isAdmin ? (
        <section className={`${mt.border} ${mt.shadow} bg-white p-6`}>
          <p className="text-sm font-bold text-[#004AAD]">Question bank (admin)</p>
          <p className="mt-1 text-xs text-neutral-600">
            Upload and review questions in the mock-only bank — separate from practice content.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/admin/mock-test/upload"
              className="rounded-[4px] border-4 border-black bg-[#FFCC00] px-4 py-2 text-xs font-black shadow-[3px_3px_0_0_#000]"
            >
              Upload JSON
            </Link>
            <Link
              href="/admin/mock-test/questions"
              className="rounded-[4px] border-4 border-black bg-white px-4 py-2 text-xs font-bold shadow-[3px_3px_0_0_#000]"
            >
              Browse bank
            </Link>
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={
            hasUser !== true || !canStart || starting || (!isAdmin && tierLoading)
          }
          onClick={() => void start()}
          className="rounded-[4px] border-4 border-black bg-[#004AAD] px-8 py-4 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000] disabled:opacity-50"
        >
          {starting
            ? "กำลังเริ่ม…"
            : isAdmin && !launchLive
              ? "Start preview (admin)"
              : "Start Test / เริ่มสอบ"}
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
