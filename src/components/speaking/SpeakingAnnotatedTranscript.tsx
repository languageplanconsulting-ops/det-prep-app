"use client";

import type { ReactNode } from "react";
import { AddToNotebookButton } from "@/components/writing/AddToNotebookButton";
import { NOTEBOOK_BUILTIN } from "@/lib/notebook-storage";
import type { SpeakingAttemptReport } from "@/types/speaking";
import type { WritingAttemptReport } from "@/types/writing";
import type { RubricHighlightNotebookCard } from "@/types/writing";

/** Shared shape for transcript-style highlights across speaking / writing / interactive UIs. */
export type TranscriptStyleHighlight = {
  id: string;
  start: number;
  end: number;
  isPositive: boolean;
  noteEn: string;
  noteTh: string;
};

type RubricReportSlice = Pick<
  WritingAttemptReport,
  | "score160"
  | "topicTitleEn"
  | "topicTitleTh"
  | "grammar"
  | "vocabulary"
  | "coherence"
  | "taskRelevancy"
>;

function buildRubricHighlightCard(
  report: RubricReportSlice,
  h: TranscriptStyleHighlight,
  snippet: string,
  kind: "read-speak-highlight" | "read-write-highlight",
): RubricHighlightNotebookCard {
  return {
    kind,
    score160: report.score160,
    topicTitleEn: report.topicTitleEn,
    topicTitleTh: report.topicTitleTh,
    grammarPercent: Math.round(report.grammar.scorePercent),
    vocabularyPercent: Math.round(report.vocabulary.scorePercent),
    coherencePercent: Math.round(report.coherence.scorePercent),
    taskPercent: Math.round(report.taskRelevancy.scorePercent),
    grammarPoints160: report.grammar.pointsOn160,
    vocabularyPoints160: report.vocabulary.pointsOn160,
    coherencePoints160: report.coherence.pointsOn160,
    taskPoints160: report.taskRelevancy.pointsOn160,
    highlightedSnippet: snippet,
    highlightPositive: h.isPositive,
    noteEn: h.noteEn,
    noteTh: h.noteTh,
  };
}

