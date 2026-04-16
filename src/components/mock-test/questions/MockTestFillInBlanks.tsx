"use client";

import { useRef, useState } from "react";

import { fitbMaxGapLetters, parseFitbBlankPrefix } from "@/lib/mock-test/fitb-content";
import { splitFitbPassage } from "@/lib/fitb-passage";
import { fitbExpectedPrefix, fitbRemainderLength } from "@/lib/fitb-scoring";
import type { FitbMissingWord } from "@/types/fitb";

type Props = {
  content: Record<string, unknown>;
  submitting?: boolean;
  onSubmit: (answer: string | { answers: string[] }) => void;
};

/**
 * MC fill-in-the-blank: legacy full `sentence`, or prefix mode
 * (`blank_prefix` 1–6 chars + optional `sentence_before` / `sentence_after` / `blank_hint`).
 */
export function MockTestFillInBlanks({ content, onSubmit, submitting = false }: Props) {
  const missingWords = Array.isArray(content.missingWords)
    ? (content.missingWords.filter(
        (m): m is FitbMissingWord =>
          !!m &&
          typeof m === "object" &&
          typeof (m as { correctWord?: unknown }).correctWord === "string",
      ) as FitbMissingWord[])
    : [];
  const hasPracticeLayout =
    typeof content.passage === "string" && content.passage.trim().length > 0 && missingWords.length > 0;

  if (hasPracticeLayout) {
    return (
      <MockTestFillInBlanksPracticeLike
        content={content}
        missingWords={missingWords}
        submitting={submitting}
        onSubmit={onSubmit}
      />
    );
  }

  const [pick, setPick] = useState<string | null>(null);
  const opts = (content.options as string[]) ?? [];
  const prefix = parseFitbBlankPrefix(content);
  const prefixMode = prefix != null;

  const before = String(content.sentence_before ?? "");
  const after = String(content.sentence_after ?? "");
  const hint = content.blank_hint != null ? String(content.blank_hint) : "";
  const legacySentence = String(content.sentence ?? "");

  const gapLetters = prefixMode && prefix ? fitbMaxGapLetters(opts, prefix) : 0;
  const underscoreRun = prefixMode && prefix ? "_".repeat(gapLetters) : "";

  return (
    <div className="space-y-4">
      <p className="text-sm font-bold">{String(content.instruction_th ?? "")}</p>
      <p className="text-xs text-neutral-600">{String(content.instruction ?? "")}</p>
      {prefixMode && prefix ? (
        <p className="rounded-[4px] border-4 border-black bg-white p-4 text-base font-medium leading-relaxed">
          <span>{before}</span>
          <span className="font-black tracking-tight text-[#004AAD]">{prefix}</span>
          <span className="font-mono tracking-widest">{underscoreRun}</span>
          <span>{after}</span>
          {hint ? (
            <span className="ml-1 text-sm font-normal text-neutral-600"> {hint}</span>
          ) : null}
        </p>
      ) : (
        <p className="rounded-[4px] border-4 border-black bg-white p-4 text-base font-medium">
          {legacySentence}
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {opts.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setPick(o)}
            disabled={submitting}
            className={`rounded-[4px] border-4 border-black px-3 py-2 text-left text-sm font-bold shadow-[4px_4px_0_0_#000] ${
              pick === o ? "bg-[#FFCC00]" : "bg-white"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={submitting || !pick}
        onClick={() => pick && onSubmit(pick)}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "ส่งคำตอบ... / Sending" : "ส่งคำตอบ / Submit"}
      </button>
    </div>
  );
}

function MockTestFillInBlanksPracticeLike({
  content,
  missingWords,
  submitting,
  onSubmit,
}: {
  content: Record<string, unknown>;
  missingWords: FitbMissingWord[];
  submitting: boolean;
  onSubmit: (answer: { answers: string[] }) => void;
}) {
  const passage = String(content.passage ?? "");
  const segments = splitFitbPassage(passage);
  const [inputs, setInputs] = useState<string[]>(() => missingWords.map(() => ""));
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

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

  const canSubmit = inputs.every((_, i) => {
    const remLen = fitbRemainderLength(missingWords[i]!);
    return remLen === 0 || (inputs[i] ?? "").trim().length > 0;
  });

  return (
    <div className="space-y-4">
      <p className="text-sm font-bold">{String(content.instruction_th ?? "")}</p>
      <p className="text-xs text-neutral-600">{String(content.instruction ?? "")}</p>

      <p className="rounded-[4px] border-4 border-black bg-white p-4 text-base font-medium leading-relaxed">
        {segments.map((seg, idx) => {
          if (seg.type === "text") return <span key={idx}>{seg.value}</span>;
          const b = seg.blankIndex;
          if (b < 0 || b >= missingWords.length) return <span key={idx}>{seg.value}</span>;
          const mw = missingWords[b]!;
          const prefix = fitbExpectedPrefix(mw);
          const remLen = fitbRemainderLength(mw);
          const typed = inputs[b] ?? "";
          const underscoreRun = "_".repeat(Math.max(1, remLen));
          if (remLen === 0) {
            return (
              <span key={idx} className="mx-0.5 font-black text-[#004AAD]">
                {mw.correctWord}
              </span>
            );
          }
          return (
            <span key={idx} className="mx-0.5 inline-flex flex-wrap items-center gap-1 align-baseline">
              <span className="font-black tracking-tight text-[#004AAD]">{prefix}</span>
              <span className="relative inline-flex items-center">
                <input
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={typed}
                  disabled={submitting}
                  ref={(el) => {
                    inputRefs.current[b] = el;
                  }}
                  maxLength={remLen}
                  onChange={(e) => updateInput(b, e.target.value)}
                  className="absolute left-0 top-0 h-full w-full opacity-0"
                  style={{ width: `${Math.min(Math.max(remLen + 1, 3), 18)}ch` }}
                  aria-label={`Blank ${b + 1}`}
                />
                <span
                  className="rounded-sm bg-[#dbffd8] px-0.5 font-mono tracking-widest text-[#0f7a16]"
                  aria-hidden="true"
                >
                  {typed ? typed.padEnd(remLen, "_") : underscoreRun}
                </span>
              </span>
            </span>
          );
        })}
      </p>

      <button
        type="button"
        disabled={submitting || !canSubmit}
        onClick={() => onSubmit({ answers: inputs })}
        className="w-full rounded-[4px] border-4 border-black bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "ส่งคำตอบ... / Sending" : "ส่งคำตอบ / Submit"}
      </button>
    </div>
  );
}
