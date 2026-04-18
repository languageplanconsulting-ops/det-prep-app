"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { MOCK_TEST_MONTHLY_LIMIT } from "@/lib/access-control";
import { FIXED_MOCK_ESTIMATED_DURATION_LABEL } from "@/lib/mock-test/fixed-sequence";
import { countBillableMockFixedSessions, mockFixedMonthStartIso } from "@/lib/mock-test/mock-fixed-quota";
import {
  isMockTestAvailableNow,
  MOCK_TEST_LAUNCH_MESSAGE_EN,
  MOCK_TEST_LAUNCH_MESSAGE_TH,
} from "@/lib/mock-test/mock-test-availability";
import { mt } from "@/lib/mock-test/mock-test-styles";
import { getBrowserSupabase } from "@/lib/supabase-browser";

function fmtScore(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return String(Math.round(Number(n)));
}

function BilingualBlock({ en, th }: { en: string; th: string }) {
  return (
    <div className="grid gap-4 border-t-2 border-dashed border-neutral-200 pt-4 sm:grid-cols-2">
      <p className="text-sm font-semibold leading-relaxed text-neutral-900">{en}</p>
      <p className="text-sm font-semibold leading-relaxed text-neutral-700">{th}</p>
    </div>
  );
}

type MockAttemptRow = {
  id: string;
  session_id: string;
  set_id: string;
  created_at: string;
  actual_total: number;
  actual_listening: number;
  actual_speaking: number;
  actual_reading: number;
  actual_writing: number;
  target_total: number | null;
  target_listening: number | null;
  target_speaking: number | null;
  target_reading: number | null;
  target_writing: number | null;
};

