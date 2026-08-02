"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  difficultyLabelTh,
  loadAttemptRedeemSnapshot,
  redeemableTaskLabel,
  type AttemptRedeemSnapshot,
  type AttemptRow,
  SUBPAR_BAR_160,
} from "@/lib/course-plan/attempt-redeem";

/**
 * Course panel: best scores per production/listening skill, plus every
 * sub-par attempt with a Redeem button (thresholds by difficulty).
 */
export function AttemptRedeemPanel({
  hasUser,
  defaultCollapsed = false,
}: {
  hasUser: boolean;
  defaultCollapsed?: boolean;
}) {
  const [snap, setSnap] = useState<AttemptRedeemSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(!defaultCollapsed);

  useEffect(() => {
    if (!hasUser) {
      setSnap({ bestByType: [], subPar: [] });
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void loadAttemptRedeemSnapshot().then((s) => {
      if (!cancelled) {
        setSnap(s);
        setLoading(false);
        if (s.bestByType.length > 0 || s.subPar.length > 0) setOpen(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hasUser]);

  const empty = !loading && (!snap || (snap.bestByType.length === 0 && snap.subPar.length === 0));

  return (
    <section className="ep-stagger-in rounded-3xl bg-white p-5 shadow-sm ring-1 ring-rose-100">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-baseline justify-between gap-2 text-left"
      >
        <h2 className="text-lg font-black text-slate-900">คะแนนสูงสุด &amp; Redeem</h2>
        <span className="text-sm font-black text-slate-400">{open ? "▲" : "▼"}</span>
      </button>
      <p className="mt-0.5 text-[11px] text-slate-400">
        เกณฑ์ Redeem · ง่าย &lt;{SUBPAR_BAR_160.easy} · กลาง &lt;{SUBPAR_BAR_160.medium} · ยาก &lt;
        {SUBPAR_BAR_160.hard}
      </p>

      {open && (
        <div className="mt-3">
          {!hasUser ? (
            <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-200">
              ล็อกอินด้วยบัญชีจริงเพื่อดูคะแนน Redeem
            </p>
          ) : loading ? (
            <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 ring-1 ring-slate-200">
              กำลังโหลดคะแนนจากแบบฝึก…
            </p>
          ) : empty ? (
            <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 ring-1 ring-slate-200">
              ยังไม่มีคะแนน Redeem — ทำแบบฝึกแล้วจะโผล่ที่นี่
            </p>
          ) : (
            <div className="space-y-5">
              {snap!.bestByType.length > 0 ? (
                <div>
                  <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
                    คะแนนสูงสุดของแต่ละประเภท
                  </p>
                  <ul className="grid gap-1.5 sm:grid-cols-2">
                    {snap!.bestByType.map((row) => (
                      <BestCard key={row.taskType} row={row} />
                    ))}
                  </ul>
                </div>
              ) : null}

              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-rose-400">
                  ต่ำกว่าเกณฑ์ — Redeem ได้เลย
                </p>
                {snap!.subPar.length === 0 ? (
                  <p className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
                    ไม่มีรายการต่ำกว่าเกณฑ์ — เก่งมาก
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {snap!.subPar.map((row) => (
                      <SubParRow key={row.id} row={row} />
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function BestCard({ row }: { row: AttemptRow }) {
  const pct = Math.min(100, Math.round((row.bestScore160 / 160) * 100));
  return (
    <li className="rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-200">
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate text-[12px] font-black text-slate-700">
          {redeemableTaskLabel(row.taskType)}
        </p>
        <p className="shrink-0 text-sm font-black text-[#004AAD]">
          {row.bestScore160}
          <span className="text-[10px] font-bold text-slate-400">/160</span>
        </p>
      </div>
      <p className="mt-0.5 truncate text-[10px] text-slate-500">
        {row.titleTh} · {difficultyLabelTh(row.difficulty)}
      </p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full bg-[#004AAD]" style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}

function SubParRow({ row }: { row: AttemptRow }) {
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-xl bg-rose-50/80 p-2.5 ring-1 ring-rose-200 sm:flex-nowrap">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-black text-slate-800">
          {redeemableTaskLabel(row.taskType)}
          <span className="ml-1.5 text-[10px] font-bold text-slate-400">
            {difficultyLabelTh(row.difficulty)} · เกณฑ์ {row.bar160}
          </span>
        </p>
        <p className="truncate text-[11px] text-slate-600">{row.titleTh}</p>
        <p className="mt-0.5 text-[11px] font-black text-rose-600">
          ได้ {row.bestScore160}/160
        </p>
      </div>
      <Link
        href={row.redeemHref}
        className="ep-redeem-pulse shrink-0 rounded-full bg-[#FFCC00] px-3.5 py-2 text-[11px] font-black uppercase tracking-wide text-slate-900 shadow-sm ring-1 ring-amber-300 transition hover:brightness-105"
      >
        Redeem
      </Link>
    </li>
  );
}
