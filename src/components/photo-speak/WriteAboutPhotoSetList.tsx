"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
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

export function WriteAboutPhotoSetList() {
  const [counts, setCounts] = useState<Record<WriteAboutPhotoRoundNum, number>>(() =>
    getWriteAboutPhotoRoundCounts(),
  );

  useEffect(() => {
    const refresh = () => setCounts(getWriteAboutPhotoRoundCounts());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-write-about-photo-rounds", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-write-about-photo-rounds", refresh);
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
          Write about photo
        </p>
        <h1 className="mt-2 text-3xl font-black">Choose a round</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Five rounds (no difficulty). Admins upload image URLs and context in{" "}
          <Link href="/admin" className="font-bold text-ep-blue underline">
            Admin
          </Link>
          . Thumbnails stay blurred until you open an item. After you submit, tiles show your latest score;
          open <strong>Redeem</strong> to review your report if you are not at 160/160.
        </p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">
        {([1, 2, 3, 4, 5] as const).map((round) => (
          <li key={round}>
            <Link href={`/practice/production/write-about-photo/round/${round}`}>
              <BrutalPanel className="h-full p-5 hover:bg-ep-yellow/15">
                <p className="ep-stat text-[10px] font-bold uppercase tracking-widest text-ep-blue">
                  {counts[round]} photo{counts[round] === 1 ? "" : "s"}
                </p>
                <p className="mt-2 text-lg font-extrabold">{ROUND_LABELS[round].en}</p>
                <p className="text-sm text-neutral-600">{ROUND_LABELS[round].th}</p>
              </BrutalPanel>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
