"use client";

import { useCallback, useEffect, useState } from "react";

import { useAdminToast } from "@/components/admin/AdminToast";

export default function AdminSubscriptionsBulkPage() {
  const { push } = useAdminToast();
  const [jsonEmails, setJsonEmails] = useState("[]");
  const [reason, setReason] = useState("");
  const [fromTier, setFromTier] = useState("basic");
  const [toTier, setToTier] = useState("premium");
  const [extendDays, setExtendDays] = useState(30);
  const [expiringTab, setExpiringTab] = useState<"7" | "14" | "expired">("7");
  const [expiring, setExpiring] = useState<Record<string, unknown>[]>([]);

  const loadExpiring = useCallback(async () => {
    const res = await fetch(
      `/api/admin/subscriptions/expiring?tab=${expiringTab}`,
      { credentials: "include" },
    );
    if (!res.ok) return;
    const j = (await res.json()) as { users: Record<string, unknown>[] };
    setExpiring(j.users);
  }, [expiringTab]);

  useEffect(() => {
    void loadExpiring();
  }, [loadExpiring]);

  const bulkTier = async () => {
    let emails: string[] = [];
    try {
      emails = JSON.parse(jsonEmails) as string[];
    } catch {
      push({
        type: "error",
        titleEn: "Invalid JSON",
        titleTh: "JSON ไม่ถูกต้อง",
      });
      return;
    }
    const res = await fetch("/api/admin/subscriptions/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action: "change_tier",
        emails,
        tier: toTier,
        fromTier,
        reason,
      }),
    });
    if (!res.ok) {
      push({ type: "error", titleEn: "Bulk failed", titleTh: "ล้มเหลว" });
      return;
    }
    push({
      type: "success",
      titleEn: "Bulk tier update queued.",
      titleTh: "อัปเดต tier แล้ว",
    });
  };

  const bulkExtend = async () => {
    let emails: string[] = [];
    try {
      emails = JSON.parse(jsonEmails) as string[];
    } catch {
      push({
        type: "error",
        titleEn: "Invalid JSON",
        titleTh: "JSON ไม่ถูกต้อง",
      });
      return;
    }
    const res = await fetch("/api/admin/subscriptions/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action: "extend_expiry",
        emails,
        days: extendDays,
        reason,
      }),
    });
    if (!res.ok) return;
    push({
      type: "success",
      titleEn: "Bulk extend applied.",
      titleTh: "ต่ออายุแล้ว",
    });
  };

  const extendAllExpiring = async () => {
    const emails = expiring
      .map((u) => String(u.email ?? ""))
      .filter(Boolean);
    const res = await fetch("/api/admin/subscriptions/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action: "extend_expiry",
        emails,
        days: 30,
        reason: reason || "Bulk extend 30d for expiring users",
      }),
    });
    if (!res.ok) return;
    void loadExpiring();
    push({ type: "success", titleEn: "Extended all.", titleTh: "ต่อทั้งหมดแล้ว" });
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-black text-[#004AAD]">
          Bulk actions / การดำเนินการกลุ่ม
        </h1>
        <p className="ep-stat text-sm text-neutral-600">
          เปลี่ยน tier และต่ออายุแบบกลุ่ม — ต้องระบุเหตุผลทุกครั้ง
        </p>
      </header>

      <section className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
        <h2 className="text-lg font-black">
          Change tier for multiple users / เปลี่ยน Tier หลายคน
        </h2>
        <textarea
          value={jsonEmails}
          onChange={(e) => setJsonEmails(e.target.value)}
          rows={5}
          className="mt-2 w-full rounded-[4px] border-4 border-black p-2 ep-stat text-sm"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-sm font-bold">From tier</span>
          <select
            value={fromTier}
            onChange={(e) => setFromTier(e.target.value)}
            className="rounded-[4px] border-2 border-black"
          >
            {["all", "free", "basic", "premium", "vip"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <span className="text-sm font-bold">To</span>
          <select
            value={toTier}
            onChange={(e) => setToTier(e.target.value)}
            className="rounded-[4px] border-2 border-black"
          >
            {["basic", "premium", "vip"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-2 text-xs text-red-700">
          WARNING: This affects many users. Cannot auto-undo. / คำเตือน
        </p>
        <label className="mt-2 block text-sm font-bold">
          Reason / เหตุผล (required)
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded-[4px] border-4 border-black px-2 py-1"
          />
        </label>
        <button
          type="button"
          onClick={() => void bulkTier()}
          className="mt-3 rounded-[4px] border-4 border-black bg-[#004AAD] px-4 py-2 text-sm font-black text-white shadow-[4px_4px_0_0_#000]"
        >
          Preview &amp; confirm tier change / ยืนยัน
        </button>
      </section>

      <section className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
        <h2 className="text-lg font-black">
          Bulk extend expiry / ต่ออายุแบบกลุ่ม
        </h2>
        <select
          value={extendDays}
          onChange={(e) => setExtendDays(Number(e.target.value))}
          className="mt-2 rounded-[4px] border-4 border-black px-2 py-1"
        >
          {[7, 14, 30].map((d) => (
            <option key={d} value={d}>
              +{d} days
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void bulkExtend()}
          className="ml-2 rounded-[4px] border-4 border-black bg-[#FFCC00] px-4 py-2 text-sm font-black shadow-[4px_4px_0_0_#000]"
        >
          Extend listed emails / ต่อตามรายการ
        </button>
      </section>

      <section className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
        <h2 className="text-lg font-black">Bulk export / ส่งออก CSV</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {(
            [
              ["all", "All users"],
              ["paid", "Paid only"],
              ["expiring7", "Expiring 7d"],
              ["expiring30", "Expiring 30d"],
              ["inactive", "Inactive 14d+"],
              ["vip_course", "VIP course"],
            ] as const
          ).map(([t, label]) => (
            <a
              key={t}
              href={`/api/admin/subscriptions/export?type=${t}`}
              className="rounded-[4px] border-4 border-black bg-white px-3 py-2 text-xs font-bold shadow-[4px_4px_0_0_#000]"
            >
              {label}
            </a>
          ))}
        </div>
      </section>

      <section className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
        <h2 className="text-lg font-black">Expiry alerts / แจ้งเตือนหมดอายุ</h2>
        <div className="mt-2 flex gap-2">
          {(
            [
              ["7", "7 days / 7 วัน"],
              ["14", "14 days / 14 วัน"],
              ["expired", "Expired / หมดแล้ว"],
            ] as const
          ).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setExpiringTab(tab as typeof expiringTab)}
              className={`rounded-[4px] border-4 px-3 py-1 text-xs font-black ${
                expiringTab === tab
                  ? "border-black bg-red-100"
                  : "border-black bg-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void extendAllExpiring()}
          className="mt-3 rounded-[4px] border-4 border-black bg-[#004AAD] px-4 py-2 text-xs font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000]"
        >
          Extend all in tab by 30 days / ต่อทุกคนในแท็บ 30 วัน
        </button>
        <table className="mt-4 w-full min-w-[480px] text-left text-xs">
          <thead>
            <tr className="bg-neutral-100">
              <th className="border p-2">Name</th>
              <th className="border p-2">Email</th>
              <th className="border p-2">Tier</th>
              <th className="border p-2">Expiry</th>
            </tr>
          </thead>
          <tbody>
            {expiring.map((u) => (
              <tr key={String(u.id)}>
                <td className="border p-2">{String(u.full_name ?? "—")}</td>
                <td className="border p-2 ep-stat">{String(u.email)}</td>
                <td className="border p-2">{String(u.tier)}</td>
                <td className="border p-2 ep-stat">
                  {u.tier_expires_at
                    ? new Date(u.tier_expires_at as string).toLocaleDateString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
