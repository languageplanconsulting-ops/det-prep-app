"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { LANDING_PAGE_GRID_BG } from "@/lib/landing-page-visual";

type ProductionReportLandingHeroProps = {
  backHref: string;
  backLabel: string;
  eyebrow: string;
  titleEn: string;
  titleTh: string;
  score160: number;
  gradingBadgeText: string;
  rubricLine: ReactNode;
  taskBoostSlot?: ReactNode;
  children: ReactNode;
};

export function ProductionReportLandingHero({
  backHref,
  backLabel,
  eyebrow,
  titleEn,
  titleTh,
  score160,
  gradingBadgeText,
  rubricLine,
  taskBoostSlot,
  children,
}: ProductionReportLandingHeroProps) {
  return (
    <section className={`${LANDING_PAGE_GRID_BG} px-4 py-8 sm:px-6 sm:py-12`}>
      <div className="mx-auto max-w-5xl">
        <Link
          href={backHref}
          className="mb-6 inline-flex text-sm font-bold text-ep-blue underline-offset-4 hover:underline"
        >
          {backLabel}
        </Link>

        <div className="border-4 border-black bg-white p-6 shadow-[12px_12px_0_0_#000] sm:p-8">
          <div
            className="mb-6 h-1.5 w-full bg-[linear-gradient(90deg,#004AAD_0%,#FFCC00_45%,#004AAD_100%)]"
            aria-hidden
          />

          <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,260px)] lg:items-start">
            <div>
              <p className="ep-stat text-sm font-bold uppercase tracking-widest text-ep-blue">
                {eyebrow}
              </p>
              <h1 className="mt-3 text-3xl font-black leading-[1.05] tracking-tight text-neutral-900 sm:text-5xl">
                {titleEn}
              </h1>
              <p className="mt-3 text-base leading-relaxed text-neutral-700 sm:text-lg">{titleTh}</p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="border-[3px] border-black bg-ep-blue px-6 py-5 text-white shadow-[8px_8px_0_0_#000]">
                <p className="ep-stat text-[11px] font-bold uppercase tracking-widest opacity-90">
                  Score / คะแนน
                </p>
                <p className="ep-stat mt-1 text-5xl font-black tabular-nums">{score160}</p>
                <p className="ep-stat mt-1 text-xs font-bold uppercase tracking-wide opacity-90">
                  out of 160
                </p>
              </div>
              <p className="border-[3px] border-black bg-white px-4 py-2.5 ep-stat text-center text-[10px] font-bold uppercase tracking-wide text-neutral-800 shadow-[4px_4px_0_0_#000]">
                {gradingBadgeText}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-end gap-4 border-t-[3px] border-dashed border-neutral-200 pt-6">
            <p className="ep-stat max-w-xl text-xs leading-relaxed text-neutral-600">{rubricLine}</p>
          </div>

          {taskBoostSlot ? <div className="mt-4">{taskBoostSlot}</div> : null}

          <div className="mt-6 flex flex-wrap gap-2">{children}</div>
        </div>
      </div>
    </section>
  );
}
