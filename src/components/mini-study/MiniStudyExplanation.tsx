"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import type { MiniStudyExplanationBlock } from "@/lib/mini-study/content";

type Props = {
  sessionIndex: number;
  durationLabel: string;
  title: string;
  subtitle: string;
  blocks: MiniStudyExplanationBlock[];
  startLabel: string;
  onStart: () => void;
};

export function MiniStudyExplanation({
  sessionIndex,
  durationLabel,
  title,
  subtitle,
  blocks,
  startLabel,
  onStart,
}: Props) {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="ep-brutal rounded-sm border-black bg-white p-6">
        <p className="ep-stat text-xs font-bold uppercase tracking-[0.2em] text-red-700">
          Admin preview · Session {sessionIndex} · {durationLabel}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>
      </div>

      <div className="space-y-4">
        {blocks.map((block, i) => (
          <div
            key={i}
            className="rounded-sm border-4 border-black bg-white p-5 shadow-[4px_4px_0_0_#111]"
          >
            <h2 className="text-lg font-black tracking-tight text-[#004AAD]">
              {block.heading}
            </h2>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-neutral-800">
              {renderInlineMarkdown(block.body)}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Link
          href="/practice/mini-study"
          className="inline-block rounded-[4px] border-4 border-black bg-white px-4 py-2 text-sm font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
        >
          ← Sessions
        </Link>
        <button
          type="button"
          onClick={onStart}
          className="rounded-[4px] border-4 border-black bg-[#004AAD] px-5 py-2 text-sm font-black uppercase tracking-wide text-[#FFCC00] shadow-[4px_4px_0_0_#000] hover:translate-x-px hover:translate-y-px hover:shadow-none"
        >
          {startLabel}
        </button>
      </div>
    </main>
  );
}

function renderInlineMarkdown(text: string) {
  const parts: ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
    if (m[1]) parts.push(<strong key={key++}>{m[1]}</strong>);
    else if (m[2]) parts.push(<em key={key++}>{m[2]}</em>);
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}
