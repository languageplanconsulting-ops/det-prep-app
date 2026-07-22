"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SPEAKING_PATTERN_PARTS,
  emptyPatternNotes,
  isBlank,
  type PatternPart,
} from "@/lib/speaking-pattern";

/**
 * Fast Track VIP note-taking scaffold for Read-and-then-speak.
 *
 * During prep the learner fills P'Doy's 4-part pattern in-line ("Throughout my
 * life, I have ____"). While recording, the same notes come back as a compact
 * sticky card so they can read their own plan out loud.
 */

const STORAGE_PREFIX = "ep-speaking-notes:";

export function useSpeakingPatternNotes(key: string | null) {
  const [notes, setNotes] = useState<string[][]>(emptyPatternNotes);

  useEffect(() => {
    if (!key) {
      setNotes(emptyPatternNotes());
      return;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      const base = emptyPatternNotes();
      if (Array.isArray(parsed)) {
        base.forEach((row, pi) => {
          const savedRow = parsed[pi];
          if (!Array.isArray(savedRow)) return;
          row.forEach((_, bi) => {
            if (typeof savedRow[bi] === "string") row[bi] = savedRow[bi];
          });
        });
      }
      setNotes(base);
    } catch {
      setNotes(emptyPatternNotes());
    }
  }, [key]);

  const persist = useCallback(
    (next: string[][]) => {
      if (!key) return;
      try {
        window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(next));
      } catch {
        /* quota / private mode — notes still live in state */
      }
    },
    [key],
  );

  const setBlank = useCallback(
    (partIndex: number, blankIndex: number, value: string) => {
      setNotes((prev) => {
        const next = prev.map((row) => [...row]);
        next[partIndex][blankIndex] = value;
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clear = useCallback(() => {
    const next = emptyPatternNotes();
    setNotes(next);
    persist(next);
  }, [persist]);

  const { filled, total } = useMemo(() => {
    const flat = notes.flat();
    return { filled: flat.filter((v) => v.trim()).length, total: flat.length };
  }, [notes]);

  return { notes, setBlank, clear, filled, total, hasNotes: filled > 0 };
}

export type SpeakingPatternNotesApi = ReturnType<typeof useSpeakingPatternNotes>;

function BlankInput({
  value,
  hint,
  onChange,
}: {
  value: string;
  hint: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  const width = Math.min(34, Math.max(8, value.length + 1, hint.length * 0.85));
  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={hint}
      spellCheck={false}
      style={{ width: `${width}ch` }}
      className="mx-[3px] inline-block max-w-full rounded-md border-b-2 border-dashed border-[#004AAD]/30 bg-[#004AAD]/[0.04] px-1.5 py-[3px] align-baseline text-[13px] font-semibold text-[#004AAD] transition-colors placeholder:font-normal placeholder:text-slate-300 focus:border-solid focus:border-[#004AAD] focus:bg-[#004AAD]/[0.08] focus:outline-none"
    />
  );
}

function PartRow({
  part,
  index,
  row,
  onChange,
}: {
  part: PatternPart;
  index: number;
  row: string[];
  onChange: (blankIndex: number, value: string) => void;
}) {
  let blankIndex = -1;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#004AAD] text-[10px] font-bold text-white">
          {index + 1}
        </span>
        <span className="text-[11px] font-semibold text-slate-500">{part.th}</span>
      </div>
      <p className="mt-2 text-[13px] leading-[2.1] text-slate-700">
        {part.tokens.map((token, i) => {
          if (!isBlank(token)) return <span key={i}>{token}</span>;
          blankIndex += 1;
          const bi = blankIndex;
          return (
            <BlankInput
              key={i}
              value={row[bi] ?? ""}
              hint={token.hint}
              onChange={(v) => onChange(bi, v)}
            />
          );
        })}
      </p>
    </div>
  );
}

/** Full editor — shown while the learner is preparing. */
export function SpeakingNotesEditor({
  api,
  onDone,
}: {
  api: SpeakingPatternNotesApi;
  onDone?: () => void;
}) {
  const { notes, setBlank, clear, filled, total } = api;
  return (
    <div className="rounded-2xl border border-[#004AAD]/15 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFCC00] px-2.5 py-[5px] text-[10px] font-extrabold uppercase leading-none tracking-wide text-[#004AAD]">
          👑 Fast Track VIP
        </span>
        <p className="text-sm font-bold text-slate-800">จดโน้ตลงแพตเทิร์น</p>
        <span className="ml-auto font-mono text-[11px] font-bold text-slate-400">
          {filled}/{total}
        </span>
      </div>
      <p className="mt-1.5 text-xs leading-6 text-slate-500">
        เติมช่องว่างเป็นคำสั้น ๆ ระหว่างเตรียมตัว — ตอนพูดโน้ตนี้จะขึ้นให้อ่าน
      </p>

      <div className="mt-3 space-y-2">
        {SPEAKING_PATTERN_PARTS.map((part, i) => (
          <PartRow
            key={i}
            part={part}
            index={i}
            row={notes[i] ?? []}
            onChange={(bi, v) => setBlank(i, bi, v)}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] text-slate-400">โน้ตถูกเก็บไว้ให้อัตโนมัติ</p>
        <div className="flex items-center gap-3">
          {filled > 0 ? (
            <button
              type="button"
              onClick={clear}
              className="text-[11px] font-semibold text-slate-400 hover:text-red-500"
            >
              ล้างโน้ต
            </button>
          ) : null}
          {onDone ? (
            <button
              type="button"
              onClick={onDone}
              className="rounded-lg bg-[#004AAD] px-3 py-1.5 text-[11px] font-bold text-white hover:opacity-90"
            >
              เสร็จแล้ว
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Read-only sticky card — shown while recording. */
export function SpeakingNotesCard({
  api,
  onEdit,
}: {
  api: SpeakingPatternNotesApi;
  onEdit: () => void;
}) {
  const { notes, filled, total } = api;
  const [open, setOpen] = useState(true);

  return (
    <div className="sticky top-2 z-20 mt-3 overflow-hidden rounded-2xl border border-[#004AAD]/20 bg-white/95 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2 border-b border-slate-100 px-3.5 py-2.5">
        <span className="text-sm">📝</span>
        <p className="text-xs font-bold text-slate-800">โน้ตของฉัน</p>
        <span className="font-mono text-[10px] font-bold text-slate-300">
          {filled}/{total}
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="ml-auto text-[11px] font-semibold text-slate-400 hover:text-[#004AAD]"
        >
          แก้ไข
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="text-[11px] font-semibold text-[#004AAD]"
        >
          {open ? "ย่อ" : "ขยาย"}
        </button>
      </div>
      {open ? (
        <div className="max-h-[42vh] space-y-2.5 overflow-y-auto px-3.5 py-3">
          {SPEAKING_PATTERN_PARTS.map((part, pi) => {
            let bi = -1;
            return (
              <p key={pi} className="text-[13px] leading-[1.9] text-slate-500">
                {part.tokens.map((token, i) => {
                  if (!isBlank(token)) return <span key={i}>{token}</span>;
                  bi += 1;
                  const v = (notes[pi]?.[bi] ?? "").trim();
                  return v ? (
                    <span key={i} className="font-bold text-[#004AAD]">
                      {v}
                    </span>
                  ) : (
                    <span key={i} className="text-slate-300">
                      ______
                    </span>
                  );
                })}
              </p>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
