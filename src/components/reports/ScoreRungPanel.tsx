"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { AddToNotebookButton } from "@/components/writing/AddToNotebookButton";
import type { SuggestedNotebookPremade } from "@/components/writing/AddToNotebookButton";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { NOTEBOOK_BUILTIN } from "@/lib/notebook-storage";
import type {
  NotebookEntry,
  ScoreRungChange,
  ScoreRungChangeCategory,
  ScoreRungLadder,
  ScoreRungSample,
} from "@/types/writing";

const CATEGORY_TH: Record<ScoreRungChangeCategory, string> = {
  grammar: "ไวยากรณ์",
  vocabulary: "คำศัพท์",
  coherence: "ความต่อเนื่อง",
};

const CATEGORY_EN: Record<ScoreRungChangeCategory, string> = {
  grammar: "Grammar",
  vocabulary: "Vocabulary",
  coherence: "Coherence",
};

/** Each change files itself under the folder it belongs to. */
function premadeFor(category: ScoreRungChangeCategory): SuggestedNotebookPremade {
  if (category === "vocabulary") return NOTEBOOK_BUILTIN.vocabulary;
  if (category === "grammar") return NOTEBOOK_BUILTIN.grammar;
  return NOTEBOOK_BUILTIN.productionFeedback;
}

/**
 * The rung text with its edits as green highlight + underline.
 *
 * Tap-to-select rather than hover: these reports are read on phones and iPads,
 * where a hover tooltip never opens, and the detail card holds a button that
 * opens a modal — which cannot live inside a hover-only popover.
 */
function RungText({
  sample,
  selectedId,
  onSelect,
}: {
  sample: ScoreRungSample;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const out: ReactNode[] = [];
  let pos = 0;
  let key = 0;

  for (const change of sample.changes) {
    if (change.start < pos) continue;
    if (change.start > pos) {
      out.push(<span key={`t${key++}`}>{sample.text.slice(pos, change.start)}</span>);
    }
    const selected = selectedId === change.id;
    out.push(
      <button
        key={change.id}
        type="button"
        onClick={() => onSelect(change.id)}
        aria-pressed={selected}
        className={`cursor-pointer rounded-sm border-b-2 border-green-600 px-0.5 font-semibold text-neutral-900 underline decoration-green-600 decoration-2 underline-offset-2 transition-colors ${
          selected ? "bg-green-300" : "bg-green-100 hover:bg-green-200"
        }`}
      >
        {sample.text.slice(change.start, change.end)}
      </button>,
    );
    pos = change.end;
  }
  if (pos < sample.text.length) {
    out.push(<span key={`t${key++}`}>{sample.text.slice(pos)}</span>);
  }

  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-neutral-900">{out}</p>
  );
}

function ChangeCard({
  change,
  replacement,
  target160,
  attemptId,
  entrySource,
}: {
  change: ScoreRungChange;
  /** The rung wording this change produced (the green-highlighted slice). */
  replacement: string;
  target160: number;
  attemptId: string;
  entrySource: NotebookEntry["source"];
}) {
  const beforeAfterEn = change.original
    ? `${change.original} → ${replacement}`
    : `+ ${replacement}`;
  return (
    <div className="mt-3 rounded-sm border-2 border-green-700 bg-green-50 p-3 shadow-[2px_2px_0_0_#15803d]">
      <p className="ep-stat text-[10px] font-bold uppercase tracking-widest text-green-800">
        {CATEGORY_TH[change.category]} · {CATEGORY_EN[change.category]}
      </p>
      <p className="mt-1 text-sm font-bold text-neutral-900">
        {change.original ? (
          <>
            <span className="text-neutral-500 line-through">{change.original}</span>
            <span className="px-1 text-green-700">→</span>
          </>
        ) : (
          <span className="pr-1 text-green-700">+</span>
        )}
        <span className="text-green-800">{replacement}</span>
      </p>
      <p className="mt-1 text-sm text-neutral-900">{change.noteTh || change.noteEn}</p>
      {change.noteTh && change.noteEn ? (
        <p className="mt-1 text-xs text-neutral-600">{change.noteEn}</p>
      ) : null}
      <div className="relative z-10 mt-3">
        <AddToNotebookButton
          entrySource={entrySource}
          attemptId={attemptId}
          suggestedPremade={premadeFor(change.category)}
          className="border-green-700 bg-green-200"
          uiLocale="th"
          getPayload={() => ({
            titleEn: `${CATEGORY_EN[change.category]} upgrade → ${target160}`,
            titleTh: `${CATEGORY_TH[change.category]} เพื่อไปที่ ${target160}`,
            bodyEn: [beforeAfterEn, change.noteEn].filter(Boolean).join("\n"),
            bodyTh: [beforeAfterEn, change.noteTh].filter(Boolean).join("\n"),
            excerpt: replacement,
          })}
        />
      </div>
    </div>
  );
}

