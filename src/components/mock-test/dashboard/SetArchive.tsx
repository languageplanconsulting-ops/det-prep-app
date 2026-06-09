"use client";

import { useMemo, useState } from "react";

import type {
  GroupStats,
  MockAttemptRow,
  MockSetGroup,
  MockSetRow,
  SetAttemptStats,
} from "./types";

type PickKind = "continue" | "weakness" | "best";

type Pick = {
  kind: PickKind;
  set: MockSetRow;
  rationale: string;
};

type Props = {
  currentGroup: MockSetGroup | null;
  pastGroups: MockSetGroup[];
  statsBySetId: Record<string, SetAttemptStats>;
  attemptCount: number;
  recommendedSetId: string | null;
  onPickSet: (setId: string) => void;
};

/** How many past-month rows to render before "load older". */
const PAST_INITIAL = 6;

function shortDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" });
  } catch {
    return "—";
  }
}

function statusBadge(stats: SetAttemptStats | undefined) {
  if (!stats || stats.attemptCount === 0) {
    return (
      <span className="border-[1.5px] border-black bg-[#FFD600] px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.08em]">
        NEW
      </span>
    );
  }
  return (
    <span className="border-[1.5px] border-black bg-[#16a34a] px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.08em] text-white">
      ✓ DONE
    </span>
  );
}

function lastScoreLine(stats: SetAttemptStats | undefined): React.ReactNode {
  if (!stats || stats.attemptCount === 0) {
    return <span className="font-mono text-[10.5px] font-bold text-neutral-500">ยังไม่เคยทำ</span>;
  }
  const score = Math.round(stats.lastAttempt!.actual_total);
  const when = shortDate(stats.lastAttempt!.created_at);
  return (
    <span className="font-mono text-[10.5px] font-bold text-neutral-600">
      คะแนน: <b className="font-sans text-sm text-black">{score}</b> · {when}
    </span>
  );
}