function HighlightSpanSimple({ h, text }: { h: TranscriptStyleHighlight; text: string }) {
  const positive = h.isPositive;
  const line = positive
    ? "border-b-2 border-emerald-600 bg-emerald-50"
    : "border-b-2 border-amber-600 bg-amber-50";
  const tip = [h.noteEn, h.noteTh].filter(Boolean).join(" · ");
  const titleAttr = tip || undefined;

  return (
    <span className="group relative inline-block max-w-full align-baseline">
      <span
        title={titleAttr}
        className={`relative z-20 cursor-help ${line} rounded-sm px-0.5 transition-colors group-hover:brightness-95`}
      >
        {text}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-full left-1/2 z-[68] h-10 w-[min(20rem,88vw)] -translate-x-1/2"
      />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-[70] mb-2 w-[min(calc(100vw-2rem),24rem)] -translate-x-1/2 border-2 border-black bg-white p-3 text-left opacity-0 shadow-[5px_5px_0_0_#0a0a0a] transition-opacity duration-200 group-hover:opacity-100"
      >
        <p className="ep-stat text-[9px] font-bold uppercase tracking-widest text-ep-blue">
          {positive ? "Strength" : "To improve"}
        </p>
        {h.noteEn ? <p className="mt-1 text-xs font-bold text-neutral-900">{h.noteEn}</p> : null}
        {h.noteTh ? <p className="text-xs text-neutral-600">{h.noteTh}</p> : null}
      </span>
    </span>
  );
}

function HighlightSpanRubricNotebook({
  h,
  text,
  report,
  rubricKind,
  entrySource,
  notebookTitleEn,
  notebookTitleTh,
  attemptId,
  uiLocale,
}: {
  h: TranscriptStyleHighlight;
  text: string;
  report: RubricReportSlice;
  rubricKind: "read-speak-highlight" | "read-write-highlight";
  entrySource: "speaking-read-and-speak" | "writing-read-and-write";
  notebookTitleEn: string;
  notebookTitleTh: string;
  attemptId: string;
  uiLocale: "en" | "th";
}) {
  const positive = h.isPositive;
  const line = positive
    ? "border-b-2 border-emerald-600 bg-emerald-50"
    : "border-b-2 border-amber-600 bg-amber-50";
  const tip = [h.noteEn, h.noteTh].filter(Boolean).join(" · ");
  const titleAttr = tip || undefined;
  const th = uiLocale === "th";
  const card = buildRubricHighlightCard(report, h, text, rubricKind);

  return (
    <span className="group relative inline-block max-w-full align-baseline">
      <span
        title={titleAttr}
        className={`relative z-20 cursor-help ${line} rounded-sm px-0.5 transition-colors group-hover:brightness-95`}
      >
        {text}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-full left-1/2 z-[68] h-10 w-[min(20rem,88vw)] -translate-x-1/2"
      />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-[70] mb-2 w-[min(calc(100vw-2rem),26rem)] -translate-x-1/2 border-2 border-black bg-white p-3 text-left opacity-0 shadow-[5px_5px_0_0_#0a0a0a] transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100"
      >
        <p className="ep-stat text-[9px] font-bold uppercase tracking-widest text-ep-blue">
          {positive ? (th ? "จุดแข็ง" : "Strength") : th ? "พัฒนาต่อ" : "To improve"}
        </p>
        {h.noteEn ? <p className="mt-1 text-xs font-bold text-neutral-900">{h.noteEn}</p> : null}
        {h.noteTh ? <p className="text-xs text-neutral-600">{h.noteTh}</p> : null}
        <div className="relative z-[71] mt-3 border-t-2 border-neutral-200 pt-3">
          <AddToNotebookButton
            entrySource={entrySource}
            attemptId={attemptId}
            suggestedPremade={NOTEBOOK_BUILTIN.productionFeedback}
            uiLocale={uiLocale}
            className="w-full border-ep-blue/40 bg-ep-yellow/90 text-[11px] shadow-[2px_2px_0_0_#000]"
            getPayload={() => ({
              titleEn: notebookTitleEn,
              titleTh: notebookTitleTh,
              bodyEn: [
                `${positive ? "Strength" : "To improve"}: “${text}”`,
                h.noteEn?.trim() ? `Note: ${h.noteEn.trim()}` : "",
              ]
                .filter(Boolean)
                .join("\n"),
              bodyTh: [`“${text}”`, h.noteTh?.trim() ? h.noteTh.trim() : ""]
                .filter(Boolean)
                .join("\n\n"),
              excerpt: text.length > 100 ? `${text.slice(0, 100)}…` : text,
              rubricHighlightCard: card,
            })}
          />
        </div>
      </span>
    </span>
  );
}

export function SpeakingAnnotatedTranscript({
  text,
  highlights,
  readSpeakReport,
  writingReport,
  attemptId,
  uiLocale = "en",
}: {
  text: string;
  highlights: TranscriptStyleHighlight[];
  /** Read-then-speak: enables “Add to notebook” with full score card. */
  readSpeakReport?: SpeakingAttemptReport;
  /** Read-then-write: same notebook card with writing labels. */
  writingReport?: WritingAttemptReport;
  attemptId?: string;
  uiLocale?: "en" | "th";
}) {
  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  const out: ReactNode[] = [];
  let pos = 0;
  let key = 0;

  const rubricReport = readSpeakReport ?? writingReport;
  const notebookMode =
    rubricReport != null && typeof attemptId === "string" && attemptId.length > 0;
  const rubricKind: "read-speak-highlight" | "read-write-highlight" | null = readSpeakReport
    ? "read-speak-highlight"
    : writingReport
      ? "read-write-highlight"
      : null;
  const entrySource: "speaking-read-and-speak" | "writing-read-and-write" | null = readSpeakReport
    ? "speaking-read-and-speak"
    : writingReport
      ? "writing-read-and-write"
      : null;

  const notebookTitleEn =
    rubricKind === "read-write-highlight"
      ? "Read then write — highlighted moment"
      : "Read then speak — highlighted moment";
  const notebookTitleTh =
    rubricKind === "read-write-highlight"
      ? "อ่านแล้วเขียน — ประเด็นที่ไฮไลต์"
      : "อ่านแล้วพูด — ประเด็นที่ไฮไลต์";

  for (const h of sorted) {
    if (h.start < pos) continue;
    if (h.start > pos) {
      out.push(<span key={`t${key++}`}>{text.slice(pos, h.start)}</span>);
    }
    const slice = text.slice(h.start, h.end);
    out.push(
      notebookMode && rubricReport && rubricKind && entrySource ? (
        <HighlightSpanRubricNotebook
          key={h.id}
          h={h}
          text={slice}
          report={rubricReport}
          rubricKind={rubricKind}
          entrySource={entrySource}
          notebookTitleEn={notebookTitleEn}
          notebookTitleTh={notebookTitleTh}
          attemptId={attemptId}
          uiLocale={uiLocale}
        />
      ) : (
        <HighlightSpanSimple key={h.id} h={h} text={slice} />
      ),
    );
    pos = h.end;
  }
  if (pos < text.length) {
    out.push(<span key={`t${key++}`}>{text.slice(pos)}</span>);
  }

  const th = uiLocale === "th";

  const hintLine =
    notebookMode && rubricKind === "read-write-highlight"
      ? th
        ? "ข้อความที่มีไฮไลต์ — วางเมาส์เพื่ออ่านคำแนะนำ · กด “เพิ่มในสมุด” เพื่อบันทึกพร้อมคะแนนเต็ม"
        : "Hover highlights · Add to notebook saves your full score + this moment"
      : notebookMode
        ? th
          ? "บทพูดที่มีไฮไลต์ — วางเมาส์เพื่ออ่านคำแนะนำ · กด “เพิ่มในสมุด” เพื่อบันทึกพร้อมคะแนนเต็ม"
          : "Annotated transcript — hover for tips · Add to notebook saves your score + this highlight"
        : th
          ? "วางเมาส์ที่แต่ละส่วนเพื่อดูคำแนะนำ"
          : "Annotated text — hover each highlight · green = strong · amber = refine";

  return (
    <div className="rounded-sm border-2 border-black bg-white p-4 text-sm leading-relaxed">
      <p className="ep-stat mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
        {hintLine}
      </p>
      <div className="whitespace-pre-wrap font-medium text-neutral-900">{out}</div>
    </div>
  );
}
