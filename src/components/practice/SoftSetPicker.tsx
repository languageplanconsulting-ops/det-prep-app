"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { FreeQuotaLockedLink } from "@/components/practice/FreeQuotaLockedLink";
import type { NonApiReminderExam } from "@/lib/non-api-practice-usage";

/**
 * Shared admin "Clean Grid" sets/questions picker for every round→difficulty→sets
 * exam. Each exam builds its item list (number + best-score% + status) from its own
 * progress storage and passes it in; this renders the consistent clean grid:
 * status badge (✓ผ่าน / ทำซ้ำ / ใหม่), score, progress header, and a ⭐ recommended item.
 * No confusing duplicate labels — just the item number + real status.
 */

const MASTERY_GATE = 95;

export type SoftSetItem = {
  /** Stable unique key (e.g. "12" or "3-2" for reading set-exam). */
  key: string;
  /** Display label, e.g. "ข้อ 5" or "ชุด 12". */
  label: string;
  href: string;
  /** Best-score % (0–100), or null if not attempted. */
  pct: number | null;
};

/** Best-score % from a progress record, or null. */
export function softPct(prog: { bestScore: number; maxScore: number } | null): number | null {
  if (!prog || prog.maxScore <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((prog.bestScore / prog.maxScore) * 100)));
}

export function SoftSetPicker({
  round,
  difficultyLabel,
  title,
  noun,
  items,
  lockExam,
  changeDifficultyHref,
  allRoundsHref,
  notice,
}: {
  round: number;
  difficultyLabel: string;
  title: string;
  /** "ข้อ" (questions) or "ชุด" (sets). */
  noun: string;
  items: SoftSetItem[];
  /** Exam name for the free-quota paywall, or null to use a plain Link. */
  lockExam: NonApiReminderExam | null;
  changeDifficultyHref: string;
  allRoundsHref: string;
  /** Optional slot above the grid (e.g. free-quota reminder). */
  notice?: ReactNode;
}) {
  const attempted = items.filter((i) => i.pct != null);
  const done = attempted.length;
  const total = items.length;
  const avg =
    attempted.length > 0
      ? Math.round(attempted.reduce((s, i) => s + (i.pct ?? 0), 0) / attempted.length)
      : null;
  const recommended =
    items.find((i) => i.pct == null) ??
    (attempted.length > 0
      ? attempted.reduce((lo, i) => ((i.pct ?? 0) < (lo.pct ?? 0) ? i : lo))
      : null);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap gap-2 text-[12px] font-semibold text-[#004AAD]">
        <Link href={allRoundsHref} className="hover:underline">
          ← All rounds
        </Link>
        <span className="text-slate-300">·</span>
        <Link href={changeDifficultyHref} className="hover:underline">
          เลือกระดับ
        </Link>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#004AAD]">
            Round {round} · {difficultyLabel}
          </p>
          <h1 className="mt-1 text-[24px] font-bold text-slate-900">
            {title} · เลือก{noun}ที่จะทำ
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {total > 0 ? (
              <>
                ทำแล้ว{" "}
                <b className="tabular-nums text-slate-700">{done}</b>/{total} {noun}
                {avg != null ? (
                  <>
                    {" "}
                    · เฉลี่ย <b className="tabular-nums text-slate-700">{avg}%</b>
                  </>
                ) : null}{" "}
                · ทำ{noun}ไหนก่อนก็ได้
              </>
            ) : (
              <>ยังไม่มี{noun}ในระดับนี้</>
            )}
          </p>
        </div>
        <Link
          href={changeDifficultyHref}
          className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
        >
          เปลี่ยนระดับ
        </Link>
      </div>

      {total > 0 ? (
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-[#004AAD] transition-[width] duration-500"
            style={{ width: `${total > 0 ? Math.round((done / total) * 100) : 0}%` }}
          />
        </div>
      ) : null}

      {notice}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const status = item.pct == null ? "todo" : item.pct >= MASTERY_GATE ? "mastered" : "retry";
          const isRec = recommended?.key === item.key;
          const bg =
            status === "mastered"
              ? "border-emerald-200 bg-emerald-50/40"
              : status === "retry"
                ? "border-amber-200 bg-amber-50/40"
                : "border-slate-200 bg-white";
          const badge =
            status === "mastered"
              ? { txt: "✓ ผ่าน", cls: "bg-emerald-500 text-white" }
              : status === "retry"
                ? { txt: "ทำซ้ำ", cls: "bg-amber-400 text-amber-900" }
                : { txt: "ใหม่", cls: "bg-[#FFCC00] text-slate-900" };

          const card = (
            <div
              className={`relative h-full rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${bg} ${
                isRec ? "ring-2 ring-[#004AAD]/30" : ""
              }`}
            >
              {isRec ? (
                <span className="absolute -top-2.5 left-3 rounded-full bg-[#004AAD] px-2 py-0.5 text-[10px] font-bold text-white">
                  ⭐ ทำต่อ
                </span>
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <span className="text-lg font-bold text-slate-900">{item.label}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${badge.cls}`}>
                  {badge.txt}
                </span>
              </div>
              <p className="mt-1 text-[12px] text-slate-500">
                {item.pct == null ? (
                  "ยังไม่ทำ"
                ) : (
                  <>
                    คะแนน{" "}
                    <b
                      className={`tabular-nums ${status === "mastered" ? "text-emerald-700" : "text-amber-700"}`}
                    >
                      {item.pct}%
                    </b>
                  </>
                )}
              </p>
            </div>
          );

          if (lockExam) {
            return (
              <FreeQuotaLockedLink key={item.key} href={item.href} exam={lockExam} className="block text-left">
                {card}
              </FreeQuotaLockedLink>
            );
          }
          return (
            <Link key={item.key} href={item.href} className="block">
              {card}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
