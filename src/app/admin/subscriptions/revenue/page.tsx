"use client";

import { useEffect, useState } from "react";
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

const COLORS = {
  basic: "#93c5fd",
  premium: "#004AAD",
  vip: "#FFCC00",
};

export default function AdminRevenuePage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/revenue?period=monthly", {
        credentials: "include",
      });
      if (res.ok) setData((await res.json()) as Record<string, unknown>);
    })();
  }, []);

  if (!data) {
    return (
      <p className="ep-stat text-neutral-600">
        Loading revenue… / กำลังโหลด
      </p>
    );
  }

  const analytics = data.analytics as Record<string, unknown>;
  const monthlyBars = (analytics.monthlyBars ?? []) as Record<
    string,
    unknown
  >[];
  const subscriberGrowth = (analytics.subscriberGrowth ?? []) as Record<
    string,
    unknown
  >[];
  const churnVsNew = (analytics.churnVsNew ?? []) as Record<string, unknown>[];
  const tierCounts = analytics.tierCounts as Record<string, number>;
  const mrr = data.mrr as { satang: number; deltaSatang: number; deltaPct: number };

  const donut = [
    { name: "Basic", value: tierCounts?.basic ?? 0, fill: COLORS.basic },
    { name: "Premium", value: tierCounts?.premium ?? 0, fill: COLORS.premium },
    { name: "VIP", value: tierCounts?.vip ?? 0, fill: COLORS.vip },
  ];
  const paidTotal = (tierCounts?.basic ?? 0) + (tierCounts?.premium ?? 0) + (tierCounts?.vip ?? 0);

  const events = (data.paymentEvents ?? []) as Record<string, unknown>[];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-black text-[#004AAD]">
          Revenue dashboard / แดชบอร์ดรายได้
        </h1>
        <p className="ep-stat text-sm text-neutral-600">
          สรุปรายได้ การเติบโต และการยกเลิก
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["MRR (month)", formatBahtFromSatang(mrr.satang), `Δ ${formatBahtFromSatang(mrr.deltaSatang)} (${mrr.deltaPct}%)`],
          ["Total all-time", formatBahtFromSatang(analytics.totalRevenueSatang as number), "—"],
          ["ARPU", formatBahtFromSatang(analytics.arpuSatang as number), "—"],
          ["Churn (actions)", String(data.churnCountThisMonth ?? 0), "This month"],
          ["New subs", String(analytics.newSubscribersThisMonth ?? 0), "This month"],
        ].map(([a, b, c]) => (
          <div
            key={String(a)}
            className="rounded-[4px] border-4 border-black bg-white p-3 shadow-[4px_4px_0_0_#000]"
          >
            <p className="text-[10px] font-bold uppercase text-neutral-600">{a}</p>
            <p className="ep-stat mt-1 text-xl font-black text-[#004AAD]">{b}</p>
            <p className="ep-stat text-[10px] text-neutral-500">{c}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-72 rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
          <h2 className="text-sm font-black">Monthly revenue (stacked) / รายได้รายเดือน</h2>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={monthlyBars}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="basic" stackId="a" fill={COLORS.basic} />
              <Bar dataKey="premium" stackId="a" fill={COLORS.premium} />
              <Bar dataKey="vip" stackId="a" fill={COLORS.vip} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="h-72 rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
          <h2 className="text-sm font-black">Signups by tier / สมัครใหม่</h2>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={subscriberGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="basic" stroke={COLORS.basic} />
              <Line type="monotone" dataKey="premium" stroke={COLORS.premium} />
              <Line type="monotone" dataKey="vip" stroke={COLORS.vip} />
              <Line type="monotone" dataKey="free" stroke="#999" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="h-72 rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
          <h2 className="text-sm font-black">Tier distribution / สัดส่วน tier</h2>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie
                data={donut}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                label
              >
                {donut.map((e, i) => (
                  <Cell key={i} fill={e.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <p className="ep-stat text-center text-xs">Total paid: {paidTotal}</p>
        </div>

        <div className="h-72 rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
          <h2 className="text-sm font-black">New vs churn / ใหม่เทียบยกเลิก</h2>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={churnVsNew}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="newAccounts" stroke="#16a34a" name="New" />
              <Line type="monotone" dataKey="churned" stroke="#dc2626" name="Churn" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <section className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
        <h2 className="text-lg font-black">Payment events / เหตุการณ์ชำระเงิน</h2>
        <table className="mt-2 w-full min-w-[600px] text-left text-xs">
          <thead className="bg-neutral-100">
            <tr>
              <th className="border p-2">Date</th>
              <th className="border p-2">User</th>
              <th className="border p-2">Tier</th>
              <th className="border p-2">Amount</th>
              <th className="border p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={String(e.id)}>
                <td className="border p-2 ep-stat">
                  {new Date(e.date as string).toLocaleString()}
                </td>
                <td className="border p-2">{String(e.userName)}</td>
                <td className="border p-2">{String(e.tier)}</td>
                <td className="border p-2 ep-stat">
                  {formatBahtFromSatang((e.amount as number) ?? 0)}
                </td>
                <td className="border p-2">{String(e.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
