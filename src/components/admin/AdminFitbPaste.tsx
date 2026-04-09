"use client";

import { useEffect, useState } from "react";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import {
  FITB_DIFFICULTY_LABEL,
  FITB_MAX_BLANKS,
  FITB_ROUND_NUMBERS,
  FITB_SET_COUNT,
} from "@/lib/fitb-constants";
import { appendAdminUploadLog } from "@/lib/admin-upload-log";
import {
  clearFitbBankFromAdmin,
  countFitbSetsInBank,
  loadFitbBank,
  loadFitbAdminOccupancy,
  mergeFitbBankFromAdmin,
  registerFitbAdminSlots,
} from "@/lib/fitb-storage";
import type { FitbDifficulty, FitbRoundNum } from "@/types/fitb";

type FitbAdminInputRow = {
  passage?: unknown;
  cefr_level?: unknown;
  difficulty?: unknown;
  set_id?: unknown;
  missingWords?: unknown;
};

const DIFFICULTY_OPTIONS: FitbDifficulty[] = ["easy", "medium", "hard"];

/** Two-row bulk example; `difficulty` and `set_id` are overwritten on import from the round/level UI. */
const FITB_BULK_TEMPLATE = JSON.stringify(
  [
    {
      passage:
        "The sudden [BLANK 1] surprised the crowd, but the speaker remained [BLANK 2] throughout the talk.",
      cefr_level: "B2",
      difficulty: "medium",
      set_id: "template_bulk_01",
      missingWords: [
        {
          correctWord: "announcement",
          clue: "A formal public statement.",
          explanationThai: "คำประกาศ / การประกาศอย่างเป็นทางการ",
          prefix_length: 2,
          synonyms: ["declaration", "statement"],
        },
        {
          correctWord: "calm",
          clue: "Not excited or angry.",
          explanationThai: "ใจเย็น ไม่ตื่นตระหนก",
          prefix_length: 2,
          synonyms: ["composed", "steady"],
        },
      ],
    },
    {
      passage:
        "Many students find it easier to [BLANK 1] new words when they hear them in context.",
      cefr_level: "B1",
      difficulty: "easy",
      set_id: "template_bulk_02",
      missingWords: [
        {
          correctWord: "memorize",
          clue: "To learn something so you can remember it later.",
          explanationThai: "ท่องจำ จดจำคำศัพท์",
          prefix_length: 3,
          synonyms: ["remember", "learn"],
        },
      ],
    },
  ],
  null,
  2,
);

