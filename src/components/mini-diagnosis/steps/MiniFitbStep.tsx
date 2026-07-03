"use client";

import { useRef, useState } from "react";

import { splitFitbPassage } from "@/lib/fitb-passage";
import { fitbExpectedPrefix, fitbRemainderLength } from "@/lib/fitb-scoring";
import type { FitbMissingWord } from "@/types/fitb";
import { PrimaryButton, SoftCard } from "@/components/mini-diagnosis/steps/ui";

/**
 * Mini-diagnosis fill-in-the-blanks. Letter-tile passage layout (given prefix
 * tiles + typed slots) with a visible focus ring on the active blank.
 * Submits { answers: string[] } — same contract the API grades with.
 */
export function MiniFitbStep({
  content,
  submitting = false,
  onSubmit,
}: {
  content: Record<string, unknown>;
  submitting?: boolean;
  onSubmit: (answer: unknown) => void;
}) {
  const missingWords = (Array.isArray(content.missingWords) ? content.missingWords : []).filter(
    (m): m is FitbMissingWord =>
      !!m && typeof m === "object" && typeof (m as { correctWord?: unknown }).correctWord === "string",
  );
  const passage = String(content.passage ?? "");
  const segments = splitFitbPassage(passage);
  const [inputs, setInputs] = useState<string[]>(() => missingWords.map(() => ""));
  const [focused, setFocused] = useState<number | null>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  if (!passage || missingWords.length === 0) {
    return (
      <SoftCard className="text-center">
        <p className="text-sm font-bold text-rose-600">โจทย์ไม่สมบูรณ์ กรุณาแจ้งทีมงาน</p>
      </SoftCard>
    );
  }

  const updateInput = (idx: number, next: string) => {
    const remLen = fitbRemainderLength(missingWords[idx]!);
    const normalized = next.slice(0, remLen);
    setInputs((prev) => {
      const out = prev.slice();
      out[idx] = normalized;
      return out;
    });
    if (normalized.length >= remLen) {
      for (let j = idx + 1; j < missingWords.length; j += 1) {
        if (fitbRemainderLength(missingWords[j]!) > 0) {
          inputRefs.current[j]?.focus();
          break;
        }
      }
    }
  };

  const filledCount = inputs.filter((v, i) => {
    const remLen = fitbRemainderLength(missingWords[i]!);
    return remLen === 0 || v.trim().length > 0;
  }).length;
  const canSubmit = filledCount >= missingWords.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-700">แตะช่องว่างแล้วพิมพ์ตัวอักษรที่เหลือ</p>
        <span className="rounded-full bg-ep-blue/10 px-3 py-1 font-mono text-xs font-bold text-ep-blue">
          {filledCount}/{missingWords.length}
        </span>
      </div>

      <SoftCard>
        <p className="text-[15px] font-medium leading-[2.2] text-slate-800">
          {segments.map((seg, idx) => {
            if (seg.type === "text") return <span key={idx}>{seg.value}</span>;
            const b = seg.blankIndex;
            if (b < 0 || b >= missingWords.length) return <span key={idx}>{seg.value}</span>;
            const mw = missingWords[b]!;
            const prefix = fitbExpectedPrefix(mw);
            const remLen = fitbRemainderLength(mw);
            const typed = inputs[b] ?? "";
            if (remLen === 0) {
              return (
                <span key={idx} className="mx-0.5 font-bold text-ep-blue">
                  {mw.correctWord}
                </span>
              );
            }
            const isFocused = focused === b;
            return (
              <span key={idx} className="mx-0.5 inline-flex flex-wrap items-center gap-1 align-middle">
                {prefix.split("").map((ch, k) => (
                  <span
                    key={`p${k}`}
                    className="inline-flex h-9 min-w-[1.85rem] items-center justify-center rounded-md bg-slate-100 px-1 font-mono text-base font-bold text-slate-500"
                  >
                    {ch}
                  </span>
                ))}
                <span
                  className={`relative inline-flex items-center gap-1 rounded-lg p-0.5 transition ${
                    isFocused ? "ring-2 ring-ep-blue/60" : ""
                  }`}
                >
                  <input
                    type="text"
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={typed}
                    disabled={submitting}
                    ref={(el) => {
                      inputRefs.current[b] = el;
                    }}
                    maxLength={remLen}
                    onFocus={() => setFocused(b)}
                    onBlur={() => setFocused((f) => (f === b ? null : f))}
                    onChange={(e) => updateInput(b, e.target.value)}
                    className="absolute left-0 top-0 z-10 h-full w-full cursor-text opacity-0"
                    aria-label={`ช่องว่างที่ ${b + 1}`}
                  />
                  {Array.from({ length: remLen }, (_, k) => {
                    const ch = typed[k];
                    const isCursor = isFocused && k === Math.min(typed.length, remLen - 1) && !ch;
                    return (
                      <span
                        key={`s${k}`}
                        className={`inline-flex h-9 min-w-[1.85rem] items-center justify-center rounded-md px-1 font-mono text-base font-bold ${
                          ch
                            ? "border-2 border-ep-blue bg-white text-slate-900"
                            : isCursor
                              ? "animate-pulse border-2 border-ep-blue bg-blue-50 text-ep-blue"
                              : "border-2 border-dashed border-slate-300 bg-slate-50 text-slate-300"
                        }`}
                        aria-hidden
                      >
                        {ch ?? "_"}
                      </span>
                    );
                  })}
                </span>
              </span>
            );
          })}
        </p>
      </SoftCard>

      {/* clues */}
      {missingWords.some((mw) => mw.explanationThai || mw.clue) ? (
        <SoftCard>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">คำใบ้</p>
          <ul className="mt-1.5 space-y-1">
            {missingWords.map((mw, i) => {
              const hint = mw.explanationThai || mw.clue;
              if (!hint) return null;
              return (
                <li key={i} className="text-sm text-slate-600">
                  <span className="font-bold text-ep-blue">ช่อง {i + 1}:</span> {hint}
                </li>
              );
            })}
          </ul>
        </SoftCard>
      ) : null}

      <PrimaryButton disabled={submitting || !canSubmit} onClick={() => onSubmit({ answers: inputs })}>
        {submitting ? "กำลังส่ง…" : canSubmit ? "ส่งคำตอบ" : `เติมให้ครบก่อนนะ (เหลือ ${missingWords.length - filledCount} ช่อง)`}
      </PrimaryButton>
    </div>
  );
}
