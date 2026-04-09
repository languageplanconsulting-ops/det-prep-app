"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SpeakAboutPhotoExamCard } from "@/components/photo-speak/SpeakAboutPhotoExamCard";
import {
  getWriteAboutPhotoSetByRound,
  type WriteAboutPhotoRoundNum,
} from "@/lib/write-about-photo-storage";
import type { PhotoSpeakItem } from "@/types/photo-speak";

function parseRound(p: string): WriteAboutPhotoRoundNum | undefined {
  const n = Number(p);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return undefined;
}

export function SpeakAboutPhotoRoundGrid({ roundParam }: { roundParam: string }) {
  const round = parseRound(roundParam);
  const [items, setItems] = useState<PhotoSpeakItem[]>([]);

  useEffect(() => {
    if (!round) return;
    const load = () => setItems([...(getWriteAboutPhotoSetByRound(round) ?? [])]);
    load();
    const onStorage = () => load();
    window.addEventListener("storage", onStorage);
    window.addEventListener("ep-write-about-photo-rounds", load);
    window.addEventListener("focus", load);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("ep-write-about-photo-rounds", load);
      window.removeEventListener("focus", load);
    };
  }, [round]);

  if (!round) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="font-bold">Round must be 1–5.</p>
        <Link
          href="/practice/production/speak-about-photo"
          className="mt-4 inline-block text-ep-blue"
        >
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap gap-3 text-sm font-bold text-ep-blue">
        <Link href="/practice/production/speak-about-photo" className="hover:underline">
          ← All rounds
        </Link>
        <span className="text-neutral-300">·</span>
        <Link href="/practice" className="hover:underline">
          Practice hub
        </Link>
      </div>
      <header className="ep-brutal rounded-sm border-black bg-white p-6">
        <p className="ep-stat text-xs font-bold uppercase tracking-widest text-ep-blue">Round {round}</p>
        <h1 className="mt-2 text-3xl font-black">Speak about photo</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Same photos as <strong>Write about photo</strong> (admin upload). Thumbnails stay blurred here until
          you tap <strong>Start</strong>. After you submit, your score appears and you can open{" "}
          <strong>Redeem</strong> to review the report if you are not at {160}/{160}.
        </p>
      </header>

      {items.length === 0 ? (
        <p className="rounded-sm border-2 border-dashed border-neutral-400 bg-neutral-50 p-6 text-sm text-neutral-700">
          No photos in this round yet. An admin must add them under{" "}
          <Link href="/admin" className="font-bold text-ep-blue underline">
            Admin → Write &amp; speak about photo
          </Link>{" "}
          (same JSON as writing).
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((it) => (
            <li key={it.id}>
              <SpeakAboutPhotoExamCard item={it} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
