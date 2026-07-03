"use client";

import { useState } from "react";

import { PrimaryButton, SoftCard } from "@/components/mini-diagnosis/steps/ui";

const WORD_GOAL = 20;

/** Mini-diagnosis write-about-photo: photo card + prompt + word-goal meter. */
export function MiniWritePhotoStep({
  content,
  submitting = false,
  onSubmit,
}: {
  content: Record<string, unknown>;
  submitting?: boolean;
  onSubmit: (answer: unknown) => void;
}) {
  const [text, setText] = useState("");
  const url = String(
    content.image_url ?? content.imageUrl ?? content.photo_url ?? content.photoUrl ?? "",
  );
  const promptTh = String(content.instruction_th ?? "");
  const promptEn = String(content.instruction ?? "");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const goalPct = Math.min(100, Math.round((words / WORD_GOAL) * 100));

  return (
    <div className="space-y-4">
      <SoftCard>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- dynamic admin URLs
          <img src={url} alt="ภาพสำหรับบรรยาย" className="max-h-64 w-full rounded-xl object-cover" />
        ) : null}
        {promptTh ? <p className="mt-3 text-sm font-bold text-slate-800">{promptTh}</p> : null}
        {promptEn ? <p className="mt-1 text-xs text-slate-500">{promptEn}</p> : null}
      </SoftCard>

      <SoftCard>
        <div className="flex items-center justify-between">
          <label htmlFor="minidiag-write-photo" className="text-sm font-bold text-slate-800">
            เขียนบรรยายภาพเป็นภาษาอังกฤษ
          </label>
          <span
            className={`font-mono text-xs font-bold ${words >= WORD_GOAL ? "text-emerald-600" : "text-slate-400"}`}
          >
            {words} คำ {words >= WORD_GOAL ? "✓" : `/ เป้า ${WORD_GOAL}+`}
          </span>
        </div>
        <textarea
          id="minidiag-write-photo"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          disabled={submitting}
          placeholder="Describe what you see in the photo…"
          className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-3 text-base leading-relaxed text-slate-900 outline-none transition focus:border-ep-blue focus:bg-white"
        />
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-300 ${words >= WORD_GOAL ? "bg-emerald-500" : "bg-ep-blue"}`}
            style={{ width: `${goalPct}%` }}
          />
        </div>
      </SoftCard>

      <PrimaryButton disabled={submitting || !text.trim()} onClick={() => onSubmit({ text })}>
        {submitting ? "ระบบกำลังตรวจงาน…" : "ส่งคำตอบ"}
      </PrimaryButton>
    </div>
  );
}
