"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SpeakAboutPhotoExamCard } from "@/components/photo-speak/SpeakAboutPhotoExamCard";
import { SoftHubHeader } from "@/components/practice/SoftHubHeader";
import {
  fetchPhotoSpeakItems,
  photoSpeakRoundNumber,
  type PhotoSpeakItemWithProgress,
} from "@/lib/photo-speak-api";

interface RoundSummary {
  round: number;
  count: number;
  averageScore: number | null;
}

function summarizeRounds(items: PhotoSpeakItemWithProgress[]): RoundSummary[] {
  const byRound = new Map<number, PhotoSpeakItemWithProgress[]>();
  for (const item of items) {
    const round = photoSpeakRoundNumber(item.sort_order);
    const arr = byRound.get(round) ?? [];
    arr.push(item);
    byRound.set(round, arr);
  }
  return [...byRound.entries()]
    .sort(([a], [b]) => a - b)
    .map(([round, roundItems]) => {
      const scored = roundItems.map((it) => it.progress?.latest_score160).filter((s): s is number => s != null);
      const averageScore = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null;
      return { round, count: roundItems.length, averageScore };
    });
}

export function SpeakAboutPhotoSetList() {
  const [items, setItems] = useState<PhotoSpeakItemWithProgress[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPhotoSpeakItems("speak_about_photo")
      .then((next) => {
        if (!cancelled) setItems(next);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : "Could not load photos");
        setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rounds = useMemo(() => summarizeRounds(items ?? []), [items]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-2">
      <Link href="/practice" className="text-sm font-semibold text-[#004AAD] hover:underline">
        ← กลับหน้าฝึก
      </Link>
      <SoftHubHeader
        color="violet"
        icon="🎤"
        eyebrow="Production · Speak about photo"
        title="พูดบรรยายภาพ"
        subtitle="Speak about photo"
        tip={
          <>
            ใช้ <strong>1 นาทีเตรียม</strong> วางประโยคในหัวก่อน — In this photo I can see… · There are… ·
            แล้วค่อยกดอัด จะพูดลื่นกว่ามากครับ
          </>
        }
      />
      {loadError ? <p className="text-sm font-bold text-red-700">{loadError}</p> : null}
      {rounds.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {rounds.map(({ round, count, averageScore }) => (
            <div key={`sum-${round}`} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
              <p className="font-bold text-slate-900">Round {round}</p>
              <p className="text-xs text-slate-500">{count} ภาพ</p>
              <p className="mt-2 text-xs text-slate-500">
                เฉลี่ย: {averageScore !== null ? `${averageScore}/160` : "—"}
              </p>
            </div>
          ))}
        </div>
      ) : null}
      {items === null ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          กำลังโหลด…
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          ยังไม่มีภาพ
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <li key={item.id} className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700">
                Round {photoSpeakRoundNumber(item.sort_order)}
              </p>
              <SpeakAboutPhotoExamCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
