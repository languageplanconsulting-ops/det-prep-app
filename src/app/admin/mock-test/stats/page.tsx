"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { buildMockBankCountMatrix } from "@/lib/mock-test/admin-bank-counts";
import { MOCK_TEST_PHASE_COUNT, PHASE_QUESTION_TYPE } from "@/lib/mock-test/constants";
import { mt } from "@/lib/mock-test/mock-test-styles";
import { getBrowserSupabase } from "@/lib/supabase-browser";

const ATTEMPT_LIMIT = 500;

type MockResultListRow = {
  id: string;
  session_id: string;
  user_id: string;
  created_at: string;
  overall_score: number | null;
  literacy_score: number | null;
  comprehension_score: number | null;
  conversation_score: number | null;
  production_score: number | null;
  routing_band: number | null;
  final_score_rounded_5: number | null;
  cefr_level: string | null;
  duration_seconds: number | null;
};

type MemberAttemptRow = {
  id: string;
  userId: string;
  createdAt: string;
  email: string;
  fullName: string | null;
  memberTier: string;
  engineLabel: string;
  poolLabel: string;
  overallScore: number | null;
  finalRounded5: number | null;
  cefr: string | null;
  literacy: number | null;
  comprehension: number | null;
  conversation: number | null;
  production: number | null;
  durationLabel: string;
};

function poolLabelFromSession(
  resultBand: number | null | undefined,
  sessionBand: number | null | undefined,
  currentDifficulty: string | null | undefined,
): string {
  const band = resultBand ?? sessionBand;
  if (band != null && band !== 0) return String(band);
  if (currentDifficulty === "easy") return "85 (legacy)";
  if (currentDifficulty === "medium") return "125 (legacy)";
  if (currentDifficulty === "hard") return "150 (legacy)";
  if (currentDifficulty) return currentDifficulty;
  return "—";
}

