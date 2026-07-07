"use client";

import { useEffect, useState } from "react";
import { loadStats, tierProgress, type Stats } from "@/lib/gamification";
import { useLessonUserId } from "@/lib/lesson-user";

/** Compact XP/tier card — same tier ladder + xpTotal shown on mobile's profile screen, synced via app_state_blobs. */
export function XpTierBadge() {
  const uid = useLessonUserId();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    loadStats(uid).then((s) => alive && setStats(s));
    return () => {
      alive = false;
    };
  }, [uid]);

  if (!stats) return null;

  const { tier, into, need, pct } = tierProgress(stats.tierXp);

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-50 text-2xl ring-1 ring-slate-200">
          {tier.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">{tier.name}</p>
          <p className="text-[11px] font-semibold text-slate-500">{stats.xpTotal.toLocaleString()} XP ทั้งหมด</p>
        </div>
        {stats.streak > 0 ? (
          <span className="shrink-0 rounded-full bg-orange-100 px-2 py-1 text-[11px] font-black text-orange-700">🔥 {stats.streak}</span>
        ) : null}
      </div>
      {tier.next ? (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#004AAD] transition-all" style={{ width: `${Math.round(pct * 100)}%` }} />
          </div>
          <p className="mt-1 text-[10px] font-semibold text-slate-400">
            อีก {Math.max(0, need - into)} XP ถึง {tier.next.name}
          </p>
        </div>
      ) : null}
    </div>
  );
}
