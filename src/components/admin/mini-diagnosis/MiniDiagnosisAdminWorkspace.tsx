"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { MINI_DIAGNOSIS_SEQUENCE_TEMPLATE, MINI_DIAGNOSIS_STEP_COUNT } from "@/lib/mini-diagnosis/sequence";
import { buildMiniDiagnosisTemplateJson, parseMiniDiagnosisUploadJson } from "@/lib/mini-diagnosis/upload";
import { mt } from "@/lib/mock-test/mock-test-styles";

const TASK_BUCKETS = Array.from(
  MINI_DIAGNOSIS_SEQUENCE_TEMPLATE.reduce((acc, step) => {
    acc.set(step.taskType, (acc.get(step.taskType) ?? 0) + 1);
    return acc;
  }, new Map<string, number>()),
).map(([taskType, count]) => ({ taskType, count }));

function normalizeGroupedItemsFromRows(
  rows: Array<{
    task_type: string;
    content: Record<string, unknown>;
    correct_answer?: Record<string, unknown> | null;
    time_limit_sec: number;
    rest_after_step_sec?: number;
    is_ai_graded?: boolean;
  }>,
): Record<string, unknown[]> {
  return rows.reduce<Record<string, unknown[]>>((acc, row) => {
    const current = acc[row.task_type] ?? [];
    current.push({
      content: row.content,
      correct_answer: row.correct_answer,
      time_limit_sec: row.time_limit_sec,
      rest_after_step_sec: row.rest_after_step_sec ?? 0,
      is_ai_graded: row.is_ai_graded ?? false,
    });
    acc[row.task_type] = current;
    return acc;
  }, {});
}

export function MiniDiagnosisAdminWorkspace() {
  const [sets, setSets] = useState<Array<{ id: string; name: string; itemCount: number }>>([]);
  const [setName, setSetName] = useState("");
  const [userTitle, setUserTitle] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const loadSets = useCallback(async () => {
    const res = await fetch("/api/mini-diagnosis/sets", { credentials: "same-origin" });
    const json = (await res.json().catch(() => ({}))) as {
      sets?: Array<{ id: string; name: string; stepCount: number }>;
      error?: string;
    };
    if (!res.ok) {
      setBanner(json.error ?? "Could not load mini diagnosis sets.");
      return;
    }
    setSets(
      (json.sets ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        itemCount: row.stepCount ?? 0,
      })),
    );
  }, []);

  useEffect(() => {
    void loadSets();
  }, [loadSets]);

  const copyTemplate = async () => {
    const text = buildMiniDiagnosisTemplateJson();
    setDraft(text);
    try {
      await navigator.clipboard.writeText(text);
      setBanner("Template copied to clipboard.");
    } catch {
      setBanner("Template loaded in the box below.");
    }
  };

  const uploadSet = async () => {
    setBanner(null);
    if (!setName.trim()) return setBanner("Please enter internal set name.");
    if (!userTitle.trim()) return setBanner("Please enter learner-facing title.");

    const parsed = parseMiniDiagnosisUploadJson(draft);
    if (parsed.error) return setBanner(parsed.error);
    const groupedItems = normalizeGroupedItemsFromRows(parsed.rows);

    setBusy(true);
    const res = await fetch("/api/admin/mini-diagnosis/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        internal_name: setName.trim(),
        user_title: userTitle.trim(),
        grouped_items: groupedItems,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; savedRows?: number };
    setBusy(false);
    if (!res.ok || !json.ok) return setBanner(json.error ?? "Upload failed.");
    setBanner(`Uploaded ${json.savedRows ?? MINI_DIAGNOSIS_STEP_COUNT}/${MINI_DIAGNOSIS_STEP_COUNT} steps.`);
    await loadSets();
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-black text-[#004AAD]">Mini block diagnosis uploader</h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-600">
          Upload one complete 9-step mini diagnosis set. This is the free-level diagnostic flow
          with 2 dictations, 1 real-word test, 1 vocab reading, 2 fill-in-the-blanks, 1 mini listening,
          1 write-about-photo, and 1 read-then-speak.
        </p>
      </header>

      <section className={`${mt.border} ${mt.shadow} bg-white p-4`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-[#004AAD]">Available mini diagnosis sets</p>
            <p className="text-xs text-neutral-600">Learners only see active admin-uploaded sets.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadSets()}
            className="rounded-[4px] border-4 border-black bg-white px-4 py-2 text-sm font-black shadow-[4px_4px_0_0_#000]"
          >
            Refresh
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {sets.length === 0 ? (
            <div className="rounded-[4px] border-4 border-dashed border-black bg-neutral-50 px-4 py-6 text-sm font-bold text-neutral-600">
              No active mini diagnosis sets yet.
            </div>
          ) : (
            sets.map((set) => (
              <div
                key={set.id}
                className="flex items-center justify-between gap-4 rounded-[4px] border-4 border-black bg-neutral-50 px-4 py-4"
              >
                <div>
                  <p className="text-xl font-black text-[#004AAD]">{set.name}</p>
                  <p className="text-sm text-neutral-600">{set.itemCount}/{MINI_DIAGNOSIS_STEP_COUNT} steps</p>
                </div>
                <Link
                  href="/mini-diagnosis/start"
                  className="rounded-[4px] border-4 border-black bg-[#FFCC00] px-4 py-2 text-sm font-black shadow-[4px_4px_0_0_#000]"
                >
                  Test diagnosis
                </Link>
              </div>
            ))
          )}
        </div>
      </section>

      <section className={`${mt.border} ${mt.shadow} bg-white p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-[#004AAD]">Sequence</p>
            <p className="text-xs text-neutral-600">Keep the grouped JSON counts exactly right.</p>
          </div>
          <button
            type="button"
            onClick={copyTemplate}
            className="rounded-[4px] border-4 border-black bg-[#004AAD] px-4 py-2 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000]"
          >
            Load JSON template
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {TASK_BUCKETS.map((bucket) => (
            <div key={bucket.taskType} className="rounded-[4px] border-4 border-black bg-neutral-50 px-3 py-3">
              <p className="font-black">{bucket.taskType}</p>
              <p className="text-xs text-neutral-600">{bucket.count} required item(s)</p>
            </div>
          ))}
        </div>
      </section>

      <section className={`${mt.border} ${mt.shadow} bg-white p-5`}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-neutral-500">
              Internal set name
            </span>
            <input
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
              className="w-full rounded-[4px] border-4 border-black px-4 py-3 text-sm font-bold"
              placeholder="mini-diagnosis-april"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-widest text-neutral-500">
              Learner title
            </span>
            <input
              value={userTitle}
              onChange={(e) => setUserTitle(e.target.value)}
              className="w-full rounded-[4px] border-4 border-black px-4 py-3 text-sm font-bold"
              placeholder="April 2026 mini diagnosis"
            />
          </label>
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-xs font-black uppercase tracking-widest text-neutral-500">Grouped JSON</p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={22}
            className="min-h-[420px] w-full rounded-[4px] border-4 border-black p-4 text-xs font-bold"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
            placeholder="Paste grouped_items JSON here…"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={uploadSet}
            disabled={busy}
            className="rounded-[4px] border-4 border-black bg-[#FFCC00] px-5 py-3 text-sm font-black shadow-[4px_4px_0_0_#000] disabled:opacity-60"
          >
            {busy ? "Uploading..." : "Upload mini diagnosis set"}
          </button>
        </div>
        {banner ? <p className="mt-4 text-sm font-bold text-[#004AAD]">{banner}</p> : null}
      </section>
    </div>
  );
}
