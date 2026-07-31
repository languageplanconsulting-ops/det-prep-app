"use client";

import { useMemo, useState } from "react";

import {
  GROUP_TH,
  LEVEL_TH,
  QUESTION_TYPE_TH,
  STATUS_TH,
  type ProductionGroup,
  type ProductionStatus,
} from "@/lib/course-production";
import type { ProductionRow, ProductionSnapshot } from "@/lib/admin-course-production-data";

const PIPELINE: ProductionStatus[] = ["missing", "scripted", "recorded", "uploaded", "live"];

const STATUS_TONE: Record<ProductionStatus, string> = {
  dead: "bg-red-100 text-red-800 border-red-300",
  draft: "bg-orange-100 text-orange-800 border-orange-300",
  missing: "bg-neutral-100 text-neutral-700 border-neutral-300",
  scripted: "bg-amber-100 text-amber-900 border-amber-300",
  recorded: "bg-sky-100 text-sky-900 border-sky-300",
  uploaded: "bg-indigo-100 text-indigo-900 border-indigo-300",
  live: "bg-emerald-100 text-emerald-900 border-emerald-300",
};

const GROUP_TONE: Record<ProductionGroup, string> = {
  FIX: "bg-red-600",
  A: "bg-orange-500",
  B: "bg-amber-500",
  C: "bg-sky-600",
  D: "bg-emerald-600",
};

type Props = { snapshot: ProductionSnapshot };

