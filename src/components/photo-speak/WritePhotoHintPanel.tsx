"use client";

import Link from "next/link";
import { useState } from "react";
import {
  DEFAULT_OPEN_BANK_FOR_TOPIC,
  PATTERNS_FOR_TOPIC,
  VOCAB_BANKS,
  type PhotoTopic,
} from "@/lib/course-plan/photo-pattern-bank";

/**
 * WritePhotoHintPanel — course-only ("Fast Track" VIP) answer-pattern scaffold for
 * the Write-about-photo exam. Unlocked for VIP (incl. course-granted VIP) and
 * always unlocked inside the paid course journey (see `unlocked` prop);
 * everyone else sees a locked teaser with a peek of step 1 (ethical show-value).
 *
 * Pattern + vocab content is sourced from photo-pattern-bank.ts, the course's
 * "ปูพื้นฐานแกรมม่าร์" PDF turned into data — when `topic` is known (the
 * curriculum's people/objects/places split), the matching pattern and vocab
 * bank are surfaced first instead of making the learner hunt for them.
 */

export function WritePhotoHintPanel({
  unlocked,
  mode = "write",
  topic,
}: {
  unlocked: boolean;
  mode?: "write" | "speak";
  /** The curriculum's people/objects/places split, when known (course context). */
  topic?: PhotoTopic;
}) {
  const patterns = PATTERNS_FOR_TOPIC[topic ?? "objects"];
  const defaultOpen = topic ? DEFAULT_OPEN_BANK_FOR_TOPIC[topic] : null;
  const [openBank, setOpenBank] = useState<string | null>(defaultOpen);

  if (!unlocked) {
    const first = patterns[0]!.steps[0]!;
    const rest = patterns[0]!.steps.slice(1);
    return (
      <div className="relative overflow-hidden rounded-2xl border border-[#FFCC00]/60 bg-[#fffaf0] p-5 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-2">
          <span className="text-base">🔒</span>
          <p className="text-sm font-bold text-slate-800">
            แพตเทิร์นคำตอบ + คลังคำศัพท์ — เฉพาะนักเรียนคอร์ส Fast Track (VIP)
          </p>
        </div>
        {/* peek: step 1 visible, rest blurred */}
        <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="font-mono text-sm text-slate-800">1. {first.en}</p>
          <div className="mt-2 select-none space-y-1.5 blur-[5px]" aria-hidden>
            {rest.map((s, i) => (
              <p key={i} className="font-mono text-sm text-slate-700">
                {i + 2}. {s.en}
              </p>
            ))}
            <p className="text-xs text-slate-500">+ คลังคำ (คน · ธรรมชาติ · เมือง · สิ่งของ · ความรู้สึก) พร้อมคำแปลไทย</p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-6 text-slate-600">
          ตัวช่วยนี้เป็นสิทธิ์ของนักเรียนคอร์ส Duolingo Fast Track — ได้แพตเทิร์นคำตอบครบใน 1 นาที พร้อมคลังคำที่ใช้ได้เกือบทุกภาพ
        </p>
        <Link
          href="/pricing"
          className="mt-3 inline-flex items-center gap-1 rounded-xl bg-[#004AAD] px-4 py-2.5 text-sm font-bold text-[#FFCC00] hover:opacity-90"
        >
          ปลดล็อกด้วย VIP / Fast Track →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#004AAD]/15 bg-white p-5 shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFCC00] px-2.5 py-[5px] text-[10px] font-extrabold uppercase leading-none tracking-wide text-[#004AAD]">
          👑 Fast Track VIP
        </span>
        <p className="text-sm font-bold text-slate-800">แพตเทิร์นคำตอบจากพี่ดอย</p>
      </div>
      <p className="mt-1.5 text-xs leading-6 text-slate-500">
        {mode === "speak"
          ? "พูดตามแพตเทิร์นนี้จากภาพ → ได้คำตอบที่มีโครงสร้างครบใน 1 นาที"
          : "เติมช่องว่างตามแพตเทิร์นนี้จากภาพ → ได้คำตอบที่มีโครงสร้างครบใน 1 นาที"}
      </p>

      {/* Pattern scaffold(s) — the topic's pattern when known, both when not. */}
      {patterns.map((pattern, pi) => (
        <div key={pattern.titleTh} className={pi > 0 ? "mt-4" : "mt-3"}>
          {patterns.length > 1 && (
            <p className="mb-1.5 text-[11px] font-black uppercase tracking-wide text-slate-400">{pattern.titleTh}</p>
          )}
          <div className="space-y-2">
            {pattern.steps.map((p, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#004AAD] text-xs font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-slate-900">{p.en}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{p.th}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Vocab banks — click to expand, topic's bank open by default */}
      <p className="mt-4 mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
        คลังคำที่ใช้ได้เกือบทุกภาพ · แตะเพื่อดู
      </p>
      <div className="space-y-2">
        {VOCAB_BANKS.map((bank) => {
          const isOpen = openBank === bank.key;
          return (
            <div key={bank.key} className="overflow-hidden rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setOpenBank(isOpen ? null : bank.key)}
                className="flex w-full items-center justify-between gap-3 bg-white px-4 py-2.5 text-left hover:bg-slate-50"
                aria-expanded={isOpen}
              >
                <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <span>{bank.icon}</span>
                  {bank.label}
                  <span className="text-xs font-normal text-slate-400">{bank.sub} · {bank.words.length} คำ</span>
                </span>
                <span className={`text-[#004AAD] transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
              </button>
              {isOpen ? (
                <div className="flex flex-wrap gap-1.5 border-t border-slate-100 bg-slate-50/60 px-3 py-3">
                  {bank.words.map((word) => (
                    <span
                      key={word.w}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs"
                    >
                      <span className="font-semibold text-slate-800">{word.w}</span>
                      <span className="text-slate-400"> · {word.th}</span>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] leading-5 text-slate-400">
        💡 พี่ดอย: {mode === "speak" ? "พูดตามแพตเทิร์นนี้ก่อน แล้วหยิบคำจากคลังมาเสริม" : "ใส่ตามแพตเทิร์นก่อน แล้วหยิบคำจากคลังมาเติม"} — ครบโครงเร็ว ไม่ตัน
      </p>
    </div>
  );
}
