"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import {
  getReadWriteTopicProgress,
  subscribeReadWriteTopicProgress,
} from "@/lib/writing-storage";
import type { WritingTopic } from "@/types/writing";

const MAX_SCORE = 160;

export function ReadWriteTopicExamCard({ topic }: { topic: WritingTopic }) {
  const progress = useSyncExternalStore(
    subscribeReadWriteTopicProgress,
    () => getReadWriteTopicProgress(topic.id),
    () => undefined as ReturnType<typeof getReadWriteTopicProgress>,
  );

  const started = !!progress;
  const latest = progress?.latestScore160 ?? null;
  const perfect = latest !== null && latest >= MAX_SCORE;
  const showRedeem = started && !perfect;

  const sessionHref = `/practice/production/read-and-write/${topic.id}`;
  const thumbLabel = topic.titleEn.trim().slice(0, 2).toUpperCase() || "RW";

  return (
    <BrutalPanel className="h-full overflow-hidden p-0">
      <div className="flex h-full flex-col">
        <Link href={sessionHref} className="block hover:bg-ep-yellow/10">
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-ep-blue/20 via-ep-yellow/30 to-neutral-100">
            <div className="flex h-full w-full items-center justify-center p-4">
              <span className="select-none text-center text-3xl font-black tracking-tight text-ep-blue drop-shadow-sm md:text-4xl">
                {thumbLabel}
              </span>
            </div>
            {started && latest !== null ? (
              <p className="ep-stat absolute bottom-2 right-2 rounded-sm border-2 border-black bg-white px-2 py-1 text-xs font-black text-ep-blue shadow-[2px_2px_0_0_#000]">
                {latest}/{MAX_SCORE}
              </p>
            ) : (
              <p className="ep-stat absolute bottom-2 left-2 rounded-sm border border-black/30 bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase text-neutral-700">
                Essay
              </p>
            )}
          </div>
          <div className="space-y-1 p-3">
            <p className="text-sm font-extrabold leading-tight">{topic.titleEn}</p>
            <p className="ep-stat line-clamp-2 text-xs text-neutral-600">{topic.titleTh}</p>
          </div>
        </Link>

        <div className="mt-auto border-t-2 border-neutral-200 p-3">
          {!started ? (
            <Link
              href={sessionHref}
              className="block text-center text-xs font-black uppercase tracking-wide text-ep-blue underline-offset-2 hover:underline"
            >
              Start exam
            </Link>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-center ep-stat text-xs font-bold text-neutral-800">
                Latest:{" "}
                <span className="text-ep-blue">
                  {latest}/{MAX_SCORE}
                </span>
              </p>
              {showRedeem && progress ? (
                <Link
                  href={`/practice/production/read-and-write/report/${progress.latestAttemptId}`}
                  className="block border-2 border-black bg-ep-yellow py-2 text-center text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
                >
                  Redeem
                </Link>
              ) : null}
              {perfect ? (
                <p className="text-center text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  Complete
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </BrutalPanel>
  );
}
