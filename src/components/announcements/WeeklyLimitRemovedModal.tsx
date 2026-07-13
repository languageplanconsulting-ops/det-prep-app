"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useEffectiveTier } from "@/hooks/useEffectiveTier";
import { AI_MONTHLY_LIMIT } from "@/lib/access-control";

/**
 * WeeklyLimitRemovedModal — one-shot popup telling VIP users the weekly AI-feedback cap is
 * gone in favor of a flat monthly pool. Only VIP ever had a weekly cap, so this is gated to
 * that tier. Bump DISMISS_KEY's version suffix to re-show it (e.g. if the monthly number
 * changes again).
 */
const DISMISS_KEY = "vip-weekly-limit-removed-v1";

/** Wait for the July "what's new" popup to be dismissed first so the two never stack. */
const JULY_DISMISS_KEY = "july-announcement-dismissed-v1";

/** Don't pop on public landing / auth screens. */
const HIDDEN_PATHS = new Set(["/", "/login", "/signup", "/reset-password", "/forgot-password"]);

const EP_BLUE = "#004AAD";

export function WeeklyLimitRemovedModal() {
  const pathname = usePathname();
  const { effectiveTier, loading } = useEffectiveTier();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (effectiveTier !== "vip") return;
    if (HIDDEN_PATHS.has(pathname)) return;
    try {
      if (window.localStorage.getItem(JULY_DISMISS_KEY) !== "1") return;
      if (window.localStorage.getItem(DISMISS_KEY) !== "1") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [loading, effectiveTier, pathname]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) return null;

  const monthlyLimit = AI_MONTHLY_LIMIT.vip;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={dismiss}
    >
      <div
        className="ep-announce-pop-in relative w-full max-w-md rounded-[10px] bg-[#fdfcf6] p-7 shadow-[0_18px_40px_rgba(15,23,42,.28)] ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="ปิด"
          className="absolute right-3 top-3 text-lg text-slate-400 hover:text-slate-600"
        >
          ✕
        </button>

        <p className="text-[13px] font-semibold" style={{ color: EP_BLUE }}>
          ✦ ข่าวดีสำหรับสมาชิก VIP
        </p>
        <h1 className="mt-1 text-[22px] font-bold leading-snug text-slate-800">
          ไม่มีลิมิตรายสัปดาห์แล้ว! 🎉
        </h1>
        <p className="mt-3 text-[13.5px] leading-7 text-slate-700">
          ตอนนี้แพ็กเกจของคุณใช้ฟีดแบ็กตรวจงานได้สูงสุด{" "}
          <span
            className="font-bold"
            style={{ background: "#FFE173", borderRadius: 2, padding: "0 .12em" }}
          >
            {monthlyLimit} ครั้ง/เดือน
          </span>{" "}
          — ไม่ต้องรอรีเซ็ตรายสัปดาห์อีกต่อไป ใช้เมื่อไหร่ก็ได้ตลอดทั้งเดือน
        </p>
        <p className="mt-2 text-[12.5px] leading-6 text-slate-500">
          No more weekly limit — your plan now gives you up to {monthlyLimit} AI feedback credits
          per month, usable any time during the month.
        </p>

        <div className="mt-6 flex items-end justify-between gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="rounded-[10px] px-6 py-3 text-sm font-bold text-[#FFCC00] shadow-[0_3px_0_rgba(0,40,110,.35)] hover:opacity-95"
            style={{ background: EP_BLUE }}
          >
            รับทราบ
          </button>
          <div className="text-right">
            <p className="text-[13.5px] font-semibold text-slate-700">— ENGLISH PLAN TEAM</p>
          </div>
        </div>
      </div>
    </div>
  );
}
