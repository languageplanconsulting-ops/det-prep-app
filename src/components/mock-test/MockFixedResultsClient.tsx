"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { mt } from "@/lib/mock-test/mock-test-styles";
import { getBrowserSupabase } from "@/lib/supabase-browser";

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
  report_payload?: {
    responses?: Array<{ step_index: number; task_type: string; score: number }>;
  };
};

function avg(list: number[]): number {
  if (!list.length) return 0;
  return list.reduce((a, b) => a + b, 0) / list.length;
}

function fmtDelta(value: number): string {
  const rounded = Math.round(value);
  return `${rounded >= 0 ? "+" : ""}${rounded}`;
}

export function MockFixedResultsClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [row, setRow] = useState<FixedResult | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/mock-test/fixed/results/${sessionId}/report`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as { result?: FixedResult };
      setRow((json.result ?? null) as FixedResult | null);
    })();
  }, [sessionId]);

  if (!row) return <div className="p-8 text-center font-bold">Loading result...</div>;

  const desiredScore = Math.round(Number(row.target_total ?? 0));
  const scoreFromSkills = Math.round(
    (Number(row.actual_listening ?? 0) +
      Number(row.actual_writing ?? 0) +
      Number(row.actual_speaking ?? 0) +
      Number(row.actual_reading ?? 0)) /
      4,
  );

  const responses = row.report_payload?.responses ?? [];
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
      ["write_about_photo", "speak_about_photo", "read_and_write", "read_then_speak", "interactive_speaking", "conversation_summary"].includes(x.task),
    )
  ) {
    recommendations.push("Focus on overall production score (speaking + writing).");
  }
  if (!recommendations.length) {
    recommendations.push("Keep balancing all skills and review your lowest two task types first.");
  }

  const items = [
    { key: "total", label: "Total", actual: row.actual_total, target: row.target_total },
    { key: "listening", label: "Listening", actual: row.actual_listening, target: row.target_listening },
    { key: "speaking", label: "Speaking", actual: row.actual_speaking, target: row.target_speaking },
    { key: "reading", label: "Reading", actual: row.actual_reading, target: row.target_reading },
    { key: "writing", label: "Writing", actual: row.actual_writing, target: row.target_writing },
  ];
  const metTargetCount = items.filter((x) => Number(x.actual ?? 0) >= Number(x.target ?? 0)).length;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <section className={`${mt.border} ${mt.shadow} ${mt.gridBg} rounded-[4px] bg-[#004AAD] p-6 text-[#FFCC00] sm:p-8`}>
        <p className="text-sm font-bold uppercase tracking-[0.2em]">Fixed 20-step mock report</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-lg font-bold">Your desired score = {desiredScore}/160</p>
            <p className="mt-1 text-4xl font-black sm:text-5xl">
              Your score = {scoreFromSkills}/160
            </p>
            <p className="mt-2 max-w-xl text-sm font-bold text-[#FFCC00]/90">
              Computed as round((Listening + Writing + Speaking + Reading) / 4)
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[4px] border-2 border-black bg-white px-3 py-3 text-black">
              <div className="text-[11px] font-black uppercase tracking-wide text-neutral-500">Target met</div>
              <div className="text-2xl font-black">{desiredScore > 0 && scoreFromSkills >= desiredScore ? "Yes" : "Not yet"}</div>
            </div>
            <div className="rounded-[4px] border-2 border-black bg-white px-3 py-3 text-black">
              <div className="text-[11px] font-black uppercase tracking-wide text-neutral-500">Skills on target</div>
              <div className="text-2xl font-black">{metTargetCount}/5</div>
            </div>
            <div className="rounded-[4px] border-2 border-black bg-white px-3 py-3 text-black">
              <div className="text-[11px] font-black uppercase tracking-wide text-neutral-500">Best area</div>
              <div className="text-sm font-black">{sortedHigh[0]?.task.replaceAll("_", " ") ?? "N/A"}</div>
            </div>
            <div className="rounded-[4px] border-2 border-black bg-white px-3 py-3 text-black">
              <div className="text-[11px] font-black uppercase tracking-wide text-neutral-500">Main focus</div>
              <div className="text-sm font-black">{sortedLow[0]?.task.replaceAll("_", " ") ?? "N/A"}</div>
            </div>
          </div>
        </div>
      </section>
      <section className={`${mt.border} ${mt.shadow} bg-white p-6`}>
        <h2 className="text-lg font-black text-[#004AAD]">Target vs Actual</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {items.map((x) => {
            const delta = (x.actual ?? 0) - (x.target ?? 0);
            return (
              <div key={x.key} className="rounded-[4px] border-2 border-black px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-bold">{x.label}</span>
                  <span
                    className={`rounded-full border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                      delta >= 0 ? "bg-emerald-200" : "bg-red-100"
                    }`}
                  >
                    {fmtDelta(delta)}
                  </span>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <span className="font-mono text-2xl font-black">{Math.round(x.actual)}</span>
                  <span className="text-xs font-bold text-neutral-500">
                    Target {Math.round(Number(x.target ?? 0))} /160
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className={`${mt.border} ${mt.shadow} bg-white p-6`}>
        <h2 className="text-lg font-black text-[#004AAD]">Score breakdown</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[4px] border-2 border-black bg-emerald-50 p-3">
            <p className="text-sm font-black text-emerald-800">Strength (Top 3)</p>
            <ul className="mt-2 space-y-1 text-sm">
              {sortedHigh.map((x) => (
                <li key={x.task} className="flex items-center justify-between">
                  <span>{x.task.replaceAll("_", " ")}</span>
                  <span className="font-mono font-bold">{x.average}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[4px] border-2 border-black bg-red-50 p-3">
            <p className="text-sm font-black text-red-800">Weakness (Lowest 3)</p>
            <ul className="mt-2 space-y-1 text-sm">
              {sortedLow.map((x) => (
                <li key={x.task} className="flex items-center justify-between">
                  <span>{x.task.replaceAll("_", " ")}</span>
                  <span className="font-mono font-bold">{x.average}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <section className={`${mt.border} ${mt.shadow} bg-white p-6`}>
        <h2 className="text-lg font-black text-[#004AAD]">Recommendation</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-800">
          {recommendations.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </section>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/mock-test/start" className={`${mt.border} bg-white px-4 py-3 text-center text-sm font-bold shadow-[4px_4px_0_0_#000]`}>
          Start another fixed mock
        </Link>
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
                  `Desired score: ${desiredScore}/160`,
                  `Your score: ${scoreFromSkills}/160`,
                  "",
                  "Strength (Top 3):",
                  ...sortedHigh.map((x) => `- ${x.task}: ${x.average}`),
                  "",
                  "Weakness (Lowest 3):",
                  ...sortedLow.map((x) => `- ${x.task}: ${x.average}`),
                  "",
                  "Recommendations:",
                  ...recommendations.map((x) => `- ${x}`),
                ].join("\n"),
                source_exercise_type: "mock_test",
                source_skill: "production",
                score_at_save: scoreFromSkills,
              });
              router.push("/notebook");
            })();
          }}
          className={`${mt.border} bg-[#FFCC00] px-4 py-3 text-sm font-black text-black shadow-[4px_4px_0_0_#000]`}
        >
          Save report to notebook
        </button>
      </div>
    </main>
  );
}
