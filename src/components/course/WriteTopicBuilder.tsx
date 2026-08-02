"use client";

import { useState } from "react";

import { ClozeStage } from "@/components/course/ClozeStage";
import { Frame } from "@/components/course/InlineExercise";
import { essayPattern, type WriteTopicItem } from "@/lib/course-plan/write-topic-bank";

/**
 * The guided "write 50 words" drill, straight off the lectures of that chapter.
 *
 * Two stages only — there is nothing to say aloud here, so unlike the speaking
 * drill it stops once the learner can reproduce the model:
 *   1. build   — rebuild the model answer, every third word missing
 *   2. pattern — the finished answer, its Thai translation, and which move of
 *                the lecture's skeleton each sentence is performing
 *
 * Stage 2 is the point of the exercise: the skeleton is what transfers to a new
 * prompt, and the three un-guided writes that follow are a memory test of it.
 */
export function WriteTopicBuilder({
  item,
  titleTh,
  onDone,
  onCancel,
  hasNext = true,
}: {
  item: WriteTopicItem;
  titleTh: string;
  onDone: (correct: number, total: number) => void;
  onCancel: () => void;
  hasNext?: boolean;
}) {
  const [stage, setStage] = useState<"build" | "pattern">("build");
  const [progress, setProgress] = useState<string | undefined>(undefined);
  const pattern = essayPattern(item.type);

  return (
    <Frame title={titleTh} onCancel={onCancel} progress={stage === "build" ? progress : undefined}>
      <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <p className="text-[10px] font-black uppercase tracking-wide text-[#004AAD]">
          {pattern.label} · {pattern.labelTh}
        </p>
        <p className="mt-1 text-[12px] font-black text-slate-700">{item.topic}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">{item.topicTh}</p>
      </div>

      {stage === "build" ? (
        <ClozeStage
          essay={item.essay}
          seed={item.id}
          choices={item.choices}
          onProgress={(f, t) => setProgress(`${f}/${t}`)}
          onComplete={() => setStage("pattern")}
        />
      ) : (
        <div>
          <div className="mt-3 rounded-2xl bg-[#FFF9E6] p-3.5 ring-1 ring-[#FFCC00]">
            <p className="text-[13px] font-black text-[#8A6A00]">🔑 สิ่งที่ต้องจำไปใช้กับโจทย์อื่น</p>
            <p className="mt-1 text-[12px] leading-6 text-slate-700">
              อย่าจำเนื้อหา — <strong>จำโครงประโยค</strong> ด้านล่างนี้แทน
              เพราะโจทย์จริงจะเปลี่ยนหัวข้อไปเรื่อย ๆ แต่โครงเดิมใช้ได้ทุกครั้ง
            </p>
          </div>

          <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-slate-400">คำตอบเต็ม</p>
          <p className="mt-1 rounded-xl bg-white p-3.5 text-[14px] leading-7 text-slate-800 ring-1 ring-slate-300">
            {item.essay}
          </p>

          <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-slate-400">คำแปลไทย</p>
          <p className="mt-1 rounded-xl bg-slate-50 p-3.5 text-[13px] leading-7 text-slate-700 ring-1 ring-slate-200">
            {item.essayTh}
          </p>

          <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-slate-400">
            แต่ละประโยคทำหน้าที่อะไร
          </p>
          <div className="mt-1 space-y-1.5">
            {item.moves.map((mv, i) => (
              <div key={i} className="rounded-xl bg-white p-2.5 ring-1 ring-slate-200">
                <p className="text-[10px] font-black uppercase tracking-wide text-[#004AAD]">
                  {i + 1}. {mv.label}
                </p>
                <p className="mt-0.5 text-[12px] leading-6 text-slate-700">{mv.en}</p>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-slate-400">
            โครงที่ต้องจำ ({pattern.labelTh})
          </p>
          <div className="mt-1 space-y-1.5">
            {pattern.steps.map((s, i) => (
              <div key={i} className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                <p className="font-mono text-[12px] leading-6 text-slate-900">{s.en}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{s.th}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onDone(1, 1)}
            className={`mt-4 w-full rounded-full py-3 text-sm font-black text-white ${
              hasNext ? "bg-[#004AAD]" : "bg-emerald-600"
            }`}
          >
            {hasNext ? "จำโครงแล้ว → แบบฝึกถัดไป" : "จบของวันนี้ 🎉"}
          </button>
        </div>
      )}
    </Frame>
  );
}
