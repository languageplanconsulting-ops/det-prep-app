"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { MOCK_TEST_MONTHLY_LIMIT, type Tier } from "@/lib/access-control";
import { FIXED_MOCK_ESTIMATED_DURATION_LABEL } from "@/lib/mock-test/fixed-sequence";
import { countBillableMockFixedSessions, mockFixedMonthStartIso } from "@/lib/mock-test/mock-fixed-quota";
import {
  isMockTestAvailableNow,
  MOCK_TEST_LAUNCH_MESSAGE_EN,
  MOCK_TEST_LAUNCH_MESSAGE_TH,
} from "@/lib/mock-test/mock-test-availability";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type MockAttemptRow = {
  id: string;
  session_id: string;
  set_id: string;
  created_at: string;
  dashboard_saved_at?: string | null;
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

type MockSetRow = { id: string; name: string; stepCount: number };

function fmtScore(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return String(Math.round(Number(n)));
}

function sortMockAttempts(list: MockAttemptRow[]) {
  return [...list].sort((a, b) => {
    const pa = a.dashboard_saved_at != null && a.dashboard_saved_at !== "" ? 1 : 0;
    const pb = b.dashboard_saved_at != null && b.dashboard_saved_at !== "" ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function formatDateShort(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

function nextMonthResetLabel(now = new Date()): string {
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return formatDateShort(next.toISOString());
}

function csvEscape(value: string): string {
  const normalized = value.replaceAll('"', '""');
  return `"${normalized}"`;
}

function downloadAttemptsCsv(attempts: MockAttemptRow[], setNameById: Record<string, string>) {
  const header = [
    "date",
    "mock_set",
    "saved_to_dashboard",
    "total",
    "literacy",
    "comprehension",
    "production",
    "conversation",
    "session_id",
  ];
  const rows = attempts.map((row) => [
    formatDateTime(row.created_at),
    setNameById[row.set_id] ?? row.set_id,
    row.dashboard_saved_at ? "yes" : "no",
    fmtScore(row.actual_total),
    fmtScore(row.actual_writing),
    fmtScore(row.actual_reading),
    fmtScore(row.actual_speaking),
    fmtScore(row.actual_listening),
    row.session_id,
  ]);
  const csv = [header, ...rows]
    .map((line) => line.map((cell) => csvEscape(String(cell))).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mock-test-history-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function archiveKeyFromName(name: string): { key: string; label: string } {
  const raw = name.trim();
  const match = raw.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\b/i,
  );
  if (match) {
    const month = match[1]!;
    const year = Number(match[2]);
    const order = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ].indexOf(month.toLowerCase());
    const key = `${year}-${String(order + 1).padStart(2, "0")}`;
    return { key, label: `${month.toUpperCase()} ${year}` };
  }
  return { key: "archive", label: "ARCHIVE" };
}

function tierMarketing(tier: Tier) {
  if (tier === "free") {
    return {
      headline: "Mock tests are locked on Free.",
      body: "Upgrade to Basic to unlock 2 mock tests per month and start building a score history.",
      cta: "Upgrade to Basic",
    };
  }
  if (tier === "basic") {
    return {
      headline: "Need more mock reps each month?",
      body: "Premium raises you to 4 mock tests per month so you can measure progress more often.",
      cta: "See Premium",
    };
  }
  if (tier === "premium") {
    return {
      headline: "Want the highest mock flexibility?",
      body: "VIP gives you 6 mock tests per month and the strongest monthly mock runway.",
      cta: "See VIP",
    };
  }
  return {
    headline: "You already have the highest mock access.",
    body: "Use all 6 monthly mocks strategically: one baseline, focused retakes, and one final benchmark.",
    cta: "View Pricing",
  };
}

export function MockTestStartClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const launchLive = isMockTestAvailableNow();
  const { effectiveTier, loading: tierLoading, isPreviewMode, isAdmin, previewEligible } = useEffectiveTier();
  const [hasUser, setHasUser] = useState<boolean | null>(null);
  const [used, setUsed] = useState(0);
  const [attempts, setAttempts] = useState<MockAttemptRow[]>([]);
  const [selectedSetId, setSelectedSetId] = useState("");
  const [sets, setSets] = useState<MockSetRow[]>([]);
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
  const [unpinSessionId, setUnpinSessionId] = useState<string | null>(null);

  const adminCanPreview = isAdmin || previewEligible;
  const trackUsage = launchLive || adminCanPreview;

  useEffect(() => {
    if (!trackUsage) return;
    void (async () => {
      const setsRes = await fetch("/api/mock-test/fixed/sets", { credentials: "same-origin" });
      const setsJson = (await setsRes.json()) as { sets?: MockSetRow[] };
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
          "id, session_id, set_id, created_at, dashboard_saved_at, actual_total, actual_listening, actual_speaking, actual_reading, actual_writing, target_total, target_listening, target_speaking, target_reading, target_writing",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      const raw = (attRows as MockAttemptRow[] | null) ?? [];
      setAttempts(sortMockAttempts(raw));
    })();
  }, [searchParams, trackUsage]);

  const setNameById = useMemo(
    () => Object.fromEntries(sets.map((s) => [s.id, s.name])),
    [sets],
  );

  const baseLimit = MOCK_TEST_MONTHLY_LIMIT[effectiveTier];
  const limit = isPreviewMode && baseLimit === 0 ? 1 : baseLimit;
  const remainingCount = Math.max(0, limit - used);
  const tierOk = used < limit;
  const canStart = !!selectedSetId && (adminCanPreview || (hasUser === true && launchLive && tierOk));
  const bestAttempt = useMemo(
    () =>
      attempts.reduce<MockAttemptRow | null>(
        (best, row) => (!best || row.actual_total > best.actual_total ? row : best),
        null,
      ),
    [attempts],
  );

  const groupedSets = useMemo(() => {
    const map = new Map<string, { key: string; label: string; rows: MockSetRow[] }>();
    for (const row of sets) {
      const info = archiveKeyFromName(row.name);
      const existing = map.get(info.key);
      if (existing) {
        existing.rows.push(row);
      } else {
        map.set(info.key, { key: info.key, label: info.label, rows: [row] });
      }
    }
    return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
  }, [sets]);

  const sortedAttempts = attempts.slice(0, 50);
  const pinnedAttemptCount = attempts.filter((row) => row.dashboard_saved_at).length;
  const marketing = tierMarketing(effectiveTier);

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

  const unpinFromDashboard = (sessionId: string) => {
    void (async () => {
      setUnpinSessionId(sessionId);
      try {
        const res = await fetch(`/api/mock-test/fixed/results/${sessionId}/dashboard`, {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ saved: false }),
        });
        if (!res.ok) return;
        setAttempts((prev) =>
          sortMockAttempts(prev.map((r) => (r.session_id === sessionId ? { ...r, dashboard_saved_at: null } : r))),
        );
      } finally {
        setUnpinSessionId(null);
      }
    })();
  };

  if (!launchLive && !adminCanPreview) {
    return (
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
        <section className="border-4 border-black bg-white p-8 shadow-[8px_8px_0_0_#111]">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-[#0055FF]">DET · MOCK CENTER</p>
          <h1 className="mt-3 text-4xl font-black uppercase italic tracking-tighter md:text-5xl">Coming Soon</h1>
          <p className="mt-4 text-base font-bold text-neutral-900">{MOCK_TEST_LAUNCH_MESSAGE_TH}</p>
          <p className="mt-3 text-sm font-semibold text-neutral-600">{MOCK_TEST_LAUNCH_MESSAGE_EN}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/practice"
              className="border-[3px] border-black bg-[#0055FF] px-6 py-3 text-sm font-black uppercase text-white shadow-[4px_4px_0_0_#111]"
            >
              ← Back to Practice
            </Link>
            <Link
              href="/pricing"
              className="border-[3px] border-black bg-[#FFD600] px-6 py-3 text-sm font-black uppercase shadow-[4px_4px_0_0_#111]"
            >
              View Plans
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/practice" className="mb-2 inline-flex items-center gap-2 font-mono text-xs font-bold hover:underline">
            ← BACK / กลับ
          </Link>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none md:text-6xl">
            DET · MOCK CENTER <br />
            <span className="not-italic text-[#0055FF]">แดชบอร์ดและการจำลองสอบ</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-bold text-neutral-700">
            Full 20-step simulation · {FIXED_MOCK_ESTIMATED_DURATION_LABEL} · one credit is used when you start.
          </p>
        </div>

        <div className="min-w-[220px] border-4 border-black bg-[#FFD600] p-4 text-center shadow-[8px_8px_0_0_#111]">
          <p className="font-mono text-[10px] font-black uppercase tracking-widest">
            สิทธิ์การสอบคงเหลือ
            <br />
            (Mock Credits)
          </p>
          <p className="mt-2 text-4xl font-black">
            {tierLoading ? "…" : `${remainingCount} / ${limit}`}
          </p>
          <p className="font-mono text-[9px] font-bold opacity-60">RENEW: {nextMonthResetLabel()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          <section className="overflow-hidden border-4 border-black bg-white shadow-[8px_8px_0_0_#111]">
            <div className="flex items-center justify-between bg-black p-3 text-white">
              <h2 className="text-sm font-black uppercase italic tracking-widest">Personal Best // คะแนนสูงสุดของคุณ</h2>
              <span className="font-mono text-[10px] opacity-60">
                UPDATED: {bestAttempt ? formatDateShort(bestAttempt.created_at) : "—"}
              </span>
            </div>

            <div className="grid gap-6 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:15px_15px] bg-white p-6 md:grid-cols-12 md:items-center">
              <div className="flex flex-col items-center justify-center py-2 md:col-span-4 md:border-r-4 md:border-dashed md:border-black">
                <p className="mb-1 font-mono text-xs font-bold uppercase text-gray-400">High Score</p>
                <p className="text-7xl font-black tracking-tighter text-[#0055FF]">{fmtScore(bestAttempt?.actual_total)}</p>
                <p className="text-xs font-bold">Estimated Overall</p>
              </div>
              <div className="grid grid-cols-2 gap-3 md:col-span-8 lg:grid-cols-4">
                <div className="border-[3px] border-black bg-white p-2 text-center">
                  <p className="font-mono text-[8px] font-black uppercase opacity-50">Lit</p>
                  <p className="text-2xl font-black text-[#FF5C00]">{fmtScore(bestAttempt?.actual_writing)}</p>
                </div>
                <div className="border-[3px] border-black bg-white p-2 text-center">
                  <p className="font-mono text-[8px] font-black uppercase opacity-50">Comp</p>
                  <p className="text-2xl font-black text-[#FF5C00]">{fmtScore(bestAttempt?.actual_reading)}</p>
                </div>
                <div className="border-[3px] border-black bg-white p-2 text-center">
                  <p className="font-mono text-[8px] font-black uppercase opacity-50">Prod</p>
                  <p className="text-2xl font-black text-[#FF5C00]">{fmtScore(bestAttempt?.actual_speaking)}</p>
                </div>
                <div className="border-[3px] border-black bg-white p-2 text-center">
                  <p className="font-mono text-[8px] font-black uppercase opacity-50">Conv</p>
                  <p className="text-2xl font-black text-[#FF5C00]">{fmtScore(bestAttempt?.actual_listening)}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden border-4 border-black bg-white shadow-[8px_8px_0_0_#111]">
            <div className="flex items-center justify-between border-b-4 border-black bg-[#0055FF] p-3 text-white">
              <div>
                <h2 className="text-sm font-black uppercase italic tracking-widest">Attempt History // ประวัติการสอบ (Last 50)</h2>
                <p className="mt-1 font-mono text-[10px] font-bold">{sortedAttempts.length}/50 COMPLETED</p>
              </div>
              <button
                type="button"
                onClick={() => downloadAttemptsCsv(sortedAttempts, setNameById)}
                disabled={sortedAttempts.length === 0}
                className="border-2 border-black bg-[#FFD600] px-3 py-2 font-mono text-[10px] font-black uppercase text-black shadow-[3px_3px_0_0_#111] disabled:opacity-40"
              >
                Download CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead className="border-b-2 border-black bg-gray-100 font-mono text-[10px] uppercase">
                  <tr>
                    <th className="border-r-2 border-black p-3">Date / เวลา</th>
                    <th className="border-r-2 border-black p-3">Mock Set / ชุดสอบ</th>
                    <th className="border-r-2 border-black p-3 text-center">Score</th>
                    <th className="border-r-2 border-black p-3 text-center">Pinned</th>
                    <th className="p-3 text-center">Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-xs font-bold">
                  {sortedAttempts.length > 0 ? (
                    sortedAttempts.map((row) => {
                      const isSaved = row.dashboard_saved_at != null && row.dashboard_saved_at !== "";
                      return (
                        <tr key={row.id} className="hover:bg-slate-50">
                          <td className="border-r-2 border-black p-3 font-mono">{formatDateShort(row.created_at)}</td>
                          <td className="border-r-2 border-black p-3 italic">{setNameById[row.set_id] ?? row.set_id.slice(0, 8)}</td>
                          <td className="border-r-2 border-black p-3 text-center text-lg text-[#0055FF]">
                            {fmtScore(row.actual_total)}
                          </td>
                          <td className="border-r-2 border-black p-3 text-center">
                            {isSaved ? (
                              <button
                                type="button"
                                disabled={unpinSessionId === row.session_id}
                                onClick={() => unpinFromDashboard(row.session_id)}
                                className="font-mono text-[10px] font-black uppercase underline disabled:opacity-40"
                              >
                                {unpinSessionId === row.session_id ? "..." : "Pinned"}
                              </button>
                            ) : (
                              <span className="font-mono text-[10px] uppercase opacity-40">No</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <Link
                              href={`/mock-test/fixed/results/${row.session_id}`}
                              className="inline-block bg-black px-3 py-1 text-[9px] font-black uppercase text-white shadow-[3px_3px_0_0_#111]"
                            >
                              View Report
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr className="bg-gray-50 italic text-gray-400">
                      <td colSpan={5} className="p-3 text-center font-mono text-[10px]">
                        No completed mock attempts yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <div className="border-4 border-black border-l-[12px] border-l-[#FF5C00] bg-white p-4 shadow-[8px_8px_0_0_#111]">
            <p className="mb-3 border-b-2 border-black pb-1 text-xs font-black uppercase">Essential Rules</p>
            <ul className="space-y-2 text-[11px] font-bold leading-tight">
              <li className="flex gap-2"><span>⏱️</span> {FIXED_MOCK_ESTIMATED_DURATION_LABEL} duration</li>
              <li className="flex gap-2 text-red-600"><span>⚠️</span> One credit is used when you start</li>
              <li className="flex gap-2"><span>📊</span> Scores are high-fidelity estimates, not official DET scores</li>
            </ul>
          </div>

          <div className="overflow-hidden border-4 border-black bg-white shadow-[8px_8px_0_0_#111]">
            <div className="bg-black p-3 text-white">
              <h2 className="text-xs font-black uppercase italic tracking-widest">Monthly Archive // คลังข้อสอบ</h2>
            </div>
            <div className="divide-y-2 divide-black">
              {groupedSets.map((group, idx) => (
                <details key={group.key} open={idx === 0} className="group">
                  <summary className={`flex cursor-pointer items-center justify-between p-3 text-xs font-black ${
                    idx === 0 ? "bg-[#FFD600] hover:bg-yellow-300" : "bg-white hover:bg-gray-100"
                  }`}>
                    <span>{group.label}</span>
                    <span className="border border-black px-1 font-mono text-[9px] group-open:bg-black group-open:text-white">+/-</span>
                  </summary>
                  <div className="space-y-2 bg-white p-2">
                    {group.rows.map((row, setIdx) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => setSelectedSetId(row.id)}
                        className={`flex w-full items-center justify-between border-2 border-black p-2 text-left hover:bg-blue-50 ${
                          selectedSetId === row.id ? "bg-blue-50" : "bg-white"
                        }`}
                      >
                        <span className="text-[11px] font-bold italic">{row.name}</span>
                        <span className={`text-[8px] ${idx === 0 && setIdx === 0 ? "bg-green-100" : "bg-gray-100"} px-2 py-0.5`}>
                          {idx === 0 && setIdx === 0 ? "New" : "Open"}
                        </span>
                      </button>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>

          <div className="border-4 border-black bg-white p-5 shadow-[8px_8px_0_0_#111]">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#0055FF]">ACCESS LOGIC</p>
            <h3 className="mt-2 text-xl font-black">Monthly mock access by plan</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              {(["free", "basic", "premium", "vip"] as const).map((tier) => (
                <div key={tier} className={`border-[3px] border-black p-3 ${tier === effectiveTier ? "bg-[#FFD600]" : "bg-white"}`}>
                  <p className="font-mono text-[9px] font-black uppercase">{tier}</p>
                  <p className="mt-1 text-2xl font-black text-[#0055FF]">{MOCK_TEST_MONTHLY_LIMIT[tier]}</p>
                  <p className="text-[9px] font-bold uppercase">per month</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs font-bold text-neutral-700">
              Free users cannot start mock tests. Basic gets 2/month, Premium gets 4/month, and VIP gets 6/month.
            </p>
          </div>

          <div className="border-4 border-black bg-[#f0fdf4] p-5 shadow-[8px_8px_0_0_#111]">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#16a34a]">UPGRADE INCENTIVE</p>
            <h3 className="mt-2 text-xl font-black">{marketing.headline}</h3>
            <p className="mt-3 text-sm font-semibold text-neutral-700">{marketing.body}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/pricing"
                className="border-[3px] border-black bg-[#22c55e] px-5 py-3 text-sm font-black uppercase text-white shadow-[4px_4px_0_0_#111]"
              >
                {marketing.cta}
              </Link>
              <button
                type="button"
                onClick={() => setShowPreflight(true)}
                disabled={!canStart || (!adminCanPreview && tierLoading)}
                className="border-[3px] border-black bg-white px-5 py-3 text-sm font-black uppercase shadow-[4px_4px_0_0_#111] disabled:opacity-45"
              >
                Start current plan
              </button>
            </div>
            <p className="mt-3 text-[11px] font-bold text-neutral-600">
              The more monthly mocks you unlock, the more often you can benchmark, review weak skills, and prove score gains.
            </p>
          </div>

          {adminCanPreview ? (
            <div className="border-4 border-black bg-black p-3 font-mono text-[9px] leading-tight text-[#FFD600] shadow-[8px_8px_0_0_#111]">
              NEXT_PUBLIC_MOCK_TEST_CLOSED={String(!launchLive)}
              <br />
              TOTAL_SETS_AVAILABLE: {sets.length}
              <br />
              USER_SESSION: {adminPreviewMode ? "ADMIN_PREVIEW" : "LEARNER_VIEW"}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col items-center justify-between gap-4 border-t-2 border-dashed border-black pt-4 md:flex-row">
        <p className="font-mono text-[9px] font-black uppercase text-gray-400">
          DET Mock System // Dashboard View // Pinned reports: {pinnedAttemptCount}
        </p>
        <div className="flex gap-4">
          <Link href="/pricing" className="font-mono text-[9px] font-black uppercase underline">Upgrade Plans</Link>
          <Link href="/practice" className="font-mono text-[9px] font-black uppercase underline">Back to Practice</Link>
        </div>
      </div>

      {showPreflight ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto border-4 border-black bg-[#fffdf2] p-6 shadow-[8px_8px_0_0_#111]">
            <p className="font-mono text-[10px] font-black uppercase tracking-widest text-[#0055FF]">Preflight · ก่อนเริ่มสอบ</p>
            <h2 className="mt-2 text-2xl font-black">Start this mock set</h2>
            <p className="mt-3 text-sm font-bold text-neutral-800">
              Starting now uses 1 mock credit immediately. Quitting early does not refund it.
            </p>
            <p className="mt-2 text-sm font-semibold text-neutral-700">
              ชุดที่เลือก: <span className="font-black">{setNameById[selectedSetId] ?? "—"}</span>
            </p>
            <p className="mt-2 text-sm font-semibold text-neutral-700">
              แพ็กเกจของคุณ: <span className="font-black uppercase">{effectiveTier}</span> · สิทธิ์ต่อเดือน:{" "}
              <span className="font-black">{limit}</span>
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(["total", "listening", "speaking", "reading", "writing"] as const).map((k) => (
                <label key={k} className="col-span-2 sm:col-span-1">
                  <span className="font-mono text-[10px] font-black uppercase text-neutral-600">{k}</span>
                  <input
                    value={targets[k]}
                    onChange={(e) => setTargets((prev) => ({ ...prev, [k]: e.target.value }))}
                    placeholder={k === "total" ? "Target total" : `Target ${k}`}
                    className="mt-1 w-full border-4 border-black bg-white px-3 py-2 text-sm font-bold"
                  />
                </label>
              ))}
            </div>

            {adminCanPreview ? (
              <div className="mt-4 space-y-2 border-2 border-black bg-white p-3">
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input type="checkbox" checked={adminPreviewMode} onChange={(e) => setAdminPreviewMode(e.target.checked)} />
                  Admin test mode (bypass 10-minute wait)
                </label>
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input type="checkbox" checked={skipTimerMode} onChange={(e) => setSkipTimerMode(e.target.checked)} />
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
                  <div className="border-2 border-dashed border-black bg-neutral-50 px-3 py-2">
                    <p className="text-xs font-bold text-neutral-700">Step 1–20</p>
                    <select
                      value={previewStepIndex}
                      onChange={(e) => setPreviewStepIndex(Number(e.target.value) || 13)}
                      className="mt-1 w-full border-4 border-black bg-white px-2 py-1 text-sm"
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

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void start()}
                className="border-[3px] border-black bg-[#0055FF] px-5 py-3 text-sm font-black uppercase text-white shadow-[4px_4px_0_0_#111]"
              >
                Confirm & Start
              </button>
              <button
                type="button"
                onClick={() => setShowPreflight(false)}
                className="border-[3px] border-black bg-white px-5 py-3 text-sm font-black uppercase shadow-[4px_4px_0_0_#111]"
              >
                Cancel
              </button>
            </div>

            {startError ? (
              <p className="mt-4 border-2 border-red-700 bg-red-50 px-3 py-2 text-xs font-bold text-red-800">{startError}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
