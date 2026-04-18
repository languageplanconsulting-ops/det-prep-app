"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { MOCK_TEST_MONTHLY_LIMIT } from "@/lib/access-control";
import { FIXED_MOCK_ESTIMATED_DURATION_LABEL } from "@/lib/mock-test/fixed-sequence";
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
  const searchParams = useSearchParams();
  const launchLive = isMockTestAvailableNow();
  const { effectiveTier, loading: tierLoading, isPreviewMode, isAdmin, previewEligible } = useEffectiveTier();
  const [hasUser, setHasUser] = useState<boolean | null>(null);
  const [used, setUsed] = useState(0);
  const [selectedSetId, setSelectedSetId] = useState("");
  const [sets, setSets] = useState<Array<{ id: string; name: string; stepCount: number }>>([]);
  const [showPreflight, setShowPreflight] = useState(false);
  const [targets, setTargets] = useState({
    total: "",
    listening: "",
    speaking: "",
    reading: "",
    writing: "",
  });
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [adminPreviewMode, setAdminPreviewMode] = useState(false);
  const [skipTimerMode, setSkipTimerMode] = useState(false);
  const [previewSeparateMode, setPreviewSeparateMode] = useState(false);
  const [previewStepIndex, setPreviewStepIndex] = useState(13);

  const adminCanPreview = isAdmin || previewEligible;
  const trackUsage = launchLive || adminCanPreview;

  useEffect(() => {
    if (!trackUsage) return;
    void (async () => {
      const setsRes = await fetch("/api/mock-test/fixed/sets", { credentials: "same-origin" });
      const setsJson = (await setsRes.json()) as { sets?: Array<{ id: string; name: string; stepCount: number }> };
      const loadedSets = setsJson.sets ?? [];
      setSets(loadedSets);
      const querySetId = searchParams.get("setId");
      const selectedFromQuery =
        querySetId && loadedSets.some((s) => s.id === querySetId)
          ? querySetId
          : loadedSets[0]?.id ?? "";
      setSelectedSetId(selectedFromQuery);
      setAdminPreviewMode(searchParams.get("adminPreview") === "1");
      setSkipTimerMode(searchParams.get("skipTimer") === "1");
      const separate = searchParams.get("previewSeparate") === "1";
      setPreviewSeparateMode(separate);
      const stepRaw = Number(searchParams.get("previewStep") ?? "13");
      const normalizedStep = Number.isFinite(stepRaw) ? Math.max(1, Math.min(20, Math.round(stepRaw))) : 13;
      setPreviewStepIndex(normalizedStep);

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
        .from("mock_fixed_results")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", monthStartIso());
      setUsed(count ?? 0);
    })();
  }, [searchParams, trackUsage]);

  const baseLimit = MOCK_TEST_MONTHLY_LIMIT[effectiveTier];
  const limit = isPreviewMode && baseLimit === 0 ? 1 : baseLimit;
  const unlimited = !Number.isFinite(limit);
  const remaining = unlimited
    ? "ไม่จำกัด / Unlimited"
    : `${Math.max(0, (limit as number) - used)} / ${limit} เหลือ this month`;

  const tierOk = unlimited || used < (limit as number);
  /** After public launch, learners need tier. Admins may start anytime (preview + QA). */
  const canStart = !!selectedSetId && (adminCanPreview || (hasUser === true && launchLive && tierOk));

  const limitLabel = unlimited ? "Unlimited" : String(limit);

  const start = async () => {
    if (!canStart || !selectedSetId) return;
    setStarting(true);
    setStartError(null);
    try {
      const ctl = new AbortController();
      const timeout = window.setTimeout(() => ctl.abort(), 20000);
      const res = await fetch("/api/mock-test/fixed/session", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        signal: ctl.signal,
        body: JSON.stringify({
          setId: selectedSetId,
          targets: {
            total: Number(targets.total || 0),
            listening: Number(targets.listening || 0),
            speaking: Number(targets.speaking || 0),
            reading: Number(targets.reading || 0),
            writing: Number(targets.writing || 0),
          },
          adminPreviewMode: adminCanPreview && adminPreviewMode,
          skipTimerMode: adminCanPreview && skipTimerMode,
          previewSeparateMode: adminCanPreview && previewSeparateMode,
          previewStepIndex: adminCanPreview && previewSeparateMode ? previewStepIndex : undefined,
        }),
      });
      window.clearTimeout(timeout);
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        const message = json.error ?? "Could not start session.";
        if (message.includes("Monthly mock test limit reached")) {
          setStartError("You already used all mock tests for your plan this month.");
        } else if (message === "Your plan does not include mock tests") {
          setStartError("Mock tests are locked on the Free plan. Upgrade to start a fixed mock.");
        } else if (message === "Mock test is not available yet") {
          setStartError("Mock test is still closed for learners right now.");
        } else {
          setStartError(message);
        }
        setStarting(false);
        return;
      }
      const { sessionId } = (await res.json()) as { sessionId?: string };
      if (!sessionId) {
        setStartError("Session was created but missing id.");
        setStarting(false);
        return;
      }
      router.push(`/mock-test/fixed/${sessionId}`);
    } catch {
      setStartError("Start request timed out. Please try again.");
      setStarting(false);
    }
  };

  if (!launchLive && !adminCanPreview) {
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
          แบบทดสอบจำลอง Fixed 20-Step
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Fixed sequence 1-20 · admin uploaded set name · strict time limits per step
        </p>
        {!launchLive && adminCanPreview ? (
          <p className="mt-3 rounded-[4px] border-2 border-amber-600 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950">
            Admin preview: learners still see “coming soon” until you set{" "}
            <code className="font-mono">NEXT_PUBLIC_MOCK_TEST_CLOSED=false</code> (and launch date /{" "}
            <code className="font-mono">NEXT_PUBLIC_MOCK_TEST_PUBLIC_LAUNCH</code>).
          </p>
        ) : null}
      </header>

      <section className={`${mt.border} ${mt.shadow} bg-white p-6`}>
        <p className="text-base font-bold text-neutral-900">Choose fixed set</p>
        <select
          value={selectedSetId}
          onChange={(e) => setSelectedSetId(e.target.value)}
          className={`${mt.border} mt-2 w-full bg-white px-3 py-2 text-sm`}
        >
          {sets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.stepCount}/20)
            </option>
          ))}
        </select>
      </section>

      <section className={`${mt.border} ${mt.shadow} bg-white p-6`}>
        <p className="text-base font-bold text-neutral-900">อย่าปิดเบราว์เซอร์ระหว่างทำข้อสอบ</p>
        <p className="text-sm text-neutral-600">
          Do not close your browser during the test.
        </p>
        <p className="mt-2 rounded-[4px] border-2 border-red-800 bg-red-50 px-3 py-2 text-xs font-bold text-red-900">
          This test takes about {FIXED_MOCK_ESTIMATED_DURATION_LABEL}. If you quit midway, the session is cancelled.
        </p>
      </section>

      <section className={`${mt.border} ${mt.shadow} bg-white p-6`}>
        <p className="text-sm font-bold">สิทธิ์ตามแพ็กเกจ / Tier usage</p>
        <p className="mt-2 font-mono text-lg font-black text-[#004AAD]">
          {tierLoading ? "…" : remaining}
        </p>
        <p className="mt-2 text-xs font-bold text-[#004AAD]">
          Monthly mock limit for your current tier: {limitLabel}
        </p>
        {hasUser === false && !adminCanPreview ? (
          <p className="mt-2 text-sm text-amber-900">
            Sign in to start. Admins: use your admin account to preview the full flow.
          </p>
        ) : hasUser === true && !canStart && !adminCanPreview ? (
          <p className="mt-2 text-sm font-bold text-red-700">
            สิทธิ์เต็มแล้ว — อัปเกรดแพ็กเกจ / No mock tests remaining this month.
          </p>
        ) : null}
      </section>

      {adminCanPreview ? (
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
            starting || !canStart || (!adminCanPreview && tierLoading)
          }
          onClick={() => setShowPreflight(true)}
          className="rounded-[4px] border-4 border-black bg-[#004AAD] px-8 py-4 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000] disabled:opacity-50"
        >
          {starting
            ? "กำลังเริ่ม…"
            : adminCanPreview && !launchLive
              ? "Start preview (admin)"
              : "Start Fixed Mock / เริ่มสอบ"}
        </button>
        <Link
          href="/practice"
          className="rounded-[4px] border-4 border-black bg-white px-6 py-4 text-sm font-bold shadow-[4px_4px_0_0_#000]"
        >
          กลับ / Back
        </Link>
      </div>
      {showPreflight ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4">
          <div className={`${mt.border} ${mt.shadow} w-full max-w-xl bg-[#fffdf2] p-5`}>
            <p className="text-xs font-black uppercase tracking-wide text-[#004AAD]">Preflight check</p>
            <h2 className="mt-1 text-xl font-black">Set your target scores first</h2>
            <p className="mt-2 text-sm text-neutral-700">
              Duration is {FIXED_MOCK_ESTIMATED_DURATION_LABEL}. If you quit midway, all progress is cancelled.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(["total", "listening", "speaking", "reading", "writing"] as const).map((k) => (
                <input
                  key={k}
                  value={targets[k]}
                  onChange={(e) => setTargets((prev) => ({ ...prev, [k]: e.target.value }))}
                  placeholder={`Target ${k}`}
                  className={`${mt.border} bg-white px-3 py-2 text-sm`}
                />
              ))}
            </div>
            {adminCanPreview ? (
              <div className="mt-3 space-y-2 rounded-[4px] border-2 border-black bg-white p-3">
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={adminPreviewMode}
                    onChange={(e) => setAdminPreviewMode(e.target.checked)}
                  />
                  Admin test mode (bypass 10-minute wait)
                </label>
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={skipTimerMode}
                    onChange={(e) => setSkipTimerMode(e.target.checked)}
                  />
                  Skip timer mode (no countdown/rest in session)
                </label>
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={previewSeparateMode}
                    onChange={(e) => setPreviewSeparateMode(e.target.checked)}
                  />
                  Preview separate step only
                </label>
                {previewSeparateMode ? (
                  <div className="rounded-[4px] border-2 border-dashed border-black bg-neutral-50 px-3 py-2">
                    <p className="text-xs font-bold text-neutral-700">Choose step (1-20)</p>
                    <select
                      value={previewStepIndex}
                      onChange={(e) => setPreviewStepIndex(Number(e.target.value) || 13)}
                      className={`${mt.border} mt-1 w-full bg-white px-2 py-1 text-sm`}
                    >
                      {Array.from({ length: 20 }).map((_, i) => {
                        const step = i + 1;
                        return (
                          <option key={step} value={step}>
                            Step {step}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                ) : null}
              </div>
            ) : null}
            <p className="mt-2 text-xs font-bold text-[#004AAD]">
              Monthly mock limit for your current tier: {limitLabel}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => void start()}
                className="rounded-[4px] border-4 border-black bg-[#004AAD] px-4 py-2 text-sm font-black text-[#FFCC00] shadow-[3px_3px_0_0_#000]"
              >
                Confirm and start
              </button>
              <button
                type="button"
                onClick={() => setShowPreflight(false)}
                className="rounded-[4px] border-4 border-black bg-white px-4 py-2 text-sm font-bold shadow-[3px_3px_0_0_#000]"
              >
                Cancel
              </button>
            </div>
            {startError ? (
              <p className="mt-3 rounded-[4px] border-2 border-red-700 bg-red-50 px-3 py-2 text-xs font-bold text-red-800">
                {startError}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
