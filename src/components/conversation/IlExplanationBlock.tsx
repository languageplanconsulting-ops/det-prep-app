"use client";

/**
 * The feedback a learner reads after answering an Interactive Listening question.
 *
 * The bank stores one 400-character Thai paragraph per question — keyword, why the key wins, and a
 * rebuttal of every distractor, all flat. Read on a phone it is a wall: nothing is bigger than
 * anything else, and the three-quarters of it about options the learner did NOT pick sits in the way
 * of the quarter that explains their own mistake.
 *
 * Same words, ranked:
 *
 *   1. the answer            — biggest, coloured, impossible to miss
 *   2. the grammar rule      — only when the learner's answer broke one (derived, see ilFormRule)
 *   3. why the answer wins   — the key's own line
 *   4. why YOUR answer lost  — pulled out of the crowd and labelled
 *   5. the other options     — folded away behind a disclosure
 *
 * The keyword rides as a chip: it is a label, not a sentence, and it should not read as one.
 */

import { useState } from "react";
import { ilFormRule, ilParseExplanation } from "@/lib/interactive-listening-explain";

/** English inside Thai prose is the thing being talked about — let it stand out from the talking. */
function Bilingual({ text }: { text: string }) {
  // A run may carry an internal comma ("Yes, I have") but never a trailing one, which would be the
  // Thai sentence's punctuation rather than part of the English.
  const parts = text.split(/([A-Za-z][A-Za-z0-9'’\-]*(?:,?\s[A-Za-z0-9'’\-]+)*)/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <span key={i} className="font-bold text-slate-900">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function IlExplanationBlock({
  explanation,
  spokenLine,
  chosenText,
  chosenIndex,
  correctIndex,
  correctText,
  /** Typed comprehension never showed the options, so their rebuttals cannot be shown either. */
  hideDistractors = false,
}: {
  explanation?: string;
  spokenLine?: string;
  chosenText?: string;
  chosenIndex?: number | null;
  correctIndex?: number;
  correctText?: string;
  hideDistractors?: boolean;
}) {
  const [openOthers, setOpenOthers] = useState(false);
  const parsed = ilParseExplanation(explanation);
  const form = spokenLine ? ilFormRule(spokenLine, chosenText) : null;
  const showForm = !!form?.mismatchTh;

  if (!parsed && !showForm) return null;

  const keyNote = parsed?.notes.find((n) => (correctIndex != null ? n.index - 1 === correctIndex : n.correct));
  const yourNote =
    chosenIndex != null && chosenIndex >= 0 && chosenIndex !== correctIndex
      ? parsed?.notes.find((n) => n.index - 1 === chosenIndex)
      : undefined;
  const others = (parsed?.notes ?? []).filter((n) => n !== keyNote && n !== yourNote);

  return (
    <div className="space-y-3">
      {/* 1 — the answer */}
      {correctText ? (
        <div className="rounded-xl border-l-4 border-emerald-500 bg-emerald-50 px-3.5 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">คำตอบที่ถูก</p>
          <p className="mt-0.5 text-[15px] font-bold leading-6 text-emerald-900">{correctText}</p>
        </div>
      ) : null}

      {/* 2 — the rule the answer broke */}
      {showForm ? (
        <div className="rounded-xl border-l-4 border-[#004AAD] bg-[#EAF1FF] px-3.5 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#004AAD]">📐 หลักไวยากรณ์</p>
          <p className="mt-1 text-[14px] font-bold leading-6 text-slate-900">
            <Bilingual text={form!.ruleTh} />
          </p>
          <p className="mt-1 text-[13px] leading-6 text-slate-700">
            <Bilingual text={form!.mismatchTh!} />
          </p>
        </div>
      ) : null}

      {/* 3 — why the key wins */}
      {keyNote ? (
        <div className="px-0.5">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">ทำไมข้อนี้ถูก</p>
          <p className="mt-0.5 text-[14px] leading-6 text-slate-700">
            <Bilingual text={keyNote.text} />
          </p>
        </div>
      ) : null}

      {/* 4 — why the learner's own pick lost */}
      {yourNote && !hideDistractors ? (
        <div className="rounded-xl border-l-4 border-rose-300 bg-rose-50/70 px-3.5 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-rose-500">ข้อที่คุณเลือก</p>
          <p className="mt-0.5 text-[13px] leading-6 text-rose-900">
            <Bilingual text={yourNote.text} />
          </p>
        </div>
      ) : null}

      {/* 5 — everything else, out of the way */}
      {others.length && !hideDistractors ? (
        <div>
          <button
            type="button"
            onClick={() => setOpenOthers((v) => !v)}
            className="text-[12px] font-bold text-slate-500 underline underline-offset-2 hover:text-slate-700"
          >
            {openOthers ? "ซ่อนตัวเลือกอื่น" : `ดูเหตุผลของตัวเลือกอื่น (${others.length})`}
          </button>
          {openOthers ? (
            <ul className="mt-2 space-y-1.5 border-l-2 border-slate-200 pl-3">
              {others.map((n, i) => (
                <li key={i} className="text-[12.5px] leading-6 text-slate-500">
                  <span className="font-black text-slate-400">ข้อ {n.index}</span>{" "}
                  <Bilingual text={n.text} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {/* keyword rides last as a label, not a sentence */}
      {parsed?.keywordEn ? (
        <p className="pt-0.5 text-[12px] text-slate-500">
          <span className="font-black uppercase tracking-wide text-slate-400">คำสำคัญ</span>{" "}
          <span className="font-bold text-slate-800">{parsed.keywordEn}</span>
          {parsed.keywordTh ? <span> — {parsed.keywordTh}</span> : null}
        </p>
      ) : null}

      {parsed?.rest ? (
        <p className="text-[13px] leading-6 text-slate-600">
          <Bilingual text={parsed.rest} />
        </p>
      ) : null}
    </div>
  );
}
