"use client";

import { useCallback, useEffect, useState } from "react";

import {
  applyAdminUploadRevert,
  loadAdminUploadLog,
  type AdminExamUploadKind,
  type AdminUploadLogEntry,
} from "@/lib/admin-upload-log";

const LABELS: Record<AdminExamUploadKind, string> = {
  fitb: "Fill in the blank",
  dictation: "Dictation",
  realword: "Real English word",
  conversation: "Interactive conversation",
  reading: "Reading sets",
  vocab: "Vocabulary in context",
  writing: "Writing topics",
  speaking: "Read, then speak",
  photo: "Speak about photo (legacy)",
  writeAboutPhoto: "Write & speak about photo (rounds)",
  dialogueSummary: "Dialogue → summary",
  interactiveSpeaking: "Interactive speaking",
};

export function AdminUploadLogPanel({ examKind }: { examKind: AdminExamUploadKind }) {
  const [entries, setEntries] = useState<AdminUploadLogEntry[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setEntries(loadAdminUploadLog().filter((e) => e.examKind === examKind));
  }, [examKind]);

  useEffect(() => {
    refresh();
    const onStorage = () => refresh();
    const onCustom = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("admin-upload-log-changed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("admin-upload-log-changed", onCustom);
    };
  }, [refresh]);

  const onRemoveImport = (entry: AdminUploadLogEntry) => {
    setError(null);
    const ok = window.confirm(
      "Remove this import from the question bank? This restores defaults or deletes merged content where supported.",
    );
    if (!ok) return;
    void (async () => {
      const result = await applyAdminUploadRevert(entry);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      refresh();
    })();
  };

  return (
    <section className="mt-6 rounded-[4px] border-4 border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
      <p className="text-xs font-black uppercase tracking-wide text-neutral-700">
        Upload history — {LABELS[examKind]}
      </p>
      <p className="mt-1 text-xs text-neutral-600">
        Each successful merge stores the exact JSON text from this browser. Use it to verify what was
        imported, then remove that import if needed.
      </p>
      {error ? <p className="mt-2 text-sm font-bold text-red-700">{error}</p> : null}
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">No uploads recorded yet for this type.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {entries.map((e) => {
            const opened = openId === e.id;
            return (
              <li
                key={e.id}
                className="rounded-[4px] border-2 border-black bg-neutral-50 p-2 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-neutral-900">
                      {new Date(e.at).toLocaleString()}{" "}
                      {e.fileName ? (
                        <span className="font-semibold text-ep-blue">· {e.fileName}</span>
                      ) : (
                        <span className="text-neutral-500">· pasted</span>
                      )}
                    </p>
                    <p className="ep-stat mt-0.5 text-xs text-neutral-700">{e.summary}</p>
                    {e.rawTruncated ? (
                      <p className="mt-1 text-xs font-bold text-amber-800">
                        Stored text was truncated for browser storage limits.
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenId(opened ? null : e.id)}
                      className="rounded-[4px] border-2 border-black bg-white px-2 py-1 text-xs font-bold"
                    >
                      {opened ? "Hide JSON" : "View JSON"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveImport(e)}
                      disabled={!e.revertSpec}
                      className="rounded-[4px] border-2 border-black bg-red-600 px-2 py-1 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Remove import
                    </button>
                  </div>
                </div>
                {opened ? (
                  <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words border border-black bg-white p-2 ep-stat text-[11px] leading-snug">
                    {e.rawText}
                  </pre>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
