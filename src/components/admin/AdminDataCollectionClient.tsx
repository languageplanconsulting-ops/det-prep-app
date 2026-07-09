"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminReportPreview } from "@/components/admin/AdminReportPreview";

type SubmissionRow = {
  id: string;
  examType: string;
  examLabel: string;
  userEmail: string | null;
  userName: string | null;
  attemptId: string | null;
  promptTitle: string | null;
  promptText: string | null;
  submittedText: string;
  wordCount: number | null;
  score160: number | null;
  report: Record<string, unknown>;
  createdAt: string;
};

type Snapshot = {
  deployed: boolean;
  total: number;
  counts: Array<{ examType: string; examLabel: string; count: number }>;
  rows: SubmissionRow[];
};

type ViewMode = "full" | "text" | "export";

const VIEWS: Array<{ key: ViewMode; label: string }> = [
  { key: "full", label: "รายงานจริง (เหมือนที่ลูกค้าเห็น)" },
  { key: "text", label: "ข้อความ + คะแนน" },
  { key: "export", label: "Export (ดิบ)" },
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ScorePill({ score }: { score: number | null }) {
  if (score == null) return <span className="text-slate-400">—</span>;
  const tone = score >= 120 ? "bg-emerald-100 text-emerald-700" : score >= 90 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700";
  return <span className={`rounded-md px-2 py-0.5 font-mono text-sm font-bold ${tone}`}>{score}/160</span>;
}

export function AdminDataCollectionClient() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [examType, setExamType] = useState("all");
  const [view, setView] = useState<ViewMode>("text");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const reload = useCallback((exam: string) => {
    setData(null);
    setError(null);
    fetch(`/api/admin/data-collection?examType=${encodeURIComponent(exam)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? `HTTP ${r.status}`);
        return r.json();
      })
      .then((d: Snapshot) => setData(d))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    reload(examType);
  }, [examType, reload]);

  const exportText = useMemo(() => {
    if (!data) return "";
    return data.rows
      .map((r) =>
        [
          `=== ${r.examLabel} | ${r.score160 ?? "-"}/160 | ${r.userEmail ?? "anon"} | ${fmtDate(r.createdAt)} ===`,
          r.promptTitle ? `Prompt: ${r.promptTitle}` : "",
          r.submittedText,
        ]
          .filter(Boolean)
          .join("\n"),
      )
      .join("\n\n");
  }, [data]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-5 text-sm text-red-700">
          โหลดข้อมูลไม่สำเร็จ: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Submitted text for data collection</h1>
        <p className="mt-1 text-sm text-slate-500">
          ทุกคำตอบงานเขียน/พูดที่ผู้ใช้ส่งเข้ามา ถูกบันทึกอัตโนมัติเพื่อปรับปรุงคำอธิบายและการเก็บข้อมูล
        </p>
      </header>

      {data && !data.deployed ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ ตาราง <code>data_collection_submissions</code> ยังไม่ถูกติดตั้งบน DB จริง — รัน{" "}
          <code>supabase/migrations/028_data_collection_submissions.sql</code> ใน Supabase ก่อน
        </div>
      ) : null}

      {/* Exam-type category tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setExamType("all")}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${examType === "all" ? "border-[#004AAD] bg-[#004AAD] text-white" : "border-slate-200 bg-white text-slate-600"}`}
        >
          ทั้งหมด {data ? `(${data.total})` : ""}
        </button>
        {data?.counts.map((c) => (
          <button
            key={c.examType}
            type="button"
            onClick={() => setExamType(c.examType)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${examType === c.examType ? "border-[#004AAD] bg-[#004AAD] text-white" : "border-slate-200 bg-white text-slate-600"}`}
          >
            {c.examLabel} ({c.count})
          </button>
        ))}
      </div>

      {/* View-mode toggle */}
      <div className="mb-5 inline-flex rounded-xl border border-slate-200 bg-white p-1">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setView(v.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${view === v.key ? "bg-[#FFCC00] text-[#004AAD]" : "text-slate-500"}`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {!data ? (
        <p className="text-sm text-slate-400">กำลังโหลด…</p>
      ) : view === "export" ? (
        <div>
          <p className="mb-2 text-xs text-slate-500">{data.rows.length} รายการ — คัดลอกไปวิเคราะห์ได้</p>
          <textarea
            readOnly
            value={exportText}
            className="h-[60vh] w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-700"
          />
        </div>
      ) : data.rows.length === 0 ? (
        <p className="text-sm text-slate-400">ยังไม่มีข้อมูลที่ส่งเข้ามา</p>
      ) : (
        <div className="space-y-3">
          {data.rows.map((r) => {
            const open = expanded.has(r.id);
            return (
              <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 text-left"
                  onClick={() =>
                    setExpanded((prev) => {
                      const n = new Set(prev);
                      if (n.has(r.id)) n.delete(r.id);
                      else n.add(r.id);
                      return n;
                    })
                  }
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-[#004AAD]/10 px-2 py-0.5 text-[11px] font-bold text-[#004AAD]">
                        {r.examLabel}
                      </span>
                      <ScorePill score={r.score160} />
                      <span className="text-xs text-slate-400">{r.wordCount ?? 0} คำ</span>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-slate-800">
                      {r.promptTitle ?? "(ไม่มีหัวข้อ)"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {r.userEmail ?? "anon"} · {fmtDate(r.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-slate-300">{open ? "▲" : "▼"}</span>
                </button>

                {open ? (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">ข้อความที่ส่ง</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{r.submittedText}</p>
                    {view === "full" ? (
                      <div className="mt-3 -mx-4 overflow-hidden rounded-lg border border-slate-200">
                        <AdminReportPreview examType={r.examType} report={r.report} />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
