"use client";

import { useCallback, useEffect, useState } from "react";

import { SimplePieChart, type PieSlice } from "@/components/charts/SimplePieChart";
import { BrutalPanel } from "@/components/ui/BrutalPanel";

const SLICE_COLORS: Record<string, string> = {
  literacy: "#FFCC00",
  comprehension: "#004AAD",
  conversation: "#22c55e",
  production: "#f97316",
  mock_test: "#a855f7",
};

type SkillRow = {
  skill: string;
  label: string;
  minutes: number;
  seconds: number;
};

type ApiOk = {
  skills: SkillRow[];
  totalMinutes: number;
  totalSeconds: number;
};

export function PracticeTimeBySkillPie() {
  const [data, setData] = useState<ApiOk | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    setUnauthorized(false);
    try {
      const res = await fetch("/api/study/time-by-skill", { credentials: "same-origin" });
      if (res.status === 401) {
        if (!opts?.silent) {
          setUnauthorized(true);
          setData(null);
        }
        return;
      }
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Request failed (${res.status})`);
      }
      setUnauthorized(false);
      setData((await res.json()) as ApiOk);
    } catch (e) {
      if (!opts?.silent) {
        setError(e instanceof Error ? e.message : "Could not load study time");
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onUpdate = () => void load({ silent: true });
    window.addEventListener("ep-study-sessions-updated", onUpdate);
    return () => window.removeEventListener("ep-study-sessions-updated", onUpdate);
  }, [load]);

  const slices: PieSlice[] =
    data?.skills.map((s) => ({
      label: s.label,
      value: Math.max(0, s.seconds),
      color: SLICE_COLORS[s.skill] ?? "#737373",
    })) ?? [];

  return (
    <BrutalPanel eyebrow="While in a test" title="Time by skill (minutes)" variant="accent">
      <p className="mb-4 text-sm text-neutral-700">
        Counts tab-visible minutes recorded when you have an exam or mock test open (signed-in
        only). Updates when you leave a session.
      </p>

      {loading && !data && !unauthorized ? (
        <p className="text-sm font-bold text-neutral-500">Loading chart…</p>
      ) : null}

      {unauthorized ? (
        <p className="text-sm font-bold text-neutral-600">
          Sign in to track and view time spent in each practice area.
        </p>
      ) : null}

      {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}

      {!loading && !unauthorized && !error && data && data.totalMinutes <= 0 ? (
        <p className="text-sm font-bold text-neutral-600">
          No recorded sessions yet. Open any practice exam while signed in — time accrues only with
          the tab in view.
        </p>
      ) : null}

      {data && data.totalMinutes > 0 ? (
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <SimplePieChart slices={slices} size={220} />
          <ul className="min-w-0 flex-1 space-y-2 text-sm">
            {data.skills.map((s) => (
              <li
                key={s.skill}
                className="flex items-center justify-between gap-3 border-b border-neutral-200 pb-2"
              >
                <span className="flex items-center gap-2 font-bold">
                  <span
                    className="inline-block size-3 shrink-0 border border-black"
                    style={{ backgroundColor: SLICE_COLORS[s.skill] ?? "#737373" }}
                    aria-hidden
                  />
                  {s.label}
                </span>
                <span className="ep-stat tabular-nums text-neutral-700">
                  {Math.floor(s.seconds / 60)}m
                  {s.seconds % 60 > 0 ? ` ${s.seconds % 60}s` : ""}
                </span>
              </li>
            ))}
            <li className="flex justify-between pt-1 text-xs font-black uppercase tracking-wide text-ep-blue">
              <span>Total</span>
              <span className="ep-stat">{data.totalMinutes} min</span>
            </li>
          </ul>
        </div>
      ) : null}
    </BrutalPanel>
  );
}
