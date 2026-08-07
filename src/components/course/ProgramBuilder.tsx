"use client";

import { useState } from "react";

import {
  blocksInStream,
  moveInOrder,
  type Customisation,
  type StudyItem,
} from "@/lib/course-plan/block-planner";

/**
 * Lets the learner author their own programme: which blocks to run, in what
 * order, and in what order inside each block.
 *
 * Up/down buttons rather than drag-and-drop — the calendar below already uses
 * dragging, and a second drag surface on the same page invites mis-drops.
 * Buttons also work on a phone without a long-press.
 */
export function ProgramBuilder({
  /** The stream AFTER customisation, so the list reflects what will actually run. */
  stream,
  /** Every block available before exclusions, so switched-off ones stay listable. */
  allBlocks,
  custom,
  onChange,
}: {
  stream: StudyItem[];
  allBlocks: { key: string; titleTh: string; items: StudyItem[] }[];
  custom: Customisation;
  onChange: (next: Customisation) => void;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const active = blocksInStream(stream);
  const activeKeys = active.map((b) => b.key);
  const excluded = new Set(custom.excludedBlocks);
  // Active blocks in running order, then the switched-off ones so they can come back.
  const rows = [...active, ...allBlocks.filter((b) => excluded.has(b.key))];

  function moveBlock(key: string, delta: -1 | 1) {
    // Seed the explicit order from what is running now, so the first nudge does
    // not reshuffle everything else.
    const base = custom.blockOrder.length > 0 ? custom.blockOrder : activeKeys;
    const seeded = base.includes(key) ? base : [...base, key];
    onChange({ ...custom, blockOrder: moveInOrder(seeded, key, delta) });
  }

  function toggleBlock(key: string) {
    const next = excluded.has(key)
      ? custom.excludedBlocks.filter((k) => k !== key)
      : [...custom.excludedBlocks, key];
    onChange({ ...custom, excludedBlocks: next });
  }

  function moveItem(blockKey: string, itemId: string, delta: -1 | 1) {
    const current = active.find((b) => b.key === blockKey)?.items ?? [];
    const base =
      custom.itemOrder[blockKey]?.length ? custom.itemOrder[blockKey] : current.map((i) => i.id);
    onChange({
      ...custom,
      itemOrder: { ...custom.itemOrder, [blockKey]: moveInOrder(base, itemId, delta) },
    });
  }

  const touched =
    custom.blockOrder.length > 0 ||
    custom.excludedBlocks.length > 0 ||
    Object.keys(custom.itemOrder).length > 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-slate-500">
          เลือกว่าจะเรียนบทไหนบ้าง เรียงลำดับเอง และสลับลำดับบทเรียนข้างในได้
        </p>
        {touched && (
          <button
            type="button"
            onClick={() => onChange({ ...custom, blockOrder: [], excludedBlocks: [], itemOrder: {} })}
            className="rounded-full bg-rose-100 px-3 py-1 text-[13px] font-bold text-rose-700"
          >
            ↺ กลับไปลำดับมาตรฐาน
          </button>
        )}
      </div>

      {active.length === 0 && (
        <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-200">
          ยังไม่ได้เลือกบทไหนเลย — เปิดอย่างน้อย 1 บทเพื่อให้มีแผน
        </p>
      )}

      <ol className="space-y-1.5">
        {rows.map((block, i) => {
          const off = excluded.has(block.key);
          const open = openKey === block.key;
          const pos = activeKeys.indexOf(block.key);
          const items = active.find((b) => b.key === block.key)?.items ?? block.items;

          return (
            <li
              key={block.key}
              className={`rounded-2xl ring-1 transition ${
                off ? "bg-slate-50 ring-slate-200" : "bg-white ring-slate-200"
              }`}
            >
              <div className="flex items-center gap-2 p-3">
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[13px] font-bold ${
                    off ? "bg-slate-200 text-slate-400" : "bg-slate-900 text-white"
                  }`}
                >
                  {off ? "–" : pos + 1}
                </span>

                <button
                  type="button"
                  onClick={() => setOpenKey(open ? null : block.key)}
                  className="min-w-0 flex-1 text-left"
                  disabled={off}
                >
                  <span
                    className={`block truncate text-[13px] font-bold ${
                      off ? "text-slate-400 line-through" : "text-slate-800"
                    }`}
                  >
                    {block.titleTh}
                  </span>
                  <span className="block text-[13px] text-slate-400">
                    {items.length} รายการ ·{" "}
                    {items.reduce((s, it) => s + it.minutes, 0)} นาที
                    {!off && items.length > 1 ? (open ? " · ▲" : " · แตะเพื่อสลับลำดับ") : ""}
                  </span>
                </button>

                {!off && (
                  <span className="flex shrink-0 gap-1">
                    <MoveBtn
                      label="เลื่อนขึ้น"
                      disabled={pos <= 0}
                      onClick={() => moveBlock(block.key, -1)}
                    >
                      ↑
                    </MoveBtn>
                    <MoveBtn
                      label="เลื่อนลง"
                      disabled={pos < 0 || pos >= activeKeys.length - 1}
                      onClick={() => moveBlock(block.key, 1)}
                    >
                      ↓
                    </MoveBtn>
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => toggleBlock(block.key)}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[13px] font-bold ${
                    off ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {off ? "เปิด" : "ปิด"}
                </button>
              </div>

              {open && !off && (
                <ul className="space-y-1 border-t border-slate-100 p-3 pt-2.5">
                  {items.map((it, k) => (
                    <li
                      key={it.id}
                      className="flex items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-1.5"
                    >
                      <span className="w-4 shrink-0 text-[13px] font-bold text-slate-400">
                        {k + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-700">
                        {it.kind === "video" ? "🎬" : it.kind === "lesson" ? "📘" : "🏋️"}{" "}
                        {it.titleTh}
                      </span>
                      <span className="shrink-0 text-[13px] text-slate-400">{it.minutes}′</span>
                      <span className="flex shrink-0 gap-1">
                        <MoveBtn
                          label="เลื่อนขึ้น"
                          disabled={k === 0}
                          onClick={() => moveItem(block.key, it.id, -1)}
                        >
                          ↑
                        </MoveBtn>
                        <MoveBtn
                          label="เลื่อนลง"
                          disabled={k === items.length - 1}
                          onClick={() => moveItem(block.key, it.id, 1)}
                        >
                          ↓
                        </MoveBtn>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function MoveBtn({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-6 w-6 place-items-center rounded-lg bg-slate-100 text-[13px] font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
