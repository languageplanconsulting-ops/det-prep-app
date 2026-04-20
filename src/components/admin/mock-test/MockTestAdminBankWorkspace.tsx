"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import {
  buildFixedTemplateCsv,
  buildFixedTemplateJson,
  parseFixedMockUploadCsv,
  parseFixedMockUploadJson,
} from "@/lib/mock-test/fixed-upload";
import { FIXED_MOCK_STEP_COUNT } from "@/lib/mock-test/fixed-sequence";
import { mt } from "@/lib/mock-test/mock-test-styles";

export function MockTestAdminBankWorkspace() {
  const [sets, setSets] = useState<Array<{ id: string; name: string; itemCount: number }>>([]);
  const [setName, setSetName] = useState("");
  const [userTitle, setUserTitle] = useState("");
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const csvInstructions = `CSV column guide (exact format)
Header:
step_index,task_type,time_limit_sec,rest_after_step_sec,is_ai_graded,content_json,correct_answer_json

Column rules:
- step_index: integer 1..20, one row per step
- task_type: must match fixed sequence for that step
- time_limit_sec: integer seconds (e.g. 120, 60, 480)
- rest_after_step_sec: integer seconds (usually 0, rest steps 45)
- is_ai_graded: true or false
- content_json: valid JSON object (quoted in CSV)
- correct_answer_json: valid JSON object for objective tasks, blank/null for open tasks

Task-specific content_json:
- fill_in_blanks (steps 1/4/6/11): normal DET format
  sentence + options[] OR sentence_before + sentence_after + options[]
- vocabulary_reading (step 8): passage.p1/p2/p3 + at least 6 vocabularyQuestions[] + missingParagraph
- interactive_speaking (step 13) + conversation_summary (step 14):
  turns[] with question_en and reference_answer_en in each turn`;

  const loadSets = useCallback(async () => {
    const res = await fetch("/api/mock-test/fixed/sets", { credentials: "same-origin" });
    const json = (await res.json().catch(() => ({}))) as {
      sets?: Array<{ id: string; name: string; stepCount: number }>;
      error?: string;
    };
    if (!res.ok) {
      setBanner(json.error ?? "Could not load fixed sets.");
      return;
    }
    const mapped = (json.sets ?? [])
      .map((row) => ({
        id: row.id,
        name: row.name,
        itemCount: row.stepCount ?? 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    setSets(mapped);
  }, []);

  useEffect(() => {
    void loadSets();
  }, [loadSets]);

  const copyTemplate = async () => {
    const text = format === "json" ? buildFixedTemplateJson() : buildFixedTemplateCsv();
    setDraft(text);
    try {
      await navigator.clipboard.writeText(text);
      setBanner("Template copied to clipboard.");
    } catch {
      setBanner("Template loaded in the input box (clipboard blocked by browser).");
    }
  };

  const downloadTemplate = () => {
    const text = format === "json" ? buildFixedTemplateJson() : buildFixedTemplateCsv();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = format === "json" ? "fixed-mock-template.json" : "fixed-mock-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const uploadFixedSet = async () => {
    setBanner(null);
    if (!setName.trim()) {
      setBanner("Please enter internal set name.");
      return;
    }
    if (!userTitle.trim()) {
      setBanner("Please enter learner-facing title.");
      return;
    }
    const parsed =
      format === "json" ? parseFixedMockUploadJson(draft) : parseFixedMockUploadCsv(draft);
    if (parsed.error) {
      setBanner(parsed.error);
      return;
    }
    const groupedItems = parsed.rows.reduce<Record<string, unknown[]>>((acc, row) => {
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
    setBusy(true);
    const res = await fetch("/api/admin/mock-test/fixed-builder/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        internal_name: setName.trim(),
        user_title: userTitle.trim(),
        grouped_items: groupedItems,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      savedRows?: number;
    };
    setBusy(false);
    if (!res.ok || !json.ok) return setBanner(json.error ?? "Upload failed.");
    setBanner(
      `Uploaded ${json.savedRows ?? parsed.rows.length}/${FIXED_MOCK_STEP_COUNT} steps to set "${userTitle.trim()}".`,
    );
    await loadSets();
  };

  return (
    <div className="space-y-8">
      <header>
        <h1
          className="text-2xl font-black text-[#004AAD]"
          style={{ fontFamily: "var(--font-inter), system-ui" }}
        >
          Fixed mock bank — 20-step set uploader
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-neutral-600">
          Upload one complete fixed set at a time with exactly 20 ordered steps. Existing steps for the same
          set name are replaced on upload. JSON supports both exact step rows and grouped-by-task rows
          (system auto-distributes by the fixed sequence).
        </p>
      </header>

      <section className={`${mt.border} ${mt.shadow} bg-white p-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-[#004AAD]">Available fixed sets</p>
            <p className="text-xs text-neutral-600">
              Learners will only see active admin-uploaded set names.
            </p>
          </div>
          <button
type="button"
            onClick={() => void loadSets()}
            className={`${mt.border} bg-neutral-100 px-3 py-2 text-xs font-bold shadow-[2px_2px_0_0_#000]`}
          >
            Refresh
          </button>
        </div>
        <ul className="mt-3 space-y-2">
          {sets.map((s) => (
            <li key={s.id} className="rounded-[4px] border-2 border-black bg-neutral-50 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-black text-[#004AAD]">{s.name}</span>
                  <span className="ml-2 text-xs text-neutral-600">{s.itemCount}/20 steps</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setBanner(null);
                      setBusy(true);
                      const res = await fetch(
                        `/api/admin/mock-test/fixed-builder/set?setId=${encodeURIComponent(s.id)}`,
                        { credentials: "same-origin" },
                      );
                      const json = (await res.json().catch(() => ({}))) as {
                        ok?: boolean;
                        error?: string;
                        set?: {
                          internal_name?: string;
                          user_title?: string;
                          grouped_items?: Record<string, unknown>;
                        };
                      };
                      setBusy(false);
                      if (!res.ok || !json.ok || !json.set) {
                        setBanner(json.error ?? "Could not load set JSON.");
                        return;
                      }
                      setFormat("json");
                      setSetName(String(json.set.internal_name ?? ""));
                      setUserTitle(String(json.set.user_title ?? ""));
                      setDraft(JSON.stringify({ grouped_items: json.set.grouped_items ?? {} }, null, 2));
                      setBanner(`Loaded "${json.set.user_title ?? s.name}" into the JSON editor. Edit and upload to replace it.`);
                      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
                    }}
                    disabled={busy}
                    className="rounded-[4px] border-2 border-black bg-white px-2.5 py-1 text-[11px] font-black shadow-[2px_2px_0_0_#000] disabled:opacity-50"
                  >
                    Edit JSON
                  </button>
                  <Link
                    href={`/mock-test/start?setId=${encodeURIComponent(s.id)}&adminPreview=1&skipTimer=1`}
                    className="rounded-[4px] border-2 border-black bg-[#FFCC00] px-2.5 py-1 text-[11px] font-black shadow-[2px_2px_0_0_#000]"
                  >
                    Test mock (skip timer)
                  </Link>
                </div>
              </div>
            </li>
          ))}
          {sets.length === 0 ? <li className="text-sm text-neutral-600">No fixed sets uploaded yet.</li> : null}
        </ul>
      </section>

      <section className={`${mt.border} ${mt.shadow} space-y-4 bg-neutral-50 p-4`}>
        <div className="rounded-[4px] border-2 border-black bg-white p-3 text-xs text-neutral-700">
          <p className="font-black uppercase tracking-wide text-[#004AAD]">CSV column guide (exact format)</p>
          <p className="mt-2">
            Header must be exactly:
            <code className="ml-1 font-mono">
              step_index,task_type,time_limit_sec,rest_after_step_sec,is_ai_graded,content_json,correct_answer_json
            </code>
          </p>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(csvInstructions);
                setBanner("CSV instructions copied.");
              } catch {
                setBanner("Could not copy CSV instructions (clipboard blocked).");
              }
            }}
            className={`${mt.border} mt-2 bg-white px-3 py-1.5 text-[11px] font-bold shadow-[2px_2px_0_0_#000]`}
          >
            Copy CSV instructions
          </button>
          <div className="mt-2 space-y-1">
            <p>
              <strong>step_index</strong>: integer 1..20 (exactly one row for each step).
            </p>
            <p>
              <strong>task_type</strong>: must match the fixed sequence for that step (do not change order).
            </p>
            <p>
              <strong>time_limit_sec</strong>: integer seconds (for example 120, 60, 480).
            </p>
            <p>
              <strong>rest_after_step_sec</strong>: integer seconds (usually 0; rest steps use 45).
            </p>
            <p>
              <strong>is_ai_graded</strong>: <code className="font-mono">true</code> or{" "}
              <code className="font-mono">false</code>.
            </p>
            <p>
              <strong>content_json</strong>: valid JSON object (must be quoted in CSV). This contains the question content.
            </p>
            <p>
              <strong>correct_answer_json</strong>: valid JSON object for objective questions (or blank/null for open-ended).
            </p>
          </div>
          <div className="mt-3 space-y-1">
            <p className="font-bold text-neutral-900">Task-specific content_json requirements</p>
            <p>
              <strong>fill_in_blanks (steps 1/4/6/11)</strong>: use normal DET fill format (
              <code className="font-mono">passage + missingWords[]</code>) exactly like normal fill-in-blank uploads.
            </p>
            <p>
              <strong>vocabulary_reading (step 8)</strong>: requires{" "}
              <code className="font-mono">passage.p1/p2/p3</code>, at least 6{" "}
              <code className="font-mono">vocabularyQuestions[]</code>, and{" "}
              <code className="font-mono">missingParagraph</code>.
            </p>
            <p>
              <strong>interactive_speaking (step 13)</strong> and{" "}
              <strong>conversation_summary (step 14)</strong>: provide{" "}
              <code className="font-mono">turns[]</code> with{" "}
              <code className="font-mono">question_en</code> and{" "}
              <code className="font-mono">reference_answer_en</code> in each turn.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={setName}
            onChange={(e) => setSetName(e.target.value)}
            className={`${mt.border} bg-white px-3 py-2 text-sm`}
            placeholder="Internal set name (e.g. april-2026-form-a)"
          />
          <input
            value={userTitle}
            onChange={(e) => setUserTitle(e.target.value)}
            className={`${mt.border} bg-white px-3 py-2 text-sm`}
            placeholder="Learner title (e.g. April 2026 Form A)"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormat("json")}
              className={`rounded-[4px] border-2 border-black px-3 py-2 text-xs font-black ${format === "json" ? "bg-[#004AAD] text-[#FFCC00]" : "bg-white"}`}
            >
              JSON
            </button>
            <button
              type="button"
              onClick={() => setFormat("csv")}
              className={`rounded-[4px] border-2 border-black px-3 py-2 text-xs font-black ${format === "csv" ? "bg-[#004AAD] text-[#FFCC00]" : "bg-white"}`}
            >
              CSV
            </button>
            <button
              type="button"
              onClick={() => void copyTemplate()}
              className={`${mt.border} bg-white px-3 py-2 text-xs font-bold shadow-[2px_2px_0_0_#000]`}
            >
              Load template
            </button>
            <button
              type="button"
              onClick={downloadTemplate}
              className={`${mt.border} bg-white px-3 py-2 text-xs font-bold shadow-[2px_2px_0_0_#000]`}
            >
              Download {format.toUpperCase()} template
            </button>
          </div>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={16}
          className={`w-full ${mt.border} bg-white p-3 font-mono text-[11px] leading-relaxed`}
          spellCheck={false}
          placeholder={format === "json" ? '{"items":[...]}' : "step_index,task_type,time_limit_sec,..."}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void uploadFixedSet()}
          className={`w-full ${mt.border} bg-[#004AAD] py-3 text-sm font-black text-[#FFCC00] shadow-[4px_4px_0_0_#000] disabled:opacity-50`}
        >
          {busy ? "Uploading..." : "Upload fixed 20-step set"}
        </button>
      </section>

      {banner ? (
        <p className="rounded-[4px] border-4 border-black bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">
          {banner}
        </p>
      ) : null}
    </div>
  );
}