export default function AdminMockTestStatsPage() {
  const [matrix, setMatrix] = useState(() => buildMockBankCountMatrix(null));
  const [avgOverall, setAvgOverall] = useState<number | null>(null);
  const [attempts, setAttempts] = useState<MemberAttemptRow[]>([]);
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [emailFilter, setEmailFilter] = useState("");

  const load = useCallback(async () => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const { data: qs } = await supabase.from("mock_questions").select("phase, difficulty");
    setMatrix(
      buildMockBankCountMatrix(qs as { phase: number; difficulty: string }[]),
    );

    const { data: rs } = await supabase
      .from("mock_test_results")
      .select("overall_score");
    const scores = (rs ?? [])
      .map((r: { overall_score: number | null }) => r.overall_score)
      .filter((v: number | null): v is number => typeof v === "number");
    setAvgOverall(
      scores.length
        ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length
        : null,
    );

    const { data: resultRows, error: attemptErr } = await supabase
      .from("mock_test_results")
      .select(
        "id, session_id, user_id, created_at, overall_score, literacy_score, comprehension_score, conversation_score, production_score, routing_band, final_score_rounded_5, cefr_level, duration_seconds",
      )
      .order("created_at", { ascending: false })
      .limit(ATTEMPT_LIMIT);

    if (attemptErr) {
      setAttempts([]);
      return;
    }
    if (!resultRows?.length) {
      setAttempts([]);
      return;
    }

    const rows = resultRows as MockResultListRow[];
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const sessionIds = [...new Set(rows.map((r) => r.session_id))];

    const profPromise =
      userIds.length > 0
        ? supabase.from("profiles").select("id, email, full_name, tier").in("id", userIds)
        : Promise.resolve({ data: [] as { id: string; email: string; full_name: string | null; tier: string | null }[] });
    const sessPromise =
      sessionIds.length > 0
        ? supabase
            .from("mock_test_sessions")
            .select("id, engine_version, routing_band, current_difficulty")
            .in("id", sessionIds)
        : Promise.resolve({
            data: [] as {
              id: string;
              engine_version: number | null;
              routing_band: number | null;
              current_difficulty: string | null;
            }[],
          });

    const [{ data: profRows }, { data: sessRows }] = await Promise.all([
      profPromise,
      sessPromise,
    ]);

    const profileById = new Map<string, Record<string, unknown>>();
    for (const p of profRows ?? []) {
      profileById.set(p.id as string, p as Record<string, unknown>);
    }
    const sessionById = new Map<string, Record<string, unknown>>();
    for (const s of sessRows ?? []) {
      sessionById.set(s.id as string, s as Record<string, unknown>);
    }

    const built: MemberAttemptRow[] = rows.map((r) => {
      const uid = r.user_id;
      const sid = r.session_id;
      const prof = profileById.get(uid);
      const sess = sessionById.get(sid);
      const engineV = sess?.engine_version as number | undefined;
      const engineLabel =
        engineV === 2 ? "Adaptive (v2)" : engineV === 1 ? "10-phase (v1)" : "—";
      const rb = r.routing_band;
      const sb = sess?.routing_band as number | null | undefined;
      const cd = sess?.current_difficulty as string | null | undefined;
      const email = (prof?.email as string) ?? `${uid.slice(0, 8)}…`;
      const dur = r.duration_seconds;
      const durationLabel =
        dur != null && dur > 0 ? `${Math.round(dur / 60)} min` : "—";

      return {
        id: r.id,
        userId: uid,
        createdAt: r.created_at,
        email,
        fullName: (prof?.full_name as string | null) ?? null,
        memberTier: String(prof?.tier ?? "—"),
        engineLabel,
        poolLabel: poolLabelFromSession(rb, sb, cd),
        overallScore: r.overall_score,
        finalRounded5: r.final_score_rounded_5,
        cefr: r.cefr_level,
        literacy: r.literacy_score,
        comprehension: r.comprehension_score,
        conversation: r.conversation_score,
        production: r.production_score,
        durationLabel,
      };
    });

    setAttempts(built);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredAttempts = useMemo(() => {
    const q = emailFilter.trim().toLowerCase();
    return attempts.filter((row) => {
      if (tierFilter !== "all" && row.memberTier !== tierFilter) return false;
      if (!q) return true;
      return (
        row.email.toLowerCase().includes(q) ||
        (row.fullName?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [attempts, tierFilter, emailFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-[#004AAD]">Test statistics</h1>
        <button
          type="button"
          onClick={() => void load()}
          className={`${mt.border} bg-neutral-100 px-3 py-2 text-xs font-bold shadow-[2px_2px_0_0_#000]`}
        >
          Refresh
        </button>
      </div>
      <div className={`${mt.border} ${mt.shadow} bg-white p-4`}>
        <p className="font-bold">Question bank by phase & DET pool (85 / 125 / 150)</p>
        <p className="mt-1 text-xs text-neutral-600">
          Totals match DB <code className="font-mono">easy | medium | hard</code> columns. Grand total:{" "}
          <span className="font-mono font-bold">{matrix.grandTotal}</span>
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-4 border-black bg-[#FFCC00]/40">
                <th className="p-2 text-xs font-black uppercase">Phase</th>
                <th className="p-2 text-center text-xs font-black">85</th>
                <th className="p-2 text-center text-xs font-black">125</th>
                <th className="p-2 text-center text-xs font-black">150</th>
                <th className="p-2 text-center text-xs font-black">Σ</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: MOCK_TEST_PHASE_COUNT }, (_, i) => i + 1).map((p) => {
                const c = matrix.byPhase[p];
                if (!c) return null;
                return (
                  <tr key={p} className="border-b border-neutral-200">
                    <td className="p-2 font-mono text-xs">
                      {p}. {PHASE_QUESTION_TYPE[p]?.replace(/_/g, " ")}
                    </td>
                    <td className="p-2 text-center font-mono">{c.easy}</td>
                    <td className="p-2 text-center font-mono">{c.medium}</td>
                    <td className="p-2 text-center font-mono">{c.hard}</td>
                    <td className="p-2 text-center font-mono font-bold">{c.total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className={`${mt.border} ${mt.shadow} bg-white p-4`}>
        <p className="font-bold">Average overall score (all students)</p>
        <p className="mt-2 font-mono text-2xl text-[#004AAD]">
          {avgOverall != null ? avgOverall.toFixed(1) : "—"}
        </p>
      </div>

      <div className={`${mt.border} ${mt.shadow} bg-white p-4`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <p className="font-bold">Member mock test attempts</p>
            <p className="mt-1 text-xs text-neutral-600">
              Scored attempts only (latest {ATTEMPT_LIMIT}). Membership tier is the account plan; pool is the
              question band (85 / 125 / 150) when recorded.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex flex-col text-xs font-bold">
              Membership tier
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className={`${mt.border} mt-1 bg-white px-2 py-1.5 text-sm shadow-[2px_2px_0_0_#000]`}
              >
                <option value="all">All</option>
                <option value="free">free</option>
                <option value="basic">basic</option>
                <option value="premium">premium</option>
                <option value="vip">vip</option>
              </select>
            </label>
            <label className="flex min-w-[12rem] flex-col text-xs font-bold">
              Filter name / email
              <input
                type="search"
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
                placeholder="Search…"
                className={`${mt.border} mt-1 bg-white px-2 py-1.5 text-sm shadow-[2px_2px_0_0_#000]`}
              />
            </label>
          </div>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Showing {filteredAttempts.length} of {attempts.length} loaded
        </p>
        <div className="mt-4 max-h-[min(70vh,720px)] overflow-auto rounded-sm border-2 border-neutral-200">
          <table className="w-full min-w-[920px] border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 border-b-4 border-black bg-[#FFCC00]/40">
              <tr>
                <th className="p-2 font-black">When</th>
                <th className="p-2 font-black">Member</th>
                <th className="p-2 font-black">Tier</th>
                <th className="p-2 font-black">Engine</th>
                <th className="p-2 font-black">Pool</th>
                <th className="p-2 text-right font-black">Overall</th>
                <th className="p-2 text-right font-black">÷5</th>
                <th className="p-2 font-black">CEFR</th>
                <th className="p-2 text-right font-black">Lit</th>
                <th className="p-2 text-right font-black">Comp</th>
                <th className="p-2 text-right font-black">Conv</th>
                <th className="p-2 text-right font-black">Prod</th>
                <th className="p-2 font-black">Duration</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttempts.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-4 text-neutral-500">
                    No rows match the filters, or no scored attempts yet.
                  </td>
                </tr>
              ) : (
                filteredAttempts.map((row) => (
                  <tr key={row.id} className="border-b border-neutral-200">
                    <td className="whitespace-nowrap p-2 ep-stat">
                      {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                    </td>
                    <td className="p-2">
                      <Link
                        href={`/admin/subscriptions/${row.userId}`}
                        className="font-semibold text-[#004AAD] underline decoration-2 underline-offset-2 hover:text-[#003580]"
                      >
                        {row.email}
                      </Link>
                      {row.fullName ? (
                        <span className="mt-0.5 block text-[10px] text-neutral-600">{row.fullName}</span>
                      ) : null}
                    </td>
                    <td className="p-2 font-mono">{row.memberTier}</td>
                    <td className="p-2">{row.engineLabel}</td>
                    <td className="p-2 font-mono">{row.poolLabel}</td>
                    <td className="p-2 text-right font-bold">
                      {row.overallScore != null ? row.overallScore : "—"}
                    </td>
                    <td className="p-2 text-right font-mono">
                      {row.finalRounded5 != null ? row.finalRounded5 : "—"}
                    </td>
                    <td className="p-2 font-mono">{row.cefr ?? "—"}</td>
                    <td className="p-2 text-right ep-stat">{row.literacy != null ? row.literacy : "—"}</td>
                    <td className="p-2 text-right ep-stat">
                      {row.comprehension != null ? row.comprehension : "—"}
                    </td>
                    <td className="p-2 text-right ep-stat">
                      {row.conversation != null ? row.conversation : "—"}
                    </td>
                    <td className="p-2 text-right ep-stat">{row.production != null ? row.production : "—"}</td>
                    <td className="p-2 ep-stat">{row.durationLabel}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-neutral-600">
        Deeper analytics (per-question difficulty, miss rate) can be added via SQL views.
      </p>
    </div>
  );
}
