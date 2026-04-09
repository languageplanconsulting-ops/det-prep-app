"use client";

import { useEffect, useState } from "react";
import { appendAdminUploadLog } from "@/lib/admin-upload-log";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import {
  DIALOGUE_SUMMARY_ROUND_NUMBERS,
  DIALOGUE_SUMMARY_SET_COUNT,
} from "@/lib/dialogue-summary-constants";
import { parseDialogueSummaryBankJson } from "@/lib/dialogue-summary-admin";
import {
  loadDialogueSummaryBank,
  mergeDialogueSummaryBankFromAdmin,
} from "@/lib/dialogue-summary-storage";

const BULK_TEMPLATE = `[
  {
    "round": 1,
    "difficulty": "easy",
    "setNumber": 1,
    "titleEn": "Office deadline discussion",
    "titleTh": "การคุยเรื่องเดดไลน์ในออฟฟิศ",
    "scenarioSentences": [
      "Two coworkers need to reply to a client email today.",
      "The project timeline slipped because of a supplier delay.",
      "They disagree on whether to promise a new date or ask for more time.",
      "Their manager wants a short summary before the 5 p.m. call.",
      "They step into the break room to align on one message."
    ],
    "dialogue": [
      { "speaker": "Mina", "text": "I think we should avoid a hard date until procurement confirms." },
      { "speaker": "Leo", "text": "If we stay vague, the client may think we're hiding something." },
      { "speaker": "Mina", "text": "Fair — we can name a window, like early next week, not a single day." },
      { "speaker": "Leo", "text": "I'll add one sentence about the supplier delay so it feels transparent." },
      { "speaker": "Mina", "text": "Good. I'll draft the summary in three bullets max." },
      { "speaker": "Leo", "text": "Bullet one: current status. Two: cause. Three: next step with timeframe." },
      { "speaker": "Mina", "text": "I'll send the draft to you in ten minutes." },
      { "speaker": "Leo", "text": "I'll read it aloud once before we join the call." }
    ]
  }
]`;

