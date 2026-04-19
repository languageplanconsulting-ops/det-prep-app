"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  levelFromPct,
  type NotebookProductionParsedReport,
} from "@/lib/notebook-production-report-parse";

function pctTone(pct: number): "high" | "mid" | "low" {
  return levelFromPct(pct);
}

const ringRadius = 45;
const ringCirc = 2 * Math.PI * ringRadius;

export function NotebookProductionReportFullView({
  data,
}: {
  data: NotebookProductionParsedReport;
}) {
  const [openResponse, setOpenResponse] = useState(true);
  const [openCriterion, setOpenCriterion] = useState<string | null>("Grammar");
  const ringRef = useRef<SVGCircleElement | null>(null);
  const detailRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const pctOverall = useMemo(() => (data.score160 / 160) * 100, [data.score160]);

  useEffect(() => {
    const el = ringRef.current;
    if (!el) return;
    const t = window.setTimeout(() => {
      const offset = ringCirc * (1 - data.score160 / 160);
      el.style.strokeDashoffset = String(offset);
    }, 120);
    return () => window.clearTimeout(t);
  }, [data.score160]);

  const reportLabel =
    data.kind === "speaking" ? "Speaking report · รายงานการพูด" : "Writing report · รายงานการเขียน";
  const taskTitle =
    data.kind === "speaking" ? "Read, then speak · อ่านแล้วพูด" : "Read, then write · อ่านแล้วเขียน";

  const scrollToCriterion = (name: string) => {
    setOpenCriterion(name);
    window.setTimeout(() => {
      detailRefs.current[name]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  return (
    <div
      className="nb-prod-report text-[#111827]"
      style={{
        fontFamily: "var(--font-inter), ui-sans-serif, system-ui",
        backgroundImage: "radial-gradient(circle, rgba(0,74,173,.04) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="mx-auto max-w-[640px] px-4 pb-10 pt-1">
        {/* Score hero */}
        <div className="mt-3 overflow-hidden border-[3px] border-black bg-white shadow-[4px_4px_0_0_#111827]">
          <div
            className="h-[5px]"
            style={{
              background: "linear-gradient(90deg,#004aad,#ffcc00,#16a34a)",
            }}
          />
          <div className="flex flex-col items-center gap-5 px-5 py-6 sm:flex-row sm:items-center sm:text-left">
            <div className="relative h-[100px] w-[100px] shrink-0 sm:h-[100px]">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r={ringRadius} fill="none" stroke="#f3f4f6" strokeWidth="7" />
                <circle
                  ref={ringRef}
                  cx="50"
                  cy="50"
                  r={ringRadius}
                  fill="none"
                  stroke="#004aad"
                  strokeWidth="7"
                  strokeLinecap="square"
                  strokeDasharray={ringCirc}
                  strokeDashoffset={ringCirc}
                  style={{ transition: "stroke-dashoffset 1.2s ease 0.25s" }}
                />
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-[1.6rem] font-black leading-none tabular-nums">{data.score160}</span>
                <span className="font-mono text-[0.5rem] font-semibold text-neutral-500">/ 160</span>
              </div>
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="font-mono text-[0.45rem] font-bold uppercase tracking-[0.12em] text-neutral-500">
                {reportLabel}
              </p>
              <h3 className="mt-1 text-[1.15rem] font-black tracking-tight text-neutral-900">{taskTitle}</h3>
              {(data.topicEn || data.topicTh) && (
                <p className="mt-1 text-[0.78rem] text-neutral-500">
                  <span className="font-semibold text-neutral-700">Topic · หัวข้อ:</span>{" "}
                  {data.topicEn || "—"}
                  {data.topicEn && data.topicTh ? " · " : ""}
                  {data.topicTh}
                </p>
              )}
              {data.kind === "speaking" && (data.questionEn || data.questionTh) ? (
                <p className="mt-1 line-clamp-3 text-[0.72rem] text-neutral-600">
                  <span className="font-bold text-neutral-800">Q · คำถาม:</span> {data.questionEn}
                  {data.questionTh ? ` · ${data.questionTh}` : ""}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                <span className="border-2 border-black bg-[#e6eef8] px-2 py-0.5 font-mono text-[0.42rem] font-bold uppercase tracking-wide text-[#004aad]">
                  {data.wordCount} words
                </span>
                <span className="border-2 border-black bg-[#fff9e0] px-2 py-0.5 font-mono text-[0.42rem] font-bold uppercase tracking-wide text-neutral-800">
                  {data.prepMinutes} min prep
                </span>
                <span className="border-2 border-black bg-[#d1fae5] px-2 py-0.5 font-mono text-[0.42rem] font-bold uppercase tracking-wide text-emerald-700">
                  {pctOverall.toFixed(1)}%
                </span>
              </div>
              {data.submittedAt ? (
                <p className="mt-2 font-mono text-[0.5rem] text-neutral-400">Submitted · {data.submittedAt}</p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Category bars */}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {data.criteria.map((c) => {
            const tone = pctTone(c.scorePercent);
            const fill =
              tone === "high" ? "bg-emerald-600" : tone === "mid" ? "bg-[#004aad]" : "bg-orange-600";
            const pctCls =
              tone === "high" ? "text-emerald-600" : tone === "mid" ? "text-[#004aad]" : "text-orange-600";
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => scrollToCriterion(c.name)}
                className="border-2 border-black bg-white px-3 py-2.5 text-left shadow-[2px_2px_0_0_#111827] transition hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_0_#111827]"
              >
                <p className="font-mono text-[0.45rem] font-bold uppercase tracking-[0.08em] text-neutral-500">
                  {c.name}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`font-mono text-[1.1rem] font-black tabular-nums ${pctCls}`}>{c.scorePercent}%</span>
                  <div className="h-[5px] min-w-0 flex-1 bg-neutral-100">
                    <div className={`h-full ${fill}`} style={{ width: `${Math.min(100, c.scorePercent)}%` }} />
                  </div>
                  <span className="shrink-0 font-mono text-[0.5rem] font-semibold text-neutral-500">
                    ≈ {c.pointsOn160}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Your response */}
        <div className="mt-4 overflow-hidden border-[3px] border-black bg-white shadow-[2px_2px_0_0_#111827]">
          <div className="flex items-center justify-between border-b-2 border-neutral-100 bg-[#f0f5fb] px-3.5 py-2">
            <span className="font-mono text-[0.5rem] font-bold uppercase tracking-[0.1em] text-[#004aad]">
              Your response · บทตอบของคุณ
            </span>
            <button
              type="button"
              onClick={() => setOpenResponse((o) => !o)}
              className="font-mono text-[0.45rem] font-bold uppercase text-neutral-500 transition hover:text-[#004aad]"
            >
              {openResponse ? "Collapse" : "Expand"}
            </button>
          </div>
          <div
            className={`px-4 text-[0.92rem] leading-[1.9] text-neutral-700 transition-[max-height] duration-300 ${
              openResponse ? "max-h-[28rem] overflow-y-auto py-4" : "max-h-0 overflow-hidden py-0"
            }`}
          >
            <p className="whitespace-pre-wrap">{data.submissionEn || "—"}</p>
          </div>
        </div>

        {/* Criteria accordions */}
        <div className="mt-3 space-y-2.5">
          {data.criteria.map((c) => {
            const tone = pctTone(c.scorePercent);
            const bar = tone === "high" ? "bg-emerald-600" : tone === "mid" ? "bg-[#004aad]" : "bg-orange-600";
            const scoreCls =
              tone === "high" ? "text-emerald-600" : tone === "mid" ? "text-[#004aad]" : "text-orange-600";
            const isOpen = openCriterion === c.name;
            return (
              <div
                key={c.key}
                ref={(el) => {
                  detailRefs.current[c.name] = el;
                }}
                className="overflow-hidden border-[3px] border-black bg-white shadow-[2px_2px_0_0_#111827]"
              >
                <button
                  type="button"
                  onClick={() => setOpenCriterion(isOpen ? null : c.name)}
                  className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left transition hover:bg-neutral-50"
                >
                  <span className={`w-1 shrink-0 self-stretch rounded-sm ${bar}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.82rem] font-extrabold tracking-tight text-neutral-900">{c.name}</p>
                    <p className="mt-0.5 text-[0.7rem] leading-snug text-neutral-500">{c.summaryEn}</p>
                    {c.summaryTh ? (
                      <p className="mt-1 text-[0.68rem] leading-snug text-neutral-600">{c.summaryTh}</p>
                    ) : null}
                  </div>
                  <span className={`shrink-0 font-mono text-[0.85rem] font-black tabular-nums ${scoreCls}`}>
                    {c.scorePercent}%
                  </span>
                  <span
                    className={`shrink-0 text-[0.7rem] font-black text-neutral-400 transition ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  >
                    ▼
                  </span>
                </button>
                <div
                  className={`border-t border-neutral-100 transition-[max-height] duration-300 ${
                    isOpen ? "max-h-[2000px] overflow-y-auto" : "max-h-0 overflow-hidden"
                  }`}
                >
                  {c.corrections.length === 0 ? (
                    <div className="px-3.5 py-4 text-center">
                      <p className="text-[1.2rem]">✨</p>
                      <p className="text-[0.78rem] font-semibold text-emerald-700">No issues flagged — great job!</p>
                    </div>
                  ) : (
                    c.corrections.map((cr, idx) => (
                      <div key={idx} className="border-t border-neutral-100 px-3.5 py-3 first:border-t-2">
                        <div className="flex flex-wrap items-start gap-2">
                          <span className="font-mono text-[0.78rem] font-semibold line-through decoration-red-600/80 bg-red-50 px-2 py-1 text-red-700 ring-1 ring-red-600">
                            {cr.before}
                          </span>
                          <span className="mt-1 text-[0.7rem] text-neutral-400">→</span>
                          <span className="font-mono text-[0.78rem] font-bold bg-emerald-50 px-2 py-1 text-emerald-700 ring-1 ring-emerald-600">
                            {cr.after}
                          </span>
                        </div>
                        <p className="mt-2 text-[0.78rem] leading-relaxed text-neutral-500">{cr.explanation}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Vocabulary upgrades (speaking) */}
        {data.vocabUpgrades.length > 0 ? (
          <div className="mt-4 overflow-hidden border-[3px] border-black bg-white shadow-[2px_2px_0_0_#111827]">
            <div className="border-b-[3px] border-black bg-[#fff9e0] px-3.5 py-2.5">
              <p className="font-mono text-[0.55rem] font-extrabold uppercase tracking-[0.1em]">Vocabulary upgrades</p>
              <p className="mt-0.5 text-[0.65rem] text-neutral-500">Level up these words · ยกระดับคำศัพท์</p>
            </div>
            <div className="flex flex-col gap-2 px-3.5 py-2.5">
              {data.vocabUpgrades.map((v, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 border-2 border-neutral-200 px-3 py-2.5 transition hover:border-[#004aad] hover:bg-[#f0f5fb] sm:flex-row sm:items-center"
                >
                  <div className="flex shrink-0 flex-col items-center gap-0.5 font-mono sm:min-w-[7.5rem] sm:flex-row sm:gap-2">
                    <span className="text-[0.7rem] font-semibold text-neutral-500 line-through">{v.original}</span>
                    <span className="text-[0.6rem] text-[#004aad]">↓</span>
                    <span className="text-[0.78rem] font-extrabold text-[#004aad]">{v.upgraded}</span>
                  </div>
                  <div className="min-w-0 flex-1 text-[0.75rem] leading-snug text-neutral-600">
                    {v.meaningTh}
                    {v.exampleEn ? (
                      <span className="mt-1 block font-mono text-[0.65rem] text-neutral-500">e.g. {v.exampleEn}</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Takeaways */}
        {(data.takeawaysEn.length > 0 || data.takeawaysTh.length > 0) && (
          <div className="mt-4 overflow-hidden border-[3px] border-black bg-white shadow-[2px_2px_0_0_#111827]">
            <div className="border-b-[3px] border-black bg-[#e6eef8] px-3.5 py-2.5">
              <p className="font-mono text-[0.55rem] font-extrabold uppercase tracking-[0.1em] text-[#004aad]">
                Key takeaways · สรุปสำคัญ
              </p>
            </div>
            <div>
              {data.takeawaysEn.map((t, i) => (
                <div
                  key={`en-${i}`}
                  className="flex gap-2 border-b border-neutral-100 px-3.5 py-3 text-[0.82rem] leading-relaxed text-neutral-700 last:border-b-0"
                >
                  <span className="shrink-0">📌</span>
                  <span>{t}</span>
                </div>
              ))}
              {data.takeawaysTh.map((t, i) => (
                <div
                  key={`th-${i}`}
                  className="flex gap-2 border-b border-neutral-100 bg-neutral-50/80 px-3.5 py-3 text-[0.78rem] leading-relaxed text-neutral-700 last:border-b-0"
                >
                  <span className="shrink-0">📌</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extra writing sections (follow-ups, study pack) */}
        {data.tailEn.trim().length > 0 ? (
          <div className="mt-4 rounded-lg border-2 border-dashed border-neutral-300 bg-white/90 px-3 py-3 text-left">
            <p className="font-mono text-[0.5rem] font-bold uppercase tracking-wide text-neutral-500">
              More from this report · เนื้อหาเพิ่มเติม
            </p>
            <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap font-mono text-[0.68rem] leading-relaxed text-neutral-700">
              {data.tailEn.trim()}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}
