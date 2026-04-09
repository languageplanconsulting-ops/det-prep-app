"use client";

import { useCallback, useEffect, useState } from "react";

import { SimpleLineChart } from "@/components/charts/SimpleLineChart";
import { DashboardPlanCard } from "@/components/dashboard/DashboardPlanCard";
import { DashboardVipAnnouncement } from "@/components/dashboard/DashboardVipAnnouncement";
import { PracticeExamCountdownPanel } from "@/components/practice/PracticeExamCountdownPanel";
import { PracticeTimeBySkillPie } from "@/components/practice/PracticeTimeBySkillPie";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import {
  buildPracticePulseStats,
  lastNLocalDayKeys,
  type PracticePulseChartPoint,
} from "@/lib/practice-stats";

function formatMin(n: number) {
  return `${n}m`;
}

const EMPTY_CHART: PracticePulseChartPoint[] = [];

export function PracticePageOverview() {
  const [today, setToday] = useState(0);
  const [weekly, setWeekly] = useState(0);
  const [total, setTotal] = useState(0);
  const [chartData, setChartData] = useState<PracticePulseChartPoint[]>(EMPTY_CHART);
  const [pulseLoading, setPulseLoading] = useState(true);
  const [pulseGuest, setPulseGuest] = useState(false);
  const [pulseError, setPulseError] = useState<string | null>(null);

  const loadPulse = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setPulseLoading(true);
    setPulseError(null);

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const dayList = lastNLocalDayKeys(7);
    const daysParam = dayList.join(",");

    try {
      const res = await fetch(
        `/api/study/pulse-stats?timeZone=${encodeURIComponent(timeZone)}&days=${encodeURIComponent(daysParam)}`,
        { credentials: "same-origin" },
      );

      if (res.status === 401) {
        setPulseGuest(true);
        const series = dayList.map((date) => ({ date, minutes: 0 }));
        const s = buildPracticePulseStats(series, 0);
        setToday(s.today);
        setWeekly(s.weekly);
        setTotal(s.total);
        setChartData(s.chartData);
        return;
      }

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Could not load pulse (${res.status})`);
      }

      setPulseGuest(false);
      const data = (await res.json()) as {
        minutesPerDay: Record<string, number>;
        totalMinutes: number;
      };

      const series = dayList.map((date) => ({
        date,
        minutes: data.minutesPerDay[date] ?? 0,
      }));
      const s = buildPracticePulseStats(series, data.totalMinutes);
      setToday(s.today);
      setWeekly(s.weekly);
      setTotal(s.total);
      setChartData(s.chartData);
    } catch (e) {
      if (!opts?.silent) {
        setPulseError(e instanceof Error ? e.message : "Could not load study pulse");
        const series = dayList.map((date) => ({ date, minutes: 0 }));
        const s = buildPracticePulseStats(series, 0);
        setToday(s.today);
        setWeekly(s.weekly);
        setTotal(s.total);
        setChartData(s.chartData);
      }
    } finally {
      setPulseLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPulse();
  }, [loadPulse]);

  useEffect(() => {
    const onUpdate = () => void loadPulse({ silent: true });
    window.addEventListener("ep-study-sessions-updated", onUpdate);
    return () => window.removeEventListener("ep-study-sessions-updated", onUpdate);
  }, [loadPulse]);

  return (
    <div className="space-y-4">
      <DashboardVipAnnouncement />

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardPlanCard />

        <BrutalPanel eyebrow="Practice pulse" title="Study time" variant="accent">
          <p className="mb-3 text-sm text-neutral-700">
            {pulseGuest
              ? "Sign in to log minutes from practice and mock tests (tab-visible time only)."
              : "Minutes from recorded test sessions — same data as the pie chart below. Updates when you leave a session."}
          </p>
          {pulseError ? (
            <p className="mb-2 text-xs font-bold text-red-700">{pulseError}</p>
          ) : null}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-sm border-2 border-black bg-white p-2">
              <p
                className={`ep-stat text-2xl font-bold text-ep-blue ${pulseLoading ? "opacity-60" : ""}`}
              >
                {formatMin(today)}
              </p>
              <p className="text-[10px] font-bold uppercase">Daily</p>
            </div>
            <div className="rounded-sm border-2 border-black bg-white p-2">
              <p
                className={`ep-stat text-2xl font-bold text-ep-blue ${pulseLoading ? "opacity-60" : ""}`}
              >
                {formatMin(weekly)}
              </p>
              <p className="text-[10px] font-bold uppercase">Weekly</p>
            </div>
            <div className="rounded-sm border-2 border-black bg-white p-2">
              <p
                className={`ep-stat text-2xl font-bold text-ep-blue ${pulseLoading ? "opacity-60" : ""}`}
              >
                {formatMin(total)}
              </p>
              <p className="text-[10px] font-bold uppercase">Total</p>
            </div>
          </div>
        </BrutalPanel>
      </div>

      <PracticeExamCountdownPanel />

      <PracticeTimeBySkillPie />

      <BrutalPanel eyebrow="Daily practice journey" title="Time in tests (last 7 local days)">
        <SimpleLineChart data={chartData} />
      </BrutalPanel>
    </div>
  );
}
