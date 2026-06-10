"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { Tier } from "@/lib/access-control";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";

/** Warn this many days before the plan lapses so students aren't cut off mid-study. */
const WARN_WITHIN_DAYS = 5;
const DISMISS_KEY = "ep-plan-expiry-dismissed";

function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

/**
 * Presentational banner — pure, no data/auth dependency. Exported so it can be
 * previewed and tested with sample props. Render via {@link PlanExpiryNotice}
 * in the app.
 */
function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="h-3 w-3 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

/** Items that stay safe when access pauses — reassures the student nothing is lost. */
const KEPT_ITEMS = ["ผลสอบ Mock Test", "ความคืบหน้าการเรียน", "สมุดโน้ตของคุณ"];

/**
 * Presentational banner — pure, no data/auth dependency. Exported so it can be
 * previewed and tested with sample props. Render via {@link PlanExpiryNotice}
 * in the app.
 */
export function PlanExpiryNoticeView({
  tier,
  daysLeft,
  onDismiss,
}: {
  tier: Tier;
  daysLeft: number;
  onDismiss?: () => void;
}) {
  const tierLabel = tier.toUpperCase();
  const whenLabel = daysLeft <= 1 ? "ภายในวันนี้" : `ในอีก ${daysLeft} วัน`;
  return (
    <div className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-md">
      <div className="overflow-hidden rounded-3xl border border-amber-100/70 bg-white/95 shadow-[0_18px_50px_-18px_rgba(146,110,40,0.45)] ring-1 ring-black/[0.03] backdrop-blur-md">
        <div className="h-1 w-full bg-gradient-to-r from-amber-200 via-amber-300 to-orange-200" />
        <div className="flex gap-3.5 p-4 sm:p-5">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500 ring-1 ring-amber-100">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7.5V12l3 1.8" />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold tracking-tight text-neutral-900">
              แพ็กเกจ {tierLabel} ของคุณใกล้หมดอายุ
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
              สิทธิ์การใช้งาน {tierLabel} จะหยุดชั่วคราว
              <span className="font-medium text-neutral-700"> {whenLabel}</span>{" "}
              — แต่ไม่ต้องกังวลนะครับ ข้อมูลและความคืบหน้าทั้งหมดของคุณจะถูกเก็บไว้อย่างปลอดภัย
            </p>

            <ul className="mt-3 flex flex-wrap gap-1.5">
              {KEPT_ITEMS.map((item) => (
                <li
                  key={item}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11.5px] font-medium text-emerald-700"
                >
                  <CheckIcon />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-2.5 text-[12px] leading-relaxed text-neutral-400">
              ทุกอย่างจะรออยู่ที่เดิม พร้อมให้คุณเรียนต่อได้ทันทีเมื่อกลับมาต่ออายุ
            </p>

            <div className="mt-4 flex items-center gap-2.5">
              <Link
                href="/pricing"
                onClick={onDismiss}
                className="inline-flex items-center justify-center rounded-full bg-[#004AAD] px-4 py-2 text-[13px] font-semibold text-white shadow-sm shadow-[#004AAD]/20 transition-colors hover:bg-[#003a86]"
              >
                ต่ออายุแพ็กเกจ
              </Link>
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-full px-3 py-2 text-[13px] font-medium text-neutral-400 transition-colors hover:text-neutral-600"
              >
                รับทราบแล้ว
              </button>
            </div>
          </div>

          <button
            type="button"
            aria-label="ปิด"
            onClick={onDismiss}
            className="-mr-1 -mt-1 h-7 w-7 shrink-0 rounded-full text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-neutral-500"
          >
            <svg
              viewBox="0 0 16 16"
              aria-hidden="true"
              className="mx-auto h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Floating banner shown to a paying user whose plan is about to lapse (within
 * WARN_WITHIN_DAYS). VIP-by-course (no expiry) and free users never see it.
 * Dismissible per expiry date so it stops nagging once acknowledged but
 * reappears after the next renewal pushes the date out.
 */
export function PlanExpiryNotice() {
  const { loading, realTier, planExpiresAt, vipGrantedByCourse } =
    useEffectiveTier();
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);

  useEffect(() => {
    try {
      setDismissedFor(window.localStorage.getItem(DISMISS_KEY));
    } catch {
      setDismissedFor(null);
    }
  }, []);

  if (loading || realTier === "free" || vipGrantedByCourse || !planExpiresAt) {
    return null;
  }

  const left = daysUntil(planExpiresAt);
  // Only warn in the lapse window. Already-expired users have dropped to "free"
  // (so realTier === "free" above), so left > 0 here.
  if (left > WARN_WITHIN_DAYS || left <= 0) return null;
  if (dismissedFor === planExpiresAt) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, planExpiresAt);
    } catch {
      /* ignore */
    }
    setDismissedFor(planExpiresAt);
  };

  return (
    <PlanExpiryNoticeView tier={realTier} daysLeft={left} onDismiss={dismiss} />
  );
}
