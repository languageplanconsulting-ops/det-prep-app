"use client";

import { useVipAiFeedbackGate } from "@/hooks/useVipAiFeedbackGate";
import {
  TH_QUOTA_BANNER_LINE,
  TH_QUOTA_COVERED_PARTS_TH,
  TH_QUOTA_NO_ROLLOVER,
} from "@/lib/vip-ai-feedback-quota";

/** Shown above AI Submit on production / dialogue-summary flows for VIP. */
export function VipAiFeedbackQuotaBanner() {
  const {
    showQuotaBanner,
    quotaMode,
    remaining,
    limit,
    loading,
    extraLimit,
    extraExpiresAt,
    renewsAt,
    planExpiresAt,
    weeklyUsed,
  } = useVipAiFeedbackGate();

  if (!showQuotaBanner) return null;
  const weeklyMode = quotaMode === "weekly";

  return (
    <div
      className="rounded-sm border-2 border-ep-blue/50 bg-gradient-to-br from-sky-50 to-white p-3 text-sm shadow-[2px_2px_0_0_rgba(0,74,173,0.2)]"
      role="status"
    >
      <p className="font-bold text-neutral-900">
        {loading
          ? "กำลังโหลดโควต้า…"
          : weeklyMode
            ? TH_QUOTA_BANNER_LINE(remaining, limit)
            : `รอบนี้คุณมี feedback credit แบบรายเดือนเหลือ ${remaining} ครั้ง จาก ${limit} ครั้ง`}
      </p>
      <p className="mt-1 text-xs font-semibold text-neutral-800">
        {weeklyMode
          ? `ใช้ไปแล้วรอบนี้ ${weeklyUsed ?? 0} ครั้ง · Used this week ${weeklyUsed ?? 0}`
          : `ใช้ไปแล้วรอบนี้ ${weeklyUsed ?? 0} ครั้ง · Used this cycle ${weeklyUsed ?? 0}`}
      </p>
      {weeklyMode && renewsAt ? (
        <p className="mt-1 text-xs font-semibold text-ep-blue">
          รีเซ็ตรอบสัปดาห์: {new Date(renewsAt).toLocaleString("th-TH")}
        </p>
      ) : null}
      {planExpiresAt ? (
        <p className="mt-1 text-xs font-semibold text-neutral-700">
          {weeklyMode ? "รอบแพ็กเกจ/รายเดือนถึง " : "รีเซ็ตรอบรายเดือน/แพ็กเกจ: "}
          {new Date(planExpiresAt).toLocaleString("th-TH")}
        </p>
      ) : null}
      {extraLimit > 0 ? (
        <p className="mt-1 text-xs font-semibold text-emerald-700">
          {weeklyMode
            ? `เหลือรายเดือน/เครดิตเพิ่มอีก ${extraLimit} ครั้ง`
            : `เครดิตเพิ่มที่ใช้งานได้อีก ${extraLimit} ครั้ง`}
          {extraExpiresAt ? ` ใช้ได้ถึง ${new Date(extraExpiresAt).toLocaleString("th-TH")}` : ""}
        </p>
      ) : null}
      {weeklyMode ? (
        <p className="mt-1.5 text-xs leading-relaxed text-neutral-700">{TH_QUOTA_NO_ROLLOVER}</p>
      ) : (
        <p className="mt-1.5 text-xs leading-relaxed text-neutral-700">
          โหมดนี้ไม่มีลิมิตรอบสัปดาห์ ระบบจะนับจากเครดิตรายเดือนที่เหลืออยู่ของคุณเท่านั้น
        </p>
      )}
      <p className="mt-1 text-xs font-medium text-ep-blue">{TH_QUOTA_COVERED_PARTS_TH}</p>
    </div>
  );
}
