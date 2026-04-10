"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { SpeakAboutPhotoExamCard } from "@/components/photo-speak/SpeakAboutPhotoExamCard";
import {
  getSpeakAboutPhotoRoundStats,
} from "@/lib/speak-about-photo-progress";
import {
  loadWriteAboutPhotoRounds,
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
  const [counts, setCounts] = useState<Record<WriteAboutPhotoRoundNum, number>>({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  });
  const [items, setItems] = useState<
    { id: string; round: WriteAboutPhotoRoundNum; item: Parameters<typeof SpeakAboutPhotoExamCard>[0]["item"] }[]
  >([]);
  const [, setRefresh] = useState(0);

  useEffect(() => {
    const refresh = () => {
      const state = loadWriteAboutPhotoRounds();
      setCounts({
        1: state.rounds[1].length,
        2: state.rounds[2].length,
        3: state.rounds[3].length,
        4: state.rounds[4].length,
        5: state.rounds[5].length,
      });
      const next: { id: string; round: WriteAboutPhotoRoundNum; item: Parameters<typeof SpeakAboutPhotoExamCard>[0]["item"] }[] = [];
      ([1, 2, 3, 4, 5] as const).forEach((round) => {
        state.rounds[round].forEach((item) => next.push({ id: `${round}:${item.id}`, round, item }));
      });
      setItems(next);
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
          Quick mode: all uploaded photos are shown below (with round labels), using the same image bank as{" "}
          <strong>Write about photo</strong>. Tap <strong>Start</strong> to open a speaking attempt.
        </p>
      </header>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {([1, 2, 3, 4, 5] as const).map((round) => {
          const stats = getSpeakAboutPhotoRoundStats(round);
          return (
            <div key={`sum-${round}`} className="rounded-sm border-2 border-black/20 bg-white p-3 text-sm">
              <p className="font-black">{ROUND_LABELS[round].en}</p>
              <p className="ep-stat text-xs text-neutral-600">{counts[round]} photo(s)</p>
              <p className="ep-stat mt-2 text-xs text-neutral-600">
                Avg: {stats.averageScore !== null ? `${stats.averageScore}/160` : "—"}
              </p>
              <p className="ep-stat text-xs text-neutral-600">Last: {formatWhen(stats.lastAttemptedAt)}</p>
            </div>
          );
        })}
      </div>

      {items.length === 0 ? (
        <BrutalPanel className="h-full cursor-not-allowed border-dashed p-5 opacity-80">
          <p className="font-black uppercase tracking-wide text-amber-700">COMING SOON</p>
          <p className="ep-stat text-xs text-neutral-600">No photos uploaded yet.</p>
        </BrutalPanel>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map(({ id, round, item }) => (
            <li key={id} className="space-y-1">
              <p className="ep-stat text-[10px] font-bold uppercase tracking-widest text-ep-blue">
                Round {round}
              </p>
              <SpeakAboutPhotoExamCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
