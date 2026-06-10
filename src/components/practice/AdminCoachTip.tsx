"use client";

import type { ReactNode } from "react";
import { useEffectiveTier } from "@/hooks/useEffectiveTier";

/**
 * AdminCoachTip — a "Tips from P'Doy" speech bubble that renders ONLY for admins
 * (isAdmin || previewEligible). Returns null for everyone else, so dropping it
 * into any screen is safe for real users. Centralises the admin gate so report
 * pages don't each need their own useEffectiveTier + soft check.
 */
export function AdminCoachTip({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { isAdmin, previewEligible } = useEffectiveTier();
  if (!(isAdmin || previewEligible)) return null;

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#004AAD] text-xl font-extrabold text-[#FFCC00] ring-[2.5px] ring-[#FFCC00]">
        D
      </div>
      <div className="relative flex-1 rounded-2xl rounded-tl-sm border border-[#004AAD]/10 bg-white px-3.5 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
        <span className="absolute -left-[7px] top-3.5 h-0 w-0 border-y-[6px] border-r-[7px] border-y-transparent border-r-white" />
        <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-[#FFCC00] px-2.5 py-[5px] text-[10px] font-extrabold uppercase leading-none tracking-wide text-[#004AAD]">
          <span className="text-[11px] leading-none">✨</span>Tips from P&apos;Doy
        </span>
        <div className="text-[13px] leading-6 text-slate-800">{children}</div>
      </div>
    </div>
  );
}
