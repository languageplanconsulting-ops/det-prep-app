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
  const [massExpiryAt, setMassExpiryAt] = useState("");
  const [massExpiryTierFilter, setMassExpiryTierFilter] = useState("all");
  const [massExpiryClear, setMassExpiryClear] = useState(false);
  const [massExpiryReason, setMassExpiryReason] = useState("");

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

  const setExpiryForAllMembers = async () => {
    const r = massExpiryReason.trim();
    if (!r) {
      push({
        type: "error",
        titleEn: "Reason required.",
        titleTh: "ต้องใส่เหตุผล",
      });
      return;
    }
    if (!massExpiryClear && !massExpiryAt.trim()) {
      push({
        type: "error",
        titleEn: "Pick a date/time or check Clear expiry.",
        titleTh: "เลือกวันหรือติ๊กล้างวันหมดอายุ",
      });
      return;
    }
    const ok = window.confirm(
      "This updates tier_expires_at for EVERY account that matches the tier filter. Continue? / จะอัปเดตวันหมดอายุให้ทุกบัญชีที่ตรงตัวกรอง — ต้องการทำต่อหรือไม่",
    );
    if (!ok) return;
    let tier_expires_at: string | null = null;
    if (!massExpiryClear) {
      const d = new Date(massExpiryAt);
      if (Number.isNaN(d.getTime())) {
        push({
          type: "error",
          titleEn: "Invalid date/time.",
          titleTh: "วันที่ไม่ถูกต้อง",
        });
        return;
      }
      tier_expires_at = d.toISOString();
    }
    const res = await fetch("/api/admin/subscriptions/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action: "set_expiry_date",
        scope: "all",
        tier_filter: massExpiryTierFilter,
        tier_expires_at,
        reason: r,
      }),
    });
    if (!res.ok) {
      push({ type: "error", titleEn: "Bulk expiry failed", titleTh: "ล้มเหลว" });
      return;
    }
    const j = (await res.json()) as { count?: number };
    push({
      type: "success",
      titleEn: `Updated ${j.count ?? 0} member(s).`,
      titleTh: `อัปเดต ${j.count ?? 0} คน`,
    });
    void loadExpiring();
  };

  const setExpiryForListedEmails = async () => {
    const r = massExpiryReason.trim();
    if (!r) {
      push({
        type: "error",
        titleEn: "Reason required.",
        titleTh: "ต้องใส่เหตุผล",
      });
      return;
    }
    let emails: string[] = [];
    try {
      emails = JSON.parse(jsonEmails) as string[];
    } catch {
      push({
        type: "error",
        titleEn: "Invalid JSON email list.",
        titleTh: "รายการอีเมล JSON ไม่ถูกต้อง",
      });
      return;
    }
    if (!Array.isArray(emails) || emails.length === 0) {
      push({
        type: "error",
        titleEn: "Provide a JSON array of emails.",
        titleTh: "ใส่ array ของอีเมล",
      });
      return;
    }
    if (!massExpiryClear && !massExpiryAt.trim()) {
      push({
        type: "error",
        titleEn: "Pick a date/time or check Clear expiry.",
        titleTh: "เลือกวันหรือติ๊กล้างวันหมดอายุ",
      });
      return;
    }
    let tier_expires_at: string | null = null;
    if (!massExpiryClear) {
      const d = new Date(massExpiryAt);
      if (Number.isNaN(d.getTime())) {
        push({
          type: "error",
          titleEn: "Invalid date/time.",
          titleTh: "วันที่ไม่ถูกต้อง",
        });
        return;
      }
      tier_expires_at = d.toISOString();
    }
    const res = await fetch("/api/admin/subscriptions/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action: "set_expiry_date",
        scope: "list",
        emails,
        tier_expires_at,
        reason: r,
      }),
    });
    if (!res.ok) {
      push({ type: "error", titleEn: "Bulk expiry failed", titleTh: "ล้มเหลว" });
      return;
    }
    const j = (await res.json()) as { count?: number; failed?: string[] };
    push({
      type: "success",
      titleEn: `Updated ${j.count ?? 0} of ${emails.length}. Failed: ${(j.failed ?? []).length}`,
      titleTh: `สำเร็จ ${j.count ?? 0} รายการ`,
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
          Set membership expiry (all members) / กำหนดวันหมดอายุทุกคน
        </h2>
        <p className="mt-1 text-xs text-neutral-600">
          Sets the same <code className="font-mono">tier_expires_at</code> for every profile (optionally only
          one tier). Use Clear to remove a stored expiry date. / ตั้งวันหมดอายุเดียวกันทั้งระบบ หรือเฉพาะ tier
          ที่เลือก — ติ๊กล้างเพื่อลบวันที่
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-xs font-bold">
            Tier filter / กรอง tier
            <select
              value={massExpiryTierFilter}
              onChange={(e) => setMassExpiryTierFilter(e.target.value)}
              className="mt-1 rounded-[4px] border-4 border-black px-2 py-1"
            >
              {["all", "free", "basic", "premium", "vip"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className={`flex flex-col text-xs font-bold ${massExpiryClear ? "opacity-40" : ""}`}>
            Expires at (local) / หมดอายุ
            <input
              type="datetime-local"
              value={massExpiryAt}
              onChange={(e) => setMassExpiryAt(e.target.value)}
              disabled={massExpiryClear}
              className="mt-1 rounded-[4px] border-4 border-black px-2 py-1 ep-stat text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-bold">
            <input
              type="checkbox"
              checked={massExpiryClear}
              onChange={(e) => setMassExpiryClear(e.target.checked)}
            />
            Clear expiry / ล้างวันหมดอายุ
          </label>
        </div>
        <label className="mt-3 block text-sm font-bold">
          Reason / เหตุผล (required)
          <input
            value={massExpiryReason}
            onChange={(e) => setMassExpiryReason(e.target.value)}
            className="mt-1 w-full rounded-[4px] border-4 border-black px-2 py-1"
          />
        </label>
        <p className="mt-2 text-xs text-red-700">
          WARNING: Affects many accounts. Cannot auto-undo. / คำเตือน
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void setExpiryForAllMembers()}
            className="rounded-[4px] border-4 border-black bg-red-700 px-4 py-2 text-sm font-black text-white shadow-[4px_4px_0_0_#000]"
          >
            Apply to all matching members / ใช้กับทุกคนที่ตรงตัวกรอง
          </button>
          <button
            type="button"
            onClick={() => void setExpiryForListedEmails()}
            className="rounded-[4px] border-4 border-black bg-white px-4 py-2 text-sm font-black shadow-[4px_4px_0_0_#000]"
          >
            Apply to JSON email list only / ใช้กับอีเมลใน JSON ด้านบน
          </button>
        </div>
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
