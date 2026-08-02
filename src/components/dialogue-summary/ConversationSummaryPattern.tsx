"use client";

import { useState } from "react";

import {
  SUMMARY_CONNECTORS,
  SUMMARY_EXAMPLES,
  SUMMARY_SKELETON,
  SUMMARY_TIME_LIMIT_TH,
} from "@/lib/course-plan/conversation-summary-bank";

/**
 * The lecture's summary pattern, shown directly above the summary box.
 *
 * Open by default: the whole point of the handout is that the five connectors
 * carry the summary, so hiding them behind a click would defeat it. Collapsible
 * for anyone who has them memorised.
 */
export function ConversationSummaryPattern() {
  const [open, setOpen] = useState(true);
  const [showExamples, setShowExamples] = useState(false);

  return (
    <div className="mb-4 rounded-sm border-4 border-black bg-[#F5F8FF]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
        aria-expanded={open}
      >
        <span className={`text-[#004AAD] transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
        <span className="text-sm font-black uppercase tracking-wide text-slate-900">
          📐 โครงสรุปบทสนทนา จากเลกเชอร์
        </span>
        <span className="ml-auto text-[11px] font-bold text-slate-500">{SUMMARY_TIME_LIMIT_TH}</span>
      </button>

      {open && (
        <div className="border-t-2 border-black/10 px-4 py-3">
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-[#004AAD]">
            คำเชื่อมที่ต้องใช้
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SUMMARY_CONNECTORS.map((c) => (
              <span key={c.en} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px]">
                <span className="font-mono font-bold text-slate-900">{c.en}</span>
                <span className="text-slate-400"> · {c.th}</span>
              </span>
            ))}
          </div>

          <p className="mb-1.5 mt-3 text-[10px] font-black uppercase tracking-wide text-[#004AAD]">
            เขียนตาม 3 ประโยคนี้
          </p>
          <div className="space-y-1.5">
            {SUMMARY_SKELETON.map((s, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#004AAD] text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-[12px] leading-6 text-slate-900">{s.en}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{s.th}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowExamples((v) => !v)}
            className="mt-2.5 text-[11px] font-bold text-[#004AAD] underline"
          >
            {showExamples ? "ซ่อนตัวอย่าง" : "ดูตัวอย่างที่พี่ดอยเขียนให้ (2 ชุด)"}
          </button>
          {showExamples && (
            <div className="mt-2 space-y-2">
              {SUMMARY_EXAMPLES.map((ex) => (
                <div key={ex.titleTh} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{ex.titleTh}</p>
                  <p className="mt-1 text-[12px] leading-6 text-slate-700">{ex.en}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
