"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatBahtFromSatang } from "@/lib/money-format";

type Snapshot = {
  totalUsers: number;
  freeUsers: number;
  activePaid: number;
  paidConversionPct: number;
  mrrSatang: number;
  arrSatang: number;
  mrrDeltaSatang: number;
  mrrDeltaPct: number;
  churnThisMonth: number;
  churnRatePct: number;
  aiCostThb30d: number;
  aiCostPerActiveLearnerThb: number;
  aiCostPerPaidUserThb: number;
  activeLearners30d: number;
  completedAttempts30d: number;
  estimatedNetThb30d: number;
  arpuSatang: number;
  newSubscribersThisMonth: number;
};

type TopCostUser = {
  userId: string;
  email: string;
  fullName: string | null;
  totalThb: number;
  events: number;
};

type CohortRetentionPoint = {
  cohort: string;
  signups: number;
  retained7d: number;
  retained7dPct: number;
  retained30d: number;
  retained30dPct: number;
};

type FunnelStep = {
  label: string;
  value: number;
  note: string;
};

type RiskUser = {
  userId: string;
  email: string;
  fullName: string | null;
  tier: string;
  expiryAt: string | null;
  lastActiveAt: string | null;
  studySessions30d: number;
  aiCostThb30d: number;
};

type ExecResponse = {
  snapshot: Snapshot;
  tierCounts: Record<string, number>;
  charts: {
    monthlyRevenue: Record<string, unknown>[];
    subscriberGrowth: Record<string, unknown>[];
    churnVsNew: Record<string, unknown>[];
    conversionsByMonth: Record<string, unknown>[];
    cohortRetention: CohortRetentionPoint[];
  };
  funnel: FunnelStep[];
  atRisk: {
    nearExpiry: RiskUser[];
    heavyFree: RiskUser[];
    inactivePaid: RiskUser[];
  };
  topCostUsers: TopCostUser[];
};

const TIER_COLORS = {
  free: "#d4d4d8",
  basic: "#93c5fd",
  premium: "#004AAD",
  vip: "#FFCC00",
};

