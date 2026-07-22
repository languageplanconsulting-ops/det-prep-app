"use client";

import { useRef } from "react";
import { fitbPrefix, fitbRemainderLength, type MissingWord } from "@/lib/fitb-lesson-scoring";

export type TypedBlankGrade = "exact" | "close" | "wrong";

/**
 * One type-the-remainder blank: the first letters in blue, then one box per
 * missing letter. Same shape as the FITB exam / grammar lesson blanks, lifted
 * into a shared component so the บทเรียน runners can mix typed blanks in with
 * dropdown blanks.
 */
export function TypedBlank({
  word,
  value,
  onChange,
  disabled,
  grade,
  label,
}: {
  word: MissingWord;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  grade?: TypedBlankGrade;
  label?: string;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  const rem = fitbRemainderLength(word);

  return (
    <span className="mx-0.5 inline-flex flex-wrap items-center gap-1 align-baseline">
      <span className="font-black text-[#004AAD]">{fitbPrefix(word)}</span>
      <span className="relative inline-flex items-center">
        <input
          ref={ref}
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={value}
          disabled={disabled}
          maxLength={rem}
          onChange={(e) => onChange(e.target.value.replace(/[^A-Za-z'-]/g, "").slice(0, rem))}
          className="absolute left-0 top-0 h-full w-full opacity-0"
          style={{ width: `${Math.min(Math.max(rem + 1, 3), 22)}ch`, minWidth: "2.5ch" }}
          aria-label={label}
        />
        <span className="inline-flex cursor-text gap-0.5" onClick={() => ref.current?.focus()} aria-hidden="true">
          {Array.from({ length: rem }, (_, k) => (
            <span
              key={k}
              className={`inline-flex h-7 w-6 items-center justify-center rounded border text-xs font-bold ${
                grade === "exact"
                  ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                  : grade
                    ? "border-rose-400 bg-rose-50 text-rose-800"
                    : value[k]
                      ? "border-[#004AAD]/40 bg-blue-50 text-neutral-900"
                      : "border-neutral-300 bg-neutral-50 text-neutral-400"
              }`}
            >
              {value[k] ?? "_"}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

/**
 * Tap-to-reveal Thai-meaning hints, one row per typed blank.
 */
export function TypedBlankHints({
  hints,
  shown,
  onToggle,
}: {
  hints: { blank: number; th: string }[];
  shown: Set<number>;
  onToggle: (blank: number) => void;
}) {
  if (!hints.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {hints.map(({ blank, th }) => (
        <div key={blank} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
          <button
            type="button"
            onClick={() => onToggle(blank)}
            className="flex w-full items-center justify-between text-left text-xs font-black text-slate-600"
          >
            <span>ช่องที่ {blank + 1}</span>
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#004AAD] ring-1 ring-slate-200">
              {shown.has(blank) ? "ซ่อนคำใบ้" : "💡 คำใบ้"}
            </span>
          </button>
          {shown.has(blank) ? <p className="mt-1.5 text-[13px] font-semibold text-slate-700">{th}</p> : null}
        </div>
      ))}
    </div>
  );
}
