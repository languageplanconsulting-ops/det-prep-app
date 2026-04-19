"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getBrowserSupabase } from "@/lib/supabase-browser";
import type { FixedMockScoredRow } from "@/lib/mock-test/fixed-mock-score-buckets";

import { MockFixedReportBrandedView } from "./MockFixedReportBrandedView";

type FixedResult = {
  target_total: number;
  target_listening: number;
  target_speaking: number;
  target_reading: number;
  target_writing: number;
  actual_total: number;
  actual_listening: number;
  actual_speaking: number;
  actual_reading: number;
  actual_writing: number;
  deltas: Record<string, number>;
  created_at?: string;
  /** When set, this report is pinned on `/mock-test/start`. */
  dashboard_saved_at?: string | null;
  report_payload?: {
    responses?: FixedMockScoredRow[];
  };
};

function avg(list: number[]): number {
  if (!list.length) return 0;
  return list.reduce((a, b) => a + b, 0) / list.length;
}

export function MockFixedResultsClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [row, setRow] = useState<FixedResult | null>(null);
  const [dashboardSavedAt, setDashboardSavedAt] = useState<string | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/mock-test/fixed/results/${sessionId}/report`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as { result?: FixedResult };
      const next = (json.result ?? null) as FixedResult | null;
      setRow(next);
      setDashboardSavedAt(next?.dashboard_saved_at ?? null);
    })();
  }, [sessionId]);

  if (!row) return <div className="p-8 text-center font-bold">Loading result...</div>;

  const desiredScore = Math.round(Number(row.target_total ?? 0));
  const totalScore = Math.round(Number(row.actual_total ?? 0));

  const responses = (row.report_payload?.responses ?? []) as FixedMockScoredRow[];
  const byTask = new Map<string, number[]>();
  for (const r of responses) {
    const prev = byTask.get(r.task_type) ?? [];
    prev.push(Number(r.score ?? 0));
    byTask.set(r.task_type, prev);
  }
  const taskAverages = [...byTask.entries()].map(([task, scores]) => ({
    task,
    average: Math.round(avg(scores)),
  }));
  const sortedHigh = [...taskAverages].sort((a, b) => b.average - a.average).slice(0, 3);
  const sortedLow = [...taskAverages].sort((a, b) => a.average - b.average).slice(0, 3);
  const lowTasks = new Set(sortedLow.map((x) => x.task));

  const recommendations: string[] = [];
  if (lowTasks.has("vocabulary_reading") || lowTasks.has("conversation_summary") || lowTasks.has("fill_in_blanks")) {
    recommendations.push("Focus on vocabulary.");
  }
  if (lowTasks.has("dictation") && lowTasks.has("fill_in_blanks")) {
    recommendations.push(
      "Revise grammar. Many people think this is vocabulary, but these tasks are strongly grammar-focused.",
    );
  }
  if (
    sortedLow.some((x) =>
      [
        "write_about_photo",
        "speak_about_photo",
        "read_and_write",
        "read_then_speak",
        "interactive_speaking",
        "conversation_summary",
      ].includes(x.task),
    )
  ) {
    recommendations.push("Focus on overall production score (speaking + writing).");
  }
  if (!recommendations.length) {
    recommendations.push("Keep balancing all skills and review your lowest two task types first.");
  }

  const listening = Math.round(Number(row.actual_listening ?? 0));
  const speaking = Math.round(Number(row.actual_speaking ?? 0));
  const reading = Math.round(Number(row.actual_reading ?? 0));
  const writing = Math.round(Number(row.actual_writing ?? 0));

  return (
    <>
      <MockFixedReportBrandedView
        sessionId={sessionId}
        total={totalScore}
        listening={listening}
        speaking={speaking}
        reading={reading}
        writing={writing}
        targets={{
          total: Math.round(Number(row.target_total ?? 0)),
          listening: Math.round(Number(row.target_listening ?? 0)),
          speaking: Math.round(Number(row.target_speaking ?? 0)),
          reading: Math.round(Number(row.target_reading ?? 0)),
          writing: Math.round(Number(row.target_writing ?? 0)),
        }}
        responses={responses}
        completedAt={row.created_at ?? null}
        recommendations={recommendations}
      />
      <div className="mx-auto max-w-[720px] space-y-2 px-4 pb-12">
        <button
          type="button"
          disabled={dashboardLoading}
          onClick={() => {
            void (async () => {
              setDashboardError(null);
              setDashboardLoading(true);
              const wantSave = !dashboardSavedAt;
              try {
                const res = await fetch(`/api/mock-test/fixed/results/${sessionId}/dashboard`, {
                  method: "PATCH",
                  credentials: "same-origin",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ saved: wantSave }),
                });
                const json = (await res.json().catch(() => ({}))) as {
                  error?: string;
                  dashboard_saved_at?: string | null;
                };
                if (!res.ok) {
                  setDashboardError(json.error ?? "Could not update dashboard.");
                  return;
                }
                setDashboardSavedAt(json.dashboard_saved_at ?? null);
              } finally {
                setDashboardLoading(false);
              }
            })();
          }}
          className="w-full border-[3px] border-black bg-white px-4 py-3 text-center text-[0.7rem] font-extrabold uppercase tracking-wide text-neutral-900 shadow-[2px_2px_0_0_#111827] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#111827] disabled:opacity-50"
        >
          {dashboardLoading
            ? "Updating…"
            : dashboardSavedAt
              ? "Saved on mock test dashboard — tap to remove"
              : "Save report to mock test dashboard"}
        </button>
        {dashboardError ? (
          <p className="text-center text-xs font-bold text-red-700">{dashboardError}</p>
        ) : null}
        <p className="text-center text-[11px] font-semibold text-neutral-600">
          Pinned reports appear at the top of your list on{" "}
          <Link href="/mock-test/start" className="font-bold text-[#004aad] underline underline-offset-2">
            Mock test
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={() => {
            void (async () => {
              const supabase = getBrowserSupabase();
              if (!supabase) return;
              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (!user) return;
              await supabase.from("notebook_entries").insert({
                user_id: user.id,
                type: "production",
                content: [
                  "DET fixed mock (20 steps) — full report snapshot",
                  `Total: ${totalScore}/160 (target ${desiredScore}/160)`,
                  `Listening ${listening}/160 · Speaking ${speaking}/160 · Reading ${reading}/160 · Writing ${writing}/160`,
                  "",
                  "Strength (top 3 task averages):",
                  ...sortedHigh.map((x) => `- ${x.task.replaceAll("_", " ")}: ${x.average}`),
                  "",
                  "Weakest (lowest 3):",
                  ...sortedLow.map((x) => `- ${x.task.replaceAll("_", " ")}: ${x.average}`),
                  "",
                  "Coach tips:",
                  ...recommendations.map((x) => `- ${x}`),
                ].join("\n"),
                source_exercise_type: "mock_test",
                source_skill: "production",
                score_at_save: totalScore,
              });
              router.push("/notebook");
            })();
          }}
          className="w-full border-[3px] border-black bg-[#ffcc00] px-4 py-3 text-center text-[0.7rem] font-extrabold uppercase tracking-wide text-black shadow-[2px_2px_0_0_#111827] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#111827]"
        >
          Save report to notebook
        </button>
      </div>
    </>
  );
}
