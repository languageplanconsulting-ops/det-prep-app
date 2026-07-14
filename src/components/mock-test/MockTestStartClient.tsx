"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PaywallUpsellCard } from "@/components/upsell/PaywallUpsellCard";
import type {
  MockSetGroup,
  SetAttemptStats,
} from "@/components/mock-test/dashboard/types";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { MOCK_TEST_MONTHLY_LIMIT } from "@/lib/access-control";
import { FIXED_MOCK_ESTIMATED_DURATION_LABEL } from "@/lib/mock-test/fixed-sequence";
import { countBillableMockFixedSessions, mockFixedMonthStartIso } from "@/lib/mock-test/mock-fixed-quota";
import {
  isMockTestAvailableNow,
  MOCK_TEST_LAUNCH_MESSAGE_EN,
  MOCK_TEST_LAUNCH_MESSAGE_TH,
} from "@/lib/mock-test/mock-test-availability";
import { buildPaywallSpec } from "@/lib/paywall-upsell";
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

function sortMockAttempts(list: MockAttemptRow[]) {
  return [...list].sort((a, b) => {
    const pa = a.dashboard_saved_at != null && a.dashboard_saved_at !== "" ? 1 : 0;
    const pb = b.dashboard_saved_at != null && b.dashboard_saved_at !== "" ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

const MOCK_START_LOADING_STEPS = [
  "Locking your mock credit…",
  "Preparing the 20-step sequence…",
  "Loading timers and skill targets…",
  "Opening your exam workspace…",
] as const;

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

export function MockTestStartClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const launchLive = isMockTestAvailableNow();
  const { effectiveTier, loading: tierLoading, isPreviewMode, isAdmin, previewEligible } = useEffectiveTier();
  const [hasUser, setHasUser] = useState<boolean | null>(null);
  const [used, setUsed] = useState(0);
  const [mockAddonRemaining, setMockAddonRemaining] = useState(0);
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
  const [fastPassPreviewMode, setFastPassPreviewMode] = useState(false);
  const [previewSeparateMode, setPreviewSeparateMode] = useState(false);
  const [previewStepIndex, setPreviewStepIndex] = useState(13);
  const [startVisualTick, setStartVisualTick] = useState(0);
  // Soft (admin) before-start browse state — search + status filter over 50+ sets.
  const [softQuery, setSoftQuery] = useState("");
  const [softStatus, setSoftStatus] = useState<"all" | "undone" | "done">("all");

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
      const summaryRes = await fetch("/api/account/quota-summary", { credentials: "same-origin" });
      if (summaryRes.ok) {
        const summary = (await summaryRes.json()) as {
          mock?: { used?: number; addonRemaining?: number };
        };
        setUsed(Math.max(0, Number(summary.mock?.used ?? 0)));
        setMockAddonRemaining(Math.max(0, Number(summary.mock?.addonRemaining ?? 0)));
      } else {
        const monthStart = mockFixedMonthStartIso();
        const { data: sessionRows } = await supabase
          .from("mock_fixed_sessions")
          .select("targets")
          .eq("user_id", user.id)
          .gte("started_at", monthStart);
        setUsed(countBillableMockFixedSessions(sessionRows));
        setMockAddonRemaining(0);
      }

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
  const remainingCount = Math.max(0, limit - used) + mockAddonRemaining;
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

  const selectedSetName = setNameById[selectedSetId] ?? "—";
  const mockBlockedSpec = useMemo(() => {
    if (hasUser === false && !adminCanPreview) return null;
    if (!tierOk || effectiveTier === "free") return buildPaywallSpec(effectiveTier, "mock_limit");
    if (!adminCanPreview && remainingCount <= 1) {
      return buildPaywallSpec(effectiveTier, "mock_near_limit", { mockRemaining: remainingCount });
    }
    return null;
  }, [adminCanPreview, effectiveTier, hasUser, remainingCount, tierOk]);

  /**
   * Per-set attempt aggregates derived from this user's attempts.
   * - lastAttempt: most recent (attempts arrive sorted desc, so the first match wins)
   * - bestAttempt: highest actual_total
   */
  const statsBySetId = useMemo<Record<string, SetAttemptStats>>(() => {
    const out: Record<string, SetAttemptStats> = {};
    for (const row of attempts) {
      const cur = out[row.set_id];
      if (!cur) {
        out[row.set_id] = { attemptCount: 1, lastAttempt: row, bestAttempt: row };
      } else {
        cur.attemptCount += 1;
        if (new Date(row.created_at).getTime() > new Date(cur.lastAttempt!.created_at).getTime()) {
          cur.lastAttempt = row;
        }
        if (row.actual_total > (cur.bestAttempt?.actual_total ?? -Infinity)) {
          cur.bestAttempt = row;
        }
      }
    }
    return out;
  }, [attempts]);

  /**
   * Split groupedSets into "current" (the most recent month, or the catch-all
   * ARCHIVE bucket when set names lack a parseable month) and "past" (the rest).
   * This is naming-driven, so it works whether the bank has 15 sets or 100+.
   */
  const currentGroup: MockSetGroup | null = groupedSets[0] ?? null;
  const pastGroups: MockSetGroup[] = useMemo(() => groupedSets.slice(1), [groupedSets]);

  /** Which set the page should highlight as "next" — used by SetArchive and the Welcome CTA. */
  const recommendedSetId: string | null = useMemo(() => {
    if (!currentGroup) return null;
    const unattempted = currentGroup.rows.find(
      (s) => (statsBySetId[s.id]?.attemptCount ?? 0) === 0,
    );
    return unattempted?.id ?? currentGroup.rows[0]?.id ?? null;
  }, [currentGroup, statsBySetId]);

  /**
   * Only treat as first-time once we know the user is loaded and has zero
   * attempts. While `hasUser === null` (still loading) we render the calmer
   * returner panel rather than briefly flashing the yellow welcome banner.
   */
  const isFirstTimeUser = hasUser === true && attempts.length === 0;
  /** Whether the welcome CTA is safe to surface (user can actually start a mock). */
  const canShowWelcomeCta =
    isFirstTimeUser && !!recommendedSetId && (adminCanPreview || (launchLive && tierOk));

  /** Trigger the preflight on a specific set id (used by SetArchive + Welcome CTA). */
  const pickSet = (setId: string) => {
    setSelectedSetId(setId);
    setShowPreflight(true);
  };

  useEffect(() => {
    if (!starting) {
      setStartVisualTick(0);
      return;
    }
    const id = window.setInterval(() => {
      setStartVisualTick((prev) => prev + 1);
    }, 850);
    return () => window.clearInterval(id);
  }, [starting]);

  useEffect(() => {
    if (!fastPassPreviewMode) return;
    setAdminPreviewMode(true);
    setSkipTimerMode(true);
    setPreviewSeparateMode(false);
  }, [fastPassPreviewMode]);

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
          fastPassPreviewMode: adminCanPreview && fastPassPreviewMode,
          previewSeparateMode: adminCanPreview && previewSeparateMode && !fastPassPreviewMode,
          previewStepIndex:
            adminCanPreview && previewSeparateMode && !fastPassPreviewMode ? previewStepIndex : undefined,
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
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
        <section className="border-4 border-black bg-white p-5 sm:p-8 shadow-[8px_8px_0_0_#111]">
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

  {
    // ── Unified "Progress Journey" before-start page (admin + learner) ──
    // Everyone gets the same layout. The only admin-specific UI is the preview
    // controls box inside the preflight modal, gated by `adminCanPreview`.
    type SoftPick = { kind: "continue" | "weakness" | "best"; set: MockSetRow; rationale: string };
    const softPicks: SoftPick[] = [];
    if (currentGroup) {
      const next =
        currentGroup.rows.find((s) => (statsBySetId[s.id]?.attemptCount ?? 0) === 0) ??
        currentGroup.rows[0];
      if (next) {
        softPicks.push({
          kind: "continue",
          set: next,
          rationale: "ชุดใหม่ล่าสุดของเดือนนี้ที่ยังไม่เคยทำ — รักษาจังหวะให้ครบโควตา",
        });
      }
    }
    if (attempts.length > 0) {
      const attemptedPast = pastGroups
        .flatMap((g) => g.rows)
        .map((r) => ({ row: r, stats: statsBySetId[r.id] }))
        .filter(
          (e): e is { row: MockSetRow; stats: SetAttemptStats } =>
            !!e.stats && e.stats.attemptCount > 0 && !!e.stats.bestAttempt,
        );
      if (attemptedPast.length > 0) {
        const worst = attemptedPast.reduce((a, c) =>
          c.stats.bestAttempt!.actual_total < a.stats.bestAttempt!.actual_total ? c : a,
        );
        if (worst.row.id !== softPicks[0]?.set.id) {
          softPicks.push({
            kind: "weakness",
            set: worst.row,
            rationale: `เคยได้ ${Math.round(worst.stats.bestAttempt!.actual_total)} (ต่ำสุด) — ทำซ้ำเพื่อยกคะแนนชุดที่อ่อนสุด`,
          });
        }
        const remaining = attemptedPast.filter((e) => e.row.id !== worst.row.id);
        if (remaining.length > 0) {
          const best = remaining.reduce((a, c) =>
            c.stats.bestAttempt!.actual_total > a.stats.bestAttempt!.actual_total ? c : a,
          );
          if (best.row.id !== softPicks[0]?.set.id) {
            softPicks.push({
              kind: "best",
              set: best.row,
              rationale: `ชุดที่ทำได้ดีสุด ${Math.round(best.stats.bestAttempt!.actual_total)} — ทำซ้ำเช็กว่ารักษาฟอร์มได้ไหม`,
            });
          }
        }
      }
    }

    const byDate = [...attempts].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const improvement =
      byDate.length >= 2
        ? Math.round(byDate[byDate.length - 1]!.actual_total - byDate[0]!.actual_total)
        : null;

    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const daysToRefresh = Math.max(0, Math.ceil((nextMonth.getTime() - now.getTime()) / 86_400_000));

    const matchesFilter = (s: MockSetRow): boolean => {
      const done = (statsBySetId[s.id]?.attemptCount ?? 0) > 0;
      if (softStatus === "done" && !done) return false;
      if (softStatus === "undone" && done) return false;
      if (softQuery.trim() && !s.name.toLowerCase().includes(softQuery.trim().toLowerCase()))
        return false;
      return true;
    };
    const groupDone = (g: MockSetGroup) =>
      g.rows.filter((s) => (statsBySetId[s.id]?.attemptCount ?? 0) > 0).length;
    const groupAvg = (g: MockSetGroup): number | null => {
      const xs = g.rows
        .map((s) => statsBySetId[s.id]?.lastAttempt?.actual_total)
        .filter((n): n is number => n != null);
      return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
    };

    const pickKindStyle: Record<SoftPick["kind"], { label: string; cls: string }> = {
      continue: { label: "ทำต่อเดือนนี้", cls: "text-[#004AAD] bg-[#004AAD]/10" },
      weakness: { label: "ยกจุดอ่อน", cls: "text-orange-600 bg-orange-50" },
      best: { label: "ทำซ้ำชุดเก่ง", cls: "text-emerald-700 bg-emerald-50" },
    };

    // Plain render fn (NOT a nested component) so typing in search doesn't
    // remount every card.
    const renderSetCard = (set: MockSetRow) => {
      const stats = statsBySetId[set.id];
      const done = (stats?.attemptCount ?? 0) > 0;
      const isRec = recommendedSetId === set.id;
      return (
        <button
          key={set.id}
          type="button"
          onClick={() => pickSet(set.id)}
          className={`relative rounded-2xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
            done ? "border-slate-200 bg-slate-50/60" : isRec ? "border-[#004AAD]/40 bg-white ring-2 ring-[#004AAD]/20" : "border-slate-200 bg-white"
          }`}
        >
          {isRec && !done ? (
            <span className="absolute -top-2.5 left-3 rounded-full bg-[#004AAD] px-2 py-0.5 text-[10px] font-bold text-white">
              เริ่มที่นี่
            </span>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">{set.name}</span>
            {done ? (
              <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">✓ ทำแล้ว</span>
            ) : (
              <span className="rounded bg-[#FFCC00] px-1.5 py-0.5 text-[10px] font-bold">ใหม่</span>
            )}
          </div>
          <p className="mt-1 text-[12px] text-slate-500">
            {done && stats?.lastAttempt
              ? `คะแนน ${Math.round(stats.lastAttempt.actual_total)}`
              : "ยังไม่เคยทำ"}
          </p>
          <p className="mt-2 border-t border-slate-100 pt-1.5 text-[11px] font-semibold text-rose-500">
            {done ? <span className="text-slate-400">~1 ชม. · ทำซ้ำได้</span> : "~1 ชม. · ใช้ 1 เครดิต"}
          </p>
        </button>
      );
    };

    const totalMonths = currentGroup ? pastGroups.length + 1 : pastGroups.length;

    return (
      <>
        <main className="mx-auto max-w-4xl px-4 pb-28 pt-6 md:px-6">
          <header className="mb-5">
            <Link
              href="/practice"
              className="text-[12px] font-semibold text-slate-400 hover:text-slate-600"
            >
              ← กลับไปฝึก
            </Link>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#004AAD]">
                  จำลองสอบ DET เต็มชุด
                </p>
                <h1 className="mt-1.5 text-[26px] font-bold leading-tight text-slate-900">
                  เลือกชุดที่จะซ้อม แล้วเริ่มเส้นทาง 20 ข้อ
                </h1>
                <p className="mt-1.5 text-sm text-slate-500">
                  ตอนนี้มี <b className="text-slate-700">{sets.length} ชุด</b> · อัปเดตทุกเดือน —
                  ไม่รู้จะเริ่มชุดไหน ปล่อยให้ระบบเลือกให้ได้เลย
                </p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1.5 text-[12px] font-semibold text-slate-600">
                เครดิตเดือนนี้{" "}
                <b className="text-[#004AAD]" style={{ fontFamily: "var(--font-jetbrains), monospace" }}>
                  {tierLoading ? "…" : remainingCount}
                </b>
                /{Math.max(limit, used + remainingCount)} · refresh ใน {daysToRefresh} วัน
              </div>
            </div>
          </header>

          {/* Clear intro (condensed from HowToUsePanel) */}
          <details open className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <summary className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-5 py-3.5">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-[#FFCC00] text-[13px] font-bold">i</span>
              <span className="text-[15px] font-bold">อ่านก่อนเริ่ม · ใช้เวลาไม่ถึง 2 นาที</span>
              <span className="ml-auto text-[12px] text-slate-400">ย่อ/ขยาย</span>
            </summary>
            <div className="grid gap-px bg-slate-100 sm:grid-cols-2">
              <div className="bg-white p-4">
                <p className="flex items-center gap-2 text-[13px] font-bold"><span className="text-[#004AAD]">①</span> เกี่ยวกับชุดข้อสอบ</p>
                <p className="mt-1 text-[13px] leading-6 text-slate-600">อัปโหลดชุดใหม่<b>ทุกเดือน</b>ตั้งแต่ ม.ค. 2026 จากข้อสอบ DET จริงของเดือนนั้น · <b>เลือกเริ่มชุดไหนก็ได้ ไม่มีลำดับบังคับ</b></p>
              </div>
              <div className="bg-white p-4">
                <p className="flex items-center gap-2 text-[13px] font-bold"><span className="text-[#004AAD]">②</span> ก่อนเริ่มทำ</p>
                <p className="mt-1 text-[13px] leading-6 text-slate-600"><b>{FIXED_MOCK_ESTIMATED_DURATION_LABEL}</b>/ชุด · <span className="font-semibold text-rose-600">ออกกลางคัน = นับว่าใช้โควตาแล้ว</span> · ตัวเลขชุด<b>ไม่ใช่</b>ระดับความยาก ทุกชุดเป็น Adaptive</p>
              </div>
              <div className="bg-white p-4">
                <p className="flex items-center gap-2 text-[13px] font-bold"><span className="text-[#004AAD]">③</span> นี่คือการ<b>ซ้อม</b> ไม่ใช่สอบจริง</p>
                <p className="mt-1 text-[13px] leading-6 text-slate-600">ไม่ต้องตั้งกล้อง เปิดเน็ตค้นได้ ไม่มีบันทึก — <b>แต่สอบจริง</b> Duolingo เข้มเรื่องกล้องและสภาพแวดล้อมมาก ควรอ่านกฎก่อน</p>
              </div>
              <div className="bg-white p-4">
                <p className="flex items-center gap-2 text-[13px] font-bold"><span className="text-[#004AAD]">④</span> ฟีดแบ็ก &amp; แจ้งปัญหา</p>
                <p className="mt-1 text-[13px] leading-6 text-slate-600">จบแต่ละชุดได้ฟีดแบ็กเฉพาะบุคคล เก็บไว้ติดตามพัฒนาการได้ · ปัญหาแจ้ง <b>languageplanconsulting@gmail.com</b></p>
              </div>
            </div>
          </details>

          {/* Journey snapshot */}
          {attempts.length > 0 ? (
            <div className="mb-4 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">เส้นทางของคุณจนถึงตอนนี้</p>
                <p className="text-sm text-slate-700">
                  ซ้อมมาแล้ว{" "}
                  <b className="text-[#004AAD]" style={{ fontFamily: "var(--font-jetbrains), monospace" }}>{attempts.length}</b> ชุด
                  {bestAttempt ? <> · ดีสุด <b className="text-[#004AAD]">{Math.round(bestAttempt.actual_total)}</b></> : null}
                  {improvement != null && improvement > 0 ? <> · พัฒนาขึ้น <b className="text-emerald-600">+{improvement}</b></> : null}
                </p>
              </div>
              <span className="ml-auto text-[12px] text-slate-400">ทำครบ 4 ทักษะทุกชุด</span>
            </div>
          ) : null}

          {/* System picks */}
          {softPicks.length > 0 ? (
            <section className="mb-6">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="flex items-center gap-2 text-base font-bold"><span className="text-[#004AAD]">★</span> เริ่มตรงนี้ · ระบบเลือกให้แล้ว</h2>
                <span className="text-[11px] text-slate-400">เลือกตามคะแนน + จังหวะของคุณ</span>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {softPicks.map((p, i) => (
                  <button
                    key={p.kind}
                    type="button"
                    onClick={() => pickSet(p.set.id)}
                    className={`relative rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                      i === 0 ? "border-[#004AAD]/40 ring-2 ring-[#004AAD]/20" : "border-slate-200"
                    }`}
                  >
                    {i === 0 ? (
                      <span className="absolute -top-2.5 left-3 rounded-full bg-[#004AAD] px-2 py-0.5 text-[10px] font-bold text-white">แนะนำ</span>
                    ) : null}
                    <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${pickKindStyle[p.kind].cls}`}>{pickKindStyle[p.kind].label}</span>
                    <p className="mt-2 font-bold leading-tight">{p.set.name}</p>
                    <p className="mt-1 text-[12px] leading-5 text-slate-500">{p.rationale}</p>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
                      <span>~1 ชม. · 20 ข้อ</span><span className="font-semibold text-rose-500">ใช้ 1 เครดิต</span>
                    </div>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[12px] text-slate-400">กดเริ่มชุดไหนก็ใช้ <b>1 เครดิต</b> ทันที · ออกกลางคันไม่คืน — เผื่อเวลา ~1 ชม. ก่อนนะ</p>
            </section>
          ) : null}

          {/* Browse all */}
          <section>
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-base font-bold">{softPicks.length > 0 ? "หรือเลือกเองจากคลัง" : "เลือกชุดที่จะซ้อม"} · {sets.length} ชุด</h2>
              <span className="text-[11px] text-slate-400" style={{ fontFamily: "var(--font-jetbrains), monospace" }}>{totalMonths} เดือน</span>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <span className="text-slate-400">🔎</span>
                <input
                  value={softQuery}
                  onChange={(e) => setSoftQuery(e.target.value)}
                  className="flex-1 text-sm outline-none placeholder:text-slate-300"
                  placeholder="ค้นหาเดือน / ชื่อชุด เช่น “June” หรือ “Set A”"
                />
              </div>
              <div className="flex gap-2">
                {(["all", "undone", "done"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setSoftStatus(f)}
                    className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold ${
                      softStatus === f ? "border-[#004AAD] bg-[#004AAD] text-white" : "border-slate-200 bg-white text-slate-500"
                    }`}
                  >
                    {f === "all" ? "ทั้งหมด" : f === "undone" ? "ยังไม่ทำ" : "ทำแล้ว"}
                  </button>
                ))}
              </div>
            </div>

            {currentGroup ? (
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                  <p className="text-sm font-bold">📚 {currentGroup.label === "ARCHIVE" ? "ชุดข้อสอบทั้งหมด" : `${currentGroup.label} · เดือนล่าสุด`}</p>
                  <span className="text-[11px] text-slate-400" style={{ fontFamily: "var(--font-jetbrains), monospace" }}>{groupDone(currentGroup)}/{currentGroup.rows.length} ทำแล้ว</span>
                </div>
                <div className="grid gap-2.5 p-3 sm:grid-cols-2 lg:grid-cols-3">
                  {currentGroup.rows.filter(matchesFilter).map((set) => renderSetCard(set))}
                  {currentGroup.rows.filter(matchesFilter).length === 0 ? (
                    <p className="col-span-full py-4 text-center text-[13px] text-slate-400">ไม่พบชุดที่ตรงกับการค้นหา</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {pastGroups.length > 0 ? (
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                  <p className="text-sm font-bold text-slate-600">📦 เดือนก่อนหน้า</p>
                  <span className="text-[11px] text-slate-400" style={{ fontFamily: "var(--font-jetbrains), monospace" }}>{pastGroups.length} เดือน · {pastGroups.reduce((s, g) => s + g.rows.length, 0)} ชุด</span>
                </div>
                {pastGroups.map((g, idx) => {
                  const visible = g.rows.filter(matchesFilter);
                  const avg = groupAvg(g);
                  const pct = g.rows.length ? Math.round((groupDone(g) / g.rows.length) * 100) : 0;
                  return (
                    <details key={g.key} open={idx === 0} className="border-b border-slate-100 last:border-b-0">
                      <summary className="grid cursor-pointer grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 hover:bg-slate-50">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="w-24 shrink-0 text-sm font-bold">{g.label}</span>
                          <div className="h-1.5 max-w-[140px] flex-1 rounded-full bg-slate-200">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[11px] text-slate-400" style={{ fontFamily: "var(--font-jetbrains), monospace" }}>{groupDone(g)}/{g.rows.length}</span>
                        </div>
                        <span className="text-[12px] text-slate-400">avg <b className="text-[#004AAD]">{avg ?? "—"}</b></span>
                      </summary>
                      <div className="grid gap-2.5 bg-slate-50/40 px-3 pb-3 sm:grid-cols-2 lg:grid-cols-3">
                        {visible.map((set) => renderSetCard(set))}
                        {visible.length === 0 ? (
                          <p className="col-span-full py-3 text-center text-[12px] text-slate-400">ไม่พบชุดที่ตรงกับการค้นหาในเดือนนี้</p>
                        ) : null}
                      </div>
                    </details>
                  );
                })}
              </div>
            ) : null}
          </section>

          {mockBlockedSpec ? (
            <div className="mt-5">
              <PaywallUpsellCard spec={mockBlockedSpec} compact />
            </div>
          ) : null}
        </main>

        {/* Sticky escape-hatch: never stuck choosing */}
        {recommendedSetId ? (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
            <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
              <span className="hidden text-[12px] text-slate-500 sm:block">ยังไม่รู้จะเลือกชุดไหน?</span>
              <button
                type="button"
                onClick={() => pickSet(recommendedSetId)}
                className="ml-auto flex items-center gap-2 rounded-xl bg-[#004AAD] px-6 py-3 text-[15px] font-bold text-[#FFCC00] shadow-sm transition hover:brightness-110"
              >
                เริ่มชุดที่แนะนำ <span>→</span>
              </button>
            </div>
          </div>
        ) : null}

        {/* Soft preflight modal */}
        {showPreflight ? (
          <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-900/40 px-4 py-6 backdrop-blur-sm">
            <div className="mx-auto flex min-h-full max-w-lg items-center justify-center">
              {starting ? (
                <div className="w-full rounded-2xl border border-slate-200 bg-white p-7 shadow-xl">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#004AAD]">กำลังเปิดข้อสอบ</p>
                  <h2 className="mt-2 text-2xl font-bold">กำลังเริ่ม Mock…</h2>
                  <p className="mt-2 text-sm text-slate-600">อย่ารีเฟรชหน้านี้ — กำลังสร้างเซสชัน ล็อกเครดิต และโหลดข้อแรกให้</p>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-[#004AAD] transition-[width] duration-500"
                      style={{ width: `${Math.min(100, ((startVisualTick % MOCK_START_LOADING_STEPS.length) + 1) / MOCK_START_LOADING_STEPS.length * 100)}%` }}
                    />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    {MOCK_START_LOADING_STEPS[Math.min(startVisualTick, MOCK_START_LOADING_STEPS.length - 1)]}
                  </p>
                </div>
              ) : (
                <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-7">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#004AAD]">ก่อนเริ่มสอบ</p>
                      <h2 className="mt-1 text-xl font-bold">ยืนยันการเริ่มชุดนี้</h2>
                    </div>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase text-slate-500">{effectiveTier}</span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold text-slate-400">ชุดที่เลือก</p>
                      <p className="mt-0.5 text-sm font-bold text-[#004AAD]">{selectedSetName}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[11px] font-semibold text-slate-400">เครดิตคงเหลือ</p>
                      <p className="mt-0.5 text-sm font-bold">{remainingCount} <span className="text-[11px] text-slate-400">ครั้ง</span></p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-[13px] leading-6 text-amber-900 ring-1 ring-amber-200">
                    กดเริ่ม = ใช้ <b>1 เครดิต</b> ทันที · ออกกลางคันไม่คืนเครดิตและไม่คืนเงิน — เผื่อเวลาให้ครบ {FIXED_MOCK_ESTIMATED_DURATION_LABEL}
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-[13px] font-bold">🎯 ตั้งเป้าคะแนน (ไม่บังคับ)</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input value={targets.total} onChange={(e) => setTargets((p) => ({ ...p, total: e.target.value }))} placeholder="เป้ารวม เช่น 125" className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#004AAD]" />
                      <input value={targets.reading} onChange={(e) => setTargets((p) => ({ ...p, reading: e.target.value }))} placeholder="การอ่าน" className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#004AAD]" />
                      <input value={targets.writing} onChange={(e) => setTargets((p) => ({ ...p, writing: e.target.value }))} placeholder="การเขียน" className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#004AAD]" />
                      <input value={targets.speaking} onChange={(e) => setTargets((p) => ({ ...p, speaking: e.target.value }))} placeholder="การพูด" className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#004AAD]" />
                    </div>
                  </div>

                  {adminCanPreview ? (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Admin controls</p>
                      <div className="mt-2 space-y-2 text-[12px] font-semibold text-slate-700">
                        <label className="flex cursor-pointer items-center gap-2">
                          <input type="checkbox" checked={adminPreviewMode} onChange={(e) => setAdminPreviewMode(e.target.checked)} className="h-4 w-4 accent-[#004AAD]" /> Admin test mode (ข้ามการรอ 10 นาที)
                        </label>
                        <label className="flex cursor-pointer items-center gap-2">
                          <input type="checkbox" checked={skipTimerMode} onChange={(e) => setSkipTimerMode(e.target.checked)} className="h-4 w-4 accent-[#004AAD]" /> ข้ามการจับเวลา
                        </label>
                        <label className="flex cursor-pointer items-center gap-2">
                          <input type="checkbox" checked={fastPassPreviewMode} onChange={(e) => setFastPassPreviewMode(e.target.checked)} className="h-4 w-4 accent-[#004AAD]" /> Fast pass (ข้ามทั้ง 20 ข้ออัตโนมัติ)
                        </label>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-5 flex gap-3">
                    <button
                      type="button"
                      onClick={() => void start()}
                      disabled={!canStart}
                      className="flex-1 rounded-xl bg-[#004AAD] py-3 text-base font-bold text-[#FFCC00] shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ยืนยัน เริ่มสอบ
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPreflight(false)}
                      className="rounded-xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-500 hover:bg-slate-50"
                    >
                      ยกเลิก
                    </button>
                  </div>
                  {!canStart && !adminCanPreview ? (
                    <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
                      {effectiveTier === "free"
                        ? "Mock Test ใช้ได้ตั้งแต่แพ็กเกจ Basic ขึ้นไป — อัปเกรดเพื่อเริ่มสอบจำลอง"
                        : "ใช้สิทธิ์ Mock Test ของเดือนนี้ครบแล้ว — รอเดือนหน้า หรืออัปเกรด/ซื้อเครดิตเพิ่ม"}
                    </p>
                  ) : null}
                  {startError ? (
                    <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">{startError}</p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </>
    );
  }
}
