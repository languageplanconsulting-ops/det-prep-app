"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import {
  getSpeakAboutPhotoRoundStats,
} from "@/lib/speak-about-photo-progress";
import {
  getWriteAboutPhotoRoundCounts,
  type WriteAboutPhotoRoundNum,
} from "@/lib/write-about-photo-storage";

const ROUND_LABELS: Record<WriteAboutPhotoRoundNum, { en: string; th: string }> = {
  1: { en: "Round 1", th: "รอบที่ 1" },
  2: { en: "Round 2", th: "รอบที่ 2" },
  3: { en: "Round 3", th: "รอบที่ 3" },
  4: { en: "Round 4", th: "รอบที่ 4" },
  5: { en: "Round 5", th: "รอบที่ 5" },
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

export function SpeakAboutPhotoSetList() {
  const [counts, setCounts] = useState<Record<WriteAboutPhotoRoundNum, number>>(() =>
    getWriteAboutPhotoRoundCounts(),
  );
  const [, setRefresh] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setCounts(getWriteAboutPhotoRoundCounts());
      setRefresh((n) => n + 1);
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-write-about-photo-rounds", refresh);
    window.addEventListener("ep-speak-about-photo-progress", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-write-about-photo-rounds", refresh);
      window.removeEventListener("ep-speak-about-photo-progress", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Link href="/practice" className="text-sm font-bold text-ep-blue hover:underline">
        ← Practice hub
      </Link>
      <header className="ep-brutal rounded-sm border-black bg-white p-6">
        <p className="ep-stat text-xs font-bold uppercase tracking-widest text-ep-blue">
          Speak about photo
        </p>
        <h1 className="mt-2 text-3xl font-black">Choose a round</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Five rounds — same image bank as <strong>Write about photo</strong> (one admin upload). Each card
          shows your <strong>average speaking score</strong> in that round and when you last finished a
          speak task. Open a round to see blurred thumbnails; tap <strong>Start</strong> to see the photo
          clearly in the exam flow.
        </p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">
        {([1, 2, 3, 4, 5] as const).map((round) => {
          const stats = getSpeakAboutPhotoRoundStats(round);
          return (
            <li key={round}>
              <Link href={`/practice/production/speak-about-photo/round/${round}`}>
                <BrutalPanel className="h-full p-5 hover:bg-ep-yellow/15">
                  <p className="ep-stat text-[10px] font-bold uppercase tracking-widest text-ep-blue">
                    {counts[round]} photo{counts[round] === 1 ? "" : "s"} uploaded
                  </p>
                  <p className="mt-2 text-lg font-extrabold">{ROUND_LABELS[round].en}</p>
                  <p className="text-sm text-neutral-600">{ROUND_LABELS[round].th}</p>
                  <div className="mt-4 space-y-1 border-t-2 border-neutral-200 pt-3 text-sm">
                    <p className="font-bold text-neutral-800">
                      Avg score (speaking):{" "}
                      <span className="text-ep-blue">
                        {stats.averageScore !== null ? `${stats.averageScore}/160` : "—"}
                      </span>
                    </p>
                    <p className="ep-stat text-xs text-neutral-600">
                      Last speak attempt:{" "}
                      <span className="font-semibold text-neutral-800">
                        {formatWhen(stats.lastAttemptedAt)}
                      </span>
                    </p>
                  </div>
                </BrutalPanel>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