export function MockTestStartClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const launchLive = isMockTestAvailableNow();
  const { effectiveTier, loading: tierLoading, isPreviewMode, isAdmin, previewEligible } = useEffectiveTier();
  const [hasUser, setHasUser] = useState<boolean | null>(null);
  const [used, setUsed] = useState(0);
  const [attempts, setAttempts] = useState<MockAttemptRow[]>([]);
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

  const setNameById = useMemo(() => Object.fromEntries(sets.map((s) => [s.id, s.name])), [sets]);

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
        setAttempts([]);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setHasUser(false);
        setUsed(0);
        setAttempts([]);
        return;
      }

      setHasUser(true);
      const monthStart = mockFixedMonthStartIso();
      const { data: sessionRows } = await supabase
        .from("mock_fixed_sessions")
        .select("targets")
        .eq("user_id", user.id)
        .gte("started_at", monthStart);
      setUsed(countBillableMockFixedSessions(sessionRows));

      const { data: attRows } = await supabase
        .from("mock_fixed_results")
        .select(
          "id, session_id, set_id, created_at, actual_total, actual_listening, actual_speaking, actual_reading, actual_writing, target_total, target_listening, target_speaking, target_reading, target_writing",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(40);
      setAttempts((attRows as MockAttemptRow[] | null) ?? []);
    })();
  }, [searchParams, trackUsage]);

  const baseLimit = MOCK_TEST_MONTHLY_LIMIT[effectiveTier];
  const limit = isPreviewMode && baseLimit === 0 ? 1 : baseLimit;
  const unlimited = !Number.isFinite(limit);
  const remaining = unlimited
    ? "ไม่จำกัด / Unlimited"
    : `${Math.max(0, (limit as number) - used)} / ${limit} left this month · เหลือต่อเดือน`;

  const tierOk = unlimited || used < (limit as number);
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

  const shell = "ep-panel-luxury ep-brutal rounded-sm border-4 border-black bg-white shadow-[4px_4px_0_0_#000]";

  if (!launchLive && !adminCanPreview) {
    return (
      <main className="ep-page-shell mx-auto max-w-3xl space-y-8 px-4 py-10">
        <header className={`${shell} overflow-hidden bg-[linear-gradient(135deg,#fffdf2_0%,#e8f0ff_100%)] p-8 text-center`}>
          <p className="ep-stat text-xs font-black uppercase tracking-[0.35em] text-[#004AAD]">MOCK TEST · แบบทดสอบจำลอง</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-neutral-900 md:text-5xl">MOCK TEST</h1>
          <p className="mt-2 text-lg font-black text-neutral-800">เร็ว ๆ นี้ · COMING SOON</p>
        </header>

        <section className={`${shell} p-6`}>
          <p className="text-base font-bold text-neutral-900">{MOCK_TEST_LAUNCH_MESSAGE_TH}</p>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">{MOCK_TEST_LAUNCH_MESSAGE_EN}</p>
        </section>

        <Link
          href="/practice"
          className="inline-flex items-center justify-center rounded-sm border-4 border-black bg-[#004AAD] px-6 py-3 text-sm font-black uppercase tracking-wide text-[#FFCC00] shadow-[4px_4px_0_0_#000]"
        >
          ← กลับสู่ Practice hub / Back
        </Link>
      </main>
    );
  }

  return (
    <main className="ep-page-shell mx-auto max-w-5xl space-y-8 px-4 py-10">
      {/* Hero */}
      <header
        className={`${shell} overflow-hidden bg-[linear-gradient(145deg,#fffdf2_0%,#dbeafe_45%,#fffdf2_100%)] p-8 md:p-10`}
      >
        <div className="text-center">
          <p className="ep-stat text-[11px] font-black uppercase tracking-[0.4em] text-[#004AAD]">
            DET · MOCK TEST · แบบทดสอบจำลอง
          </p>
          <h1 className="mt-4 text-5xl font-black tracking-tighter text-neutral-900 md:text-6xl">MOCK TEST</h1>
          <p className="mt-4 inline-block rounded-sm border-4 border-black bg-[#FFCC00] px-4 py-2 text-sm font-black uppercase shadow-[3px_3px_0_0_#000]">
            Duration / ระยะเวลา: {FIXED_MOCK_ESTIMATED_DURATION_LABEL}
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-base font-bold text-neutral-800">
            Choose your mock here / เลือกชุดสอบจำลองด้านล่าง
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-neutral-600">
            Fixed 20-step sequence · เวลาต่อข้อเข้มงวด · ชุดจากธนาคารข้อสอบ
          </p>
        </div>
        {!launchLive && adminCanPreview ? (
          <p className="mx-auto mt-6 max-w-2xl rounded-sm border-2 border-amber-600 bg-amber-50 px-4 py-3 text-center text-xs font-bold text-amber-950">
            Admin preview: learners still see “coming soon” until{" "}
            <code className="font-mono">NEXT_PUBLIC_MOCK_TEST_CLOSED=false</code> and launch envs are set.
          </p>
        ) : null}
      </header>

      {/* Simulation disclaimer */}
      <section className={`${shell} p-6 md:p-8`}>
        <h2 className="text-xs font-black uppercase tracking-widest text-[#004AAD]">Simulation · การจำลองสอบ</h2>
        <BilingualBlock
          en="This is a practice simulation to help you prepare for the real Duolingo English Test. The flow, timing, and item mix are designed to feel roughly 80% like the real exam — but it is not identical."
          th="นี่คือการจำลองเพื่อฝึกและเตรียมสอบ Duolingo English Test จริง โครงสร้างเวลาและประเภทข้อออกแบบให้ใกล้เคียงประมาณ 80% กับของจริง — แต่ไม่ใช่สอบจริง"
        />
        <BilingualBlock
          en="Scores here are estimates to help you improve skills and track progress. They are not predictions of your official exam score."
          th="คะแนนที่ได้เป็นการประมาณเพื่อพัฒนาทักษะและติดตามความก้าวหน้า ไม่ใช่การทำนายคะแนนสอบจริงของคุณ"
        />
      </section>

      {/* Credit & commitment */}
      <section className={`${shell} border-red-800 bg-red-50/90 p-6 md:p-8`}>
        <h2 className="text-xs font-black uppercase tracking-widest text-red-900">Do not stop midway · ห้ามหยุดกลางทาง</h2>
        <BilingualBlock
          en="One monthly mock credit is used the moment you start a full mock. If you quit before the mock fully finishes, you still lose that credit — no refund — and you will not get a complete score report. Plan at least 1 hour before you start."
          th="สิทธิ์ mock รายเดือนจะถูกใช้ทันทีที่กดเริ่มสอบจำลองเต็มชุด ถ้าออกกลางทางจะไม่คืนสิทธิ์ — ไม่ได้รายงานคะแนนครบ — เผื่อเวลาอย่างน้อย 1 ชั่วโมง"
        />
        <BilingualBlock
          en="After you complete all steps, allow about 10 minutes for the full score estimate and report to finish processing."
          th="หลังทำครบทุกข้อ รอประมาณ 10 นาทีเพื่อให้ระบบประมาณคะแนนเต็มและสร้างรายงาน"
        />
        <p className="mt-4 text-center text-xs font-bold text-neutral-700">
          Keep this browser tab open during the whole mock / อย่าปิดแท็บระหว่างทำข้อสอบ
        </p>
      </section>

      {/* Tier */}
      <section className={`${shell} p-6`}>
        <h2 className="text-xs font-black uppercase tracking-widest text-[#004AAD]">Tier usage · สิทธิ์ตามแพ็กเกจ</h2>
        <p className="mt-3 font-mono text-xl font-black text-[#004AAD]">{tierLoading ? "…" : remaining}</p>
        <p className="mt-2 text-xs font-bold text-neutral-700">
          Monthly mock test limit for your tier / จำนวนครั้งต่อเดือน: <span className="text-[#004AAD]">{limitLabel}</span>
        </p>
        <p className="mt-2 text-[11px] font-semibold leading-relaxed text-neutral-600">
          Usage counts each time you start a full mock (even if you abandon it). Admin preview / single-step preview does not use your quota. ·
          นับทุกครั้งที่เริ่มสอบจำลองเต็มชุด (แม้ออกกลางทาง) โหมดพรีวิวแอดมิน/ดูข้อเดียวไม่กินสิทธิ์
        </p>
        {hasUser === false && !adminCanPreview ? (
          <p className="mt-3 text-sm font-semibold text-amber-900">
            Sign in to start · ล็อกอินเพื่อเริ่มสอบ
          </p>
        ) : hasUser === true && !canStart && !adminCanPreview ? (
          <p className="mt-3 text-sm font-black text-red-700">
            No mock tests remaining this month · สิทธิ์เต็มแล้ว — พิจารณาอัปเกรดแพ็กเกจ
          </p>
        ) : null}
      </section>

      {/* Choose mock */}
      <section className={`${shell} p-6 md:p-8`}>
        <h2 className="text-xs font-black uppercase tracking-widest text-[#004AAD]">Choose your mock · เลือกชุดสอบ</h2>
        <label className="mt-4 block">
          <span className="text-sm font-black text-neutral-900">Mock set / ชุดข้อสอบ</span>
          <select
            value={selectedSetId}
            onChange={(e) => setSelectedSetId(e.target.value)}
            className={`${mt.border} mt-2 w-full bg-neutral-50 px-4 py-3 text-sm font-bold shadow-[2px_2px_0_0_#000]`}
          >
            {sets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.stepCount}/20 steps)
              </option>
            ))}
          </select>
        </label>
      </section>

      {/* Past attempts */}
      {hasUser === true && attempts.length > 0 ? (
        <section className={`${shell} overflow-hidden p-0`}>
          <div className="border-b-4 border-black bg-[#004AAD] px-4 py-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#FFCC00]">
              Your mock attempts · ประวัติการสอบจำลอง
            </h2>
            <p className="mt-1 text-[11px] font-semibold text-white/90">
              Total + skill subscores (estimated) · คะแนนรวมและทักษะย่อย (ประมาณ)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b-2 border-black bg-ep-yellow/30">
                  <th className="border-r-2 border-black px-3 py-2 font-black uppercase">Date / วันที่</th>
                  <th className="border-r-2 border-black px-3 py-2 font-black uppercase">Set / ชุด</th>
                  <th className="border-r-2 border-black px-3 py-2 font-black uppercase">Total</th>
                  <th className="border-r-2 border-black px-3 py-2 font-black uppercase">Listen</th>
                  <th className="border-r-2 border-black px-3 py-2 font-black uppercase">Read</th>
                  <th className="border-r-2 border-black px-3 py-2 font-black uppercase">Speak</th>
                  <th className="border-r-2 border-black px-3 py-2 font-black uppercase">Write</th>
                  <th className="px-3 py-2 font-black uppercase">Report</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((row) => {
                  const name = setNameById[row.set_id] ?? row.set_id.slice(0, 8);
                  const date =
                    row.created_at != null
                      ? new Date(row.created_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "—";
                  return (
                    <tr key={row.id} className="border-b-2 border-black odd:bg-white even:bg-neutral-50">
                      <td className="border-r-2 border-black px-3 py-2 font-semibold text-neutral-800">{date}</td>
                      <td className="border-r-2 border-black px-3 py-2 font-bold text-neutral-900">{name}</td>
                      <td className="border-r-2 border-black px-3 py-2 font-mono font-black text-[#004AAD]">
                        {fmtScore(row.actual_total)}
                      </td>
                      <td className="border-r-2 border-black px-3 py-2 font-mono">{fmtScore(row.actual_listening)}</td>
                      <td className="border-r-2 border-black px-3 py-2 font-mono">{fmtScore(row.actual_reading)}</td>
                      <td className="border-r-2 border-black px-3 py-2 font-mono">{fmtScore(row.actual_speaking)}</td>
                      <td className="border-r-2 border-black px-3 py-2 font-mono">{fmtScore(row.actual_writing)}</td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/mock-test/fixed/results/${row.session_id}`}
                          className="font-black uppercase text-[#004AAD] underline underline-offset-2"
                        >
                          Open / เปิด
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : hasUser === true ? (
        <section className={`${shell} p-6 text-center text-sm font-semibold text-neutral-600`}>
          No finished mock attempts yet · ยังไม่มีประวัติที่ทำครบ — finish a mock to see scores here.
        </section>
      ) : null}

      {adminCanPreview ? (
        <section className={`${shell} p-6`}>
          <p className="text-xs font-black uppercase text-[#004AAD]">Question bank (admin)</p>
          <p className="mt-1 text-xs text-neutral-600">Mock-only content — separate from practice.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/admin/mock-test/upload"
              className="rounded-sm border-4 border-black bg-[#FFCC00] px-4 py-2 text-xs font-black shadow-[3px_3px_0_0_#000]"
            >
              Upload JSON
            </Link>
            <Link
              href="/admin/mock-test/questions"
              className="rounded-sm border-4 border-black bg-white px-4 py-2 text-xs font-bold shadow-[3px_3px_0_0_#000]"
            >
              Browse bank
            </Link>
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          disabled={starting || !canStart || (!adminCanPreview && tierLoading)}
          onClick={() => setShowPreflight(true)}
          className="rounded-sm border-4 border-black bg-[#004AAD] px-10 py-4 text-sm font-black uppercase tracking-wide text-[#FFCC00] shadow-[4px_4px_0_0_#000] transition hover:opacity-95 disabled:opacity-45"
        >
          {starting
            ? "กำลังเริ่ม…"
            : adminCanPreview && !launchLive
              ? "Start preview (admin)"
              : "Start mock test · เริ่มสอบจำลอง"}
        </button>
        <Link
          href="/practice"
          className="rounded-sm border-4 border-black bg-white px-8 py-4 text-sm font-black uppercase shadow-[4px_4px_0_0_#000]"
        >
          ← Back / กลับ
        </Link>
      </div>

      {showPreflight ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-4 py-6">
          <div className={`${shell} max-h-[90vh] w-full max-w-lg overflow-y-auto bg-[#fffdf2] p-6`}>
            <p className="ep-stat text-[10px] font-black uppercase tracking-widest text-[#004AAD]">
              Preflight · ก่อนเริ่มสอบ
            </p>
            <h2 className="mt-2 text-xl font-black text-neutral-900">Target scores / เป้าหมายคะแนน</h2>
            <BilingualBlock
              en={`Plan about ${FIXED_MOCK_ESTIMATED_DURATION_LABEL}. Starting now uses one mock credit for this month — quitting early does not refund it, and you will not get a complete report. After you finish all steps, allow ~10 minutes for the full score estimate.`}
              th={`เตรียมเวลาประมาณ ${FIXED_MOCK_ESTIMATED_DURATION_LABEL} การกดเริ่มใช้สิทธิ์ mock รายเดือน 1 ครั้งทันที — ออกกลางทางไม่คืนสิทธิ์และไม่ได้รายงานครบ หลังทำครบทุกข้อรอประมาณ 10 นาทีเพื่อประมาณคะแนนเต็ม`}
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(["total", "listening", "speaking", "reading", "writing"] as const).map((k) => (
                <label key={k} className="col-span-2 sm:col-span-1">
                  <span className="ep-stat text-[10px] font-black uppercase text-neutral-600">{k}</span>
                  <input
                    value={targets[k]}
                    onChange={(e) => setTargets((prev) => ({ ...prev, [k]: e.target.value }))}
                    placeholder={k === "total" ? "Target total" : `Target ${k}`}
                    className={`${mt.border} mt-1 w-full bg-white px-3 py-2 text-sm font-bold`}
                  />
                </label>
              ))}
            </div>
            {adminCanPreview ? (
              <div className="mt-4 space-y-2 rounded-sm border-2 border-black bg-white p-3">
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
                  Skip timer mode
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
                  <div className="rounded-sm border-2 border-dashed border-black bg-neutral-50 px-3 py-2">
                    <p className="text-xs font-bold text-neutral-700">Step 1–20</p>
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
            <p className="mt-3 text-xs font-bold text-[#004AAD]">Tier limit / จำกัดต่อเดือน: {limitLabel}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void start()}
                className="rounded-sm border-4 border-black bg-[#004AAD] px-5 py-3 text-sm font-black uppercase text-[#FFCC00] shadow-[3px_3px_0_0_#000]"
              >
                Confirm & start · ยืนยัน
              </button>
              <button
                type="button"
                onClick={() => setShowPreflight(false)}
                className="rounded-sm border-4 border-black bg-white px-5 py-3 text-sm font-black uppercase shadow-[3px_3px_0_0_#000]"
              >
                Cancel · ยกเลิก
              </button>
            </div>
            {startError ? (
              <p className="mt-4 rounded-sm border-2 border-red-700 bg-red-50 px-3 py-2 text-xs font-bold text-red-800">
                {startError}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
