"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PaywallUpsellCard } from "@/components/upsell/PaywallUpsellCard";
import { CadenceTile } from "@/components/mock-test/dashboard/CadenceTile";
import { HowToUsePanel } from "@/components/mock-test/dashboard/HowToUsePanel";
import { SetArchive } from "@/components/mock-test/dashboard/SetArchive";
import type {
  MockSetGroup,
  SetAttemptStats,
} from "@/components/mock-test/dashboard/types";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { MOCK_TEST_MONTHLY_LIMIT, type Tier } from "@/lib/access-control";
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

function csvEscape(value: string): string {
  const normalized = value.replaceAll('"', '""');
  return `"${normalized}"`;
}

const MOCK_START_LOADING_STEPS = [
  "Locking your mock credit…",
  "Preparing the 20-step sequence…",
  "Loading timers and skill targets…",
  "Opening your exam workspace…",
] as const;

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
  const [unpinSessionId, setUnpinSessionId] = useState<string | null>(null);
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

  const sortedAttempts = attempts.slice(0, 50);
  const pinnedAttemptCount = attempts.filter((row) => row.dashboard_saved_at).length;
  const marketing = tierMarketing(effectiveTier);
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

  if (adminCanPreview) {
    // ── Admin / preview "Progress Journey" before-start page (50+ sets) ──
    // Reuses ALL the same data + handlers; only the layout changes. Real
    // (non-admin) users fall through to the original brutalist dashboard below.
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
                <p className="mt-1 text-[13px] leading-6 text-slate-600">จบแต่ละชุดได้ฟีดแบ็กเฉพาะบุคคล เก็บไว้ติดตามพัฒนาการได้ · ปัญหาแจ้ง <b>languageplan.consulting@gmail.com</b></p>
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

                  <div className="mt-5 flex gap-3">
                    <button
                      type="button"
                      onClick={() => void start()}
                      className="flex-1 rounded-xl bg-[#004AAD] py-3 text-base font-bold text-[#FFCC00] shadow-sm transition hover:brightness-110"
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

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/practice" className="mb-2 inline-flex items-center gap-2 font-mono text-xs font-bold hover:underline">
            ← BACK / กลับ
          </Link>
          <h1 className="text-2xl sm:text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">
            DET · MOCK CENTER <br />
            <span className="not-italic text-[#0055FF]">แดชบอร์ดและการจำลองสอบ</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-bold text-neutral-700">
            Full 20-step simulation · {FIXED_MOCK_ESTIMATED_DURATION_LABEL} · one credit is used when you start.
          </p>
        </div>

        <CadenceTile
          used={used}
          limit={limit}
          remainingCount={remainingCount}
          mockAddonRemaining={mockAddonRemaining}
          lifetimeAttempts={attempts.length}
          tier={effectiveTier}
          loading={tierLoading}
        />
      </div>

      <HowToUsePanel
        firstSetName={
          canShowWelcomeCta && recommendedSetId
            ? currentGroup?.rows.find((r) => r.id === recommendedSetId)?.name
            : undefined
        }
        onStartFirst={
          canShowWelcomeCta && recommendedSetId
            ? () => pickSet(recommendedSetId)
            : undefined
        }
      />

      <SetArchive
        currentGroup={currentGroup}
        pastGroups={pastGroups}
        statsBySetId={statsBySetId}
        attemptCount={attempts.length}
        recommendedSetId={recommendedSetId}
        onPickSet={pickSet}
      />

      {!isFirstTimeUser ? (
        <>
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
                <p className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter text-[#0055FF]">{fmtScore(bestAttempt?.actual_total)}</p>
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
              <table className="w-full min-w-[560px] md:min-w-0 border-collapse text-left">
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
        </>
      ) : null}

      {mockBlockedSpec ? <PaywallUpsellCard spec={mockBlockedSpec} compact /> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="border-4 border-black bg-white p-5 shadow-[8px_8px_0_0_#111]">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#0055FF]">ACCESS LOGIC</p>
          <h3 className="mt-2 text-xl font-black">Monthly mock access by plan</h3>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
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
              onClick={() => recommendedSetId && pickSet(recommendedSetId)}
              disabled={
                !recommendedSetId || !canStart || (!adminCanPreview && tierLoading)
              }
              className="border-[3px] border-black bg-white px-5 py-3 text-sm font-black uppercase shadow-[4px_4px_0_0_#111] disabled:opacity-45"
            >
              Start recommended
            </button>
          </div>
          <p className="mt-3 text-[11px] font-bold text-neutral-600">
            The more monthly mocks you unlock, the more often you can benchmark, review weak skills, and prove score gains.
          </p>
        </div>
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
        <div
          className="fixed inset-0 z-[80] overflow-y-auto px-4 py-6 md:px-8"
          style={{
            backgroundImage: "radial-gradient(#111 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            backgroundColor: "#f3f4f6",
          }}
        >
          <div className="mx-auto flex min-h-full max-w-5xl items-center justify-center">
            {starting ? (
              <div className="w-full max-w-2xl border-4 border-black bg-white p-5 sm:p-8 md:p-10 shadow-[10px_10px_0_0_#111]">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-[#004aad]">
                  Launch Sequence // กำลังเปิดข้อสอบ
                </p>
                <h2 className="mt-3 text-2xl sm:text-4xl md:text-5xl font-black uppercase italic leading-none tracking-tighter">
                  Starting Mock <br />
                  <span className="not-italic text-[#004aad]">Please wait</span>
                </h2>
                <div className="mt-8 border-4 border-black bg-[#ffcc00] p-4 shadow-[4px_4px_0_0_#111]">
                  <p className="text-sm font-black uppercase">Preparing your exam workspace</p>
                  <p className="mt-2 text-[11px] font-bold text-black/80">
                    Do not refresh this page. We are creating your session, locking your credit, and loading the first step.
                  </p>
                </div>
                <div className="mt-8 border-4 border-black bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-black uppercase text-neutral-500">Progress</span>
                    <span className="font-mono text-[10px] font-black uppercase text-[#004aad]">
                      {Math.min(MOCK_START_LOADING_STEPS.length, startVisualTick + 1)}/{MOCK_START_LOADING_STEPS.length}
                    </span>
                  </div>
                  <div className="mt-3 h-4 border-[3px] border-black bg-neutral-100">
                    <div
                      className="h-full bg-[#004aad] transition-[width] duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          ((startVisualTick % MOCK_START_LOADING_STEPS.length) + 1) /
                            MOCK_START_LOADING_STEPS.length *
                            100,
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="mt-4 text-sm font-black text-neutral-900">
                    {
                      MOCK_START_LOADING_STEPS[
                        Math.min(startVisualTick, MOCK_START_LOADING_STEPS.length - 1)
                      ]
                    }
                  </p>
                  <div className="mt-5 flex gap-2">
                    {MOCK_START_LOADING_STEPS.map((label, idx) => {
                      const active = idx <= Math.min(startVisualTick, MOCK_START_LOADING_STEPS.length - 1);
                      return (
                        <div key={label} className="flex-1">
                          <div
                            className={`h-3 border-2 border-black ${
                              active ? "bg-[#ffcc00]" : "bg-white"
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-2xl border-4 border-black bg-white p-6 shadow-[10px_10px_0_0_#111] md:p-10">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b-4 border-black pb-4 sm:pb-6">
                  <div>
                    <p className="font-mono text-[10px] font-black uppercase tracking-widest text-[#004aad]">
                      Preflight Check // ก่อนเริ่มสอบ
                    </p>
                    <h2 className="mt-2 text-2xl sm:text-4xl md:text-5xl font-black uppercase italic leading-none tracking-tighter">
                      ยืนยันการเริ่มสอบ <br />
                      <span className="not-italic text-[#004aad]">Start Mock Set</span>
                    </h2>
                  </div>
                  <div className="shrink-0 border-[3px] border-black bg-[#ffcc00] p-2 text-center sm:min-w-[100px]">
                    <p className="font-mono text-[9px] font-black uppercase">Tier Status</p>
                    <p className="text-xl font-black uppercase italic">{effectiveTier}</p>
                  </div>
                </div>

                <div className="mb-8 flex items-start gap-4 border-[3px] border-black bg-[#ffcc00] p-4 shadow-[4px_4px_0_0_#111]">
                  <span className="text-3xl">⚠️</span>
                  <div>
                    <p className="text-sm font-black uppercase leading-tight">คำเตือนเรื่องสิทธิ์การสอบ (Credit Notice)</p>
                    <p className="mt-1 text-[11px] font-bold text-black/80">
                      การกดเริ่มจะใช้ <span className="underline">1 Mock Credit</span> ทันที หากกดออกกลางคันระบบจะไม่คืนสิทธิ์และไม่มีการคืนเงิน กรุณาเผื่อเวลาอย่างน้อย {FIXED_MOCK_ESTIMATED_DURATION_LABEL}
                    </p>
                    <p className="mt-1 font-mono text-[9px] font-bold uppercase text-black/40">
                      Starting now uses 1 credit. Quitting early = No refund.
                    </p>
                  </div>
                </div>

                <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="border-2 border-black bg-gray-50 p-3">
                    <p className="font-mono text-[9px] font-black uppercase opacity-40">Selected Set / ชุดที่เลือก</p>
                    <p className="mt-1 text-lg font-black uppercase italic text-[#004aad]">{selectedSetName}</p>
                  </div>
                  <div className="border-2 border-black bg-gray-50 p-3">
                    <p className="font-mono text-[9px] font-black uppercase opacity-40">Credits Left / สิทธิ์คงเหลือ</p>
                    <p className="mt-1 text-lg font-black">
                      {remainingCount} <span className="text-[10px] opacity-40">Sessions</span>
                    </p>
                  </div>
                </div>

                <div className="mb-10 space-y-4">
                  <h3 className="flex items-center gap-2 border-b-2 border-black pb-1 text-sm font-black uppercase">
                    🎯 ตั้งเป้าหมายของคุณ (Set Your Targets)
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="font-mono text-[10px] font-black uppercase opacity-50">Total Target</label>
                      <input
                        value={targets.total}
                        onChange={(e) => setTargets((prev) => ({ ...prev, total: e.target.value }))}
                        placeholder="Target total (e.g. 125)"
                        className="w-full border-[3px] border-black px-3 py-[10px] font-extrabold outline-none focus:bg-[#fff9e6] focus:shadow-[4px_4px_0_0_#004aad]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        ["listening", "Listening"],
                        ["speaking", "Speaking"],
                      ] as const).map(([key, label]) => (
                        <div key={key} className="space-y-1">
                          <label className="font-mono text-[10px] font-black uppercase opacity-50">{label}</label>
                          <input
                            value={targets[key]}
                            onChange={(e) => setTargets((prev) => ({ ...prev, [key]: e.target.value }))}
                            placeholder="Target"
                            className="w-full border-[3px] border-black px-3 py-[10px] font-extrabold outline-none focus:bg-[#fff9e6] focus:shadow-[4px_4px_0_0_#004aad]"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:col-span-2">
                      {([
                        ["reading", "Reading"],
                        ["writing", "Writing"],
                      ] as const).map(([key, label]) => (
                        <div key={key} className="space-y-1">
                          <label className="font-mono text-[10px] font-black uppercase opacity-50">{label}</label>
                          <input
                            value={targets[key]}
                            onChange={(e) => setTargets((prev) => ({ ...prev, [key]: e.target.value }))}
                            placeholder="Target"
                            className="w-full border-[3px] border-black px-3 py-[10px] font-extrabold outline-none focus:bg-[#fff9e6] focus:shadow-[4px_4px_0_0_#004aad]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {adminCanPreview ? (
                  <div className="relative mb-10 border-[3px] border-black bg-black p-5 text-[#FFD600]">
                    <span className="absolute -top-3 left-4 bg-red-600 px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-sm">
                      Admin Control Room
                    </span>
                    <div className="space-y-3 pt-2">
                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={adminPreviewMode}
                          onChange={(e) => setAdminPreviewMode(e.target.checked)}
                          className="h-5 w-5 accent-[#FFD600]"
                        />
                        <span className="text-[11px] font-bold">Admin test mode (Bypass 10-minute wait)</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={skipTimerMode}
                          onChange={(e) => setSkipTimerMode(e.target.checked)}
                          className="h-5 w-5 accent-[#FFD600]"
                        />
                        <span className="text-[11px] font-bold">Skip timer mode</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={fastPassPreviewMode}
                          onChange={(e) => setFastPassPreviewMode(e.target.checked)}
                          className="h-5 w-5 accent-[#FFD600]"
                        />
                        <span className="text-[11px] font-bold">Fast pass preview (auto-skip all 20)</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={previewSeparateMode}
                          onChange={(e) => setPreviewSeparateMode(e.target.checked)}
                          disabled={fastPassPreviewMode}
                          className="h-5 w-5 accent-[#FFD600]"
                        />
                        <span className="text-[11px] font-bold">Preview separate step only</span>
                      </label>
                      {fastPassPreviewMode ? (
                        <div className="border-2 border-dashed border-[#FFD600] bg-black/40 px-3 py-2 text-[10px] font-bold leading-5">
                          Shows each question briefly, auto-submits `skippedByAdmin`, skips timers/rest,
                          and still runs the normal backend scoring + result creation path.
                        </div>
                      ) : null}
                      {previewSeparateMode ? (
                        <div className="border-2 border-dashed border-[#FFD600] bg-black/40 px-3 py-2">
                          <p className="text-[10px] font-black uppercase">Preview step</p>
                          <select
                            value={previewStepIndex}
                            onChange={(e) => setPreviewStepIndex(Number(e.target.value) || 13)}
                            className="mt-2 w-full border-[3px] border-[#FFD600] bg-black px-2 py-2 text-sm font-bold text-[#FFD600]"
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
                  </div>
                ) : null}

                <div className="flex flex-col gap-4 md:flex-row">
                  <button
                    type="button"
                    onClick={() => void start()}
                    className="flex-grow border-[3px] border-black bg-[#004aad] py-4 text-xl font-black uppercase tracking-widest text-white shadow-[6px_6px_0_0_#111] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_0_#111]"
                  >
                    Confirm & Start
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPreflight(false)}
                    className="border-[3px] border-black bg-white px-6 sm:px-10 py-3 sm:py-4 font-black uppercase text-gray-500 shadow-[4px_4px_0_0_#111] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#111]"
                  >
                    Cancel
                  </button>
                </div>

                {startError ? (
                  <p className="mt-4 border-2 border-red-700 bg-red-50 px-3 py-2 text-xs font-bold text-red-800">
                    {startError}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