export function CourseProductionClient({ snapshot }: Props) {
  const [rows, setRows] = useState<ProductionRow[]>(snapshot.rows);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState<ProductionGroup | "ALL">("ALL");
  const [hideDone, setHideDone] = useState(false);

  const visible = useMemo(
    () =>
      rows.filter(
        (r) =>
          (groupFilter === "ALL" || r.group === groupFilter) &&
          (!hideDone || !["live", "uploaded"].includes(r.status)),
      ),
    [rows, groupFilter, hideDone],
  );

  const byGroup = useMemo(() => {
    const map = new Map<ProductionGroup, ProductionRow[]>();
    for (const r of visible) {
      const list = map.get(r.group) ?? [];
      list.push(r);
      map.set(r.group, list);
    }
    return map;
  }, [visible]);

  const done = rows.filter((r) => ["uploaded", "live"].includes(r.status)).length;
  const actionable = rows.filter((r) => r.status !== "dead").length;
  const pct = actionable === 0 ? 0 : Math.round((done / actionable) * 100);

  function patchRow(key: string, patch: Partial<ProductionRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  return (
    <div className="space-y-5">
      {!snapshot.deployed && (
        <div className="ep-brutal rounded-sm border-black bg-amber-50 p-5">
          <h2 className="text-lg font-black tracking-tight">โหมดอ่านอย่างเดียว</h2>
          <p className="mt-1.5 text-sm text-neutral-700">
            ยังไม่ได้ deploy ตาราง <code>course_video_scripts</code> — ดูแผนและสคริปต์ได้
            แต่ยังบันทึกไม่ได้ รัน{" "}
            <code className="rounded bg-white px-1.5 py-0.5">
              supabase/manual_run_course_video_scripts.sql
            </code>{" "}
            บน live DB ก่อน
          </p>
        </div>
      )}

      {/* -------- progress -------- */}
      <section className="ep-brutal rounded-sm border-black bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
              ความคืบหน้าการถ่ายทำ
            </p>
            <p className="mt-1 text-3xl font-black">
              {done}
              <span className="text-neutral-400"> / {actionable}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Chip label="ต้องลบ" value={snapshot.totals.dead} tone="bg-red-100 text-red-800" />
            <Chip label="ยังไม่เสร็จ" value={snapshot.totals.draft} tone="bg-orange-100 text-orange-800" />
            <Chip label="ยังไม่ถ่าย" value={snapshot.totals.missing} tone="bg-neutral-100 text-neutral-700" />
            <Chip label="ถ่ายแล้ว" value={snapshot.totals.recorded} tone="bg-sky-100 text-sky-900" />
            <Chip label="ขึ้นแล้ว" value={snapshot.totals.live + snapshot.totals.uploaded} tone="bg-emerald-100 text-emerald-900" />
          </div>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full border-2 border-black bg-neutral-100">
          <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
        </div>
      </section>

      {/* -------- coverage grid -------- */}
      <section className="ep-brutal rounded-sm border-black bg-white p-5">
        <h2 className="text-lg font-black tracking-tight">ความครอบคลุม 13 ประเภทโจทย์</h2>
        <p className="mt-1 text-xs text-neutral-500">
          ตัวเลข = คลิปที่มีอยู่ในคอร์สแล้ว · จุดสี = ระดับที่แผนนี้จะเติมให้ครบ
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-black text-left text-[10px] uppercase tracking-wide text-neutral-500">
                <th className="py-2">ประเภทโจทย์</th>
                <th className="py-2 text-center">มีอยู่</th>
                <th className="py-2 text-center">เริ่มต้น</th>
                <th className="py-2 text-center">กลาง</th>
                <th className="py-2 text-center">สูง</th>
                <th className="py-2 text-center">ต้องถ่าย</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.coverage.map((c) => (
                <tr key={c.questionType} className="border-b border-neutral-200">
                  <td className="py-2 font-bold text-neutral-800">{c.labelTh}</td>
                  <td className="py-2 text-center tabular-nums">{c.live}</td>
                  <Dot n={c.beginner} />
                  <Dot n={c.middle} />
                  <Dot n={c.advanced} />
                  <td className="py-2 text-center">
                    {c.missing > 0 ? (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-black text-orange-800">
                        +{c.missing}
                      </span>
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* -------- filters -------- */}
      <div className="flex flex-wrap items-center gap-2">
        {(["ALL", "FIX", "A", "B", "C", "D"] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGroupFilter(g)}
            className={`rounded-[4px] border-2 border-black px-3 py-1.5 text-xs font-black uppercase tracking-wide ${
              groupFilter === g ? "bg-black text-white" : "bg-white text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            {g === "ALL" ? "ทั้งหมด" : GROUP_TH[g]}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs font-bold text-neutral-600">
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
          ซ่อนที่เสร็จแล้ว
        </label>
      </div>

      {/* -------- board -------- */}
      {(["FIX", "A", "B", "C", "D"] as ProductionGroup[])
        .filter((g) => (byGroup.get(g) ?? []).length > 0)
        .map((g) => (
          <section key={g} className="ep-brutal rounded-sm border-black bg-white">
            <header className={`flex items-center gap-2 px-4 py-2 ${GROUP_TONE[g]}`}>
              <h3 className="text-sm font-black uppercase tracking-wide text-white">{GROUP_TH[g]}</h3>
              <span className="rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-black text-white">
                {(byGroup.get(g) ?? []).length}
              </span>
            </header>
            <ul className="divide-y divide-neutral-200">
              {(byGroup.get(g) ?? []).map((row) => (
                <li key={row.key}>
                  <VideoRow
                    row={row}
                    open={openKey === row.key}
                    canSave={snapshot.deployed}
                    onToggle={() => setOpenKey(openKey === row.key ? null : row.key)}
                    onPatch={(patch) => patchRow(row.key, patch)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}

function Dot({ n }: { n: number }) {
  return (
    <td className="py-2 text-center">
      <span
        className={`inline-block h-3 w-3 rounded-full ${
          n > 0 ? "bg-emerald-500" : "border border-neutral-300 bg-neutral-100"
        }`}
        title={n > 0 ? `${n} คลิปในแผน` : "ยังไม่มีในแผน"}
      />
    </td>
  );
}

function Chip({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 font-black ${tone}`}>
      {label} {value}
    </span>
  );
}

function VideoRow({
  row,
  open,
  canSave,
  onToggle,
  onPatch,
}: {
  row: ProductionRow;
  open: boolean;
  canSave: boolean;
  onToggle: () => void;
  onPatch: (patch: Partial<ProductionRow>) => void;
}) {
  const [draftScript, setDraftScript] = useState(row.script ?? "");
  const [draftNotes, setDraftNotes] = useState(row.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(patch: {
    scriptMd?: string;
    status?: ProductionStatus;
    notes?: string;
  }) {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/course-production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoKey: row.key, ...patch }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg(json.error ?? "บันทึกไม่สำเร็จ");
        return;
      }
      onPatch({
        ...(patch.scriptMd !== undefined ? { script: patch.scriptMd, scriptEdited: true } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      });
      setMsg("บันทึกแล้ว");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={row.status === "dead" ? "bg-red-50/60" : undefined}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-neutral-50"
      >
        <span
          className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${STATUS_TONE[row.status]}`}
        >
          {STATUS_TH[row.status]}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-neutral-900">{row.titleTh}</span>
          <span className="mt-0.5 block text-[11px] text-neutral-500">
            {QUESTION_TYPE_TH[row.questionType]} · ระดับ{LEVEL_TH[row.level]}
            {row.chapterRef ? ` · ${row.chapterRef}` : ""}
            {row.scriptEdited ? " · ✏️ แก้สคริปต์แล้ว" : ""}
          </span>
          {row.noteTh && (
            <span className="mt-1 block text-[11px] font-semibold text-red-700">{row.noteTh}</span>
          )}
        </span>
        <span className="shrink-0 text-neutral-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-neutral-200 bg-neutral-50 px-4 py-4">
          {/* status pipeline */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-black uppercase tracking-wide text-neutral-500">
              สถานะ
            </span>
            {PIPELINE.map((s) => (
              <button
                key={s}
                type="button"
                disabled={!canSave || saving}
                onClick={() => void save({ status: s })}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-black disabled:opacity-40 ${
                  row.status === s ? STATUS_TONE[s] : "border-neutral-300 bg-white text-neutral-500"
                }`}
              >
                {STATUS_TH[s]}
              </button>
            ))}
            {row.status === "dead" && (
              <span className="rounded-full border border-red-300 bg-red-100 px-2.5 py-1 text-[11px] font-black text-red-800">
                คลิปนี้ต้องลบออกจากคอร์ส
              </span>
            )}
          </div>

          {row.status !== "dead" && (
            <>
              <div>
                <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-neutral-500">
                  สคริปต์ (แก้ได้ แล้วกดบันทึก)
                </label>
                <textarea
                  value={draftScript}
                  onChange={(e) => setDraftScript(e.target.value)}
                  rows={16}
                  spellCheck={false}
                  placeholder="ยังไม่มีสคริปต์ — เขียนได้เลย"
                  className="w-full rounded-[4px] border-2 border-black bg-white p-3 font-mono text-[12px] leading-relaxed"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-neutral-500">
                  โน้ตสำหรับวันถ่าย
                </label>
                <textarea
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-[4px] border-2 border-black bg-white p-2 text-[12px]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!canSave || saving}
                  onClick={() => void save({ scriptMd: draftScript, notes: draftNotes })}
                  className="rounded-[4px] border-4 border-black bg-emerald-400 px-4 py-2 text-sm font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000] disabled:opacity-40 hover:translate-x-px hover:translate-y-px hover:shadow-none"
                >
                  {saving ? "กำลังบันทึก…" : "บันทึกสคริปต์"}
                </button>
                <button
                  type="button"
                  disabled={!canSave || saving}
                  onClick={() => void save({ scriptMd: draftScript, notes: draftNotes, status: "scripted" })}
                  className="rounded-[4px] border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase tracking-wide disabled:opacity-40 hover:bg-neutral-100"
                >
                  บันทึก + ทำเครื่องหมายว่าเขียนสคริปต์แล้ว
                </button>
                {msg && <span className="text-xs font-bold text-neutral-600">{msg}</span>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
