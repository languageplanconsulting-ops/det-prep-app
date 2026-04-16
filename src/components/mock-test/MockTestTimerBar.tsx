"use client";

import { mt } from "@/lib/mock-test/mock-test-styles";

type Props = {
  progress: number;
  isWarning: boolean;
  isCritical: boolean;
  formattedTime: string;
};

export function MockTestTimerBar({ progress, isWarning, isCritical, formattedTime }: Props) {
  const fill = isCritical ? "#ef4444" : isWarning ? mt.yellow : mt.blueSolid;
  const pulse =
    isCritical ? "animate-pulse" : isWarning ? "animate-pulse" : "";
  const status = isCritical ? "Critical" : isWarning ? "Move faster" : "On track";
  const pct = Math.round(Math.max(0, Math.min(100, progress * 100)));

  return (
    <div className={`w-full ${mt.border} ${mt.shadow} overflow-hidden bg-white`}>
      <div className="flex items-center justify-between gap-3 border-b-4 border-black px-3 py-2">
        <div>
          <span className="text-xs font-bold text-neutral-600">เวลา / Time</span>
          <div className="mt-1 text-[11px] font-black uppercase tracking-wide text-neutral-500">
            {pct}% remaining
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded-full border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wide"
            style={{ backgroundColor: fill, color: isWarning ? "#111827" : "#ffffff" }}
          >
            {status}
          </span>
          <span
            className={`text-lg font-black tabular-nums ${pulse}`}
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              color: fill,
            }}
          >
            {formattedTime}
          </span>
        </div>
      </div>
      <div className="h-3 w-full bg-neutral-200">
        <div
          className="h-full transition-[width] duration-1000 ease-linear"
          style={{
            width: `${Math.max(0, Math.min(100, progress * 100))}%`,
            backgroundColor: fill,
          }}
        />
      </div>
    </div>
  );
}