export function AdminFitbPaste() {
  const [text, setText] = useState("");
  const [selectedSet, setSelectedSet] = useState<number>(1);
  const [selectedRound, setSelectedRound] = useState<FitbRoundNum>(1);
  const [selectedDifficulty, setSelectedDifficulty] = useState<FitbDifficulty>("easy");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [totalSets, setTotalSets] = useState(0);
  const [selectedSlotExists, setSelectedSlotExists] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<{
    setId: string;
    cefrLevel: string;
    blankCount: number;
    passage: string;
  } | null>(null);
  const [freeSlots, setFreeSlots] = useState(0);
  const [occupancyGrid, setOccupancyGrid] = useState<
    { round: FitbRoundNum; easy: { up: number; free: number }; medium: { up: number; free: number }; hard: { up: number; free: number } }[]
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clearNotice, setClearNotice] = useState<string | null>(null);
  const [templateCopied, setTemplateCopied] = useState(false);

  useEffect(() => {
    const bank = loadFitbBank();
    setTotalSets(countFitbSetsInBank());
    setSelectedSlotExists(
      bank[selectedRound][selectedDifficulty].some((row) => row.setNumber === selectedSet),
    );
    const row =
      bank[selectedRound][selectedDifficulty].find((r) => r.setNumber === selectedSet) ?? null;
    setSelectedPreview(
      row
        ? {
            setId: row.setId,
            cefrLevel: row.cefrLevel,
            blankCount: row.missingWords.length,
            passage: row.passage,
          }
        : null,
    );
    const occupancy = loadFitbAdminOccupancy();
    const occSize = (r: FitbRoundNum, d: FitbDifficulty) => new Set(occupancy[r][d]).size;
    setFreeSlots(Math.max(0, FITB_SET_COUNT - occSize(selectedRound, selectedDifficulty)));
    setOccupancyGrid(
      FITB_ROUND_NUMBERS.map((round) => ({
        round,
        easy: {
          up: occSize(round, "easy"),
          free: Math.max(0, FITB_SET_COUNT - occSize(round, "easy")),
        },
        medium: {
          up: occSize(round, "medium"),
          free: Math.max(0, FITB_SET_COUNT - occSize(round, "medium")),
        },
        hard: {
          up: occSize(round, "hard"),
          free: Math.max(0, FITB_SET_COUNT - occSize(round, "hard")),
        },
      })),
    );
  }, [message, selectedDifficulty, selectedSet, selectedRound]);

  const applySelectionDefaults = (
    rows: FitbAdminInputRow[],
  ): { normalizedRows: FitbAdminInputRow[]; assignedSets: number[] } => {
    const occupancy = loadFitbAdminOccupancy();
    const occupied = new Set(occupancy[selectedRound][selectedDifficulty]);
    const available: number[] = [];
    for (let n = 1; n <= FITB_SET_COUNT; n++) {
      if (!occupied.has(n)) available.push(n);
    }
    if (available.length < rows.length) {
      throw new Error(
        `Not enough empty sets in Round ${selectedRound} · ${FITB_DIFFICULTY_LABEL[selectedDifficulty]}. Need ${rows.length}, but only ${available.length} empty slot(s) left.`,
      );
    }

    const assignedSets = available.slice(0, rows.length);
    const normalizedRows = rows.map((row, idx) => {
      const setNumber = assignedSets[idx]!;
      const slot = String(setNumber).padStart(2, "0");
      return {
        ...row,
        difficulty: selectedDifficulty,
        set_id: `set_r${selectedRound}_${selectedDifficulty}_${slot}`,
      };
    });
    return { normalizedRows, assignedSets };
  };

  const apply = () => {
    setMessage(null);
    setError(null);
    setClearNotice(null);
    try {
      const raw = text.trim();
      if (!raw) {
        throw new Error("Please paste JSON or upload a JSON file first.");
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("JSON must be a non-empty array");
      }
      const { normalizedRows, assignedSets } = applySelectionDefaults(
        parsed as FitbAdminInputRow[],
      );
      const { count } = mergeFitbBankFromAdmin(JSON.stringify(normalizedRows), selectedRound);
      registerFitbAdminSlots(selectedRound, selectedDifficulty, assignedSets);
      const logResult = appendAdminUploadLog({
        examKind: "fitb",
        fileName: selectedFileName,
        summary: `R${selectedRound} · ${FITB_DIFFICULTY_LABEL[selectedDifficulty]} · slots ${assignedSets.join(", ")}`,
        rawText: raw,
        revertSpec: {
          kind: "fitb",
          round: selectedRound,
          difficulty: selectedDifficulty,
          setNumbers: assignedSets,
        },
      });
      setMessage(
        `Merged ${count} set(s) into Round ${selectedRound} · ${FITB_DIFFICULTY_LABEL[selectedDifficulty]}: ${assignedSets.join(", ")}. Passage with [BLANK 1]…[BLANK n]; cefr_level must be A1–C2; each missingWord needs correctWord, clue, explanationThai, synonyms, prefix_length 1–5. Max ${FITB_MAX_BLANKS} blanks per set.${
          logResult.ok ? "" : ` (${logResult.error})`
        }`,
      );
      setText("");
      setSelectedFileName(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  const onFileChange = async (file: File | null) => {
    setMessage(null);
    setError(null);
    setClearNotice(null);
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

  const copyBulkTemplate = async () => {
    setError(null);
    setClearNotice(null);
    setTemplateCopied(false);
    try {
      await navigator.clipboard.writeText(FITB_BULK_TEMPLATE);
      setMessage("Bulk template copied to clipboard — paste into the box below or a .json file.");
      setTemplateCopied(true);
      window.setTimeout(() => setTemplateCopied(false), 2500);
    } catch {
      setMessage(null);
      setError(
        "Clipboard blocked — click the template box, select all (⌘A / Ctrl+A), then copy (⌘C / Ctrl+C).",
      );
    }
  };

  const clearAllFitb = () => {
    setMessage(null);
    setError(null);
    const ok = window.confirm(
      "Clear all FITB sets in all rounds and levels? This removes the FITB bank in this browser.",
    );
    if (!ok) return;
    clearFitbBankFromAdmin();
    setSelectedFileName(null);
    setText("");
    setClearNotice("All FITB sets cleared. You can upload new content.");
  };

  return (
    <BrutalPanel title="Fill in the blank — JSON upload">
      <p className="mb-2 text-sm text-neutral-600">
        Choose <strong>round (1–5)</strong> and <strong>level</strong>, then paste a JSON <strong>array</strong>.
        Import fills the first empty sets for that round and level (incoming set numbers are ignored).
      </p>
      <button
        type="button"
        onClick={clearAllFitb}
        className="mb-3 w-full border-2 border-black bg-red-600 py-2 text-sm font-black uppercase tracking-wide text-white shadow-[4px_4px_0_0_#000] hover:bg-red-700"
      >
        Clear all FITB sets (all rounds)
      </button>
      <p className="mb-2 text-xs font-bold text-neutral-600">
        Total FITB sets in browser: {totalSets}. Selected slot R{selectedRound} ·{" "}
        {FITB_DIFFICULTY_LABEL[selectedDifficulty]} · set {selectedSet}:{" "}
        {selectedSlotExists ? "has content (merge overwrites)" : "empty"}.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-bold uppercase tracking-wide text-neutral-700">
          Round
          <select
            value={selectedRound}
            onChange={(e) => setSelectedRound(Number(e.target.value) as FitbRoundNum)}
            className="mt-1 w-full border-2 border-black bg-white px-2 py-2 text-sm font-bold"
          >
            {FITB_ROUND_NUMBERS.map((r) => (
              <option key={r} value={r}>
                Round {r}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold uppercase tracking-wide text-neutral-700">
          Set #
          <select
            value={selectedSet}
            onChange={(e) => setSelectedSet(Number(e.target.value))}
            className="mt-1 w-full border-2 border-black bg-white px-2 py-2 text-sm font-bold"
          >
            {Array.from({ length: FITB_SET_COUNT }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Set {n}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold uppercase tracking-wide text-neutral-700">
          Level
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value as FitbDifficulty)}
            className="mt-1 w-full border-2 border-black bg-white px-2 py-2 text-sm font-bold"
          >
            {DIFFICULTY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {FITB_DIFFICULTY_LABEL[d]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="ep-stat mt-2 text-xs text-neutral-600">
        Empty slots left for this round + level: <strong>{freeSlots}</strong> / {FITB_SET_COUNT}
      </p>
      <div className="mt-3 rounded-[4px] border-2 border-black bg-neutral-50 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-neutral-700">
          Set preview (admin)
        </p>
        {!selectedPreview ? (
          <p className="mt-2 text-sm text-neutral-600">
            Set {selectedSet} (R{selectedRound} · {FITB_DIFFICULTY_LABEL[selectedDifficulty]}) is empty.
          </p>
        ) : (
          <div className="mt-2 space-y-1 text-sm">
            <p className="font-bold">
              {selectedPreview.setId} · {selectedPreview.cefrLevel} ·{" "}
              {selectedPreview.blankCount} blanks
            </p>
            <p className="line-clamp-3 text-neutral-700">{selectedPreview.passage}</p>
          </div>
        )}
      </div>
      <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-neutral-700">
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
      <p className="mb-2 mt-3 text-sm text-neutral-600">
        <code className="ep-stat text-xs">missingWords</code> order must match{" "}
        <code className="ep-stat text-xs">[BLANK n]</code>. Learners type the rest of each word after a prefix of{" "}
        <code className="ep-stat text-xs">prefix_length</code> letters.
      </p>

      <div className="mt-4 rounded-[4px] border-2 border-dashed border-ep-blue/60 bg-ep-yellow/10 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-ep-blue">Copyable bulk template</p>
        <p className="mt-1 text-xs text-neutral-700">
          JSON <strong>array</strong> with two example sets (multi-blank + single-blank). On import,{" "}
          <code className="ep-stat">difficulty</code> and <code className="ep-stat">set_id</code> are replaced by
          your selected round/level and the next free slot numbers.
        </p>
        <textarea
          readOnly
          value={FITB_BULK_TEMPLATE}
          rows={22}
          className="mt-2 w-full cursor-text border-2 border-black bg-white p-3 ep-stat text-xs"
          spellCheck={false}
          aria-label="Fill in the blank bulk JSON template"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          onClick={() => void copyBulkTemplate()}
          className="mt-2 border-2 border-black bg-ep-yellow px-4 py-2 text-xs font-black uppercase tracking-wide shadow-[2px_2px_0_0_#000] hover:bg-ep-yellow/90"
        >
          {templateCopied ? "Copied!" : "Copy template to clipboard"}
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder='[ { "passage": "The [BLANK 1] …", "cefr_level": "B2", "difficulty": "hard", "set_id": "set_hard_01", "missingWords": [ … ] } ]'
        className="w-full border-2 border-black bg-neutral-50 p-3 ep-stat text-xs"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={apply}
        className="mt-3 w-full border-2 border-black bg-ep-blue py-3 text-sm font-black text-white shadow-[4px_4px_0_0_#000]"
      >
        Import into browser FITB bank
      </button>
      <div className="mt-4 rounded-[4px] border-2 border-black bg-neutral-50 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-neutral-700">
          Upload counts by round &amp; level
        </p>
        <p className="mt-1 text-xs text-neutral-600">
          <strong>Up</strong> = distinct set slots registered via this admin panel for that cell.{" "}
          <strong>Free</strong> = remaining slots (max {FITB_SET_COUNT} per cell).
        </p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-100 text-left uppercase">
                <th className="border border-black px-2 py-1">Round</th>
                <th className="border border-black px-2 py-1">Easy</th>
                <th className="border border-black px-2 py-1">Medium</th>
                <th className="border border-black px-2 py-1">Hard</th>
              </tr>
            </thead>
            <tbody>
              {occupancyGrid.map((row) => (
                <tr key={row.round}>
                  <td className="border border-black bg-white px-2 py-1 font-bold">R{row.round}</td>
                  <td className="border border-black bg-white px-2 py-1 text-center ep-stat">
                    {row.easy.up} up · {row.easy.free} free
                  </td>
                  <td className="border border-black bg-white px-2 py-1 text-center ep-stat">
                    {row.medium.up} up · {row.medium.free} free
                  </td>
                  <td className="border border-black bg-white px-2 py-1 text-center ep-stat">
                    {row.hard.up} up · {row.hard.free} free
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {message ? <p className="mt-2 text-sm font-bold text-green-800">{message}</p> : null}
      {clearNotice ? <p className="mt-2 text-sm font-bold text-amber-800">{clearNotice}</p> : null}
      {error ? <p className="mt-2 text-sm font-bold text-red-700">{error}</p> : null}
    </BrutalPanel>
  );
}
