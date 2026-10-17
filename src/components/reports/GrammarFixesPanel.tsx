"use client";

import { useEffect, useState } from "react";

import { WeaknessDrill } from "@/components/reports/WeaknessDrill";
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
  /** Short grammar rule name (e.g. "การใช้ if I were") — leads the card. */
  topicEn?: string;
  topicTh?: string;
};

type RepeatInfo = {
  index: number;
  occurrenceCount: number;
  firstSeenAt: string;
  previousExample: { wrong: string; better: string } | null;
};

function thaiDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

/** Which of this report's mistakes the learner has made before, and how often. */
function useRepeatHistory(items: GrammarFixItem[]): Map<number, RepeatInfo> {
  const [map, setMap] = useState<Map<number, RepeatInfo>>(new Map());
  const signature = items.map((i) => `${i.topicEn ?? ""}|${i.topicTh ?? ""}|${i.wrong}`).join("§");
  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/production-weakness/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((i) => ({ topicEn: i.topicEn ?? "", topicTh: i.topicTh ?? "", wrong: i.wrong })),
          }),
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { history?: RepeatInfo[] };
        if (!cancelled) setMap(new Map((data.history ?? []).map((h) => [h.index, h])));
      } catch {
        // The report is complete without the repeat badges.
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  return map;
}

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
  const repeats = useRepeatHistory(items.slice(0, maxItems));
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
        {items.slice(0, maxItems).map((item, idx) => {
          const repeat = repeats.get(idx);
          return (
          <li
            key={item.id}
            className="rounded-sm border-2 border-black bg-[#fafafa] p-3 text-sm shadow-[2px_2px_0_0_#000]"
          >
            {item.topicTh?.trim() || item.topicEn?.trim() ? (
              <p className="mb-2 inline-block rounded-sm bg-[#004AAD] px-2 py-1 text-xs font-black text-white">
                📚 {item.topicTh?.trim() || item.topicEn?.trim()}
              </p>
            ) : null}
            {repeat ? (
              <div className="mb-2 rounded-sm border-2 border-amber-500 bg-amber-50 px-2 py-1.5 text-xs">
                <p className="font-black text-amber-900">
                  🔁 ข้อผิดพลาดเดิม — คุณทำผิดข้อนี้มาแล้ว {repeat.occurrenceCount} ครั้ง
                  {thaiDate(repeat.firstSeenAt) ? ` (ตั้งแต่ ${thaiDate(repeat.firstSeenAt)})` : ""}
                </p>
                <p className="mt-0.5 text-amber-800">
                  You have made this mistake {repeat.occurrenceCount} times now.
                </p>
                {repeat.previousExample ? (
                  <p className="mt-1 text-amber-900">
                    ครั้งก่อนคุณเขียนว่า: <span className="font-semibold">“{repeat.previousExample.wrong}”</span>
                    {repeat.previousExample.better ? (
                      <>
                        {" "}→ <span className="font-semibold text-emerald-800">“{repeat.previousExample.better}”</span>
                      </>
                    ) : null}
                  </p>
                ) : null}
              </div>
            ) : null}
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
                suggestedPremade={NOTEBOOK_BUILTIN.grammar}
                className="border-emerald-700/30 bg-emerald-100"
                getPayload={() => {
                  const topic = item.topicTh?.trim() || item.topicEn?.trim();
                  return {
                    // Grammar entries LEAD with the rule topic so the notebook shows
                    // the rule to revise first; the correction goes in the body.
                    titleEn: topic || titleEn,
                    titleTh: topic || titleTh,
                    bodyEn: `Wrong: ${item.wrong}\n\nBetter: ${item.betterEn ?? item.betterTh ?? ""}${
                      item.noteEn ? `\n\nWhy: ${item.noteEn}` : ""
                    }`,
                    bodyTh: `ของเดิม: ${item.wrong}\n\nแบบที่ดีขึ้น: ${item.betterTh ?? item.betterEn ?? ""}${
                      item.noteTh ? `\n\nเหตุผล: ${item.noteTh}` : ""
                    }`,
                    excerpt: item.wrong.slice(0, 120),
                  };
                }}
              />
            </div>
            {repeat ? (
              <WeaknessDrill
                source={{
                  topicEn: item.topicEn,
                  topicTh: item.topicTh,
                  wrong: item.wrong,
                  betterEn: item.betterEn,
                  noteTh: item.noteTh,
                  noteEn: item.noteEn,
                }}
              />
            ) : null}
          </li>
          );
        })}
      </ul>
    </BrutalPanel>
  );
}
