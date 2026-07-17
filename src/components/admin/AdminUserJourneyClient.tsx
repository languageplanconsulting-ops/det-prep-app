"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Shared types (mirror src/lib/admin-user-journey-data.ts)
// ---------------------------------------------------------------------------

type UserJourneySummary = {
  userId: string;
  email: string;
  fullName: string | null;
  totalSeconds: number;
  sessionCount: number;
  completedCount: number;
  daysActive: number;
  firstActivityAt: string | null;
  lastActivityAt: string | null;
  secondsByExercise: Record<string, number>;
  topExercise: string | null;
};

type ExerciseSlice = { exerciseType: string; seconds: number; sessions: number };

type JourneySession = {
  id: string;
  startedAt: string | null;
  endedAt: string | null;
  exerciseType: string;
  skill: string | null;
  seconds: number;
  rawSeconds: number;
  capped: boolean;
  completed: boolean;
  score: number | null;
  difficulty: string | null;
  setId: string | null;
};

type JourneyDay = {
  date: string;
  totalSeconds: number;
  sessionCount: number;
  completedCount: number;
  byExercise: ExerciseSlice[];
  sessions: JourneySession[];
  practiceMinutes: { skill: string; minutes: number; setsDone: number }[];
};

type UserJourneyDetail = {
  userId: string;
  email: string;
  fullName: string | null;
  totalSeconds: number;
  sessionCount: number;
  completedCount: number;
  daysActive: number;
  firstActivityAt: string | null;
  lastActivityAt: string | null;
  secondsByExercise: ExerciseSlice[];
  days: JourneyDay[];
};

// ---------------------------------------------------------------------------
// Exercise-type presentation (emoji, label, colour)
// ---------------------------------------------------------------------------

const EXERCISE_META: Record<string, { emoji: string; label: string; color: string }> = {
  dictation: { emoji: "🎧", label: "Dictation · ตามคำบอก", color: "#4F46E5" },
  fill_in_blank: { emoji: "✏️", label: "Fill in the blank · เติมคำ", color: "#0F766E" },
  fitb: { emoji: "✏️", label: "Fill in the blank · เติมคำ", color: "#0F766E" },
  real_word: { emoji: "🔤", label: "Real word · คำจริง/ปลอม", color: "#B45309" },
  realword: { emoji: "🔤", label: "Real word · คำจริง/ปลอม", color: "#B45309" },
  reading: { emoji: "📖", label: "Reading · การอ่าน", color: "#B91C1C" },
  vocabulary: { emoji: "📚", label: "Vocabulary · ศัพท์", color: "#7C3AED" },
  vocab: { emoji: "📚", label: "Vocabulary · ศัพท์", color: "#7C3AED" },
  dialogue_summary: { emoji: "💬", label: "Dialogue → summary", color: "#DB2777" },
  interactive_conversation: { emoji: "🗣️", label: "Interactive conversation", color: "#0891B2" },
  interactive_speaking: { emoji: "🎙️", label: "Interactive speaking", color: "#0E7490" },
  read_then_speak: { emoji: "🗨️", label: "Read then speak", color: "#2563EB" },
  read_then_write: { emoji: "🖊️", label: "Read then write", color: "#7C2D12" },
  write_about_photo: { emoji: "🖼️", label: "Write about photo", color: "#9333EA" },
  speak_about_photo: { emoji: "📷", label: "Speak about photo", color: "#C026D3" },
  mock_test: { emoji: "📝", label: "Mock test", color: "#111827" },
  unknown: { emoji: "❓", label: "Other", color: "#6B7280" },
};

const FALLBACK_COLORS = ["#EA580C", "#65A30D", "#0D9488", "#4338CA", "#BE185D", "#0369A1"];

function exMeta(type: string): { emoji: string; label: string; color: string } {
  const hit = EXERCISE_META[type];
  if (hit) return hit;
  // Stable colour for unmapped types.
  let hash = 0;
  for (let i = 0; i < type.length; i += 1) hash = (hash * 31 + type.charCodeAt(i)) >>> 0;
  const color = FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
  const label = type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { emoji: "🎯", label, color };
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) {
    const rem = s % 60;
    return rem ? `${m}m ${rem}s` : `${m}m`;
  }
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return remM ? `${h}h ${remM}m` : `${h}h`;
}

function fmtClock(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  });
}

