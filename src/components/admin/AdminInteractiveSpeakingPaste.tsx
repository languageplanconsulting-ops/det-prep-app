"use client";

import { useEffect, useState } from "react";
import { appendAdminUploadLog } from "@/lib/admin-upload-log";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { parseInteractiveSpeakingScenariosJson } from "@/lib/interactive-speaking-admin";
import {
  loadInteractiveSpeakingScenarios,
  mergeInteractiveSpeakingScenariosFromAdmin,
} from "@/lib/interactive-speaking-storage";

const BULK_TEMPLATE = `[
  {
    "id": "is-office-morning",
    "titleEn": "A morning at work or school",
    "titleTh": "เช้าวันหนึ่งที่ทำงานหรือโรงเรียน",
    "starterQuestionEn": "What is usually the first thing you do when you arrive? Tell me in a few sentences.",
    "starterQuestionTh": "โดยปกติสิ่งแรกที่คุณทำเมื่อถึงที่ทำงานหรือโรงเรียนคืออะไร? เล่าให้ฟังสั้นๆ"
  }
]`;

export function AdminInteractiveSpeakingPaste() {
  const [text, setText] = useState("");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setTotal(loadInteractiveSpeakingScenarios().length);
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-interactive-speaking-storage", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-interactive-speaking-storage", refresh);
    };
  }, [message]);

  const apply = () => {
    setMessage(null);
    setError(null);
    try {
      const raw = text.trim();
      if (!raw) throw new Error("Paste JSON or upload a file first.");
      const preview = parseInteractiveSpeakingScenariosJson(raw);
      mergeInteractiveSpeakingScenariosFromAdmin(preview);
      const ids = preview.map((s) => s.id);
      const logResult = appendAdminUploadLog({
        examKind: "interactiveSpeaking",
        fileName: selectedFileName,
        summary: `${preview.length} scenario(s): ${ids.join(", ")}`,
        rawText: raw,
        revertSpec: { kind: "interactiveSpeaking", ids },
      });
      setMessage(
        `Imported ${preview.length} scenario(s).${logResult.ok ? "" : ` (${logResult.error})`}`,
      );
      setText("");
      setSelectedFileName(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    }
  };

  return (
    <BrutalPanel title="Interactive speaking — scenarios (starter question only)">
      <p className="text-sm text-neutral-700">
        Each scenario needs a stable <code className="font-mono text-xs">id</code>, bilingual title, and{" "}
        <strong>starterQuestionEn / starterQuestionTh</strong>. The app asks AI for follow-ups (turns 2–6).
      </p>
      <p className="mt-2 text-xs text-neutral-500">
        Scenarios in bank (this browser): <strong>{total}</strong>
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        className="mt-3 w-full border-2 border-black bg-neutral-50 p-3 font-mono text-xs"
        placeholder="Paste JSON array…"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setText(BULK_TEMPLATE)}
          className="border-2 border-black bg-white px-3 py-1.5 text-xs font-bold"
        >
          Insert template
        </button>
        <label className="cursor-pointer border-2 border-black bg-ep-yellow px-3 py-1.5 text-xs font-bold">
          Upload .json
          <input
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setSelectedFileName(f.name);
              void f.text().then(setText);
            }}
          />
        </label>
        <button
          type="button"
          onClick={apply}
          className="border-2 border-black bg-ep-blue px-3 py-1.5 text-xs font-bold text-white"
        >
          Merge into bank
        </button>
      </div>
      {error ? <p className="mt-2 text-sm font-bold text-red-700">{error}</p> : null}
      {message ? <p className="mt-2 text-sm font-bold text-emerald-800">{message}</p> : null}
    </BrutalPanel>
  );
}
