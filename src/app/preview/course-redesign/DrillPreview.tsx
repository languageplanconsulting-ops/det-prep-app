"use client";

import { useState } from "react";

import { ExerciseIntro } from "@/components/course/ExerciseIntro";
import { InlineExercise } from "@/components/course/InlineExercise";
import { inlineContentFor } from "@/lib/course-plan/exercise-content";

/**
 * One drill, opened directly by exerciseKey.
 *
 * Reaching a given exercise through the plan means finishing every item before
 * it, so verifying (say) that the photo shows up on wp-pattern was a twenty-set
 * slog. This renders the real runner with the real content bank — the same code
 * path a learner hits, minus the queue.
 */
export function DrillPreview({ exerciseKey }: { exerciseKey: string }) {
  const [result, setResult] = useState<{ correct: number; total: number } | null>(null);
  const content = inlineContentFor(exerciseKey, null);

  if (!content) {
    return (
      <p className="rounded-2xl bg-amber-50 p-4 text-[14px] text-amber-900 ring-1 ring-amber-200">
        ไม่มีแบบฝึกในหน้านี้สำหรับคีย์ <code>{exerciseKey}</code> — แบบฝึกพูด/เขียน/โต้ตอบ
        ใช้ runner เฉพาะทาง เปิดผ่านแผนการเรียนแทน
      </p>
    );
  }

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="mb-2 text-[13px] text-slate-500">
        drill: <code>{exerciseKey}</code> · {content.kind} · {content.items.length} ข้อ
      </p>
      <ExerciseIntro exerciseKey={exerciseKey} taskType={null} />
      {result ? (
        <p className="rounded-2xl bg-emerald-50 p-4 text-[15px] font-bold text-emerald-900 ring-1 ring-emerald-200">
          จบแล้ว — ได้ {result.correct}/{result.total}
        </p>
      ) : (
        <InlineExercise
          exerciseKey={exerciseKey}
          taskType={null}
          titleTh={exerciseKey}
          onCancel={() => undefined}
          onDone={(correct, total) => setResult({ correct, total })}
        />
      )}
    </div>
  );
}