export function AdminExecutiveDashboardClient() {
  const [data, setData] = useState<ExecResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/executive-summary", {
        credentials: "include",
      });
      const json = (await res.json()) as ExecResponse & { error?: string };
      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load executive dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-neutral-600">Loading executive dashboard…</p>;
  }

  if (error || !data) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-bold text-red-700">{error ?? "Failed to load dashboard."}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-[4px] border-2 border-black bg-[#FFCC00] px-3 py-2 text-xs font-black uppercase shadow-[3px_3px_0_0_#000]"
        >
          Retry
        </button>
      </div>
    );
  }

  const { snapshot, tierCounts, charts, topCostUsers, funnel, atRisk } = data;
  const tierDistribution = [
    { name: "Free", value: tierCounts.free ?? 0, fill: TIER_COLORS.free },
    { name: "Basic", value: tierCounts.basic ?? 0, fill: TIER_COLORS.basic },
    { name: "Premium", value: tierCounts.premium ?? 0, fill: TIER_COLORS.premium },
    { name: "VIP", value: tierCounts.vip ?? 0, fill: TIER_COLORS.vip },
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <header className="rounded-[4px] border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#004AAD]">
          Executive view
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
          Business dashboard
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-600">
          Revenue, conversion, churn, and AI cost in one place so you can quickly see
          growth, margin pressure, and which users are most expensive to support.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/admin/study-activity"
            className="rounded-[4px] border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase shadow-[3px_3px_0_0_#000]"
          >
            Study activity →
          </Link>
          <Link
            href="/admin/api-usage"
            className="rounded-[4px] border-2 border-black bg-cyan-100 px-3 py-2 text-xs font-black uppercase shadow-[3px_3px_0_0_#000]"
          >
            API cost drilldown →
          </Link>
          <Link
            href="/admin/subscriptions/revenue"
            className="rounded-[4px] border-2 border-black bg-[#FFCC00] px-3 py-2 text-xs font-black uppercase shadow-[3px_3px_0_0_#000]"
          >
            Revenue detail →
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="MRR"
          value={formatBahtFromSatang(snapshot.mrrSatang)}
          note={`Δ ${formatBahtFromSatang(snapshot.mrrDeltaSatang)} (${snapshot.mrrDeltaPct}%) vs last month`}
          tone="blue"
        />
        <MetricCard
          label="ARR run rate"
          value={formatBahtFromSatang(snapshot.arrSatang)}
          note="Annualized from current month"
          tone="neutral"
        />
        <MetricCard
          label="Paid conversion"
          value={`${snapshot.paidConversionPct}%`}
          note={`${snapshot.activePaid} paid / ${snapshot.totalUsers} total users`}
          tone="green"
        />
        <MetricCard
          label="Churn this month"
          value={String(snapshot.churnThisMonth)}
          note={`${snapshot.churnRatePct}% of active paid base`}
          tone="red"
        />
        <MetricCard
          label="AI cost (30d)"
          value={`฿${snapshot.aiCostThb30d.toFixed(2)}`}
          note={`≈ ฿${snapshot.aiCostPerPaidUserThb.toFixed(2)} per paid user`}
          tone="amber"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MiniCard
          label="Free users"
          value={String(snapshot.freeUsers)}
          note="Current free base"
        />
        <MiniCard
          label="New paid this month"
          value={String(snapshot.newSubscribersThisMonth)}
          note="Based on profile tier at signup"
        />
        <MiniCard
          label="ARPU"
          value={formatBahtFromSatang(snapshot.arpuSatang)}
          note="All-time paid revenue / current paid users"
        />
        <MiniCard
          label="Est. net after AI"
          value={`฿${snapshot.estimatedNetThb30d.toFixed(2)}`}
          note="MRR month less AI cost over last 30d"
        />
        <MiniCard
          label="Active learners (30d)"
          value={String(snapshot.activeLearners30d)}
          note="Unique users with study activity"
        />
        <MiniCard
          label="Completed attempts (30d)"
          value={String(snapshot.completedAttempts30d)}
          note="Across tracked study sessions"
        />
        <MiniCard
          label="AI cost / active learner"
          value={`฿${snapshot.aiCostPerActiveLearnerThb.toFixed(2)}`}
          note="30-day average"
        />
        <MiniCard
          label="AI cost / paid user"
          value={`฿${snapshot.aiCostPerPaidUserThb.toFixed(2)}`}
          note="30-day average"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ChartPanel title="Monthly revenue mix">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="basic" stackId="a" fill={TIER_COLORS.basic} />
              <Bar dataKey="premium" stackId="a" fill={TIER_COLORS.premium} />
              <Bar dataKey="vip" stackId="a" fill={TIER_COLORS.vip} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Tier distribution">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={tierDistribution}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                cx="50%"
                cy="50%"
                label
              >
                {tierDistribution.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Signups vs churn">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={charts.churnVsNew}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="newAccounts" stroke="#16a34a" strokeWidth={2} />
              <Line type="monotone" dataKey="churned" stroke="#dc2626" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Paid conversion by signup month">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={charts.conversionsByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="paid" fill="#004AAD" name="Paid signups" />
              <Bar yAxisId="left" dataKey="free" fill="#d4d4d8" name="Free signups" />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="conversionPct"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Paid conversion %"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Cohort retention (7d / 30d)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={charts.cohortRetention}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="cohort" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="retained7dPct"
                stroke="#004AAD"
                strokeWidth={2}
                name="7d retention %"
              />
              <Line
                type="monotone"
                dataKey="retained30dPct"
                stroke="#f59e0b"
                strokeWidth={2}
                name="30d retention %"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>

        <div className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
          <h2 className="text-sm font-black text-neutral-900">Free → paid upgrade funnel</h2>
          <div className="mt-4 space-y-3">
            {funnel.map((step, index) => {
              const prev = index > 0 ? funnel[index - 1]?.value ?? 0 : 0;
              const ratio = index === 0 || prev <= 0 ? 100 : Math.max(8, Math.round((step.value / prev) * 100));
              return (
                <div key={step.label}>
                  <div className="flex items-center justify-between gap-4 text-xs font-bold uppercase">
                    <span>{step.label}</span>
                    <span>{step.value}</span>
                  </div>
                  <div className="mt-1 h-4 border-2 border-black bg-neutral-100">
                    <div
                      className="h-full bg-[#004AAD]"
                      style={{ width: `${Math.min(100, ratio)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-neutral-500">{step.note}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-neutral-900">Highest AI cost users</h2>
            <p className="text-xs text-neutral-500">
              Useful for margin checks, abuse detection, and deciding where to tighten quotas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-[4px] border-2 border-black bg-[#FFCC00] px-3 py-2 text-xs font-black uppercase shadow-[3px_3px_0_0_#000]"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-neutral-100">
              <tr>
                <th className="border-b-2 border-black p-2">User</th>
                <th className="border-b-2 border-black p-2">Email</th>
                <th className="border-b-2 border-black p-2 text-right">AI cost (30d)</th>
                <th className="border-b-2 border-black p-2 text-right">Events</th>
                <th className="border-b-2 border-black p-2">Open</th>
              </tr>
            </thead>
            <tbody>
              {topCostUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-neutral-500">
                    No recent AI usage rows were found for the selected window.
                  </td>
                </tr>
              ) : (
                topCostUsers.map((user) => (
                  <tr key={user.userId}>
                    <td className="border-b border-neutral-200 p-2 font-semibold">
                      {user.fullName || "—"}
                    </td>
                    <td className="border-b border-neutral-200 p-2">{user.email}</td>
                    <td className="border-b border-neutral-200 p-2 text-right font-black text-[#004AAD]">
                      ฿{user.totalThb.toFixed(2)}
                    </td>
                    <td className="border-b border-neutral-200 p-2 text-right">{user.events}</td>
                    <td className="border-b border-neutral-200 p-2">
                      <Link
                        href={`/admin/subscriptions/${user.userId}`}
                        className="font-bold text-[#004AAD] underline underline-offset-2"
                      >
                        Open member
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <RiskPanel
          title="Near expiry"
          subtitle="Active paid users expiring within 7 days"
          rows={atRisk.nearExpiry}
          accent="amber"
          mode="expiry"
        />
        <RiskPanel
          title="Heavy free users"
          subtitle="Strong upgrade candidates using a lot without paying"
          rows={atRisk.heavyFree}
          accent="blue"
          mode="usage"
        />
        <RiskPanel
          title="Inactive paid users"
          subtitle="Paying users with no study activity for more than 7 days"
          rows={atRisk.inactivePaid}
          accent="red"
          mode="inactive"
        />
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone: "blue" | "neutral" | "red" | "green" | "amber";
}) {
  const toneClass =
    tone === "blue"
      ? "text-[#004AAD]"
      : tone === "red"
        ? "text-red-600"
        : tone === "green"
          ? "text-green-700"
          : tone === "amber"
            ? "text-amber-700"
            : "text-neutral-900";
  return (
    <div className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
      <p className="text-[10px] font-black uppercase tracking-wide text-neutral-500">{label}</p>
      <p className={`mt-2 text-3xl font-black ${toneClass}`}>{value}</p>
      <p className="mt-2 text-xs text-neutral-500">{note}</p>
    </div>
  );
}

function MiniCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
      <p className="text-[10px] font-black uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-neutral-900">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{note}</p>
    </div>
  );
}

function ChartPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="h-80 rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
      <h2 className="text-sm font-black text-neutral-900">{title}</h2>
      <div className="mt-3 h-[calc(100%-2rem)]">{children}</div>
    </div>
  );
}

function RiskPanel({
  title,
  subtitle,
  rows,
  accent,
  mode,
}: {
  title: string;
  subtitle: string;
  rows: RiskUser[];
  accent: "amber" | "blue" | "red";
  mode: "expiry" | "usage" | "inactive";
}) {
  const accentClass =
    accent === "amber"
      ? "text-amber-700"
      : accent === "red"
        ? "text-red-600"
        : "text-[#004AAD]";

  return (
    <div className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
      <h2 className={`text-lg font-black ${accentClass}`}>{title}</h2>
      <p className="mt-1 text-xs text-neutral-500">{subtitle}</p>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-neutral-500">No users in this bucket right now.</p>
        ) : (
          rows.map((user) => (
            <div key={user.userId} className="rounded-[4px] border-2 border-black bg-neutral-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-neutral-900">{user.fullName || "—"}</p>
                  <p className="text-xs text-neutral-500">{user.email}</p>
                </div>
                <Link
                  href={`/admin/subscriptions/${user.userId}`}
                  className="text-xs font-black uppercase text-[#004AAD] underline underline-offset-2"
                >
                  Open
                </Link>
              </div>
              <div className="mt-2 grid gap-2 text-[11px] text-neutral-700">
                <p>
                  <span className="font-black">Tier:</span> {user.tier}
                </p>
                {mode === "expiry" ? (
                  <p>
                    <span className="font-black">Expiry:</span>{" "}
                    {user.expiryAt ? new Date(user.expiryAt).toLocaleDateString() : "—"}
                  </p>
                ) : null}
                {mode === "inactive" ? (
                  <p>
                    <span className="font-black">Last active:</span>{" "}
                    {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString() : "Never"}
                  </p>
                ) : null}
                {mode === "usage" ? (
                  <>
                    <p>
                      <span className="font-black">Sessions (30d):</span> {user.studySessions30d}
                    </p>
                    <p>
                      <span className="font-black">AI cost (30d):</span> ฿{user.aiCostThb30d.toFixed(2)}
                    </p>
                  </>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
