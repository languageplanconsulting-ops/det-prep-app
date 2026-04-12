import type { RubricHighlightNotebookCard as CardData } from "@/types/writing";

/**
 * Branded layout for read-then-speak / read-then-write submission highlights saved to the notebook.
 */
export function NotebookSpeakingHighlightCard({
  data,
  titleEn,
  titleTh,
}: {
  data: CardData;
  titleEn: string;
  titleTh: string;
}) {
  const pos = data.highlightPositive;
  const quoteBg = pos
    ? "border-emerald-700 bg-emerald-50 shadow-[inset_0_0_0_1px_rgba(4,120,87,0.12)]"
    : "border-amber-700 bg-amber-50 shadow-[inset_0_0_0_1px_rgba(180,83,9,0.12)]";
  const quoteLabel = pos ? "Strong moment" : "Refine this";
  const quoteLabelTh = pos ? "จุดแข็ง" : "พัฒนาต่อ";

  const eyebrow =
    data.kind === "read-write-highlight"
      ? "Read then write · อ่านแล้วเขียน"
      : "Read then speak · อ่านแล้วพูด";

  const crit = [
    {
      key: "G",
      label: "Grammar",
      labelTh: "ไวยากรณ์",
      pct: data.grammarPercent,
      pts: data.grammarPoints160,
      tone: "bg-ep-blue/15 border-ep-blue/40 text-ep-blue",
    },
    {
      key: "V",
      label: "Vocabulary",
      labelTh: "คำศัพท์",
      pct: data.vocabularyPercent,
      pts: data.vocabularyPoints160,
      tone: "bg-violet-100/80 border-violet-700/35 text-violet-900",
    },
    {
      key: "C",
      label: "Coherence",
      labelTh: "ความต่อเนื่อง",
      pct: data.coherencePercent,
      pts: data.coherencePoints160,
      tone: "bg-sky-100/80 border-sky-800/30 text-sky-950",
    },
    {
      key: "T",
      label: "Task",
      labelTh: "โจทย์",
      pct: data.taskPercent,
      pts: data.taskPoints160,
      tone: "bg-amber-100/70 border-amber-800/35 text-amber-950",
    },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border-2 border-black bg-[linear-gradient(135deg,#fffdf5_0%,#eef6ff_45%,#fff8e8_100%)] p-4 shadow-[4px_4px_0_0_#000]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-black/10 pb-3">
          <div className="min-w-0">
            <p className="ep-stat text-[10px] font-black uppercase tracking-widest text-ep-blue">{eyebrow}</p>
            {titleEn.trim() ? (
              <h2 className="mt-1 text-lg font-black leading-tight text-neutral-900">{titleEn}</h2>
            ) : null}
            {titleTh.trim() ? (
              <p className="mt-0.5 text-sm font-semibold text-neutral-700">{titleTh}</p>
            ) : null}
            {(data.topicTitleEn.trim() || data.topicTitleTh.trim()) && (
              <p className="mt-2 text-xs text-neutral-600">
                <span className="font-bold text-neutral-800">Topic · หัวข้อ:</span>{" "}
                {data.topicTitleEn.trim()}
                {data.topicTitleEn.trim() && data.topicTitleTh.trim() ? " · " : ""}
                {data.topicTitleTh.trim()}
              </p>
            )}
          </div>
          <div className="shrink-0 rounded-lg border-2 border-black bg-ep-yellow px-3 py-2 text-center shadow-[2px_2px_0_0_#000]">
            <p className="ep-stat text-[9px] font-black uppercase tracking-widest text-neutral-700">
              Overall / รวม
            </p>
            <p className="text-2xl font-black tabular-nums text-neutral-900">
              {data.score160}
              <span className="text-sm font-bold text-neutral-600">/160</span>
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {crit.map((c) => (
            <div
              key={c.key}
              className={`rounded-lg border-2 px-2 py-2 text-center ${c.tone}`}
            >
              <p className="ep-stat text-[9px] font-black uppercase tracking-wide">{c.label}</p>
              <p className="text-[10px] font-semibold opacity-90">{c.labelTh}</p>
              <p className="mt-1 text-xl font-black tabular-nums">{c.pct}%</p>
              <p className="ep-stat text-[10px] font-bold opacity-80">≈ {c.pts}/160</p>
            </div>
          ))}
        </div>
      </div>

      <div className={`rounded-xl border-2 p-4 ${quoteBg}`}>
        <p className="ep-stat text-[10px] font-black uppercase tracking-widest text-neutral-700">
          {quoteLabel} · {quoteLabelTh}
        </p>
        <blockquote className="mt-2 whitespace-pre-wrap text-base font-semibold leading-relaxed text-neutral-900">
          “{data.highlightedSnippet}”
        </blockquote>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border-2 border-black bg-white p-3 shadow-[2px_2px_0_0_#000]">
          <p className="ep-stat text-[10px] font-black uppercase tracking-wide text-ep-blue">Grader note (EN)</p>
          <p className="mt-2 text-sm leading-relaxed text-neutral-900">{data.noteEn.trim() || "—"}</p>
        </div>
        <div className="rounded-lg border-2 border-black bg-neutral-50 p-3 shadow-[2px_2px_0_0_#000]">
          <p className="ep-stat text-[10px] font-black uppercase tracking-wide text-neutral-600">
            คำอธิบาย (TH)
          </p>
          <p className="mt-2 text-sm leading-relaxed text-neutral-800">{data.noteTh.trim() || "—"}</p>
        </div>
      </div>
    </div>
  );
}
