"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Topic = {
  topicKey: string;
  topicEn: string;
  topicTh: string;
  scope: "all" | "writing";
  occurrenceCount: number;
  cleanStreak: number;
  retired: boolean;
  lastSurface: string | null;
  lastSeenAt: string | null;
};

type Learner = {
  userId: string;
  email: string;
  fullName: string | null;
  topics: Topic[];
};

type Tally = {
  topicEn: string;
  topicTh: string;
  learners: number;
  occurrences: number;
};

const SURFACE_LABEL: Record<string, string> = {
  read_then_write: "Read & write",
  write_about_photo: "Write about photo",
  read_then_speak: "Read & speak",
  speak_about_photo: "Speak about photo",
  interactive_speaking: "Interactive speaking",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export function AdminProductionWeaknessPageClient() {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [tally, setTally] = useState<Tally[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hideRetired, setHideRetired] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/production-weakness", { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { learners?: Learner[]; tally?: Tally[] };
      setLearners(data.learners ?? []);
      setTally(data.tally ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return learners
      .map((l) => ({
        ...l,
        topics: hideRetired ? l.topics.filter((t) => !t.retired) : l.topics,
      }))
      .filter((l) => l.topics.length > 0)
      .filter((l) =>
        !q
          ? true
          : l.email.toLowerCase().includes(q) ||
            (l.fullName ?? "").toLowerCase().includes(q) ||
            l.topics.some((t) => t.topicEn.toLowerCase().includes(q)),
      );
  }, [learners, query, hideRetired]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/admin" className="text-sm font-bold text-ep-blue underline-offset-4 hover:underline">
        ← Admin
      </Link>
      <h1 className="mt-4 text-2xl font-black uppercase tracking-tight">Repeated grammar habits</h1>
      <p className="mt-2 max-w-3xl text-sm text-neutral-600">
        Grammar mistakes each learner has made in more than one production exercise, counted once
        per attempt across writing and speaking. A topic is shown to the learner before their next
        exercise once it reaches 2, and stops being shown after 3 clean attempts.
      </p>

      {loading ? <p className="mt-6 text-sm">Loading…</p> : null}
      {error ? <p className="mt-6 text-sm font-bold text-red-700">{error}</p> : null}

      {!loading && !error && learners.length === 0 ? (
        <p className="mt-6 rounded-sm border-2 border-black bg-amber-50 p-4 text-sm">
          Nothing recorded yet. Rows appear here as learners finish production exercises that are
          graded after this feature went live.
        </p>
      ) : null}

      {tally.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-black uppercase tracking-tight">What the whole cohort gets wrong</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-black text-left">
                  <th className="py-2 pr-4">Topic</th>
                  <th className="py-2 pr-4">Learners affected</th>
                  <th className="py-2">Total occurrences</th>
                </tr>
              </thead>
              <tbody>
                {tally.map((t) => (
                  <tr key={t.topicEn || t.topicTh} className="border-b border-neutral-200">
                    <td className="py-2 pr-4">
                      <span className="font-bold">{t.topicEn || "—"}</span>
                      {t.topicTh ? (
                        <span className="ml-2 text-neutral-600">{t.topicTh}</span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-4 font-bold">{t.learners}</td>
                    <td className="py-2">{t.occurrences}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {learners.length > 0 ? (
        <section className="mt-10">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-black uppercase tracking-tight">By learner</h2>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search email, name or topic"
              className="rounded-sm border-2 border-black px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={hideRetired}
                onChange={(e) => setHideRetired(e.target.checked)}
              />
              Hide topics they have fixed
            </label>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-sm border-2 border-black bg-white px-3 py-2 text-sm font-bold shadow-[2px_2px_0_0_#000]"
            >
              Refresh
            </button>
          </div>

          <ul className="mt-4 space-y-4">
            {visible.map((l) => (
              <li key={l.userId} className="rounded-sm border-2 border-black bg-white p-4 shadow-[3px_3px_0_0_#000]">
                <p className="font-bold">{l.email || l.userId}</p>
                {l.fullName ? <p className="text-sm text-neutral-600">{l.fullName}</p> : null}
                <ul className="mt-3 flex flex-wrap gap-2">
                  {l.topics.map((t) => (
                    <li
                      key={t.topicKey}
                      className={`rounded-sm border-2 border-black px-3 py-2 text-sm ${
                        t.retired ? "bg-neutral-100 text-neutral-500" : "bg-amber-50"
                      }`}
                    >
                      <span className="font-bold">{t.topicTh || t.topicEn}</span>
                      {t.topicEn && t.topicTh ? (
                        <span className="ml-2 text-neutral-600">{t.topicEn}</span>
                      ) : null}
                      <span className="ml-2 font-bold text-amber-800">×{t.occurrenceCount}</span>
                      {t.scope === "writing" ? (
                        <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-900">
                          writing only
                        </span>
                      ) : null}
                      {t.retired ? (
                        <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-900">
                          fixed
                        </span>
                      ) : null}
                      <span className="ml-2 text-xs text-neutral-500">
                        last: {SURFACE_LABEL[t.lastSurface ?? ""] ?? t.lastSurface ?? "—"} ·{" "}
                        {formatDate(t.lastSeenAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          {visible.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-600">No learners match that filter.</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
