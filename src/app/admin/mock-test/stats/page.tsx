"use client";

import { useEffect, useState } from "react";

import { mt } from "@/lib/mock-test/mock-test-styles";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export default function AdminMockTestStatsPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [avgOverall, setAvgOverall] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      const supabase = getBrowserSupabase();
      if (!supabase) return;
      const { data: qs } = await supabase.from("mock_questions").select("phase");
      const c: Record<string, number> = {};
      for (const q of qs ?? []) {
        const k = String((q as { phase: number }).phase);
        c[k] = (c[k] ?? 0) + 1;
      }
      setCounts(c);

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
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-[#004AAD]">Test statistics</h1>
      <div className={`${mt.border} ${mt.shadow} bg-white p-4`}>
        <p className="font-bold">Questions per phase</p>
        <ul className="mt-2 font-mono text-sm">
          {Object.entries(counts).map(([k, v]) => (
            <li key={k}>
              Phase {k}: {v}
            </li>
          ))}
        </ul>
      </div>
      <div className={`${mt.border} ${mt.shadow} bg-white p-4`}>
        <p className="font-bold">Average overall score (all students)</p>
        <p className="mt-2 font-mono text-2xl text-[#004AAD]">
          {avgOverall != null ? avgOverall.toFixed(1) : "—"}
        </p>
      </div>
      <p className="text-xs text-neutral-600">
        Deeper analytics (per-question difficulty, miss rate) can be added via SQL
        views.
      </p>
    </div>
  );
}
