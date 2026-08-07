"use client";

import { useMemo, useState } from "react";

import {
  TRANSFER_HEADING_TH,
  transferLabel,
  transfersFor,
} from "@/lib/course-plan/skill-transfer";

/**
 * The strip that sits above every drill in a session.
 *
 * Rendered once by SessionRunner rather than inside each runner: there are six
 * runners and they do not share a header component, so putting it here is the
 * only way every exercise gets it without six copies drifting apart.
 */
export function ExerciseIntro({
  exerciseKey,
  taskType,
  skip,
}: {
  exerciseKey?: string | null;
  taskType?: string | null;
  /** Omitted when there is no lecture waiting, or when the debt gate is closed. */
  skip?: { onSkip: () => void; labelTh: string; noteTh?: string };
}) {
  const targets = useMemo(
    () => transfersFor(exerciseKey, taskType ?? null),
    [exerciseKey, taskType],
  );
  const [open, setOpen] = useState(false);

  if (targets.length === 0 && !skip) return null;

  return (
    <div className="space-y-2 px-4 pt-4 sm:px-6">
      {targets.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-sky-50 ring-1 ring-sky-200">
          {/* Collapsed by default: the point is reassurance, not reading. The
              count alone answers "is this worth my time?"; opening it answers
              "worth it for what?". */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left"
          >
            <span aria-hidden className="shrink-0 text-[15px]">
              🎯
            </span>
            <span className="min-w-0 flex-1 text-[13px] font-semibold text-sky-900">
              {TRANSFER_HEADING_TH}{" "}
              <span className="font-bold">({targets.length} โจทย์)</span>
            </span>
            <span className="shrink-0 text-[13px] font-bold text-sky-500">
              {open ? "▲" : "▼"}
            </span>
          </button>
          {open && (
            <ul className="flex flex-wrap gap-1.5 px-3.5 pb-3">
              {targets.map((t) => (
                <li
                  key={t}
                  className="rounded-full bg-white px-2.5 py-1 text-[13px] font-semibold text-sky-800 ring-1 ring-sky-200"
                >
                  {transferLabel(t)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {skip && (
        <div>
          <button
            type="button"
            onClick={skip.onSkip}
            className="w-full rounded-full bg-slate-100 py-2.5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-200"
          >
            {skip.labelTh}
          </button>
          {skip.noteTh && (
            <p className="mt-1 px-1 text-center text-[13px] text-slate-400">{skip.noteTh}</p>
          )}
        </div>
      )}
    </div>
  );
}
