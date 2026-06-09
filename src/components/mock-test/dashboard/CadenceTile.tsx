"use client";

import type { Tier } from "@/lib/access-control";

type Props = {
  used: number;
  limit: number;
  remainingCount: number;
  mockAddonRemaining: number;
  lifetimeAttempts: number;
  tier: Tier;
  loading: boolean;
};

function daysUntilNextMonth(now = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const ms = next.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function nextMonthLabel(now = new Date()): string {
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function CadenceTile({
  used,
  limit,
  remainingCount,
  mockAddonRemaining,
  lifetimeAttempts,
  tier,
  loading,
}: Props) {
  const isLockedTier = limit <= 0;
  // Dot row visualizes the monthly limit. For locked tiers (limit=0) we render
  // a single muted dot rather than a misleading "next" indicator.
  const dotCount = isLockedTier ? 1 : limit;
  const dots = Array.from({ length: dotCount }, (_, idx) => {
    if (isLockedTier) return "locked" as const;
    if (idx < used) return "used" as const;
    if (idx === used) return "next" as const;
    return "open" as const;
  });

  const daysLeft = daysUntilNextMonth();
  const monthName = new Date().toLocaleDateString(undefined, { month: "long" });
  const totalSlots = Math.max(limit, used + remainingCount);

  return (
    <div className="min-w-[260px] border-4 border-black bg-[#FFD600] p-4 shadow-[8px_8px_0_0_#111]">
      <div className="flex items-baseline justify-between font-mono text-[10px] font-black uppercase tracking-[0.14em]">
        <span>เดือนนี้ · {monthName}</span>
        <span>{tier.toUpperCase()}</span>
      </div>
      <p className="mt-2 text-[15px] font-black leading-none">
        {loading ? (
          <span className="opacity-60">…</span>
        ) : isLockedTier ? (
          <span className="text-base">🔒 แผนนี้ยังไม่รวม Mock Test</span>
        ) : (
          <>
            เหลือ <span className="text-3xl">{remainingCount}</span> / {totalSlots} · ใช้ไป {used}
          </>
        )}
      </p>
      <div className="mt-2 flex gap-[6px]">
        {dots.map((state, idx) => (
          <span
            key={idx}
            className={`h-[18px] w-[18px] rounded-full border-2 border-black ${
              state === "used"
                ? "bg-black"
                : state === "next"
                  ? "bg-[#FF5C00]"
                  : state === "locked"
                    ? "bg-neutral-300"
                    : "bg-white"
            }`}
            aria-hidden
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between border-t-2 border-black/15 pt-2 font-mono text-[10px] font-bold text-black/70">
        <span>
          เหลือ <b className="text-black">{daysLeft} วัน</b> · refresh {nextMonthLabel()}
        </span>
        <span>
          Lifetime · <b className="text-black">{lifetimeAttempts}</b>
        </span>
      </div>
      {mockAddonRemaining > 0 ? (
        <p className="mt-2 font-mono text-[9px] font-bold uppercase tracking-wider text-black/50">
          + {mockAddonRemaining} ADD-ON CREDITS
        </p>
      ) : null}
    </div>
  );
}
