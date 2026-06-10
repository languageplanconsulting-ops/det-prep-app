"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type HubColor = "amber" | "emerald" | "violet" | "sky";

const COLOR: Record<HubColor, { tint: string; ring: string; iconBg: string; eyebrow: string }> = {
  amber: { tint: "bg-amber-50", ring: "ring-amber-200", iconBg: "bg-amber-600", eyebrow: "text-amber-700" },
  emerald: {
    tint: "bg-emerald-50",
    ring: "ring-emerald-200",
    iconBg: "bg-emerald-600",
    eyebrow: "text-emerald-700",
  },
  violet: {
    tint: "bg-violet-50",
    ring: "ring-violet-200",
    iconBg: "bg-violet-600",
    eyebrow: "text-violet-700",
  },
  sky: { tint: "bg-sky-50", ring: "ring-sky-200", iconBg: "bg-sky-600", eyebrow: "text-sky-700" },
};

/**
 * SoftHubHeader — the soft-modern header + Tips from P'Doy coach bubble shared by
 * every round-selector hub (replaces the brutalist dotted-grid header). Admin
 * branches render this; users keep the original.
 */
export function SoftHubHeader({
  color,
  icon,
  eyebrow,
  title,
  subtitle,
  tip,
}: {
  color: HubColor;
  icon: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  tip: ReactNode;
}) {
  const c = COLOR[color];
  return (
    <div className={`rounded-2xl ${c.tint} p-5 ring-1 ${c.ring} sm:p-6`}>
      <div className="flex items-center gap-3">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.iconBg} text-2xl text-white`}
        >
          {icon}
        </div>
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${c.eyebrow}`}>{eyebrow}</p>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {title}
            {subtitle ? <span className="font-semibold text-slate-400"> · {subtitle}</span> : null}
          </h1>
        </div>
      </div>
      <div className="mt-4 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#004AAD] text-xl font-extrabold text-[#FFCC00] ring-[2.5px] ring-[#FFCC00]">
          D
        </div>
        <div className="relative flex-1 rounded-2xl rounded-tl-sm border border-[#004AAD]/10 bg-white px-3.5 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
          <span className="absolute -left-[7px] top-3.5 h-0 w-0 border-y-[6px] border-r-[7px] border-y-transparent border-r-white" />
          <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-[#FFCC00] px-2.5 py-[5px] text-[10px] font-extrabold uppercase leading-none tracking-wide text-[#004AAD]">
            <span className="text-[11px] leading-none">✨</span>Tips from P&apos;Doy
          </span>
          <p className="text-[13px] leading-6 text-slate-800">{tip}</p>
        </div>
      </div>
    </div>
  );
}

/** Soft round/set card used by hub soft branches. */
export function SoftHubCard({
  href,
  done,
  badgeRight,
  title,
  subtitle,
  metricLabel,
  metric,
  footer,
}: {
  href: string;
  done?: boolean;
  badgeRight: string;
  title: string;
  subtitle: string;
  metricLabel: string;
  metric: string;
  footer: string;
}) {
  return (
    <Link
      href={href}
      className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-[#004AAD] hover:shadow-[0_8px_22px_rgba(0,74,173,0.08)]"
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
            done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {done ? "ทำแล้ว" : "พร้อมทำ"}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{badgeRight}</span>
      </div>
      <h3 className="text-2xl font-bold text-slate-900">{title}</h3>
      <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      <div className="mt-auto pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{metricLabel}</p>
        <p className="text-2xl font-bold text-[#004AAD]">{metric}</p>
        <p className="mt-2 text-[11px] text-slate-500">{footer}</p>
      </div>
    </Link>
  );
}
