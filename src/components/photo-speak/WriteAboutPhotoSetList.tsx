"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WriteAboutPhotoExamCard } from "@/components/photo-speak/WriteAboutPhotoExamCard";
import {
  loadWriteAboutPhotoRounds,
  type WriteAboutPhotoRoundNum,
} from "@/lib/write-about-photo-storage";

type CardItem = {
  round: WriteAboutPhotoRoundNum;
  id: string;
  item: Parameters<typeof WriteAboutPhotoExamCard>[0]["item"];
};

export function WriteAboutPhotoSetList() {
  const [items, setItems] = useState<CardItem[]>([]);

  useEffect(() => {
    const refresh = () => {
      const state = loadWriteAboutPhotoRounds();
      const next: CardItem[] = [];
      ([1, 2, 3, 4, 5] as const).forEach((round) => {
        state.rounds[round].forEach((item) => {
          next.push({
            round,
            id: `${round}:${item.id}`,
            item,
          });
        });
      });
      setItems(next);
    };
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
        <h1 className="mt-2 text-3xl font-black">เลือกภาพ</h1>
        <p className="mt-2 text-sm text-neutral-600">
          ดูภาพแล้วเขียนบรรยายเป็นภาษาอังกฤษ · เลือกภาพด้านล่างเพื่อเริ่มได้เลย ·
          ภาพจะเบลอจนกว่าคุณจะกดเริ่ม · พอส่งแล้วการ์ดจะแสดงคะแนนล่าสุด —
          กด <strong>ดูผล</strong> เพื่อทบทวนรายงานถ้ายังไม่ถึง 160/160
        </p>
      </header>
      {items.length === 0 ? (
        <p className="rounded-sm border-2 border-dashed border-neutral-400 bg-neutral-50 p-6 text-sm font-bold text-neutral-700">
          COMING SOON (or sync latest upload from admin browser)
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map(({ id, round, item }) => (
            <li key={id} className="space-y-1">
              <p className="ep-stat text-[10px] font-bold uppercase tracking-widest text-ep-blue">
                Round {round}
              </p>
              <WriteAboutPhotoExamCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
