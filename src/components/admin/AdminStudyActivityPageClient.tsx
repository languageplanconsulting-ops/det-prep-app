"use client";

import Link from "next/link";
import { Fragment } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  extractReportCard,
  extractSubmissionCard,
} from "@/lib/admin-study-activity-format";

type StudyRow = {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  completed: boolean | null;
  skill: string | null;
  exercise_type: string | null;
  difficulty: string | null;
  set_id: string | null;
  score: number | null;
  submission_payload: Record<string, unknown> | null;
  report_payload: Record<string, unknown> | null;
};

const EXERCISE_OPTIONS = [
  "all",
  "read_then_write",
  "read_then_speak",
  "write_about_photo",
  "speak_about_photo",
  "interactive_speaking",
] as const;

export function AdminStudyActivityPageClient() {
  const [rows, setRows] = useState<StudyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [exerciseFilter, setExerciseFilter] =
    useState<(typeof EXERCISE_OPTIONS)[number]>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/study-activity", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { rows: StudyRow[] };
      setRows(data.rows ?? []);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (exerciseFilter !== "all" && row.exercise_type !== exerciseFilter) {
        return false;
      }
      if (!q) return true;
      return (
        row.email.toLowerCase().includes(q) ||
        (row.full_name?.toLowerCase().includes(q) ?? false) ||
        (row.exercise_type?.toLowerCase().includes(q) ?? false) ||
        (row.skill?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rows, query, exerciseFilter]);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <header className="rounded-[4px] border-4 border-black bg-white p-6 shadow-[4px_4px_0_0_#000]">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#004AAD]">
          Admin only
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-900">
          Study activity dashboard
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-600">
          Recent learner activity across speaking and writing-style exercises, including saved
          scores, learner submissions, and compact report snapshots when available.
        </p>
      </header>

      <section className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[260px] flex-1 text-xs font-black uppercase tracking-wide text-neutral-700">
            Search student / task
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="email, name, task"
              className="mt-2 w-full border-2 border-black bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal"
            />
          </label>
          <label className="min-w-[220px] text-xs font-black uppercase tracking-wide text-neutral-700">
            Exercise
            <select
              value={exerciseFilter}
              onChange={(e) =>
                setExerciseFilter(e.target.value as (typeof EXERCISE_OPTIONS)[number])
              }
              className="mt-2 w-full border-2 border-black bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal"
            >
              {EXERCISE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All production tasks" : option}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-[4px] border-2 border-black bg-[#FFCC00] px-4 py-2 text-xs font-black uppercase shadow-[3px_3px_0_0_#000]"
          >
            Refresh
          </button>
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          Showing {filtered.length} of {rows.length} recent sessions.
        </p>
      </section>

      <section className="rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
        {loading ? (
          <p className="text-sm text-neutral-500">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-neutral-500">No study activity matched the filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-xs">
              <thead className="bg-neutral-100">
                <tr>
                  <th className="border-b-2 border-black p-2">Started</th>
                  <th className="border-b-2 border-black p-2">Student</th>
                  <th className="border-b-2 border-black p-2">Skill</th>
                  <th className="border-b-2 border-black p-2">Exercise</th>
                  <th className="border-b-2 border-black p-2">Difficulty</th>
                  <th className="border-b-2 border-black p-2">Score</th>
                  <th className="border-b-2 border-black p-2">Duration</th>
                  <th className="border-b-2 border-black p-2">Done</th>
                  <th className="border-b-2 border-black p-2">User</th>
                  <th className="border-b-2 border-black p-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const submissionCard = extractSubmissionCard(
                    row as unknown as Record<string, unknown>,
                  );
                  const reportCard = extractReportCard(
                    row as unknown as Record<string, unknown>,
                  );
                  const isOpen = expandedId === row.id;
                  return (
                    <Fragment key={row.id}>
                      <tr>
                        <td className="border-b border-neutral-200 p-2 whitespace-nowrap">
                          {row.started_at
                            ? new Date(row.started_at).toLocaleString()
                            : "—"}
                        </td>
                        <td className="border-b border-neutral-200 p-2">
                          <div className="font-semibold text-neutral-900">
                            {row.full_name || "—"}
                          </div>
                          <div className="text-neutral-500">{row.email}</div>
                        </td>
                        <td className="border-b border-neutral-200 p-2">{row.skill ?? "—"}</td>
                        <td className="border-b border-neutral-200 p-2 font-mono text-[10px]">
                          {row.exercise_type ?? "—"}
                        </td>
                        <td className="border-b border-neutral-200 p-2">
                          {row.difficulty ?? "—"}
                        </td>
                        <td className="border-b border-neutral-200 p-2 font-black text-[#004AAD]">
                          {row.score != null ? row.score : "—"}
                        </td>
                        <td className="border-b border-neutral-200 p-2">
                          {row.duration_seconds != null && row.duration_seconds > 0
                            ? `${Math.round(row.duration_seconds / 60)} min`
                            : "—"}
                        </td>
                        <td className="border-b border-neutral-200 p-2">
                          {row.completed ? "✓" : "—"}
                        </td>
                        <td className="border-b border-neutral-200 p-2">
                          <Link
                            href={`/admin/subscriptions/${row.user_id}`}
                            className="font-bold text-[#004AAD] underline underline-offset-2"
                          >
                            Open
                          </Link>
                        </td>
                        <td className="border-b border-neutral-200 p-2">
                          {submissionCard || reportCard ? (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedId((prev) => (prev === row.id ? null : row.id))
                              }
                              className="rounded-sm border-2 border-black bg-[#FFCC00] px-2 py-1 text-[10px] font-black uppercase shadow-[2px_2px_0_0_#000]"
                            >
                              {isOpen ? "Hide" : "View"}
                            </button>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr>
                          <td colSpan={10} className="border-b border-neutral-200 bg-neutral-50 p-3">
                            <div className="grid gap-3 lg:grid-cols-2">
                              <div className="rounded-sm border-2 border-black bg-white p-3">
                                <p className="text-[11px] font-black uppercase tracking-wide text-[#004AAD]">
                                  {submissionCard?.title ?? "Learner submission"}
                                </p>
                                {submissionCard?.meta.length ? (
                                  <p className="mt-1 text-[10px] font-bold text-neutral-500">
                                    {submissionCard.meta.filter(Boolean).join(" · ")}
                                  </p>
                                ) : null}
                                <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-neutral-800">
                                  {submissionCard?.body ?? "No saved submission snapshot for this session."}
                                </p>
                              </div>
                              <div className="rounded-sm border-2 border-black bg-white p-3">
                                <p className="text-[11px] font-black uppercase tracking-wide text-[#004AAD]">
                                  Saved report snapshot
                                </p>
                                <p className="mt-2 text-sm font-black text-neutral-900">
                                  Score: <span className="text-[#004AAD]">{reportCard?.score ?? "—"}</span>
                                </p>
                                <p className="mt-2 text-xs leading-relaxed text-neutral-800">
                                  {reportCard?.summary || "No compact report summary was saved for this session."}
                                </p>
                                {reportCard?.bullets.length ? (
                                  <ul className="mt-3 space-y-1 text-xs text-neutral-800">
                                    {reportCard.bullets.map((bullet, index) => (
                                      <li key={`${row.id}-bullet-${index}`} className="flex gap-2">
                                        <span className="font-black text-[#004AAD]">{index + 1}.</span>
                                        <span>{bullet}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : null}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
