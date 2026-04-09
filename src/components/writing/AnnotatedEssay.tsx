"use client";

import type { ReactNode } from "react";
import type { EssayHighlight } from "@/types/writing";

const STYLE: Record<
  EssayHighlight["type"],
  { line: string; good: string; bad: string }
> = {
  grammar: {
    line: "border-b-2 border-red-600",
    good: "bg-red-50",
    bad: "bg-red-100",
  },
  vocabulary: {
    line: "border-b-2 border-blue-600",
    good: "bg-blue-50",
    bad: "bg-blue-100",
  },
  coherence: {
    line: "border-b-2 border-green-600",
    good: "bg-green-50",
    bad: "bg-green-100",
  },
  task: {
    line: "border-b-2 border-yellow-500",
    good: "bg-yellow-50",
    bad: "bg-yellow-100",
  },
};

function typeLabel(t: EssayHighlight["type"]): string {
  switch (t) {
    case "grammar":
      return "Grammar";
    case "vocabulary":
      return "Vocabulary";
    case "coherence":
      return "Coherence";
    default:
      return "Task";
  }
}

function HighlightTooltip({ h, text }: { h: EssayHighlight; text: string }) {
  const st = STYLE[h.type];
  const tone = h.isPositive ? st.good : st.bad;
  const headEn = h.headlineEn?.trim() || h.noteEn;
  const headTh = h.headlineTh?.trim() || h.noteTh;
  const scoreEn =
    h.scoreLineEn?.trim() ||
    (h.isPositive
      ? `+ ${typeLabel(h.type)}: reinforces your score on this band.`
      : `− ${typeLabel(h.type)}: hurts your score — see fix below.`);
  const scoreTh =
    h.scoreLineTh?.trim() ||
    (h.isPositive
      ? `+ ${typeLabel(h.type)}: ช่วยคะแนนในเกณฑ์นี้`
      : `− ${typeLabel(h.type)}: กดคะแนน — ดูวิธีแก้ด้านล่าง`);

  return (
    <span className="group relative inline-block max-w-full align-baseline">
      <span
        className={`relative z-20 cursor-help ${st.line} ${tone} rounded-sm px-0.5 transition-colors group-hover:brightness-95`}
      >
        {text}
      </span>
      {/* Invisible strip so hover survives moving up to the card */}
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

        {h.patternEn || h.patternTh ? (
          <div className="mt-2 border-t border-neutral-200 pt-2">
            <p className="ep-stat text-[10px] font-bold text-neutral-500">Pattern / focus</p>
            {h.patternEn ? (
              <p className="text-xs font-semibold text-neutral-800">{h.patternEn}</p>
            ) : null}
            {h.patternTh ? <p className="text-xs text-neutral-600">{h.patternTh}</p> : null}
          </div>
        ) : null}

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

export function AnnotatedEssay({
  essay,
  highlights,
}: {
  essay: string;
  highlights: EssayHighlight[];
}) {
  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  const out: ReactNode[] = [];
  let pos = 0;
  let key = 0;

  for (const h of sorted) {
    if (h.start < pos) continue;
    if (h.start > pos) {
      out.push(<span key={`t${key++}`}>{essay.slice(pos, h.start)}</span>);
    }
    const slice = essay.slice(h.start, h.end);
    out.push(<HighlightTooltip key={`h${key++}`} h={h} text={slice} />);
    pos = h.end;
  }
  if (pos < essay.length) {
    out.push(<span key={`t${key++}`}>{essay.slice(pos)}</span>);
  }

  return (
    <div className="rounded-sm border-2 border-black bg-white p-4 text-sm leading-relaxed">
      <p className="ep-stat mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
        Annotated feedback — hover each highlight · red grammar · blue vocab · green
        coherence · yellow task
      </p>
      <div className="whitespace-pre-wrap font-medium text-neutral-900">{out}</div>
    </div>
  );
}
