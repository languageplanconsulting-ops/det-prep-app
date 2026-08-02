"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { sfxCorrect, sfxWrong } from "@/lib/exam-sfx";
import {
  MOVE_LABELS,
  MOVE_ORDER,
  READSPEAK_ITEMS,
  type ReadSpeakItem,
  type ReadSpeakMove,
  type ReadSpeakMoveKind,
} from "@/lib/readspeak-lessons";

/**
 * VIP-only "build the answer move-by-move" drill.
 *
 * The learner sees the question and assembles a full answer one move at a time
 * — Direct answer → Explain → Provide an example → Conclude — choosing the
 * right sentence for each move. Distractors are real sentences of the SAME move
 * kind taken from other questions, so picking correctly means noticing which
 * move actually answers THIS question, not just spotting a connective.
 */
export function ReadSpeakPatternCoach({ item, onDone }: { item: ReadSpeakItem; onDone: () => void }) {
  const moves = item.moves ?? [];
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<(string | null)[]>(() => new Array(moves.length).fill(null));
  const [wrongPick, setWrongPick] = useState<string | null>(null);

  const choices = useMemo(() => moves.map((m, i) => optionsForMove(item.id, m, i)), [item.id, moves]);

  if (!moves.length) return null;

  // `step` runs one past the last move once the answer is complete, so nothing
  // may read `current` before checking `done`.
  const done = step >= moves.length;
  const current = done ? null : moves[step]!;
  const label = current ? MOVE_LABELS[current.kind] : null;

  function choose(option: string) {
    if (!current) return;
    if (option !== current.en) {
      sfxWrong();
      setWrongPick(option);
      return;
    }
    sfxCorrect();
    setWrongPick(null);
    setPicked((p) => {
      const n = [...p];
      n[step] = option;
      return n;
    });
    setStep((s) => s + 1);
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full bg-[#6B45C7] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">VIP</span>
        <p className="text-xs font-black text-slate-600">ประกอบคำตอบทีละส่วน — จำโครง 4 ขั้นให้ขึ้นใจ</p>
      </div>

      {/* what has been built so far */}
      {picked.some(Boolean) ? (
        <div className="mb-4 rounded-2xl border border-emerald-400 bg-emerald-50 p-4">
          {moves.map((m, i) =>
            picked[i] ? (
              <p key={i} className="mb-2 last:mb-0 text-[14px] leading-6 text-emerald-950">
                <span className="mr-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white">{MOVE_LABELS[m.kind].en}</span>
                {picked[i]}
              </p>
            ) : null,
          )}
        </div>
      ) : null}

      {done ? (
        <div>
          <p className="mb-3 text-sm font-bold text-slate-800">ครบทั้ง 4 ขั้นแล้ว — นี่คือคำตอบเต็มที่คุณเพิ่งประกอบเอง 🎉</p>
          <button type="button" onClick={onDone} className="w-full rounded-xl bg-[#004AAD] py-3 text-sm font-bold text-[#FFCC00]">
            ต่อไป · เติมคำในคำตอบ →
          </button>
        </div>
      ) : current && label ? (
        <>
          <div className="mb-3 rounded-xl bg-[#E7E0FA] p-3">
            <p className="text-sm font-black text-[#6B45C7]">
              ขั้นที่ {step + 1}/{moves.length} · {label.th} <span className="font-bold text-slate-500">({label.en})</span>
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-600">{label.hintTh}</p>
          </div>

          <div className="space-y-2">
            {(choices[step] ?? []).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => choose(opt)}
                className={`block w-full rounded-xl border-[1.5px] p-3 text-left text-[14px] leading-6 ${
                  wrongPick === opt ? "border-rose-500 bg-rose-50 text-rose-900" : "border-slate-200 bg-white text-slate-800"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          {wrongPick ? (
            <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              ยังไม่ใช่ — ประโยคนี้เป็น “{label.th}” ของคำถามอื่น ลองหาประโยคที่ตอบ “{item.topic}” โดยตรง
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** The locked state shown to everyone who is not VIP. */
export function ReadSpeakPatternTeaser({ item }: { item: ReadSpeakItem }) {
  const first = item.moves?.[0];
  if (!first) return null;
  return (
    <div className="mb-4 overflow-hidden rounded-2xl border-[1.5px] border-dashed border-[#6B45C7] bg-[#F6F2FF] p-4">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-[#6B45C7] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">VIP</span>
        <p className="text-xs font-black text-[#6B45C7]">โครงคำตอบ 4 ขั้น ของพี่ดอย</p>
      </div>
      <p className="mt-2 text-[13px] font-semibold text-slate-700">
        <span className="mr-1.5 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-black text-white">{MOVE_LABELS.direct.en}</span>
        {first.en}
      </p>
      <div aria-hidden className="mt-2 space-y-1.5 blur-[5px]">
        {MOVE_ORDER.slice(1).map((k) => (
          <p key={k} className="text-[13px] font-semibold text-slate-700">
            <span className="mr-1.5 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-black text-white">{MOVE_LABELS[k].en}</span>
            {item.moves?.find((m) => m.kind === k)?.en ?? ""}
          </p>
        ))}
      </div>
      <Link href="/pricing" className="mt-3 inline-block rounded-xl bg-[#6B45C7] px-4 py-2 text-xs font-black text-white">
        ปลดล็อกด้วย VIP / Fast Track →
      </Link>
    </div>
  );
}

/**
 * Two distractors of the same move kind, pulled from other questions.
 * Chosen by index rather than at random so the drill is stable across renders
 * (and identical on server and client).
 */
function optionsForMove(itemId: string, move: ReadSpeakMove, moveIndex: number): string[] {
  const pool = READSPEAK_ITEMS.filter((i) => i.id !== itemId && i.moves?.some((m) => m.kind === move.kind))
    .map((i) => i.moves!.find((m) => m.kind === move.kind)!.en)
    .filter((en) => en !== move.en);

  const seed = hash(itemId) + moveIndex * 7;
  const picks: string[] = [];
  for (let k = 0; k < 2 && pool.length; k++) {
    const pick = pool[(seed + k * 13) % pool.length]!;
    if (!picks.includes(pick)) picks.push(pick);
  }

  const all = [move.en, ...picks];
  // stable shuffle: rotate by the seed so the answer is not always first
  const offset = seed % all.length;
  return [...all.slice(offset), ...all.slice(0, offset)];
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export type { ReadSpeakMoveKind };
