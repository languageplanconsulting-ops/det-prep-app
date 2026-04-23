"use client";

import { useEffectiveTier } from "@/hooks/useEffectiveTier";

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M5 16L3 7l5.5 3L12 4l3.5 6L21 7l-2 9H5zm2.7 2h8.6l.4 2H7.3l.4-2z" />
    </svg>
  );
}

/**
 * Small VIP pill for headers and profile surfaces.
 * Course VIP vs Stripe VIP use different colors; tooltip is bilingual (EN · TH).
 */
export function VIPBadge() {
  const {
    effectiveTier,
    vipGrantedByCourse,
    hasStripeSubscription,
    loading,
  } = useEffectiveTier();

  if (loading || effectiveTier !== "vip") {
    return null;
  }

  const isCourse = vipGrantedByCourse;
  const isPremiumStripe = !vipGrantedByCourse && hasStripeSubscription;

  const label = isCourse
    ? "VIP • Course"
    : isPremiumStripe
      ? "VIP • Premium Member"
      : "VIP";

  const title = isCourse
    ? "VIP access granted via EnglishPlan Course enrollment · สิทธิ์ VIP มอบให้ผ่านการลงทะเบียนคอร์ส EnglishPlan"
    : isPremiumStripe
      ? "VIP via paid plan · สมาชิก VIP แบบชำระเงิน"
      : "VIP · EnglishPlan";

  const palette = isCourse
    ? "border-black bg-[#FFCC00] text-[#004AAD]"
    : isPremiumStripe
      ? "border-black bg-[#004AAD] text-[#FFCC00]"
      : "border-black bg-white text-[#004AAD]";

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-[4px] border-[3px] px-2 py-0.5 text-[11px] font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000] ${palette}`}
      style={{ fontFamily: "var(--font-jetbrains), monospace" }}
    >
      <CrownIcon className="shrink-0" />
      {label}
    </span>
  );
}
