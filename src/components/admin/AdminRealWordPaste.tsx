"use client";

import { useEffect, useState } from "react";
import { appendAdminUploadLog } from "@/lib/admin-upload-log";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import {
  expandGroupedRealWordTopicsToMergeRows,
  isFlatRowsWithSetIdPerWord,
  isRealWordGroupedTopicFormat,
} from "@/lib/realword-admin";
import { REALWORD_ROUND_NUMBERS, REALWORD_SET_COUNT } from "@/lib/realword-constants";
import {
  countRealWordSetsInBank,
  loadRealWordAdminOccupancy,
  loadRealWordBank,
  loadRealWordVisibleBank,
  mergeRealWordBankFromAdmin,
} from "@/lib/realword-storage";
import type { RealWordDifficulty, RealWordRoundNum } from "@/types/realword";

type RealWordAdminInputRow = {
  set_id?: unknown;
  difficulty?: unknown;
  topic?: unknown;
  word?: unknown;
  is_real?: unknown;
  explanationThai?: unknown;
  synonyms?: unknown;
};

const DIFFICULTIES: RealWordDifficulty[] = ["easy", "medium", "hard"];
const REALWORD_BULK_TEMPLATE = `[
  {
    "topic": "personality",
    "word": "outgoing",
    "is_real": true,
    "explanationThai": "ชอบเข้าสังคม",
    "synonyms": "sociable, extroverted"
  },
  {
    "topic": "personality",
    "word": "resiliant",
    "is_real": false,
    "explanationThai": "",
    "synonyms": ""
  },
  {
    "topic": "personality",
    "word": "empathetic",
    "is_real": true,
    "explanationThai": "เห็นอกเห็นใจ",
    "synonyms": "compassionate, understanding"
  }
]`;

function extractTopic(setId: string): string {
  return setId.match(/_TOPIC_([^_]+)$/i)?.[1]?.replace(/-/g, " ") ?? "-";
}

function slugTopic(raw: unknown, fallback: string): string {
  const v = typeof raw === "string" ? raw.trim() : "";
  const base = v || fallback;
  return base.toLowerCase().replace(/\s+/g, "-");
}

