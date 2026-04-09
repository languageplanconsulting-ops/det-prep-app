"use client";

import { useEffect, useState } from "react";
import { appendAdminUploadLog } from "@/lib/admin-upload-log";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { normalizeReadingSetsIncoming, parseReadingSetsJson } from "@/lib/reading-admin";
import {
  READING_DIFFICULTY_LABEL,
  READING_HUB_SET_COUNT,
  READING_ROUND_NUMBERS,
} from "@/lib/reading-constants";
import {
  countReadingSetsInBank,
  loadReadingBank,
  loadReadingVisibleBank,
  mergeReadingSetsFromAdmin,
  removeReadingSetFromAdmin,
} from "@/lib/reading-storage";
import type { ReadingDifficulty, ReadingRoundNum, ReadingSet } from "@/types/reading";

export function AdminReadingSetsPaste() {
  const [text, setText] = useState("");
  const [selectedSet, setSelectedSet] = useState<number>(1);
  const [selectedRound, setSelectedRound] = useState<ReadingRoundNum>(1);
  const [selectedDifficulty, setSelectedDifficulty] = useState<ReadingDifficulty>("easy");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [sets, setSets] = useState<ReadingSet[]>([]);
  const [countsGrid, setCountsGrid] = useState<
    {
      round: ReadingRoundNum;
      easy: number;
      medium: number;
      hard: number;
      easyExams: number;
      mediumExams: number;
      hardExams: number;
    }[]
  >([]);
  const [selectedSetToRemove, setSelectedSetToRemove] = useState<number | null>(null);

  useEffect(() => {
    const refresh = () => {
      const visibleBank = loadReadingVisibleBank();
      setCount(countReadingSetsInBank());
      setCountsGrid(
        READING_ROUND_NUMBERS.map((r) => {
          const easyExams = visibleBank[r].easy.reduce((n, s) => n + s.exams.length, 0);
          const mediumExams = visibleBank[r].medium.reduce((n, s) => n + s.exams.length, 0);
          const hardExams = visibleBank[r].hard.reduce((n, s) => n + s.exams.length, 0);
          return {
            round: r,
            easy: visibleBank[r].easy.length,
            medium: visibleBank[r].medium.length,
            hard: visibleBank[r].hard.length,
            easyExams,
            mediumExams,
            hardExams,
          };
        }),
      );
      const loaded = visibleBank[selectedRound][selectedDifficulty];
      setSets(loaded);
      if (loaded.length === 0) {
        setSelectedSetToRemove(null);
      } else if (
        selectedSetToRemove === null ||
        !loaded.some((s) => s.setNumber === selectedSetToRemove)
      ) {
        setSelectedSetToRemove(loaded[0].setNumber);
      }
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-reading-storage", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-reading-storage", refresh);
    };
  }, [message, selectedSetToRemove, selectedDifficulty, selectedRound]);

  const apply = () => {
    setMessage(null);
    setError(null);
    try {
      const rawText = text.trim();
      if (!rawText) {
        throw new Error("Please paste JSON first.");
      }
      const rawData = JSON.parse(rawText) as unknown;
      let normalizedInput: unknown = rawData;
      if (Array.isArray(rawData) && rawData.length > 0) {
        const looksLikeExamObject = (row: unknown): boolean => {
          if (!row || typeof row !== "object") return false;
          const obj = row as Record<string, unknown>;
          if ("setNumber" in obj || "exams" in obj) return false;
          return "passage" in obj || "highlightedVocab" in obj || "missingSentence" in obj;
        };
        const allLookLikeExamRows = rawData.every((row) => looksLikeExamObject(row));
        if (allLookLikeExamRows) {
          normalizedInput = [
            {
              setNumber: selectedSet,
              difficulty: selectedDifficulty,
              exams: rawData,
            },
          ];
        }
      }
      const parsed = parseReadingSetsJson(JSON.stringify(normalizedInput));
      const grouped = normalizeReadingSetsIncoming(parsed);
      const occupied = new Set(
        loadReadingVisibleBank()[selectedRound][selectedDifficulty].map((s) => s.setNumber),
      );
      const available: number[] = [];
      for (let n = selectedSet; n <= READING_HUB_SET_COUNT; n++) {
        if (!occupied.has(n)) available.push(n);
      }
      if (available.length < grouped.length) {
        throw new Error(
          `Not enough empty set slots from set ${selectedSet}. Need ${grouped.length}, but only ${available.length} slot(s) free.`,
        );
      }
      const assignedSets = available.slice(0, grouped.length);
      const anchored = grouped.map((set, idx) => ({
        ...set,
        setNumber: assignedSets[idx]!,
        difficulty: selectedDifficulty,
        round: selectedRound,
      }));
      mergeReadingSetsFromAdmin(anchored, selectedRound);
      const examTotal = grouped.reduce((n, s) => n + s.exams.length, 0);
      const logResult = appendAdminUploadLog({
        examKind: "reading",
        fileName: null,
        summary: `R${selectedRound} · ${selectedDifficulty} · ${grouped.length} set(s), ${examTotal} exam(s) → ${assignedSets.join(", ")}`,
        rawText: rawText,
        revertSpec: {
          kind: "reading",
          round: selectedRound,
          difficulty: selectedDifficulty,
          setNumbers: assignedSets,
        },
      });
      setMessage(
        `Imported ${grouped.length} set(s) (${examTotal} exam(s)) into R${selectedRound} ${selectedDifficulty} empty sets: ${assignedSets.join(", ")}. Total sets in browser: ${countReadingSetsInBank()}.${
          logResult.ok ? "" : ` (${logResult.error})`
        }`,
      );
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  const removeSelectedSet = () => {
    setMessage(null);
    setError(null);
    if (selectedSetToRemove === null) {
      setError("Please select a set to remove.");
      return;
    }
    removeReadingSetFromAdmin(selectedSetToRemove, selectedDifficulty, selectedRound);
    const next = loadReadingVisibleBank()[selectedRound][selectedDifficulty];
    setSets(next);
    setCount(countReadingSetsInBank());
    setMessage(`Removed reading set ${selectedSetToRemove} from R${selectedRound} · ${selectedDifficulty}.`);
    setSelectedSetToRemove(next.length > 0 ? next[0].setNumber : null);
  };

  return (
    <BrutalPanel title="Reading sets — JSON (copy & paste)">
      <p className="mb-2 text-sm text-neutral-600">
        Paste a JSON <strong>array</strong>. Each top-level object is a <strong>set</strong> with{" "}
        <code className="ep-stat text-xs">setNumber</code> and an <code className="ep-stat text-xs">exams</code>{" "}
        array (recommended: 10+ exams per set). Choose <strong>round</strong> and <strong>difficulty</strong>, then
        merge into the first empty set slots from your chosen start.
      </p>
      <p className="mb-2 text-sm text-neutral-600">
        <strong>Legacy:</strong> one exam can sit at the top level with <code className="ep-stat text-xs">setNumber</code>{" "}
        (no <code className="ep-stat text-xs">exams</code> key). Multiple rows with the same{" "}
        <code className="ep-stat text-xs">setNumber</code> are merged into one set automatically.
      </p>
      <p className="ep-stat mb-3 text-xs text-neutral-500">Total sets in browser: {count}</p>
      <div className="mb-3 rounded-[4px] border-2 border-black bg-neutral-50 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-neutral-700">
          Sets by round &amp; level
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
              {countsGrid.map((row) => (
                <tr key={row.round}>
                  <td className="border border-black bg-white px-2 py-1 font-bold">R{row.round}</td>
                  <td className="border border-black bg-white px-2 py-1 text-center">
                    {row.easyExams} questions ({row.easy} sets)
                  </td>
                  <td className="border border-black bg-white px-2 py-1 text-center">
                    {row.mediumExams} questions ({row.medium} sets)
                  </td>
                  <td className="border border-black bg-white px-2 py-1 text-center">
                    {row.hardExams} questions ({row.hard} sets)
                  </td>
                </tr>
              ))}
              <tr className="bg-neutral-100">
                <td className="border border-black px-2 py-1 font-black">Total</td>
                <td className="border border-black px-2 py-1 text-center font-black" colSpan={3}>
                  {count} / {READING_HUB_SET_COUNT * 3 * 5}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-700">
          Round
          <select
            value={selectedRound}
            onChange={(e) => setSelectedRound(Number(e.target.value) as ReadingRoundNum)}
            className="mt-1 w-full border-2 border-black bg-white px-2 py-2 text-sm font-bold"
          >
            {READING_ROUND_NUMBERS.map((r) => (
              <option key={r} value={r}>
                Round {r}
              </option>
            ))}
          </select>
        </label>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-700">
          Difficulty
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value as ReadingDifficulty)}
            className="mt-1 w-full border-2 border-black bg-white px-2 py-2 text-sm font-bold"
          >
            {(["easy", "medium", "hard"] as ReadingDifficulty[]).map((d) => (
              <option key={d} value={d}>
                {READING_DIFFICULTY_LABEL[d]}
              </option>
            ))}
          </select>
        </label>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-neutral-700">
          Target set (start)
          <select
            value={selectedSet}
            onChange={(e) => setSelectedSet(Number(e.target.value))}
            className="mt-1 w-full border-2 border-black bg-white px-2 py-2 text-sm font-bold"
          >
            {Array.from({ length: READING_HUB_SET_COUNT }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Set {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        placeholder='[ { "setNumber": 1, "exams": [ { "titleEn": "Exam 1", "passage": { ... }, ... } ] } ]'
        className="w-full border-2 border-black bg-neutral-50 p-3 ep-stat text-xs"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={apply}
        className="mt-3 w-full border-2 border-black bg-ep-blue py-3 text-sm font-black text-white shadow-[4px_4px_0_0_#000]"
      >
        Merge into browser sets
      </button>
      <div className="mt-4 rounded-[4px] border-2 border-black bg-neutral-50 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-neutral-700">
          Remove set from admin
        </p>
        <p className="mt-1 text-xs text-neutral-600">
          Removes the selected set for <strong>R{selectedRound}</strong> ·{" "}
          <strong>{READING_DIFFICULTY_LABEL[selectedDifficulty]}</strong> only.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={selectedSetToRemove ?? ""}
            onChange={(e) => setSelectedSetToRemove(Number(e.target.value))}
            className="border-2 border-black bg-white px-2 py-2 text-sm font-bold"
            disabled={sets.length === 0}
          >
            {sets.length === 0 ? (
              <option value="">No sets</option>
            ) : (
              sets.map((s) => (
                <option key={s.setNumber} value={s.setNumber}>
                  Set {s.setNumber}
                </option>
              ))
            )}
          </select>
          <button
            type="button"
            onClick={removeSelectedSet}
            disabled={selectedSetToRemove === null}
            className="border-2 border-black bg-red-600 px-3 py-2 text-xs font-black uppercase text-white shadow-[3px_3px_0_0_#000] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Remove selected set
          </button>
        </div>
      </div>
      <div className="mt-4 rounded-[4px] border-2 border-black bg-neutral-50 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-neutral-700">
          Upload summary (exams per set — R{selectedRound} · {READING_DIFFICULTY_LABEL[selectedDifficulty]})
        </p>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-[320px] border-collapse text-xs">
            <thead>
              <tr>
                <th className="border border-black bg-white px-2 py-1 text-left">Set</th>
                <th className="border border-black bg-white px-2 py-1 text-center">
                  Exams uploaded
                </th>
              </tr>
            </thead>
            <tbody>
              {sets.length === 0 ? (
                <tr>
                  <td
                    className="border border-black bg-white px-2 py-2 text-center text-neutral-500"
                    colSpan={2}
                  >
                    No reading sets uploaded for this round and level.
                  </td>
                </tr>
              ) : (
                sets
                  .slice()
                  .sort((a, b) => a.setNumber - b.setNumber)
                  .map((set) => (
                    <tr key={set.setNumber}>
                      <td className="border border-black bg-white px-2 py-1 font-bold">
                        Set {set.setNumber}
                      </td>
                      <td className="border border-black bg-white px-2 py-1 text-center">
                        {set.exams.length}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {message ? <p className="mt-2 text-sm font-bold text-green-800">{message}</p> : null}
      {error ? <p className="mt-2 text-sm font-bold text-red-700">{error}</p> : null}
    </BrutalPanel>
  );
}
