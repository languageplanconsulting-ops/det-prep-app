"use client";

import { useCallback, useEffect, useState } from "react";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { appendAdminUploadLog } from "@/lib/admin-upload-log";
import { WRITING_ROUND_NUMBERS } from "@/lib/writing-constants";
import { parseWritingTopicsJson } from "@/lib/writing-admin";
import {
  countWritingTopicsByRound,
  loadWritingTopics,
  mergeWritingTopicsFromAdmin,
  resetWritingTopicsToDefaults,
} from "@/lib/writing-storage";

const WRITING_TOPICS_JSON_TEMPLATE = `[
  {
    "id": "rw-custom-1",
    "round": 1,
    "titleEn": "A challenge you overcame",
    "titleTh": "อุปสรรคที่คุณผ่านมาได้",
    "promptEn": "Describe a difficult situation you faced and how you dealt with it.",
    "promptTh": "อธิบายสถานการณ์ที่ยากที่คุณเคยเจอ และคุณรับมืออย่างไร",
    "followUps": [
      {
        "promptEn": "What would you do differently if it happened again?",
        "promptTh": "ถ้าเกิดขึ้นอีก คุณจะทำอะไรต่างออกไป"
      },
      {
        "promptEn": "Who helped you, and how?",
        "promptTh": "ใครช่วยคุณ และช่วยอย่างไร"
      },
      {
        "promptEn": "What did you learn about yourself?",
        "promptTh": "คุณได้เรียนรู้อะไรเกี่ยวกับตัวเอง"
      }
    ]
  },
  {
    "id": "rw-custom-2",
    "round": 3,
    "titleEn": "Single long essay (no follow-up questions)",
    "titleTh": "เขียนยาวข้อเดียว (ไม่มีคำถามต่อ)",
    "promptEn": "Explain one advantage of learning English early, with examples.",
    "promptTh": "อธิบายข้อดีอย่างหนึ่งของการเรียนภาษาอังกฤษตั้งแต่เด็ก พร้อมตัวอย่าง"
  },
  {
    "id": "rw-custom-3",
    "round": 2,
    "titleEn": "Same follow-ups using the alternate key name",
    "titleTh": "คำถามต่อด้วยชื่อฟิลด์ทางเลือก",
    "promptEn": "Briefly describe your favourite way to relax after a busy week.",
    "promptTh": "อธิบายสั้นๆ ว่าคุณชอบพักผ่อนอย่างไรหลังสัปดาห์ที่ยุ่ง",
    "followUpQuestions": [
      {
        "promptEn": "How often do you do this?",
        "promptTh": "คุณทำแบบนี้บ่อยแค่ไหน"
      },
      {
        "promptEn": "Would you recommend it to a friend? Why or why not?",
        "promptTh": "คุณจะแนะนำให้เพื่อนหรือไม่ เพราะอะไร"
      }
    ]
  }
]`;

function importTopicsFromRaw(
  raw: string,
  fileName: string,
): { topics: ReturnType<typeof parseWritingTopicsJson>; mergedLen: number } {
  const topics = parseWritingTopicsJson(raw);
  const merged = mergeWritingTopicsFromAdmin(topics);
  const ids = [...new Set(topics.map((t) => t.id))];
  appendAdminUploadLog({
    examKind: "writing",
    fileName,
    summary: `${topics.length} topic(s) · ids: ${ids.join(", ")}`,
    rawText: raw,
    revertSpec: { kind: "writing", topicIds: ids },
  });
  return { topics, mergedLen: merged.length };
}

