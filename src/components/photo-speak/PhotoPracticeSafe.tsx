"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PhotoSpeakItem } from "@/types/photo-speak";
import {
  loadWriteAboutPhotoRounds,
  type WriteAboutPhotoRoundNum,
} from "@/lib/write-about-photo-storage";

type Props = {
  mode: "write" | "speak";
};

type FlatItem = {
  round: WriteAboutPhotoRoundNum;
  item: PhotoSpeakItem;
};

function flattenItems(): FlatItem[] {
  const s = loadWriteAboutPhotoRounds();
  const out: FlatItem[] = [];
  ([1, 2, 3, 4, 5] as const).forEach((round) => {
    s.rounds[round].forEach((item) => out.push({ round, item }));
  });
  return out;
}

export function PhotoPracticeSafe({ mode }: Props) {
  const [items, setItems] = useState<FlatItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const refresh = () => setItems(flattenItems());
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

  const active = useMemo(
    () => items.find((x) => x.item.id === activeId) ?? null,
    [items, activeId],
  );

  const title = mode === "write" ? "Write about photo" : "Speak about photo";
  const helper =
    mode === "write"
      ? "Safe mode: open a prompt and type your response here."
      : "Safe mode: open a prompt and practise speaking (or type transcript) here.";

  if (!active) {
    return (
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <header className="ep-brutal rounded-sm border-black bg-white p-6">
          <p className="ep-stat text-xs font-bold uppercase tracking-widest text-ep-blue">{title}</p>
          <h1 className="mt-2 text-3xl font-black">Quick safe mode</h1>
          <p className="mt-2 text-sm text-neutral-600">{helper}</p>
        </header>

        {items.length === 0 ? (
          <p className="rounded-sm border-2 border-dashed border-neutral-400 bg-neutral-50 p-6 text-sm font-bold text-neutral-700">
            COMING SOON
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map(({ round, item }) => (
              <li key={`${round}:${item.id}`} className="rounded-sm border-2 border-black bg-white p-3">
                <p className="ep-stat text-[10px] font-bold uppercase tracking-widest text-ep-blue">
                  Round {round}
                </p>
                <p className="mt-1 text-sm font-black">{item.titleEn || "Untitled photo task"}</p>
                <p className="mt-1 line-clamp-2 text-xs text-neutral-600">{item.titleTh || item.promptTh}</p>
                <button
                  type="button"
                  onClick={() => {
                    setDraft("");
                    setActiveId(item.id);
                  }}
                  className="mt-3 w-full border-2 border-black bg-ep-yellow py-2 text-xs font-black uppercase shadow-[2px_2px_0_0_#000]"
                >
                  Start
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    );
  }

  const { item, round } = active;
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap gap-3 text-sm font-bold text-ep-blue">
        <button type="button" onClick={() => setActiveId(null)} className="hover:underline">
          ← Back to all photos
        </button>
        <span className="text-neutral-300">·</span>
        <Link href="/practice" className="hover:underline">
          Practice hub
        </Link>
      </div>

      <header className="ep-brutal rounded-sm border-black bg-white p-6">
        <p className="ep-stat text-xs font-bold uppercase tracking-widest text-ep-blue">
          {title} · Round {round}
        </p>
        <h1 className="mt-2 text-2xl font-black">{item.titleEn || "Untitled photo task"}</h1>
        <p className="text-sm text-neutral-600">{item.titleTh || item.promptTh}</p>
      </header>

      <section className="rounded-sm border-2 border-black bg-white p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt=""
          className="max-h-[26rem] w-full rounded-sm border border-neutral-200 object-cover"
          referrerPolicy="no-referrer"
        />
        <p className="mt-4 text-sm font-bold text-neutral-900">{item.promptEn}</p>
        <p className="mt-1 text-sm text-neutral-700">{item.promptTh}</p>
        {item.contextEn ? (
          <p className="mt-2 rounded-sm border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-neutral-700">
            {item.contextEn}
          </p>
        ) : null}
      </section>

      <section className="rounded-sm border-2 border-black bg-white p-4">
        <p className="text-sm font-bold text-neutral-800">
          {mode === "write" ? "Your response" : "Your speaking notes / transcript"}
        </p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={8}
          placeholder={mode === "write" ? "Type your response here..." : "Type key points or transcript here..."}
          className="mt-2 w-full border-2 border-black bg-white px-3 py-2 text-sm"
        />
      </section>
    </main>
  );
}