function RungBlock({
  sample,
  currentScore160,
  learnerWordCount,
  attemptId,
  entrySource,
}: {
  sample: ScoreRungSample;
  currentScore160: number;
  learnerWordCount: number;
  attemptId: string;
  entrySource: NotebookEntry["source"];
}) {
  // Pre-select the first edit so the explanation is visible without a tap.
  const [selectedId, setSelectedId] = useState<string | null>(
    sample.changes[0]?.id ?? null,
  );
  const selected =
    sample.changes.find((c) => c.id === selectedId) ?? sample.changes[0] ?? null;
  const gain = sample.target160 - currentScore160;

  return (
    <div className="rounded-sm border-2 border-black bg-white p-3 shadow-[3px_3px_0_0_#000] sm:p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="ep-stat text-2xl font-black text-ep-blue">{sample.target160}</span>
        <span className="ep-stat text-[11px] font-bold uppercase tracking-widest text-neutral-500">
          {sample.bandLabel}
        </span>
        {gain > 0 ? (
          <span className="rounded-sm border-2 border-black bg-ep-yellow px-1.5 py-0.5 text-[11px] font-black">
            +{gain}
          </span>
        ) : null}
        <span className="ep-stat ml-auto text-[11px] text-neutral-500">
          {sample.wordCount} คำ · ของคุณ {learnerWordCount} คำ
        </span>
      </div>

      {sample.headlineTh || sample.headlineEn ? (
        <p className="mt-2 text-sm font-bold text-neutral-900">
          {sample.headlineTh || sample.headlineEn}
        </p>
      ) : null}

      <div className="mt-3 rounded-sm border-2 border-neutral-300 bg-[#fafafa] p-3">
        <RungText sample={sample} selectedId={selectedId} onSelect={setSelectedId} />
      </div>
      <p className="mt-2 text-[11px] text-neutral-500">
        แตะคำที่ไฮไลต์สีเขียวเพื่อดูว่าแก้อะไร แล้วกดเพิ่มในสมุดได้เลย
      </p>

      {selected ? (
        <ChangeCard
          change={selected}
          replacement={sample.text.slice(selected.start, selected.end)}
          target160={sample.target160}
          attemptId={attemptId}
          entrySource={entrySource}
        />
      ) : null}

      <div className="relative z-10 mt-3">
        <AddToNotebookButton
          entrySource={entrySource}
          attemptId={attemptId}
          suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
          directSaveToProductionFeedback
          className="border-ep-blue/30 bg-ep-yellow/80"
          uiLocale="th"
          getPayload={() => ({
            titleEn: `My answer rewritten at ${sample.target160}`,
            titleTh: `คำตอบของฉันในระดับ ${sample.target160} (${sample.bandLabel})`,
            bodyEn: sample.text,
            bodyTh: [
              sample.headlineTh,
              ...sample.changes.map((c) => `• ${c.noteTh || c.noteEn}`),
            ]
              .filter(Boolean)
              .join("\n"),
            excerpt: sample.text.length > 90 ? `${sample.text.slice(0, 90)}…` : sample.text,
          })}
        />
      </div>
    </div>
  );
}

/**
 * "How to get +20 from here" — the learner's own answer rewritten at the next
 * two rungs, same length, same ideas. Renders nothing when the grader (or an
 * older stored report) has no rung payload.
 */
export function ScoreRungPanel({
  ladder,
  attemptId,
  entrySource,
}: {
  ladder: ScoreRungLadder | undefined;
  attemptId: string;
  entrySource: NotebookEntry["source"];
}) {
  if (!ladder || ladder.rungs.length === 0) return null;
  const first = ladder.rungs[0];
  const gain = first.target160 - ladder.currentScore160;

  return (
    <BrutalPanel
      variant="elevated"
      eyebrow={gain > 0 ? `จากนี้ +${gain}` : "ขั้นต่อไป"}
      title="จะไปต่อยังไง — คำตอบเดิมของคุณ เขียนใหม่ในระดับที่สูงขึ้น"
    >
      <p className="mb-4 text-xs text-neutral-600">
        นี่คือ<strong>ข้อความของคุณเอง</strong> ไม่ได้เพิ่มความยาว ไม่ได้เพิ่มไอเดียใหม่ —
        แก้แค่ไวยากรณ์ คำศัพท์ และคำเชื่อม เพราะสามอย่างนี้คือคะแนนส่วนใหญ่ที่คุณเสียไป
      </p>
      <div className="space-y-5">
        {ladder.rungs.map((sample) => (
          <RungBlock
            key={sample.id}
            sample={sample}
            currentScore160={ladder.currentScore160}
            learnerWordCount={ladder.learnerWordCount}
            attemptId={attemptId}
            entrySource={entrySource}
          />
        ))}
      </div>
    </BrutalPanel>
  );
}
