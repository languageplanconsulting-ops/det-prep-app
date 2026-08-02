"use client";

import { useState } from "react";

import {
  ESSAY_CRITERIA_TH,
  ESSAY_PATTERNS,
  essayPattern,
  vocabBanksForType,
  type EssayTypeKey,
} from "@/lib/course-plan/write-topic-bank";

/**
 * The pattern + vocabulary dropdown that sits directly above the typing box.
 *
 * Deliberately close to the textarea rather than at the top of the page: by the
 * time someone is writing, a panel three screens up is a panel they will not
 * scroll back to. Pick the question type, get that type's skeleton and the word
 * groups the lecture pairs with it.
 *
 * Same source of truth as the guided rebuild drills (write-topic-bank.ts), so a
 * learner sees the exact skeleton they reconstructed word by word.
 */
export function EssayPatternPicker({ defaultType = "opinion" }: { defaultType?: EssayTypeKey }) {
  const [type, setType] = useState<EssayTypeKey>(defaultType);
  const [open, setOpen] = useState(true);
  const [openBank, setOpenBank] = useState<string | null>(null);
  const pattern = essayPattern(type);

  return (
    <div className="mb-3 rounded-2xl border border-[#004AAD]/20 bg-[#F5F8FF]">
      <div className="flex flex-wrap items-center gap-2 px-3.5 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-bold text-slate-800"
          aria-expanded={open}
        >
          <span className={`text-[#004AAD] transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
          📐 โครงคำตอบ + คลังคำที่แนะนำ
        </button>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value as EssayTypeKey);
            setOpenBank(null);
            setOpen(true);
          }}
          className="ml-auto rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[12px] font-bold text-slate-800 outline-none focus:border-[#004AAD]"
          aria-label="เลือกประเภทโจทย์"
        >
          {ESSAY_PATTERNS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label} — {p.labelTh}
            </option>
          ))}
        </select>
      </div>

      {open && (
        <div className="border-t border-[#004AAD]/10 px-3.5 py-3">
          <p className="text-[11px] text-slate-500">{pattern.cueTh}</p>

          <div className="mt-2 space-y-1.5">
            {pattern.steps.map((s, i) => (
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

          <p className="mt-3 mb-1 text-[10px] font-black uppercase tracking-wide text-[#004AAD]">
            ไวยากรณ์ที่ควรใส่
          </p>
          <div className="flex flex-wrap gap-1.5">
            {pattern.grammarTh.map((g) => (
              <span key={g} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] text-slate-800">
                {g}
              </span>
            ))}
          </div>

          <p className="mt-3 mb-1 text-[10px] font-black uppercase tracking-wide text-[#004AAD]">
            คลังคำสำหรับโจทย์แบบนี้ · แตะเพื่อดู
          </p>
          <div className="space-y-1.5">
            {vocabBanksForType(type).map((bank) => {
              const isOpen = openBank === bank.key;
              return (
                <div key={bank.key} className="overflow-hidden rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setOpenBank(isOpen ? null : bank.key)}
                    className="flex w-full items-center justify-between gap-2 bg-white px-3 py-2 text-left hover:bg-slate-50"
                    aria-expanded={isOpen}
                  >
                    <span className="flex items-center gap-1.5 text-[12px] font-bold text-slate-800">
                      <span>{bank.icon}</span>
                      {bank.label}
                      <span className="text-[11px] font-normal text-slate-400">
                        {bank.sub} · {bank.words.length} คำ
                      </span>
                    </span>
                    <span className={`text-[#004AAD] transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
                  </button>
                  {isOpen && (
                    <div className="flex flex-wrap gap-1.5 border-t border-slate-100 bg-slate-50/60 px-2.5 py-2.5">
                      {bank.words.map((w) => (
                        <span key={w.w} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px]">
                          <span className="font-semibold text-slate-800">{w.w}</span>
                          <span className="text-slate-400"> · {w.th}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">ตรวจจาก</span>
            {ESSAY_CRITERIA_TH.map((c) => (
              <span key={c} className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
