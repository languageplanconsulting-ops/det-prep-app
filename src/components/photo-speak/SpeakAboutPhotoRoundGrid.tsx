"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SpeakAboutPhotoExamCard } from "@/components/photo-speak/SpeakAboutPhotoExamCard";
import {
  fetchPhotoSpeakItems,
  photoSpeakRoundNumber,
  type PhotoSpeakItemWithProgress,
} from "@/lib/photo-speak-api";

function parseRound(p: string): number | undefined {
  const n = Number(p);
  return Number.isInteger(n) && n >= 1 ? n : undefined;
}

export function SpeakAboutPhotoRoundGrid({ roundParam }: { roundParam: string }) {
  const round = parseRound(roundParam);
  const [items, setItems] = useState<PhotoSpeakItemWithProgress[] | null>(null);

  useEffect(() => {
    if (!round) return;
    let cancelled = false;
    fetchPhotoSpeakItems("speak_about_photo")
      .then((all) => {
        if (!cancelled) setItems(all.filter((it) => photoSpeakRoundNumber(it.sort_order) === round));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [round]);

  if (!round) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="font-bold">Invalid round.</p>
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
        <h1 className="mt-2 text-2xl sm:text-3xl font-black">Speak about photo</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Same photos as <strong>Write about photo</strong>. Thumbnails stay blurred here until you tap{" "}
          <strong>Start</strong>. After you submit, your score appears and you can open <strong>Redeem</strong>{" "}
          to review the report if you are not at {160}/{160}.
        </p>
      </header>

      {items === null ? (
        <p className="rounded-sm border-2 border-dashed border-neutral-400 bg-neutral-50 p-6 text-sm text-neutral-700">
          Loading…
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-sm border-2 border-dashed border-neutral-400 bg-neutral-50 p-6 text-sm text-neutral-700">
          No photos in this round.{" "}
          <Link href="/practice/production/speak-about-photo" className="font-bold text-ep-blue underline">
            Back to all rounds
          </Link>
          .
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