export function AdminRealWordPaste() {
  const [text, setText] = useState("");
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [selectedSet, setSelectedSet] = useState<number>(1);
  const [selectedDifficulty, setSelectedDifficulty] = useState<RealWordDifficulty>("easy");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [totalBoards, setTotalBoards] = useState(0);
  const [previewWords, setPreviewWords] = useState<
    { word: string; is_real: boolean; explanationThai: string; synonyms: string }[]
  >([]);
  const [previewTopic, setPreviewTopic] = useState<string>("-");
  const [groupCounts, setGroupCounts] = useState<
    { round: number; easy: number; medium: number; hard: number }[]
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTotalBoards(countRealWordSetsInBank());
    const bank = loadRealWordBank();
    const visible = loadRealWordVisibleBank();
    const r = selectedRound as RealWordRoundNum;
    const row = bank[r][selectedDifficulty].find((x) => x.setNumber === selectedSet);
    setPreviewWords(row?.words ?? []);
    setPreviewTopic(row ? extractTopic(row.setId) : "-");
    setGroupCounts(
      REALWORD_ROUND_NUMBERS.map((round) => ({
        round,
        easy: visible[round].easy.length,
        medium: visible[round].medium.length,
        hard: visible[round].hard.length,
      })),
    );
  }, [message, selectedDifficulty, selectedSet, selectedRound]);

  const applySelectionDefaults = (
    rows: RealWordAdminInputRow[],
  ): {
    normalizedRows: {
      set_id: string;
      difficulty: RealWordDifficulty;
      word: string;
      is_real: boolean;
      explanationThai: string;
      synonyms: string;
    }[];
    targetSet: number;
  } => {
    const r = selectedRound as RealWordRoundNum;
    const occupancy = loadRealWordAdminOccupancy();
    const occupied = new Set(occupancy[r][selectedDifficulty]);
    let targetSet: number | null = null;
    for (let n = selectedSet; n <= REALWORD_SET_COUNT; n++) {
      if (!occupied.has(n)) {
        targetSet = n;
        break;
      }
    }
    if (targetSet === null) {
      throw new Error(
        `No empty set slots left from set ${selectedSet} for round ${selectedRound} / ${selectedDifficulty}.`,
      );
    }
    const firstTopic = rows.find((r) => typeof r.topic === "string" && r.topic.trim())?.topic;
    if (typeof firstTopic !== "string" || !firstTopic.trim()) {
      throw new Error("Upload JSON must include a topic field (e.g. personality, science).");
    }
    const topicSlug = firstTopic.trim().toLowerCase().replace(/\s+/g, "-");
    const setId = `RW_R${selectedRound}_${selectedDifficulty.toUpperCase()}_S${String(
      targetSet,
    ).padStart(2, "0")}_TOPIC_${topicSlug}`;
    return {
      targetSet,
      normalizedRows: rows.map((row) => ({
        set_id: setId,
        difficulty: selectedDifficulty,
        word: typeof row.word === "string" ? row.word : "",
        is_real: row.is_real === true,
        explanationThai: typeof row.explanationThai === "string" ? row.explanationThai : "",
        synonyms: typeof row.synonyms === "string" ? row.synonyms : "",
      })),
    };
  };

  const apply = () => {
    setMessage(null);
    setError(null);
    try {
      const raw = text.trim();
      if (!raw) {
        throw new Error("Please paste JSON or upload a JSON file first.");
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("JSON must be a non-empty array");
      }

      if (isRealWordGroupedTopicFormat(parsed)) {
        const rr = selectedRound as RealWordRoundNum;
        const occupancy = loadRealWordAdminOccupancy();
        const occupied = new Set(occupancy[rr][selectedDifficulty]);
        const { rows: normalizedRows, assignedSetNumbers } = expandGroupedRealWordTopicsToMergeRows(
          parsed,
          selectedRound,
          selectedDifficulty,
          selectedSet,
          occupied,
        );
        const { count: boardCount } = mergeRealWordBankFromAdmin(
          JSON.stringify(normalizedRows),
          rr,
        );
        const firstId = normalizedRows[0]?.set_id ?? "";
        const logResult = appendAdminUploadLog({
          examKind: "realword",
          fileName: selectedFileName,
          summary: `R${selectedRound} · ${selectedDifficulty} · ${boardCount} board(s) · sets ${assignedSetNumbers.join(", ")}`,
          rawText: raw,
          revertSpec: {
            kind: "realword",
            round: rr,
            difficulty: selectedDifficulty,
            setNumbers: assignedSetNumbers,
          },
        });
        setMessage(
          `Imported ${boardCount} topic board(s) into sets ${assignedSetNumbers.join(", ")} (${selectedDifficulty}). First: ${firstId}.${
            logResult.ok ? "" : ` (${logResult.error})`
          }`,
        );
      } else if (isFlatRowsWithSetIdPerWord(parsed)) {
        const rr = selectedRound as RealWordRoundNum;
        const rows = parsed as RealWordAdminInputRow[];
        const occupancy = loadRealWordAdminOccupancy();
        const occupied = new Set(occupancy[rr][selectedDifficulty]);
        const ids: string[] = [];
        const byOldId = new Map<string, RealWordAdminInputRow[]>();
        for (const row of rows) {
          const oldId = typeof row.set_id === "string" ? row.set_id.trim() : "";
          if (!oldId) continue;
          if (!byOldId.has(oldId)) ids.push(oldId);
          byOldId.set(oldId, [...(byOldId.get(oldId) ?? []), row]);
        }

        const idToSet = new Map<string, number>();
        let cursor = selectedSet;
        for (const oldId of ids) {
          let found: number | null = null;
          for (let n = cursor; n <= REALWORD_SET_COUNT; n++) {
            if (!occupied.has(n)) {
              found = n;
              break;
            }
          }
          if (found == null) {
            throw new Error(
              `No empty set slots left from set ${selectedSet} for round ${selectedRound} / ${selectedDifficulty}.`,
            );
          }
          occupied.add(found);
          idToSet.set(oldId, found);
          cursor = found + 1;
        }

        const normalizedRows = rows.map((row) => {
          const oldId = typeof row.set_id === "string" ? row.set_id.trim() : "";
          const mappedSet = idToSet.get(oldId);
          if (!mappedSet) {
            throw new Error('Each row in flat format must include non-empty "set_id".');
          }
          const groupRows = byOldId.get(oldId) ?? [];
          const firstTopic = groupRows.find((r) => typeof r.topic === "string" && r.topic.trim())?.topic;
          const topicSlug = slugTopic(firstTopic, oldId);
          const setId = `RW_R${selectedRound}_${selectedDifficulty.toUpperCase()}_S${String(mappedSet).padStart(2, "0")}_TOPIC_${topicSlug}`;
          return {
            set_id: setId,
            difficulty: selectedDifficulty,
            word: typeof row.word === "string" ? row.word : "",
            is_real: row.is_real === true,
            explanationThai: typeof row.explanationThai === "string" ? row.explanationThai : "",
            synonyms: typeof row.synonyms === "string" ? row.synonyms : "",
          };
        });

        const { count, sets } = mergeRealWordBankFromAdmin(JSON.stringify(normalizedRows), rr);
        const setNumbers = [...new Set(sets.map((s) => s.setNumber))].sort((a, b) => a - b);
        const logResult = appendAdminUploadLog({
          examKind: "realword",
          fileName: selectedFileName,
          summary: `R${selectedRound} · ${selectedDifficulty} · ${count} board(s) · sets ${setNumbers.join(", ")}`,
          rawText: raw,
          revertSpec: {
            kind: "realword",
            round: rr,
            difficulty: selectedDifficulty,
            setNumbers,
          },
        });
        setMessage(
          `Imported ${count} board(s) (${selectedDifficulty}) into set slot(s) ${setNumbers.join(", ")}.${
            logResult.ok ? "" : ` (${logResult.error})`
          }`,
        );
      } else {
        const { normalizedRows, targetSet } = applySelectionDefaults(
          parsed as RealWordAdminInputRow[],
        );
        const rr = selectedRound as RealWordRoundNum;
        const { count } = mergeRealWordBankFromAdmin(JSON.stringify(normalizedRows), rr);
        const assignedSetId = normalizedRows[0]?.set_id ?? "";
        const logResult = appendAdminUploadLog({
          examKind: "realword",
          fileName: selectedFileName,
          summary: `R${selectedRound} · ${selectedDifficulty} · set ${targetSet} · ${assignedSetId}`,
          rawText: raw,
          revertSpec: {
            kind: "realword",
            round: rr,
            difficulty: selectedDifficulty,
            setNumbers: [targetSet],
          },
        });
        setMessage(
          `Imported ${count} board(s) into ${selectedDifficulty} (${assignedSetId}).${
            logResult.ok ? "" : ` (${logResult.error})`
          }`,
        );
      }
      setText("");
      setSelectedFileName(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON");
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
    setText(REALWORD_BULK_TEMPLATE);
    setSelectedFileName(null);
    setMessage(null);
    setError(null);
  };

  return (
    <BrutalPanel title="Real English word — JSON upload">
      <p className="mb-2 text-sm text-neutral-600">
        Choose <strong>round</strong>, <strong>set</strong> (starting slot), and <strong>difficulty</strong>, then paste JSON.
        Use <strong>flat rows with</strong> <code className="ep-stat text-xs">set_id</code> on every line (different ids → multiple
        boards; <code className="ep-stat text-xs">difficulty</code> can be omitted — uses the level you pick below),{" "}
        <strong>topic-only flat rows</strong> (one object per word with <code className="ep-stat text-xs">topic</code> +{" "}
        <code className="ep-stat text-xs">word</code>), or a <strong>grouped array</strong>:{" "}
        <code className="ep-stat text-xs">[{`{ "topic": "…", "words": [ … ] }`}, …]</code> — each topic becomes its own board in
        the next free set numbers.
      </p>
      <p className="ep-stat mb-3 text-xs text-neutral-500">
        Boards in browser: {totalBoards} · Selected slot: Round {selectedRound} / {selectedDifficulty} / set {selectedSet}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-bold uppercase tracking-wide text-neutral-700">
          Round
          <select
            value={selectedRound}
            onChange={(e) => setSelectedRound(Number(e.target.value))}
            className="mt-1 w-full border-2 border-black bg-white px-2 py-2 text-sm font-bold"
          >
            {REALWORD_ROUND_NUMBERS.map((n) => (
              <option key={n} value={n}>
                Round {n}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold uppercase tracking-wide text-neutral-700">
          Set
          <select
            value={selectedSet}
            onChange={(e) => setSelectedSet(Number(e.target.value))}
            className="mt-1 w-full border-2 border-black bg-white px-2 py-2 text-sm font-bold"
          >
            {Array.from({ length: REALWORD_SET_COUNT }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Set {n}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold uppercase tracking-wide text-neutral-700">
          Difficulty
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value as RealWordDifficulty)}
            className="mt-1 w-full border-2 border-black bg-white px-2 py-2 text-sm font-bold"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
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
        rows={10}
        placeholder={REALWORD_BULK_TEMPLATE}
        className="w-full border-2 border-black bg-neutral-50 p-3 ep-stat text-xs"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={apply}
        className="mt-3 w-full border-2 border-black bg-ep-blue py-3 text-sm font-black text-white shadow-[4px_4px_0_0_#000]"
      >
        Import real-word set
      </button>
      <div className="mt-4 rounded-[4px] border-2 border-black bg-neutral-50 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-neutral-700">
          Set preview (admin)
        </p>
        {previewWords.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600">
            No words yet for {selectedDifficulty} set {selectedSet}.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            <li className="rounded-[4px] border border-black bg-white px-3 py-2 text-xs font-bold uppercase">
              Topic: {previewTopic}
            </li>
            {previewWords.slice(0, 12).map((w) => (
              <li
                key={`${w.word}-${w.is_real ? "real" : "fake"}`}
                className="rounded-[4px] border border-black bg-white px-3 py-2 text-sm"
              >
                <p className="font-bold">
                  {w.word} {w.is_real ? "✅ Real" : "❌ Fake"}
                </p>
                <p className="text-xs text-neutral-600">
                  {w.explanationThai || "—"} · {w.synonyms || "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-4 rounded-[4px] border-2 border-black bg-neutral-50 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-neutral-700">
          Upload counts by group
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
                  <td className="border border-black bg-white px-2 py-1 font-bold">
                    {row.round}
                  </td>
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
