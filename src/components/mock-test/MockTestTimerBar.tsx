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

  return (
    <div className={`w-full ${mt.border} ${mt.shadow} overflow-hidden bg-white`}>
      <div className="flex items-center justify-between border-b-4 border-black px-3 py-2">
        <span className="text-xs font-bold text-neutral-600">เวลา / Time</span>
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
