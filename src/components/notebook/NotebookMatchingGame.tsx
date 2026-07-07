"use client";

import { useState } from "react";
import type { NotebookEntry } from "@/types/writing";

const MAX_WORDS = 20;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function meaningOf(w: NotebookEntry): string {
  return w.titleTh || w.bodyTh || w.bodyEn || "";
}

export function NotebookMatchingGame({
  deck,
  onMastered,
  onClose,
}: {
  deck: NotebookEntry[];
  onMastered: (id: string) => void;
  onClose: () => void;
}) {
  // Frozen for the lifetime of this session — never re-derived from `deck`, so a
  // background entries refresh (server hydration, another tab) can't shrink the
  // grid out from under an in-progress game or desync the "remaining" count.
  const [left] = useState(() => shuffle(deck.slice(0, MAX_WORDS)));
  const [right] = useState(() => shuffle(deck.slice(0, MAX_WORDS)));
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [wrongBoxId, setWrongBoxId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const done = (id: string) => matched.has(id) || removed.has(id);
  const remaining = left.filter((w) => !done(w.id));

  const handleDrop = (boxId: string) => {
    const droppedId = draggingId;
    setDraggingId(null);
    if (!droppedId || done(droppedId) || done(boxId)) return;
    if (droppedId === boxId) {
      setMatched((prev) => new Set(prev).add(droppedId));
    } else {
      setWrongBoxId(boxId);
      window.setTimeout(() => setWrongBoxId((cur) => (cur === boxId ? null : cur)), 500);
    }
  };

  const markMastered = (id: string) => {
    setRemoved((prev) => new Set(prev).add(id));
    onMastered(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#004AAD]">🧩 เกมจับคู่คำศัพท์</p>
            <p className="mt-0.5 text-xs text-slate-500">
              ลากคำศัพท์ไปวางบนความหมายที่ตรงกัน · เหลืออีก {remaining.length} คู่
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600"
          >
            ✕ ปิด
          </button>
        </div>

        {remaining.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 py-12 text-center">
            <p className="text-2xl">🎉</p>
            <p className="text-sm font-bold text-slate-700">จับคู่ครบแล้ว เก่งมาก!</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-[#004AAD] px-5 py-2 text-sm font-bold text-[#FFCC00]"
            >
              เสร็จสิ้น
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              {left
                .filter((w) => !done(w.id))
                .map((w) => (
                  <div
                    key={w.id}
                    draggable
                    onDragStart={() => setDraggingId(w.id)}
                    onDragEnd={() => setDraggingId(null)}
                    className="flex cursor-grab items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 shadow-sm active:cursor-grabbing"
                  >
                    <span>{w.titleEn}</span>
                    <button
                      type="button"
                      title="จำได้แล้ว — เอาออกจากคำศัพท์"
                      onClick={() => markMastered(w.id)}
                      className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
                    >
                      🧠 จำได้แล้ว
                    </button>
                  </div>
                ))}
            </div>
            <div className="flex flex-col gap-2">
              {right
                .filter((w) => !done(w.id))
                .map((w) => (
                  <div
                    key={w.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(w.id)}
                    className={`rounded-xl border-2 border-dashed px-3 py-2.5 text-sm text-slate-600 transition ${
                      wrongBoxId === w.id
                        ? "border-rose-400 bg-rose-50 text-rose-700"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    {meaningOf(w)}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