function SetCard({
  set,
  stats,
  isRecommended,
  onPick,
}: {
  set: MockSetRow;
  stats: SetAttemptStats | undefined;
  isRecommended: boolean;
  onPick: () => void;
}) {
  const done = (stats?.attemptCount ?? 0) > 0;
  return (
    <button
      type="button"
      onClick={onPick}
      className={`relative border-[2.5px] border-black p-3 text-left shadow-[3px_3px_0_0_#111] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#111] ${
        done
          ? "bg-[#fafaf6]"
          : isRecommended
            ? "bg-[#fffbea]"
            : "bg-white hover:bg-[#eff6ff]"
      }`}
    >
      {isRecommended ? (
        <span
          className="absolute -top-3 left-2 border-2 border-black bg-[#FF5C00] px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.1em] text-white"
          aria-hidden
        >
          NEXT
        </span>
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13.5px] font-extrabold leading-tight">{set.name}</span>
        {statusBadge(stats)}
      </div>
      <div className="mt-1.5">{lastScoreLine(stats)}</div>
      <div className="mt-2 flex items-center justify-between border-t border-dashed border-black/70 pt-1.5 font-mono text-[10px] font-bold text-neutral-600">
        <span>~1h 0m – 1h 15m</span>
        {done ? (
          <span className="text-neutral-400 line-through">used</span>
        ) : (
          <span className="font-black text-[#c1121f]">uses 1 credit</span>
        )}
      </div>
    </button>
  );
}

function PickUpNextRow({
  picks,
  onPickSet,
}: {
  picks: Pick[];
  onPickSet: (setId: string) => void;
}) {
  if (picks.length === 0) return null;
  return (
    <section className="border-[3px] border-black bg-white p-4 shadow-[6px_6px_0_0_#111]">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-black pb-2">
        <h3 className="flex items-center gap-2 text-base font-black tracking-tight">
          <span className="text-[#FF5C00]">★</span> Pick up next · ระบบเลือกให้แล้ว
        </h3>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-500">
          ตามคะแนน + cadence
        </span>
      </div>
      <div className="grid gap-2.5 md:grid-cols-3">
        {picks.map((p) => {
          const colorByKind: Record<PickKind, string> = {
            continue: "bg-[#0055FF] text-white",
            weakness: "bg-[#FF5C00] text-white",
            best: "bg-black text-white",
          };
          const labelByKind: Record<PickKind, string> = {
            continue: "CONTINUE CURRENT",
            weakness: "TARGET WEAKNESS",
            best: "REVISIT BEST",
          };
          return (
            <button
              key={p.kind}
              type="button"
              onClick={() => onPickSet(p.set.id)}
              className="flex flex-col gap-1.5 border-[2.5px] border-black bg-white p-3 text-left shadow-[3px_3px_0_0_#111] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#fffbea] hover:shadow-[5px_5px_0_0_#111]"
            >
              <span
                className={`self-start border-[1.5px] border-black px-1.5 py-[3px] font-mono text-[9px] font-black uppercase tracking-[0.1em] ${colorByKind[p.kind]}`}
              >
                {labelByKind[p.kind]}
              </span>
              <span className="text-[14.5px] font-extrabold leading-tight">{p.set.name}</span>
              <span className="text-[11.5px] font-medium leading-snug text-neutral-700">
                {p.rationale}
              </span>
              <span className="mt-auto flex items-center justify-between border-t border-dashed border-black/60 pt-1.5 font-mono text-[10px] font-bold text-neutral-600">
                <span>~1h 0m – 1h 15m</span>
                <span className="font-black text-[#c1121f]">uses 1 credit</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function groupStats(group: MockSetGroup, statsBySetId: Record<string, SetAttemptStats>): GroupStats {
  let attemptedSetCount = 0;
  let totalScore = 0;
  let totalAttempts = 0;
  const lastScores: Array<number | null> = [];
  for (const set of group.rows) {
    const stats = statsBySetId[set.id];
    if (stats && stats.attemptCount > 0) {
      attemptedSetCount += 1;
      totalScore += stats.lastAttempt!.actual_total;
      totalAttempts += 1;
      lastScores.push(Math.round(stats.lastAttempt!.actual_total));
    } else {
      lastScores.push(null);
    }
  }
  return {
    attemptedSetCount,
    totalSetCount: group.rows.length,
    avgScore: totalAttempts > 0 ? Math.round(totalScore / totalAttempts) : null,
    lastScores,
  };
}

function Sparkline({ scores }: { scores: Array<number | null> }) {
  if (scores.length === 0) return null;
  const numeric = scores.filter((s): s is number => s != null);
  const max = numeric.length > 0 ? Math.max(...numeric, 1) : 1;
  return (
    <div className="flex h-6 items-end gap-[2px]">
      {scores.map((s, idx) => {
        const heightPct = s == null ? 10 : Math.max(15, Math.round((s / max) * 100));
        return (
          <span
            key={idx}
            className={`block w-[6px] border border-black border-b-0 ${s == null ? "bg-neutral-200" : "bg-[#0055FF]"}`}
            style={{ height: `${heightPct}%` }}
          />
        );
      })}
    </div>
  );
}

function PastMonthRow({
  group,
  stats,
  statsBySetId,
  recommendedSetId,
  onPickSet,
  openByDefault,
}: {
  group: MockSetGroup;
  stats: GroupStats;
  statsBySetId: Record<string, SetAttemptStats>;
  recommendedSetId: string | null;
  onPickSet: (setId: string) => void;
  openByDefault: boolean;
}) {
  // Controlled details: react to user toggles via onToggle, otherwise re-renders
  // (e.g. on attempts refresh) would snap the row back to its default state.
  const [open, setOpen] = useState(openByDefault);
  const pct =
    stats.totalSetCount > 0
      ? Math.round((stats.attemptedSetCount / stats.totalSetCount) * 100)
      : 0;
  return (
    <details
      className="group border-b-[1.5px] border-dashed border-black last:border-b-0"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="grid cursor-pointer grid-cols-[minmax(120px,1.4fr)_minmax(120px,1fr)_70px_minmax(80px,90px)_40px] items-center gap-3 px-3 py-2.5 hover:bg-[#fafaf6] open:bg-[#fffbea]">
        <div className="flex flex-col">
          <span className="text-sm font-extrabold">{group.label}</span>
          <span className="mt-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.06em] text-neutral-500">
            {group.rows.length} sets
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative h-[8px] flex-1 border-[1.5px] border-black bg-neutral-200">
            <div className="h-full bg-[#16a34a]" style={{ width: `${pct}%` }} />
          </div>
          <span className="min-w-[34px] text-right font-mono text-[10.5px] font-black text-black">
            {stats.attemptedSetCount}/{stats.totalSetCount}
          </span>
        </div>
        <div className="text-right font-mono text-[10px] font-bold uppercase tracking-[0.04em] text-neutral-500">
          <b className="block font-sans text-base text-[#0055FF]">{stats.avgScore ?? "—"}</b>
          avg
        </div>
        <Sparkline scores={stats.lastScores} />
        <span className="text-right font-mono text-[13px] font-black text-black transition group-open:rotate-90">
          ▶
        </span>
      </summary>
      <div className="bg-[#fafaf6] px-3 py-3">
        <div className="grid gap-2.5 md:grid-cols-3">
          {group.rows.map((set) => (
            <SetCard
              key={set.id}
              set={set}
              stats={statsBySetId[set.id]}
              isRecommended={recommendedSetId === set.id}
              onPick={() => onPickSet(set.id)}
            />
          ))}
        </div>
      </div>
    </details>
  );
}

export function SetArchive({
  currentGroup,
  pastGroups,
  statsBySetId,
  attemptCount,
  recommendedSetId,
  onPickSet,
}: Props) {
  const [showAllPast, setShowAllPast] = useState(false);

  const picks = useMemo<Pick[]>(() => {
    const out: Pick[] = [];
    // 1. Continue current — first un-attempted set in current group
    if (currentGroup) {
      const next =
        currentGroup.rows.find((s) => (statsBySetId[s.id]?.attemptCount ?? 0) === 0) ??
        currentGroup.rows[0];
      if (next) {
        out.push({
          kind: "continue",
          set: next,
          rationale:
            "ทำต่อจากชุดล่าสุดของเดือนนี้ — รักษา cadence ให้ครบตามโควต้า",
        });
      }
    }
    if (attemptCount > 0) {
      // 2. Target weakness — set whose best attempt is the lowest, excluding current group
      const pastRows = pastGroups.flatMap((g) => g.rows);
      const attemptedPast = pastRows
        .map((r) => ({ row: r, stats: statsBySetId[r.id] }))
        .filter(
          (entry): entry is { row: MockSetRow; stats: SetAttemptStats } =>
            !!entry.stats && entry.stats.attemptCount > 0 && !!entry.stats.bestAttempt,
        );
      if (attemptedPast.length > 0) {
        const worst = attemptedPast.reduce((acc, cur) =>
          cur.stats.bestAttempt!.actual_total < acc.stats.bestAttempt!.actual_total ? cur : acc,
        );
        if (worst.row.id !== out[0]?.set.id) {
          out.push({
            kind: "weakness",
            set: worst.row,
            rationale: `เคยได้ ${Math.round(worst.stats.bestAttempt!.actual_total)} — ลองทำซ้ำเพื่อยกคะแนนชุดที่อ่อนสุด`,
          });
        }
        // 3. Revisit best — set whose best attempt is the highest, excluding current group + already-picked
        const remaining = attemptedPast.filter((e) => e.row.id !== worst.row.id);
        if (remaining.length > 0) {
          const best = remaining.reduce((acc, cur) =>
            cur.stats.bestAttempt!.actual_total > acc.stats.bestAttempt!.actual_total ? cur : acc,
          );
          if (best.row.id !== out[0]?.set.id) {
            out.push({
              kind: "best",
              set: best.row,
              rationale: `ชุดที่ทำได้ดีสุด (${Math.round(best.stats.bestAttempt!.actual_total)}) — ทำซ้ำเพื่อเช็คว่ารักษาฟอร์มได้ไหม`,
            });
          }
        }
      }
    }
    return out;
  }, [attemptCount, currentGroup, pastGroups, statsBySetId]);

  const visiblePast = showAllPast ? pastGroups : pastGroups.slice(0, PAST_INITIAL);
  const hiddenPastCount = Math.max(0, pastGroups.length - PAST_INITIAL);
  const hiddenSetCount = pastGroups
    .slice(PAST_INITIAL)
    .reduce((sum, g) => sum + g.rows.length, 0);

  return (
    <div className="space-y-4">
      <PickUpNextRow picks={picks} onPickSet={onPickSet} />

      {currentGroup ? (
        <section className="border-[3px] border-black bg-white p-4 shadow-[6px_6px_0_0_#111]">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b-2 border-black pb-2">
            <h3 className="text-base font-black tracking-tight">
              📚 {currentGroup.label === "ARCHIVE" ? "ชุดข้อสอบทั้งหมด" : `${currentGroup.label} · ล่าสุด`}
            </h3>
            {(() => {
              const stats = groupStats(currentGroup, statsBySetId);
              return (
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-600">
                  {stats.attemptedSetCount} of {stats.totalSetCount} done ·{" "}
                  {stats.totalSetCount - stats.attemptedSetCount} remaining
                </span>
              );
            })()}
          </div>
          <div className="grid gap-2.5 md:grid-cols-3">
            {currentGroup.rows.map((set) => (
              <SetCard
                key={set.id}
                set={set}
                stats={statsBySetId[set.id]}
                isRecommended={recommendedSetId === set.id}
                onPick={() => onPickSet(set.id)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {pastGroups.length > 0 ? (
        <section className="border-[3px] border-black bg-white shadow-[6px_6px_0_0_#111]">
          <div className="flex items-center justify-between border-b-2 border-black bg-black px-3 py-2 font-mono text-[11px] font-black uppercase tracking-[0.14em] text-white">
            <span>📦 Past months · คลังย้อนหลัง</span>
            <span className="text-[#FFD600]">
              {pastGroups.length} months ·{" "}
              {pastGroups.reduce((sum, g) => sum + g.rows.length, 0)} sets
            </span>
          </div>
          <div>
            {visiblePast.map((group, idx) => {
              const stats = groupStats(group, statsBySetId);
              return (
                <PastMonthRow
                  key={group.key}
                  group={group}
                  stats={stats}
                  statsBySetId={statsBySetId}
                  recommendedSetId={recommendedSetId}
                  onPickSet={onPickSet}
                  openByDefault={idx === 0}
                />
              );
            })}
          </div>
          {hiddenPastCount > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-black bg-[#fafaf6] px-3 py-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.08em]">
              <span className="text-neutral-600">
                Showing {visiblePast.length} of {pastGroups.length} months
              </span>
              <button
                type="button"
                onClick={() => setShowAllPast(true)}
                className="border-2 border-black bg-[#FFD600] px-2.5 py-1 font-black shadow-[2px_2px_0_0_#111]"
              >
                ▾ Load {hiddenPastCount} older months · {hiddenSetCount} sets
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
