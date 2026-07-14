"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CoachBubble } from "@/components/ui/CoachBubble";
import { sfxCorrect, sfxWrong } from "@/lib/exam-sfx";
import type { NotebookEntry } from "@/types/writing";

const MAX_WORDS = 20;
// How long a correct pair holds its green flash before fading out, and how
// long the fade itself takes — gives the learner a moment to register "yes,
// that was right" before the cards actually leave the grid.
const CORRECT_HOLD_MS = 500;
const FADE_MS = 650;
const WRONG_TIP_MS = 1500;

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
  const [fadingId, setFadingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [correctId, setCorrectId] = useState<string | null>(null);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [showTryAgain, setShowTryAgain] = useState(false);
  // Body scroll-lock is owned by the parent (NotebookListV2) for all review
  // overlays — don't duplicate it here, two lock/restore effects race on
  // cleanup order and can leave scroll permanently stuck off.
  const [portalReady, setPortalReady] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    setPortalReady(true);
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const done = (id: string) => matched.has(id);
  const remaining = left.filter((w) => !done(w.id));

  const tapWord = (id: string) => {
    if (done(id) || correctId) return;
    setSelectedId((cur) => (cur === id ? null : id));
  };

  const tapMeaning = (boxId: string) => {
    if (!selectedId || done(boxId) || correctId) return;
    if (selectedId === boxId) {
      sfxCorrect();
      const id = selectedId;
      setCorrectId(id);
      setSelectedId(null);
      timers.current.push(
        setTimeout(() => {
          setFadingId(id);
          timers.current.push(
            setTimeout(() => {
              setMatched((prev) => new Set(prev).add(id));
              setCorrectId(null);
              setFadingId(null);
              onMastered(id);
            }, FADE_MS),
          );
        }, CORRECT_HOLD_MS),
      );
    } else {
      sfxWrong();
      setWrongId(boxId);
      setShowTryAgain(true);
      setSelectedId(null);
      timers.current.push(
        setTimeout(() => {
          setWrongId((cur) => (cur === boxId ? null : cur));
          setShowTryAgain(false);
        }, WRONG_TIP_MS),
      );
    }
  };

  if (!portalReady) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#004AAD]">🧩 เกมจับคู่คำศัพท์</p>
            <p className="mt-0.5 text-xs text-slate-500">
              แตะคำศัพท์ แล้วแตะความหมายที่ตรงกัน · เหลืออีก {remaining.length} คู่
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

        {showTryAgain ? (
          <div className="mb-4">
            <CoachBubble label="ลองใหม่นะ">ยังไม่ตรงกันนะ ลองใหม่อีกครั้ง!</CoachBubble>
          </div>
        ) : null}

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
            <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto overscroll-contain pr-1">
              {left
                .filter((w) => !done(w.id))
                .map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => tapWord(w.id)}
                    className={`rounded-xl border px-3 py-2.5 text-left text-sm font-bold shadow-sm transition-opacity duration-[650ms] ${
                      fadingId === w.id ? "opacity-0" : "opacity-100"
                    } ${
                      correctId === w.id
                        ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                        : selectedId === w.id
                          ? "border-[#004AAD] bg-blue-50 text-slate-900"
                          : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                    }`}
                  >
                    {w.titleEn}
                  </button>
                ))}
            </div>
            <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto overscroll-contain pl-1">
              {right
                .filter((w) => !done(w.id))
                .map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => tapMeaning(w.id)}
                    className={`rounded-xl border-2 border-dashed px-3 py-2.5 text-left text-sm transition-opacity duration-[650ms] ${
                      fadingId === w.id ? "opacity-0" : "opacity-100"
                    } ${
                      correctId === w.id
                        ? "border-emerald-400 border-solid bg-emerald-50 text-emerald-800"
                        : wrongId === w.id
                          ? "border-rose-400 border-solid bg-rose-50 text-rose-700"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    {meaningOf(w)}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