export function AdminDialogueSummaryPaste() {
  const [text, setText] = useState("");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [totalSets, setTotalSets] = useState(0);
  const [groupCounts, setGroupCounts] = useState<
    { round: number; easy: number; medium: number; hard: number }[]
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      const bank = loadDialogueSummaryBank();
      let n = 0;
      for (const r of DIALOGUE_SUMMARY_ROUND_NUMBERS) {
        n += bank[r].easy.length + bank[r].medium.length + bank[r].hard.length;
      }
      setTotalSets(n);
      setGroupCounts(
        DIALOGUE_SUMMARY_ROUND_NUMBERS.map((round) => ({
          round,
          easy: bank[round].easy.length,
          medium: bank[round].medium.length,
          hard: bank[round].hard.length,
        })),
      );
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-dialogue-summary-storage", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-dialogue-summary-storage", refresh);
    };
  }, [message]);

  const apply = () => {
    setMessage(null);
    setError(null);
    try {
      const raw = text.trim();
      if (!raw) throw new Error("Paste JSON or upload a file first.");
      const preview = parseDialogueSummaryBankJson(raw);
      const { count } = mergeDialogueSummaryBankFromAdmin(raw);
      const slots = preview.map((e) => ({
        round: e.round,
        difficulty: e.difficulty,
        setNumber: e.setNumber,
      }));
      const logResult = appendAdminUploadLog({
        examKind: "dialogueSummary",
        fileName: selectedFileName,
        summary: `${count} exam(s) → ${slots.map((s) => `R${s.round}/${s.difficulty}/S${s.setNumber}`).join(", ")}`,
        rawText: raw,
        revertSpec: { kind: "dialogueSummary", slots },
      });
      setMessage(
        `Imported ${count} exam(s).${logResult.ok ? "" : ` (${logResult.error})`}`,
      );
      setText("");
      setSelectedFileName(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid JSON";
      if (/exceeded the quota|QuotaExceededError/i.test(msg)) {
        setError(
          "Browser storage is full, so Dialogue Summary cannot be saved. Free space first (recommended: Admin -> Dictation -> Manage audio -> Clear saved audio), then try upload again.",
        );
        return;
      }
      setError(msg);
    }
  };

  const onFileChange = async (file: File | null) => {
    setMessage(null);
    setError(null);
    if (!file) {
      setSelectedFileName(null);
      return;
    }
    try {
      const content = await file.text();
      setText(content);
      setSelectedFileName(file.name);
    } catch {
      setError("Failed to read file.");
    }
  };

  const insertTemplate = () => {
    setText(BULK_TEMPLATE);
    setSelectedFileName(null);
    setMessage(null);
    setError(null);
  };

  return (
    <BrutalPanel title="Dialogue → summary — bulk JSON">
      <p className="mb-2 text-sm text-neutral-600">
        Paste a <strong>JSON array</strong>. Each object needs <code className="ep-stat text-xs">round</code> (1–5),{" "}
        <code className="ep-stat text-xs">difficulty</code> (easy|medium|hard), <code className="ep-stat text-xs">setNumber</code>{" "}
        (1–{DIALOGUE_SUMMARY_SET_COUNT}), <code className="ep-stat text-xs">titleEn</code>,{" "}
        <code className="ep-stat text-xs">titleTh</code>, exactly{" "}
        <strong>five</strong> strings in <code className="ep-stat text-xs">scenarioSentences</code>, and{" "}
        <code className="ep-stat text-xs">dialogue</code> as an array of{" "}
        <code className="ep-stat text-xs">{`{ "speaker", "text" }`}</code> (at least 8 turns).
      </p>
      <p className="ep-stat mb-3 text-xs text-neutral-500">
        Sets in bank: {totalSets}
      </p>
      <label className="block text-xs font-bold uppercase tracking-wide text-neutral-700">
        Upload JSON file
        <input
          type="file"
          accept="application/json,.json"
          onChange={(e) => void onFileChange(e.target.files?.[0] ?? null)}
          className="mt-1 w-full border-2 border-dashed border-black bg-white px-3 py-3 text-sm font-semibold"
        />
      </label>
      {selectedFileName ? (
        <p className="mt-2 text-xs font-bold text-ep-blue">Uploaded file: {selectedFileName}</p>
      ) : null}
      <div className="mt-2">
        <button
          type="button"
          onClick={insertTemplate}
          className="border-2 border-black bg-white px-3 py-1 text-xs font-black uppercase shadow-[2px_2px_0_0_#000] hover:bg-ep-yellow/30"
        >
          Insert copyable template
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        placeholder={BULK_TEMPLATE}
        className="mt-3 w-full border-2 border-black bg-neutral-50 p-3 ep-stat text-xs"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={apply}
        className="mt-3 w-full border-2 border-black bg-ep-blue py-3 text-sm font-black text-white shadow-[4px_4px_0_0_#000]"
      >
        Merge into bank
      </button>
      <div className="mt-4 rounded-[4px] border-2 border-black bg-neutral-50 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-neutral-700">
          Upload counts by round
        </p>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-[360px] border-collapse text-xs">
            <thead>
              <tr>
                <th className="border border-black bg-white px-2 py-1 text-left">Round</th>
                <th className="border border-black bg-white px-2 py-1">Easy</th>
                <th className="border border-black bg-white px-2 py-1">Medium</th>
                <th className="border border-black bg-white px-2 py-1">Hard</th>
              </tr>
            </thead>
            <tbody>
              {groupCounts.map((row) => (
                <tr key={row.round}>
                  <td className="border border-black bg-white px-2 py-1 font-bold">{row.round}</td>
                  <td className="border border-black bg-white px-2 py-1 text-center">{row.easy}</td>
                  <td className="border border-black bg-white px-2 py-1 text-center">{row.medium}</td>
                  <td className="border border-black bg-white px-2 py-1 text-center">{row.hard}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {message ? <p className="mt-2 text-sm font-bold text-green-800">{message}</p> : null}
      {error ? <p className="mt-2 text-sm font-bold text-red-700">{error}</p> : null}
    </BrutalPanel>
  );
}
