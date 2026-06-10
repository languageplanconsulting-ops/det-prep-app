"use client";

import { useEffectiveTier } from "@/hooks/useEffectiveTier";

/**
 * AdminWritingStarters — sentence-starters / answer skeleton shown ONLY for
 * admins (isAdmin || previewEligible). Kills the "blank page" fear on Production
 * exams (Change by Design: design for the anxious learner). Returns null for
 * everyone else, so it's safe to drop into any screen.
 */
export function AdminWritingStarters({
  title = "💬 เริ่มประโยคยังไงดี",
  starters,
}: {
  title?: string;
  starters: string[];
}) {
  const { isAdmin, previewEligible } = useEffectiveTier();
  if (!(isAdmin || previewEligible)) return null;

  return (
    <div className="rounded-2xl bg-violet-50 p-4 ring-1 ring-violet-200">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-violet-700">
        {title} <span className="font-medium normal-case text-violet-500">— ลองหยิบไปใช้ได้นะครับ</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {starters.map((s) => (
          <span
            key={s}
            className="rounded-full bg-white px-3 py-1.5 text-[13px] text-slate-700 ring-1 ring-violet-200"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