export function AdminWritingTopicsUpload() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [lastImportLabel, setLastImportLabel] = useState<string | null>(null);
  const [, bump] = useState(0);

  const refresh = useCallback(() => bump((n) => n + 1), []);

  useEffect(() => {
    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("ep-writing-topics", onStorage);
    window.addEventListener("focus", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("ep-writing-topics", onStorage);
      window.removeEventListener("focus", onStorage);
    };
  }, [refresh]);

  const total = loadWritingTopics().length;
  const byRound = countWritingTopicsByRound();

  const runImport = (raw: string, label: string) => {
    setMessage(null);
    setError(null);
    try {
      const { topics, mergedLen } = importTopicsFromRaw(raw, label);
      setLastImportLabel(label);
      setMessage(`Imported ${topics.length} topic(s). Total in bank: ${mergedLen}.`);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      runImport(String(reader.result ?? ""), file.name);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const onPasteImport = () => {
    runImport(pasteText.trim(), "paste.json");
  };

  const copyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(WRITING_TOPICS_JSON_TEMPLATE);
      setMessage("Template copied to clipboard.");
      setError(null);
    } catch {
      setError("Could not copy — select the template manually.");
    }
  };

  const clearAllUploads = () => {
    const ok = window.confirm(
      "Clear saved writing topics in this browser? With no bundled topics in the app, the bank will be empty until you import JSON again.",
    );
    if (!ok) return;
    resetWritingTopicsToDefaults();
    setMessage("Writing topic bank cleared (bundled list only, if any).");
    setError(null);
    setPasteText("");
    setLastImportLabel(null);
    refresh();
  };

  return (
    <BrutalPanel title="Writing topics (essay) — JSON bulk upload">
      <p className="mb-2 text-sm text-neutral-600">
        Array of objects: <code className="ep-stat text-xs">id</code>,{" "}
        <code className="ep-stat text-xs">round</code> (1–5),{" "}
        <code className="ep-stat text-xs">titleEn</code> /{" "}
        <code className="ep-stat text-xs">titleTh</code>,{" "}
        <code className="ep-stat text-xs">promptEn</code> /{" "}
        <code className="ep-stat text-xs">promptTh</code>. Optional follow-up questions after the
        main essay: use <code className="ep-stat text-xs">followUps</code> or{" "}
        <code className="ep-stat text-xs">followUpQuestions</code> (same shape)—up to 3 items, each
        with <code className="ep-stat text-xs">promptEn</code> (required) and{" "}
        <code className="ep-stat text-xs">promptTh</code>.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyTemplate}
          className="border-2 border-black bg-ep-yellow px-3 py-2 text-sm font-bold shadow-[3px_3px_0_0_#000]"
        >
          Copy JSON template
        </button>
      </div>

      <pre className="mb-3 max-h-72 overflow-auto rounded-sm border-2 border-black bg-neutral-50 p-3 text-xs leading-relaxed">
        {WRITING_TOPICS_JSON_TEMPLATE}
      </pre>

      <p className="ep-stat mb-1 text-xs font-bold uppercase text-neutral-600">Paste JSON</p>
      <textarea
        value={pasteText}
        onChange={(e) => setPasteText(e.target.value)}
        rows={8}
        placeholder='[ { "id": "…", "round": 1, "promptEn": "…", "followUps": [ { "promptEn": "…" } ] } ]'
        className="mb-2 w-full border-2 border-black bg-white p-3 font-mono text-xs outline-none focus:ring-2 focus:ring-ep-blue"
      />
      <button
        type="button"
        onClick={onPasteImport}
        className="border-2 border-black bg-ep-blue px-4 py-2 text-sm font-black text-white shadow-[4px_4px_0_0_#000]"
      >
        Import from paste
      </button>

      <p className="mt-4 ep-stat text-xs font-bold uppercase text-neutral-600">Or upload a file</p>
      <input
        type="file"
        accept="application/json,.json"
        onChange={onFile}
        className="mt-1 w-full border-2 border-dashed border-black bg-neutral-50 px-3 py-4 text-sm"
      />

      <div className="mt-4 rounded-sm border-2 border-black bg-neutral-50 p-3">
        <p className="text-xs font-bold uppercase text-neutral-600">Counts in this browser</p>
        <p className="mt-1 text-sm">
          Total: <strong>{total}</strong>
          {lastImportLabel ? ` · Last import: ${lastImportLabel}` : null}
        </p>
        <ul className="mt-2 grid grid-cols-5 gap-2 text-center text-sm">
          {WRITING_ROUND_NUMBERS.map((r) => (
            <li key={r} className="rounded-sm border border-black bg-white px-2 py-1">
              <span className="ep-stat block text-[10px] font-bold text-neutral-500">R{r}</span>
              <span className="font-black">{byRound[r]}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={clearAllUploads}
          className="border-2 border-red-700 bg-red-50 px-4 py-2 text-sm font-bold text-red-900 shadow-[3px_3px_0_0_#000]"
        >
          Clear saved topics (reset local bank)
        </button>
        <p className="mt-2 text-xs text-neutral-500">
          Removes the writing-topics entry from this browser. With no bundled topics in the app,
          rounds stay empty until you import JSON.
        </p>
      </div>

      {message ? <p className="mt-3 text-sm font-bold text-green-800">{message}</p> : null}
      {error ? <p className="mt-3 text-sm font-bold text-red-700">{error}</p> : null}
    </BrutalPanel>
  );
}
