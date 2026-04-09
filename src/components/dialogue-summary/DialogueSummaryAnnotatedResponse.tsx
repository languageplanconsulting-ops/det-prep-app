"use client";

import type { ReactNode } from "react";
import type { DialogueSummaryHighlight } from "@/types/dialogue-summary";

const STYLE: Record<
  DialogueSummaryHighlight["type"],
  { line: string; tone: string }
> = {
  grammar: {
    line: "border-b-2 border-red-600",
    tone: "bg-red-50",
  },
  flow: {
    line: "border-b-2 border-emerald-600",
    tone: "bg-emerald-50",
  },
  vocabulary: {
    line: "border-b-2 border-amber-500",
    tone: "bg-amber-50",
  },
};

function typeLabel(t: DialogueSummaryHighlight["type"]): string {
  switch (t) {
    case "grammar":
      return "Grammar";
    case "flow":
      return "Flow";
    default:
      return "Vocabulary";
  }
}

function HighlightTooltip({ h, text }: { h: DialogueSummaryHighlight; text: string }) {
  const st = STYLE[h.type];
  const headEn = h.headlineEn?.trim() || h.noteEn;
  const headTh = h.headlineTh?.trim() || h.noteTh;
  const scoreEn =
    h.scoreLineEn?.trim() ||
    (h.isPositive
      ? `+ ${typeLabel(h.type)}: supports your score on this band.`
      : `− ${typeLabel(h.type)}: consider the suggestion below.`);
  const scoreTh =
    h.scoreLineTh?.trim() ||
    (h.isPositive
      ? `+ ${typeLabel(h.type)}: ช่วยคะแนนในเกณฑ์นี้`
      : `− ${typeLabel(h.type)}: ควรปรับปรุง — ดูคำแนะนำด้านล่าง`);

  return (
    <span className="group relative inline-block max-w-full align-baseline">
      <span
        className={`relative z-20 cursor-help ${st.line} ${st.tone} rounded-sm px-0.5 transition-colors group-hover:brightness-95`}
      >
        {text}
      </span>
      <span
        aria-hidden
        className="absolute bottom-full left-1/2 z-[68] h-10 w-[min(20rem,88vw)] -translate-x-1/2"
      />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-[70] mb-2 w-[min(calc(100vw-2rem),24rem)] -translate-x-1/2 border-2 border-black bg-white p-3 text-left opacity-0 shadow-[5px_5px_0_0_#0a0a0a] transition-opacity duration-200 group-hover:opacity-100"
      >
        <p className="ep-stat text-[9px] font-bold uppercase tracking-widest text-ep-blue">
          {typeLabel(h.type)} · {h.isPositive ? "Strength" : "Fix"}
        </p>
        <p className="mt-1 text-xs font-bold text-neutral-900">{headEn}</p>
        <p className="text-xs text-neutral-600">{headTh}</p>
        {!h.isPositive && (h.fixEn || h.fixTh) ? (
          <div className="mt-2 border-t border-neutral-200 pt-2">
            <p className="ep-stat text-[10px] font-bold text-red-700">Suggestion</p>
            {h.fixEn ? <p className="text-xs text-neutral-900">{h.fixEn}</p> : null}
            {h.fixTh ? <p className="text-xs text-neutral-600">{h.fixTh}</p> : null}
          </div>
        ) : null}
        <div className="mt-2 border-t-2 border-ep-yellow pt-2">
          <p className="ep-stat text-[10px] font-bold text-neutral-600">Score link</p>
          <p className="text-xs font-bold text-ep-blue">{scoreEn}</p>
          <p className="text-xs text-neutral-600">{scoreTh}</p>
        </div>
      </span>
    </span>
  );
}

export function DialogueSummaryAnnotatedResponse({
  summary,
  highlights,
}: {
  summary: string;
  highlights: DialogueSummaryHighlight[];
}) {
  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  const out: ReactNode[] = [];
  let pos = 0;
  let key = 0;

  for (const h of sorted) {
    if (h.start < pos) continue;
    if (h.start > pos) {
      out.push(<span key={`t${key++}`}>{summary.slice(pos, h.start)}</span>);
    }
    const slice = summary.slice(h.start, h.end);
    out.push(<HighlightTooltip key={`h${key++}`} h={h} text={slice} />);
    pos = h.end;
  }
  if (pos < summary.length) {
    out.push(<span key={`t${key++}`}>{summary.slice(pos)}</span>);
  }

  return (
    <div className="rounded-sm border-2 border-black bg-white p-4 text-sm leading-relaxed">
      <p className="ep-stat mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
        Annotated feedback — hover each highlight · red grammar · green flow · yellow vocabulary
      </p>
      <div className="whitespace-pre-wrap font-medium text-neutral-900">{out}</div>
    </div>
  );
}
