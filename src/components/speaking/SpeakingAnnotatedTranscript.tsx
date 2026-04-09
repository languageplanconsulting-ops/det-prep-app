"use client";

import type { ReactNode } from "react";
import type { SpeakingTranscriptHighlight } from "@/types/speaking";

function HighlightSpan({ h, text }: { h: SpeakingTranscriptHighlight; text: string }) {
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

export function SpeakingAnnotatedTranscript({
  text,
  highlights,
}: {
  text: string;
  highlights: SpeakingTranscriptHighlight[];
}) {
  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  const out: ReactNode[] = [];
  let pos = 0;
  let key = 0;

  for (const h of sorted) {
    if (h.start < pos) continue;
    if (h.start > pos) {
      out.push(<span key={`t${key++}`}>{text.slice(pos, h.start)}</span>);
    }
    const slice = text.slice(h.start, h.end);
    out.push(<HighlightSpan key={h.id} h={h} text={slice} />);
    pos = h.end;
  }
  if (pos < text.length) {
    out.push(<span key={`t${key++}`}>{text.slice(pos)}</span>);
  }

  return (
    <div className="rounded-sm border-2 border-black bg-white p-4 text-sm leading-relaxed">
      <p className="ep-stat mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
        Annotated transcript — hover each highlight · green = strong · amber = refine
      </p>
      <div className="whitespace-pre-wrap font-medium text-neutral-900">{out}</div>
    </div>
  );
}
