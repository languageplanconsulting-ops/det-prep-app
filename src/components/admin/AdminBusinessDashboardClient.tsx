"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type BusinessSummaryResponse = {
  snapshot: {
    totalAccounts: number;
    newAccounts7d: number;
    newAccounts30d: number;
    activePaidUsers: number;
    overallConversionPct: number;
    paidCustomers30d: number;
    signupToPaid30dPct: number;
    revenue30dThb: number;
    planPurchases30d: number;
    addonPurchases30d: number;
    freeMiniDiagnosis30d: number;
    mockStarts30d: number;
  };
  charts: {
    activity30d: Array<{
      date: string;
      signups: number;
      paidCustomers: number;
      revenueThb: number;
      freeMiniDiagnosis: number;
      mockStarts: number;
    }>;
    planMix: Array<{ label: string; value: number }>;
  };
  funnel: Array<{ label: string; value: number; note: string }>;
  recentEvents: Array<{
    id: string;
    type: string;
    label: string;
    email: string;
    createdAt: string;
    value: number | null;
    currency: string;
    source: string;
    emailNotifiedAt: string | null;
    emailNotificationError: string | null;
  }>;
  emailConfig: {
    resendConfigured: boolean;
    businessNotifyConfigured: boolean;
  };
};

const PIE_COLORS = ["#004AAD", "#FFCC00", "#93c5fd", "#fb7185", "#34d399"];

function formatMoney(value: number) {
  return `฿${value.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatEventTime(value: string) {
  return new Date(value).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  });
}

function MetricCard(props: { label: string; value: string; note: string; tone?: string }) {
  const toneClass =
    props.tone === "green"
      ? "bg-[#dcfce7]"
      : props.tone === "amber"
        ? "bg-[#fef3c7]"
        : props.tone === "rose"
          ? "bg-[#ffe4e6]"
          : "bg-white";

  return (
    <div className={`rounded-[4px] border-4 border-black p-4 shadow-[4px_4px_0_0_#000] ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-600">
        {props.label}
      </p>
      <p className="mt-2 text-2xl font-black text-neutral-900">{props.value}</p>
      <p className="mt-1 text-xs text-neutral-600">{props.note}</p>
    </div>
  );
}

export function AdminBusinessDashboardClient() {
  const [data, setData] = useState<BusinessSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/business-summary", { credentials: "include" });
      const json = (await res.json()) as BusinessSummaryResponse & { error?: string };
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load business dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-neutral-600">Loading business dashboard…</p>;
  }

  if (!data || error) {
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

  const { snapshot, charts, funnel, recentEvents, emailConfig } = data;

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <header className="rounded-[4px] border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#004AAD]">
          Live business ops
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
          Alerts, conversion, and learner activity
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-600">
          ดูยอดสมัครใหม่ การซื้อแพ็กเกจ การเริ่มใช้ฟรี และ event ล่าสุดในที่เดียว พร้อมเช็กว่า
          email alert ทำงานอยู่หรือไม่
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/admin/executive"
            className="rounded-[4px] border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase shadow-[3px_3px_0_0_#000]"
          >
            Executive dashboard →
          </Link>
          <Link
            href="/admin/subscriptions/revenue"
            className="rounded-[4px] border-2 border-black bg-[#FFCC00] px-3 py-2 text-xs font-black uppercase shadow-[3px_3px_0_0_#000]"
          >
            Revenue detail →
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Accounts"
          value={String(snapshot.totalAccounts)}
          note={`+${snapshot.newAccounts7d} in 7d / +${snapshot.newAccounts30d} in 30d`}
          tone="green"
        />
        <MetricCard
          label="Active paid"
          value={String(snapshot.activePaidUsers)}
          note={`Overall conversion ${snapshot.overallConversionPct}%`}
        />
        <MetricCard
          label="Paid customers (30d)"
          value={String(snapshot.paidCustomers30d)}
          note={`Signup→paid ${snapshot.signupToPaid30dPct}%`}
          tone="amber"
        />
        <MetricCard
          label="Revenue (30d)"
          value={formatMoney(snapshot.revenue30dThb)}
          note={`${snapshot.planPurchases30d} plan purchases + ${snapshot.addonPurchases30d} add-ons`}
          tone="rose"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Free mini diagnosis"
          value={String(snapshot.freeMiniDiagnosis30d)}
          note="Started in last 30 days"
        />
        <MetricCard
          label="Mock starts"
          value={String(snapshot.mockStarts30d)}
          note="Full mock starts in last 30 days"
        />
        <MetricCard
          label="Email alerts"
          value={
            emailConfig.resendConfigured && emailConfig.businessNotifyConfigured ? "Ready" : "Setup needed"
          }
          note={
            emailConfig.resendConfigured && emailConfig.businessNotifyConfigured
              ? "Resend + business recipient configured"
              : "Set RESEND_API_KEY and BUSINESS_NOTIFY_EMAIL"
          }
          tone={emailConfig.resendConfigured && emailConfig.businessNotifyConfigured ? "green" : "amber"}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="h-80 rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
          <h2 className="text-sm font-black">Daily growth & conversion (30d)</h2>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={charts.activity30d}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="signups" fill="#004AAD" name="Signups" />
              <Bar dataKey="paidCustomers" fill="#FFCC00" name="Paid" />
              <Bar dataKey="freeMiniDiagnosis" fill="#34d399" name="Free mini diagnosis" />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="h-80 rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
          <h2 className="text-sm font-black">Plan mix from purchases (30d)</h2>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie data={charts.planMix} dataKey="value" nameKey="label" outerRadius={88} label>
                {charts.planMix.map((entry, index) => (
                  <Cell key={entry.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </section>

        <section className="h-80 rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
          <h2 className="text-sm font-black">Revenue & mock activity (30d)</h2>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={charts.activity30d}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenueThb" fill="#fb7185" name="Revenue (THB)" />
              <Bar dataKey="mockStarts" fill="#93c5fd" name="Mock starts" />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="h-80 rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
          <h2 className="text-sm font-black">Simple funnel</h2>
          <ResponsiveContainer width="100%" height="90%">
            <FunnelChart>
              <Tooltip />
              <Funnel dataKey="value" data={funnel} isAnimationActive>
                <LabelList position="right" fill="#111827" stroke="none" dataKey="label" />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </section>
      </div>

      <section className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
        <h2 className="text-lg font-black">Recent business events</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Signup, purchases, and learner activity from the new event stream
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-xs">
            <thead className="bg-neutral-100">
              <tr>
                <th className="border p-2">Time</th>
                <th className="border p-2">Type</th>
                <th className="border p-2">Email</th>
                <th className="border p-2">Label</th>
                <th className="border p-2">Source</th>
                <th className="border p-2">Value</th>
                <th className="border p-2">Email sent</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((event) => (
                <tr key={event.id}>
                  <td className="border p-2">{formatEventTime(event.createdAt)}</td>
                  <td className="border p-2 font-bold">{event.type}</td>
                  <td className="border p-2">{event.email}</td>
                  <td className="border p-2">{event.label}</td>
                  <td className="border p-2">{event.source}</td>
                  <td className="border p-2">
                    {event.value == null
                      ? "—"
                      : event.currency === "thb"
                        ? formatMoney(event.value / 100)
                        : String(event.value)}
                  </td>
                  <td className="border p-2">
                    {event.emailNotifiedAt
                      ? `OK · ${formatEventTime(event.emailNotifiedAt)}`
                      : event.emailNotificationError
                        ? `Error · ${event.emailNotificationError}`
                        : "Skipped / pending"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