function fmtDayHeading(dateKey: string): { weekday: string; long: string } {
  // dateKey is YYYY-MM-DD already in Bangkok time.
  const d = new Date(`${dateKey}T00:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return { weekday: "", long: dateKey };
  return {
    weekday: d.toLocaleDateString("en-GB", { weekday: "long", timeZone: "Asia/Bangkok" }),
    long: d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Bangkok",
    }),
  };
}

function relativeDay(dateKey: string): string | null {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const dayMs = 86400000;
  const a = new Date(`${dateKey}T00:00:00+07:00`).getTime();
  const b = new Date(`${today}T00:00:00+07:00`).getTime();
  const diff = Math.round((b - a) / dayMs);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff > 1 && diff < 7) return `${diff} days ago`;
  return null;
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-[6px] border-2 border-black bg-white p-3 shadow-[3px_3px_0_0_#000]">
      <div className="text-[10px] font-black uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-black leading-none text-neutral-900">{value}</div>
      {sub ? <div className="mt-1 text-[11px] font-medium text-neutral-500">{sub}</div> : null}
    </div>
  );
}

/** Horizontal stacked bar: one coloured segment per exercise type. */
function StackedBar({ slices, total }: { slices: ExerciseSlice[]; total: number }) {
  if (total <= 0) {
    return <div className="h-3 w-full rounded-full bg-neutral-100" />;
  }
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full border border-black/10 bg-neutral-100">
      {slices.map((s) => {
        const pct = (s.seconds / total) * 100;
        if (pct <= 0) return null;
        const { color, label } = exMeta(s.exerciseType);
        return (
          <div
            key={s.exerciseType}
            style={{ width: `${pct}%`, backgroundColor: color }}
            title={`${label}: ${fmtDuration(s.seconds)}`}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day card
// ---------------------------------------------------------------------------

function DayCard({ day, defaultOpen }: { day: JourneyDay; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const heading = fmtDayHeading(day.date);
  const rel = relativeDay(day.date);
  const practiceTotal = day.practiceMinutes.reduce((m, p) => m + p.minutes, 0);

  return (
    <div className="rounded-[6px] border-2 border-black bg-white shadow-[3px_3px_0_0_#000]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[6px] border-2 border-black bg-ep-yellow/40 leading-none">
          <span className="text-[9px] font-black uppercase text-neutral-600">
            {day.date.slice(5, 7)}/{day.date.slice(8, 10)}
          </span>
          <span className="text-[9px] font-bold text-neutral-500">{day.date.slice(0, 4)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-black text-neutral-900">{heading.long}</span>
            {rel ? (
              <span className="shrink-0 rounded-full border border-black bg-black px-1.5 py-0.5 text-[9px] font-black uppercase text-white">
                {rel}
              </span>
            ) : null}
          </div>
          <div className="text-[11px] font-medium text-neutral-500">
            {heading.weekday} · {day.sessionCount} session{day.sessionCount === 1 ? "" : "s"} ·{" "}
            {day.completedCount} finished
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-black leading-none text-neutral-900">
            {fmtDuration(day.totalSeconds)}
          </div>
          {practiceTotal > 0 ? (
            <div className="text-[10px] font-bold text-emerald-700">🎲 +{practiceTotal}m free</div>
          ) : null}
        </div>
        <span className="shrink-0 text-xs font-black text-neutral-400">{open ? "▲" : "▼"}</span>
      </button>

      <div className="px-4 pb-3">
        <StackedBar slices={day.byExercise} total={day.totalSeconds} />
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {day.byExercise.map((s) => {
            const { emoji, label, color } = exMeta(s.exerciseType);
            return (
              <span key={s.exerciseType} className="flex items-center gap-1 text-[11px] font-semibold">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-[2px] border border-black/20"
                  style={{ backgroundColor: color }}
                />
                <span className="text-neutral-700">
                  {emoji} {label.split(" · ")[0]}
                </span>
                <span className="font-mono text-neutral-500">{fmtDuration(s.seconds)}</span>
              </span>
            );
          })}
        </div>
      </div>

      {open ? (
        <div className="border-t-2 border-dashed border-neutral-200 px-4 py-3">
          {day.sessions.length > 0 ? (
            <ol className="space-y-1.5">
              {day.sessions.map((s) => {
                const { emoji, label, color } = exMeta(s.exerciseType);
                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-2 rounded-[4px] border border-neutral-200 bg-neutral-50 px-2.5 py-1.5"
                  >
                    <span className="w-11 shrink-0 font-mono text-[11px] font-bold text-neutral-500">
                      {fmtClock(s.startedAt)}
                    </span>
                    <span
                      className="h-6 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-neutral-800">
                      {emoji} {label.split(" · ")[0]}
                      {s.difficulty ? (
                        <span className="ml-1 text-[10px] font-medium text-neutral-400">
                          ({s.difficulty})
                        </span>
                      ) : null}
                    </span>
                    {s.score != null ? (
                      <span className="shrink-0 rounded-full border border-black bg-white px-1.5 py-0.5 text-[10px] font-black text-neutral-800">
                        {s.score}
                      </span>
                    ) : null}
                    <span
                      className="shrink-0 text-xs"
                      title={s.completed ? "Completed" : "Not finished"}
                    >
                      {s.completed ? "✅" : "◦"}
                    </span>
                    {s.capped ? (
                      <span
                        className="shrink-0 text-xs"
                        title={`Left open for ${fmtDuration(s.rawSeconds)} — counted as ${fmtDuration(s.seconds)}`}
                      >
                        ⚠️
                      </span>
                    ) : null}
                    <span className="w-14 shrink-0 text-right font-mono text-[11px] font-bold text-neutral-600">
                      {s.seconds > 0 ? fmtDuration(s.seconds) : "—"}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-[11px] text-neutral-400">No timed exam sessions this day.</p>
          )}

          {day.practiceMinutes.length > 0 ? (
            <div className="mt-2 rounded-[4px] border border-emerald-300 bg-emerald-50 px-2.5 py-1.5">
              <div className="text-[10px] font-black uppercase tracking-wide text-emerald-700">
                🎲 Freeform timed practice
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] font-semibold text-emerald-800">
                {day.practiceMinutes.map((p, i) => (
                  <span key={`${p.skill}-${i}`}>
                    {exMeta(p.skill).emoji} {p.skill}: {p.minutes}m
                    {p.setsDone ? ` · ${p.setsDone} sets` : ""}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail panel
// ---------------------------------------------------------------------------

function DetailPanel({ detail }: { detail: UserJourneyDetail }) {
  const completionRate =
    detail.sessionCount > 0
      ? Math.round((detail.completedCount / detail.sessionCount) * 100)
      : 0;
  const avgPerDay =
    detail.daysActive > 0 ? detail.totalSeconds / detail.daysActive : 0;

  return (
    <div className="space-y-4">
      {/* Identity + headline stats */}
      <div className="rounded-[6px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-xl font-black text-neutral-900">
              {detail.fullName || detail.email}
            </h2>
            {detail.fullName ? (
              <p className="text-xs font-medium text-neutral-500">{detail.email}</p>
            ) : null}
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-wide text-neutral-500">
              Total time on task
            </div>
            <div className="text-2xl font-black text-[#004AAD]">
              {fmtDuration(detail.totalSeconds)}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard label="Sessions" value={String(detail.sessionCount)} sub={`${completionRate}% finished`} />
          <StatCard label="Days active" value={String(detail.daysActive)} sub={`~${fmtDuration(avgPerDay)}/day`} />
          <StatCard label="First seen" value={fmtDate(detail.firstActivityAt)} />
          <StatCard label="Last active" value={fmtDate(detail.lastActivityAt)} />
        </div>
      </div>

      {/* All-time per-exam-type breakdown */}
      <div className="rounded-[6px] border-2 border-black bg-white p-4 shadow-[3px_3px_0_0_#000]">
        <h3 className="text-sm font-black uppercase tracking-wide text-neutral-800">
          Time by exam type
        </h3>
        {detail.secondsByExercise.length === 0 ? (
          <p className="mt-2 text-xs text-neutral-400">No timed sessions recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {detail.secondsByExercise.map((s) => {
              const { emoji, label, color } = exMeta(s.exerciseType);
              const pct =
                detail.totalSeconds > 0 ? (s.seconds / detail.totalSeconds) * 100 : 0;
              return (
                <li key={s.exerciseType}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-800">
                      {emoji} {label}
                    </span>
                    <span className="font-mono text-neutral-600">
                      {fmtDuration(s.seconds)}
                      <span className="text-neutral-400"> · {s.sessions}×</span>
                    </span>
                  </div>
                  <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(2, pct)}%`, backgroundColor: color }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Day-by-day timeline */}
      <div>
        <h3 className="mb-2 px-1 text-sm font-black uppercase tracking-wide text-neutral-800">
          Daily journey · {detail.days.length} day{detail.days.length === 1 ? "" : "s"}
        </h3>
        {detail.days.length === 0 ? (
          <p className="rounded-[6px] border-2 border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-400">
            No activity recorded for this learner.
          </p>
        ) : (
          <div className="space-y-2.5">
            {detail.days.map((day, i) => (
              <DayCard key={day.date} day={day} defaultOpen={i === 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// User list (left rail)
// ---------------------------------------------------------------------------

function UserRow({
  user,
  active,
  onClick,
}: {
  user: UserJourneySummary;
  active: boolean;
  onClick: () => void;
}) {
  const topSlices: ExerciseSlice[] = Object.entries(user.secondsByExercise)
    .map(([exerciseType, seconds]) => ({ exerciseType, seconds, sessions: 0 }))
    .sort((a, b) => b.seconds - a.seconds);
  const topEmoji = user.topExercise ? exMeta(user.topExercise).emoji : "·";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[6px] border-2 border-black p-3 text-left shadow-[2px_2px_0_0_#000] transition ${
        active ? "bg-ep-yellow/40" : "bg-white hover:bg-neutral-50"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-black text-neutral-900">
          {user.fullName || user.email}
        </span>
        <span className="shrink-0 font-mono text-sm font-black text-[#004AAD]">
          {fmtDuration(user.totalSeconds)}
        </span>
      </div>
      {user.fullName ? (
        <div className="truncate text-[11px] font-medium text-neutral-500">{user.email}</div>
      ) : null}
      <div className="mt-1.5">
        <StackedBar slices={topSlices} total={user.totalSeconds} />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] font-semibold text-neutral-500">
        <span>
          {topEmoji} {user.daysActive}d · {user.sessionCount} sess.
        </span>
        <span>{fmtDate(user.lastActivityAt)}</span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

type SortKey = "time" | "recent" | "sessions";

export function AdminUserJourneyClient() {
  const [summaries, setSummaries] = useState<UserJourneySummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("time");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserJourneyDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/admin/user-journey", { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { summaries: UserJourneySummary[] };
      setSummaries(data.summaries ?? []);
    } catch (e) {
      console.error(e);
      setSummaries([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const loadDetail = useCallback(async (userId: string) => {
    setSelectedId(userId);
    setLoadingDetail(true);
    setDetail(null);
    try {
      const res = await fetch(
        `/api/admin/user-journey?userId=${encodeURIComponent(userId)}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { detail: UserJourneyDetail | null };
      setDetail(data.detail);
    } catch (e) {
      console.error(e);
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = summaries.filter((u) => {
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        (u.fullName?.toLowerCase().includes(q) ?? false)
      );
    });
    const sorted = [...rows];
    if (sort === "time") sorted.sort((a, b) => b.totalSeconds - a.totalSeconds);
    else if (sort === "sessions") sorted.sort((a, b) => b.sessionCount - a.sessionCount);
    else
      sorted.sort((a, b) =>
        (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? ""),
      );
    return sorted;
  }, [summaries, query, sort]);

  const totals = useMemo(() => {
    const time = summaries.reduce((m, u) => m + u.totalSeconds, 0);
    const sessions = summaries.reduce((m, u) => m + u.sessionCount, 0);
    return { time, sessions, learners: summaries.length };
  }, [summaries]);

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-8">
      <header className="rounded-[4px] border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#004AAD]">Admin only</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
          User journey · time on each exam
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-600">
          Pick a learner to see exactly how their time is spent — every exam type, broken down day
          by day, with each session in order. Totals count visible time-on-task from
          recorded study sessions (last 365 days) plus off-plan timed practice.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:max-w-md">
          <StatCard label="Learners" value={String(totals.learners)} />
          <StatCard label="Total time" value={fmtDuration(totals.time)} />
          <StatCard label="Sessions" value={String(totals.sessions)} />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(280px,360px)_1fr]">
        {/* Left rail: user list */}
        <section className="space-y-3">
          <div className="rounded-[6px] border-2 border-black bg-white p-3 shadow-[3px_3px_0_0_#000]">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or email…"
              className="w-full border-2 border-black bg-white px-3 py-2 text-sm font-medium"
            />
            <div className="mt-2 flex gap-1.5">
              {(
                [
                  ["time", "Most time"],
                  ["recent", "Recent"],
                  ["sessions", "Sessions"],
                ] as [SortKey, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSort(key)}
                  className={`rounded-[4px] border-2 border-black px-2 py-1 text-[11px] font-black uppercase ${
                    sort === key ? "bg-black text-white" : "bg-white text-neutral-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loadingList ? (
            <p className="px-1 text-sm text-neutral-400">Loading learners…</p>
          ) : filtered.length === 0 ? (
            <p className="px-1 text-sm text-neutral-400">No learners match.</p>
          ) : (
            <div className="max-h-[75vh] space-y-2 overflow-y-auto pr-1">
              {filtered.map((u) => (
                <UserRow
                  key={u.userId}
                  user={u}
                  active={u.userId === selectedId}
                  onClick={() => void loadDetail(u.userId)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Right: detail */}
        <section>
          {!selectedId ? (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-[6px] border-2 border-dashed border-neutral-300 bg-white p-8 text-center">
              <p className="text-sm font-medium text-neutral-400">
                Select a learner on the left to see their full journey.
              </p>
            </div>
          ) : loadingDetail ? (
            <p className="px-1 text-sm text-neutral-400">Loading journey…</p>
          ) : detail ? (
            <DetailPanel detail={detail} />
          ) : (
            <p className="px-1 text-sm text-rose-500">Could not load this learner&apos;s journey.</p>
          )}
        </section>
      </div>
    </main>
  );
}
