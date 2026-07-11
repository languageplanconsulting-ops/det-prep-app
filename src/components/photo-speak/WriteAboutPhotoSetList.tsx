"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WriteAboutPhotoExamCard } from "@/components/photo-speak/WriteAboutPhotoExamCard";
import { SoftHubHeader } from "@/components/practice/SoftHubHeader";
import {
  fetchPhotoSpeakItems,
  photoSpeakRoundNumber,
  type PhotoSpeakItemWithProgress,
} from "@/lib/photo-speak-api";

export function WriteAboutPhotoSetList() {
  const [items, setItems] = useState<PhotoSpeakItemWithProgress[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPhotoSpeakItems("write_about_photo")
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

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-2">
      <Link href="/practice" className="text-sm font-semibold text-[#004AAD] hover:underline">
        ← กลับหน้าฝึก
      </Link>
      <SoftHubHeader
        color="violet"
        icon="📸"
        eyebrow="Production · Write about photo"
        title="เขียนบรรยายภาพ"
        subtitle="Write about photo"
        tip={
          <>
            ดูภาพแล้วเขียนบรรยายเป็นภาษาอังกฤษ · เขียนให้ครบ <strong>ใคร ทำอะไร ที่ไหน</strong> แล้วเพิ่มรายละเอียด
            ก็ครบประเด็นง่ายๆ ครับ
          </>
        }
      />
      {loadError ? <p className="text-sm font-bold text-red-700">{loadError}</p> : null}
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
              <WriteAboutPhotoExamCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
