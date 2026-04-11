"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import {
  getWriteAboutPhotoProgressForItem,
  type WriteAboutPhotoItemProgress,
} from "@/lib/write-about-photo-storage";
import type { PhotoSpeakItem } from "@/types/photo-speak";

const MAX_SCORE = 160;

function subscribeWriteProgress(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", cb);
  window.addEventListener("ep-write-about-photo-progress", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("ep-write-about-photo-progress", cb);
  };
}

export function WriteAboutPhotoExamCard({ item }: { item: PhotoSpeakItem }) {
  const itemId = typeof item.id === "string" && item.id.trim() ? item.id : "unknown-item";
  const imageUrl = typeof item.imageUrl === "string" ? item.imageUrl : "";
  const titleEn = typeof item.titleEn === "string" && item.titleEn.trim() ? item.titleEn : "Untitled photo";
  const titleTh = typeof item.titleTh === "string" ? item.titleTh : titleEn;
  const contextEn = typeof item.contextEn === "string" ? item.contextEn : "";

  const [progress, setProgress] = useState<WriteAboutPhotoItemProgress | undefined>(undefined);

  useEffect(() => {
    setProgress(getWriteAboutPhotoProgressForItem(itemId));
    return subscribeWriteProgress(() => {
      setProgress(getWriteAboutPhotoProgressForItem(itemId));
    });
  }, [itemId]);

  const started = !!progress;
  const latest = progress?.latestScore160 ?? null;
  const perfect = latest !== null && latest >= MAX_SCORE;
  const showRedeem = started && !perfect;

  const sessionHref = `/practice/production/write-about-photo/play?itemId=${encodeURIComponent(itemId)}`;

  return (
    <BrutalPanel className="h-full overflow-hidden p-0">
      <div className="flex h-full flex-col">
        <Link href={sessionHref} className="block hover:bg-ep-yellow/10">
          <div className="relative aspect-[4/3] w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {imageUrl ? (
              <img
                src={imageUrl}
                alt=""
                className="h-full w-full scale-105 object-cover blur-md"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-neutral-200 text-xs font-bold text-neutral-600">
                NO IMAGE
              </div>
            )}
            <p className="ep-stat absolute bottom-2 left-2 rounded-sm border border-black/30 bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase text-neutral-700">
              Blurred until you start
            </p>
          </div>
          <div className="space-y-1 p-3">
            <p className="text-sm font-extrabold leading-tight">{titleEn}</p>
            {contextEn ? (
              <p className="ep-stat line-clamp-2 text-xs text-neutral-600">{contextEn}</p>
            ) : (
              <p className="ep-stat line-clamp-2 text-xs text-neutral-600">{titleTh}</p>
            )}
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
                  href={`/practice/production/write-about-photo/report/${progress.latestAttemptId}`}
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
