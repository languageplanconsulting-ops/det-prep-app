"use client";

import { useEffect, useRef, useState } from "react";
import { GRADING_LOADER_MESSAGES } from "@/lib/grading-loader-messages";

const MSG_INTERVAL_MS = 2800;
const TICK_MS = 120;

function easeProgress(elapsedSec: number): number {
  const cap = 97;
  return Math.min(cap, cap * (1 - Math.exp(-elapsedSec / 18)));
}

type GradingProgressLoaderProps = {
  eyebrow?: string;
  variant?: "default" | "premium";
};

export function GradingProgressLoader({
  eyebrow,
  variant = "default",
}: GradingProgressLoaderProps) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number | null>(null);
  const premium = variant === "premium";

  const msg = GRADING_LOADER_MESSAGES[msgIndex] ?? GRADING_LOADER_MESSAGES[0]!;

  useEffect(() => {
    const id = window.setInterval(() => {
      setMsgIndex((i) => (i + 1) % GRADING_LOADER_MESSAGES.length);
    }, MSG_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    startRef.current = Date.now();
    const id = window.setInterval(() => {
      const t = (Date.now() - (startRef.current ?? Date.now())) / 1000;
      setProgress(Math.floor(easeProgress(t)));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className={
        premium
          ? "fixed inset-0 z-[80] flex items-center justify-center bg-neutral-900/45 p-4 backdrop-blur-[2px]"
          : "fixed inset-0 z-[80] flex items-center justify-center bg-neutral-900/35 p-4"
      }
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={
          premium
            ? "ep-brutal relative w-full max-w-xl overflow-hidden border-4 border-black bg-white p-6 shadow-[10px_10px_0_0_#000]"
            : "ep-brutal w-full max-w-lg border-4 border-black bg-white p-6 shadow-[8px_8px_0_0_#000]"
        }
      >
        {premium ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-[linear-gradient(90deg,#facc15_0%,#fef08a_45%,#facc15_100%)]" />
        ) : null}
        {eyebrow ? (
          <p
            className={
              premium
                ? "ep-stat text-center text-[11px] font-bold uppercase tracking-[0.28em] text-ep-blue"
                : "ep-stat text-center text-[11px] font-bold uppercase tracking-[0.25em] text-ep-blue"
            }
          >
            {eyebrow}
          </p>
        ) : null}

        <div
          className={
            premium
              ? "mt-4 rounded-sm border-2 border-black bg-neutral-50 p-4"
              : "mt-4 flex flex-col items-center border-b-2 border-black pb-4"
          }
        >
          <div className="flex flex-col items-center">
            <span className="ep-stat text-5xl font-black tabular-nums text-ep-blue md:text-6xl">
              {Math.min(97, progress)}%
            </span>
            <span className="ep-stat mt-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              {premium ? "AI analysis in progress" : "Processing"}
            </span>
          </div>
        </div>

        <div
          className={
            premium
              ? "mt-4 h-3 overflow-hidden rounded-sm border-2 border-black bg-neutral-200"
              : "mt-5 h-3 overflow-hidden border-2 border-black bg-neutral-200"
          }
        >
          <div
            className={
              premium
                ? "h-full bg-[linear-gradient(90deg,#0b5bd3_0%,#2563eb_45%,#60a5fa_100%)] transition-[width] duration-200 ease-out"
                : "h-full bg-ep-blue transition-[width] duration-200 ease-out"
            }
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>

        <div className={premium ? "mt-4 min-h-[8rem] space-y-3 text-center" : "mt-6 min-h-[8rem] space-y-3 text-center"}>
          <p
            key={`th-${msgIndex}`}
            className="text-sm font-semibold leading-relaxed text-neutral-900 md:text-base"
          >
            {msg.th}
          </p>
          <p
            key={`en-${msgIndex}`}
            className="ep-stat text-xs leading-relaxed text-neutral-600 md:text-sm"
          >
            {msg.en}
          </p>
        </div>

        <div className={premium ? "mt-5 flex items-center justify-between border-t border-black/20 pt-3" : ""}>
          <p
            className={
              premium
                ? "ep-stat text-[10px] font-bold uppercase tracking-wider text-neutral-500"
                : "ep-stat mt-5 text-center text-[10px] font-bold text-neutral-400"
            }
          >
            {premium
              ? `Step ${msgIndex + 1} of ${GRADING_LOADER_MESSAGES.length}`
              : `${msgIndex + 1} / ${GRADING_LOADER_MESSAGES.length}`}
          </p>
          {premium ? (
            <p className="ep-stat text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              English Plan AI
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
