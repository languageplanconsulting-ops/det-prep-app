"use client";

import { AddToNotebookButton } from "@/components/writing/AddToNotebookButton";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { NOTEBOOK_BUILTIN } from "@/lib/notebook-storage";
import type { NotebookEntry } from "@/types/writing";

export type GrammarFixItem = {
  id: string;
  wrong: string;
  betterEn?: string;
  betterTh?: string;
  noteEn?: string;
  noteTh?: string;
};

export function GrammarFixesPanel({
  items,
  attemptId,
  entrySource,
  titleEn,
  titleTh,
  maxItems = 5,
}: {
  items: GrammarFixItem[];
  attemptId: string;
  entrySource: NotebookEntry["source"];
  titleEn: string;
  titleTh: string;
  maxItems?: number;
}) {
  if (items.length === 0) return null;

  return (
    <BrutalPanel
      variant="elevated"
      eyebrow={`Up to ${Math.min(maxItems, items.length)}`}
      title="Grammar fixes"
    >
      <p className="mb-4 text-xs text-neutral-600">
        จุดที่ควรแก้ไวยากรณ์เพื่อเพิ่มคะแนน: ข้อความเดิมเป็นสีแดง และประโยคที่แนะนำเป็นสีเขียว
      </p>
      <ul className="space-y-3">
        {items.slice(0, maxItems).map((item) => (
          <li
            key={item.id}
            className="rounded-sm border-2 border-black bg-[#fafafa] p-3 text-sm shadow-[2px_2px_0_0_#000]"
          >
            <p className="ep-stat text-[10px] font-bold uppercase tracking-wide text-red-700">
              Original (fix this)
            </p>
            <p className="mt-1 text-red-700 line-through decoration-2">{item.wrong}</p>
            <p className="ep-stat mt-3 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              Better grammar
            </p>
            {item.betterTh?.trim() ? (
              <p className="mt-1 font-bold text-emerald-700">{item.betterTh}</p>
            ) : null}
            {item.betterEn?.trim() ? (
              <p className="mt-1 text-sm text-emerald-700/85">{item.betterEn}</p>
            ) : null}
            {item.noteTh?.trim() || item.noteEn?.trim() ? (
              <div className="mt-2 rounded-sm border border-emerald-200 bg-emerald-50/60 px-2 py-1.5 text-xs">
                {item.noteTh?.trim() ? <p className="font-semibold text-emerald-900">{item.noteTh}</p> : null}
                {item.noteEn?.trim() ? <p className="mt-0.5 text-emerald-800">{item.noteEn}</p> : null}
              </div>
            ) : null}
            <div className="relative z-10 mt-3">
              <AddToNotebookButton
                attemptId={attemptId}
                entrySource={entrySource}
                suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
                directSaveToProductionFeedback
                className="border-emerald-700/30 bg-emerald-100"
                getPayload={() => ({
                  titleEn,
                  titleTh,
                  bodyEn: `Wrong: ${item.wrong}\n\nBetter: ${item.betterEn ?? item.betterTh ?? ""}${
                    item.noteEn ? `\n\nWhy: ${item.noteEn}` : ""
                  }`,
                  bodyTh: `ของเดิม: ${item.wrong}\n\nแบบที่ดีขึ้น: ${item.betterTh ?? item.betterEn ?? ""}${
                    item.noteTh ? `\n\nเหตุผล: ${item.noteTh}` : ""
                  }`,
                  excerpt: item.wrong.slice(0, 120),
                })}
              />
            </div>
          </li>
        ))}
      </ul>
    </BrutalPanel>
  );
}
