"use client";

import { useEffect, useState } from "react";
import { appendAdminUploadLog } from "@/lib/admin-upload-log";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { normalizeVocabSetsIncoming, parseVocabSetsJson } from "@/lib/vocab-admin";
import { VOCAB_MAX_PASSAGES_PER_SET, VOCAB_ROUND_NUMBERS } from "@/lib/vocab-constants";
import {
  countVocabSetsInBank,
  loadVocabBank,
  mergeVocabSetsFromAdmin,
} from "@/lib/vocab-storage";
import type { VocabPassageUnit, VocabRoundNum, VocabSet, VocabSessionLevel } from "@/types/vocab";

const DIFFICULTIES: VocabSessionLevel[] = ["easy", "medium", "hard"];

type LegacyVocabExamRow = {
  collection?: unknown;
  difficultyScore?: unknown;
  passage?: unknown;
  missingWords?: unknown;
  highlightedVocab?: unknown;
  data?: {
    passage?: unknown;
    missingWords?: unknown;
    highlightedVocab?: unknown;
  };
};

export function AdminVocabSetsPaste() {
  const [text, setText] = useState("");
  const [selectedRound, setSelectedRound] = useState<VocabRoundNum>(1);
  const [selectedSet, setSelectedSet] = useState<number>(1);
  const [selectedDifficulty, setSelectedDifficulty] = useState<VocabSessionLevel>("easy");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [previewSet, setPreviewSet] = useState<VocabSet | null>(null);
  const [coverage, setCoverage] = useState<
    { setNumber: number; easy: number; medium: number; hard: number }[]
  >([]);
  const [summary, setSummary] = useState<{
    totalTests: number;
    testsByDifficulty: Record<VocabSessionLevel, number>;
    setsWithTestsByDifficulty: Record<VocabSessionLevel, number>;
  }>({
    totalTests: 0,
    testsByDifficulty: { easy: 0, medium: 0, hard: 0 },
    setsWithTestsByDifficulty: { easy: 0, medium: 0, hard: 0 },
  });

  useEffect(() => {
    const refresh = () => {
      const bank = loadVocabBank();
      setCount(countVocabSetsInBank());
      const setsInRound = bank[selectedRound];
      setPreviewSet(setsInRound.find((s) => s.setNumber === selectedSet) ?? null);
      const maxSet = setsInRound.reduce((n, s) => Math.max(n, s.setNumber), 0);
      const rows = Array.from({ length: Math.max(20, maxSet) }, (_, i) => i + 1).map(
        (setNumber) => {
          const set = setsInRound.find((s) => s.setNumber === setNumber);
          const countFor = (level: VocabSessionLevel) =>
            (set?.passages ?? []).filter((p) => p.contentLevel === level).length;
          return {
            setNumber,
            easy: countFor("easy"),
            medium: countFor("medium"),
            hard: countFor("hard"),
          };
        },
      );
      setCoverage(rows);
      const testsByDifficulty: Record<VocabSessionLevel, number> = { easy: 0, medium: 0, hard: 0 };
      const setsSeen: Record<VocabSessionLevel, Set<string>> = {
        easy: new Set(),
        medium: new Set(),
        hard: new Set(),
      };
      for (const r of VOCAB_ROUND_NUMBERS) {
        for (const set of bank[r]) {
          for (const p of set.passages) {
            testsByDifficulty[p.contentLevel] += 1;
            setsSeen[p.contentLevel].add(`${r}:${set.setNumber}`);
          }
        }
      }
      const setsWithTestsByDifficulty: Record<VocabSessionLevel, number> = {
        easy: setsSeen.easy.size,
        medium: setsSeen.medium.size,
        hard: setsSeen.hard.size,
      };
      setSummary({
        totalTests: testsByDifficulty.easy + testsByDifficulty.medium + testsByDifficulty.hard,
        testsByDifficulty,
        setsWithTestsByDifficulty,
      });
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-vocab-storage", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-vocab-storage", refresh);
    };
  }, [message, selectedSet, selectedRound]);

  const applyAdminSelection = (parsed: unknown): VocabSet[] => {
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("JSON must be a non-empty array");
    }
    const existing = loadVocabBank()[selectedRound].find((s) => s.setNumber === selectedSet);
    const usedPassageNumbers = new Set(
      (existing?.passages ?? [])
        .filter((p) => p.contentLevel === selectedDifficulty)
        .map((p) => p.passageNumber),
    );
    const allocatePassageNumbers = (count: number): number[] => {
      const allocated: number[] = [];
      let cursor = 1;
      while (allocated.length < count) {
        if (!usedPassageNumbers.has(cursor)) {
          allocated.push(cursor);
          usedPassageNumbers.add(cursor);
        }
        cursor += 1;
      }
      return allocated;
    };
    const legacyRows = parsed as LegacyVocabExamRow[];
    const getLegacyPassage = (r: LegacyVocabExamRow): string | null => {
      if (typeof r.passage === "string") return r.passage;
      if (typeof r.data?.passage === "string") return r.data.passage;
      return null;
    };
    const getLegacyMissing = (r: LegacyVocabExamRow): unknown[] => {
      if (Array.isArray(r.missingWords)) return r.missingWords;
      if (Array.isArray(r.data?.missingWords)) return r.data.missingWords;
      return [];
    };
    const isLegacyShape = legacyRows.every(
      (r) =>
        !!r &&
        typeof r === "object" &&
        typeof getLegacyPassage(r) === "string" &&
        Array.isArray(getLegacyMissing(r)),
    );
    if (isLegacyShape) {
      const passageNumbers = allocatePassageNumbers(legacyRows.length);
      return [
        {
          setNumber: selectedSet,
          passages: legacyRows.map((row, i) => {
            const missing = getLegacyMissing(row);
            const blanks = missing.map((m, idx) => {
              const mm = (m ?? {}) as Record<string, unknown>;
              const correctWord = typeof mm.correctWord === "string" ? mm.correctWord.trim() : "";
              const options = Array.isArray(mm.options)
                ? mm.options.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
                : [];
              return {
                question: `Which word best fits blank ${idx + 1}?`,
                correctAnswer: correctWord,
                options: options.length >= 2 ? options : [correctWord, "N/A"],
                explanationThai:
                  typeof mm.explanationThai === "string" && mm.explanationThai.trim()
                    ? mm.explanationThai
                    : "Use the context in the passage to choose the best answer.",
              };
            });
            return {
              passageNumber: passageNumbers[i] ?? i + 1,
              contentLevel: selectedDifficulty,
              titleEn: `Set ${selectedSet} Passage ${i + 1}`,
              passageText: getLegacyPassage(row) ?? "",
              blanks,
              correctWords: missing.map((m) => {
                const mm = (m ?? {}) as Record<string, unknown>;
                return {
                  word: typeof mm.correctWord === "string" ? mm.correctWord : "",
                  synonyms: Array.isArray(mm.synonyms)
                    ? mm.synonyms.filter(
                        (x): x is string => typeof x === "string" && x.trim().length > 0,
                      )
                    : [],
                };
              }),
            } satisfies VocabPassageUnit;
          }),
        },
      ];
    }
    const directRows = parsed as Partial<VocabPassageUnit>[];
    const directAllocated = allocatePassageNumbers(directRows.length);
    return [
      {
        setNumber: selectedSet,
        passages: directRows.map((p, i) => ({
          passageNumber:
            typeof p.passageNumber === "number" && Number.isFinite(p.passageNumber)
              ? p.passageNumber
              : directAllocated[i] ?? i + 1,
          contentLevel: selectedDifficulty,
          titleEn:
            typeof p.titleEn === "string" && p.titleEn.trim()
              ? p.titleEn
              : `Set ${selectedSet} Passage ${i + 1}`,
          passageText: typeof p.passageText === "string" ? p.passageText : "",
          blanks: Array.isArray(p.blanks) ? p.blanks : [],
          correctWords: Array.isArray(p.correctWords) ? p.correctWords : [],
        })),
      },
    ];
  };

  const apply = () => {
    setMessage(null);
    setError(null);
    try {
      const raw = text.trim();
      if (!raw) {
        throw new Error("Please paste JSON or upload a JSON file first.");
      }
      const parsedUnknown = JSON.parse(raw) as unknown;
      const withSelection = applyAdminSelection(parsedUnknown);
      const parsed = parseVocabSetsJson(JSON.stringify(withSelection));
      const grouped = normalizeVocabSetsIncoming(parsed);
      mergeVocabSetsFromAdmin(parsed, selectedRound);
      const passageTotal = grouped.reduce((n, s) => n + s.passages.length, 0);
      const passagesMeta = grouped.flatMap((g) =>
        g.passages.map((p) => ({
          contentLevel: p.contentLevel,
          passageNumber: p.passageNumber,
        })),
      );
      const logResult = appendAdminUploadLog({
        examKind: "vocab",
        fileName: selectedFileName,
        summary: `Slot ${selectedSet} · ${selectedDifficulty} · ${passageTotal} passage(s)`,
        rawText: raw,
        revertSpec: {
          kind: "vocab",
          round: selectedRound,
          setNumber: selectedSet,
          passages: passagesMeta,
        },
      });
      setMessage(
        `Imported R${selectedRound} slot ${selectedSet} (${selectedDifficulty}) with ${passageTotal} passage(s). Total groups in browser: ${countVocabSetsInBank()}.${
          logResult.ok ? "" : ` (${logResult.error})`
        }`,
      );
      setText("");
      setSelectedFileName(null);
      setPreviewSet(loadVocabBank()[selectedRound].find((s) => s.setNumber === selectedSet) ?? null);
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

  const difficultyPassages =
    previewSet?.passages.filter((p) => p.contentLevel === selectedDifficulty) ?? [];

  return (
    <BrutalPanel title="Vocabulary in context — JSON upload">
      <p className="mb-2 text-sm text-neutral-600">
        Choose <strong>round (1–5)</strong>, <strong>slot</strong> and <strong>difficulty</strong>, then upload or
        paste a JSON array of passages.
      </p>
      <p className="ep-stat mb-3 text-xs text-neutral-500">
        Questions uploaded: {summary.totalTests} · Groups uploaded: {count} · R{selectedRound} · slot {selectedSet} · level{" "}
        {selectedDifficulty}
      </p>
      <p className="mb-2 text-xs font-bold text-ep-blue">
        Upload updates only the selected difficulty in this slot; other difficulties are preserved.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-bold uppercase tracking-wide text-neutral-700">
          Round
          <select
            value={selectedRound}
            onChange={(e) => setSelectedRound(Number(e.target.value) as VocabRoundNum)}
            className="mt-1 w-full border-2 border-black bg-white px-2 py-2 text-sm font-bold"
          >
            {VOCAB_ROUND_NUMBERS.map((r) => (
              <option key={r} value={r}>
                Round {r}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold uppercase tracking-wide text-neutral-700">
          Slot
          <select
            value={selectedSet}
            onChange={(e) => setSelectedSet(Number(e.target.value))}
            className="mt-1 w-full border-2 border-black bg-white px-2 py-2 text-sm font-bold"
          >
            {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Slot {n}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold uppercase tracking-wide text-neutral-700">
          Difficulty
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value as VocabSessionLevel)}
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
      <p className="mb-2 mt-3 text-sm text-neutral-600">
        Each passage must include <code className="ep-stat text-xs">passageText</code> (or legacy{" "}
        <code className="ep-stat text-xs">passage</code>) with{" "}
        <code className="ep-stat text-xs">[BLANK]</code> or numbered{" "}
        <code className="ep-stat text-xs">[BLANK 1]</code>…<code className="ep-stat text-xs">[BLANK N]</code>{" "}
        markers matching the lengths of{" "}
        <code className="ep-stat text-xs">blanks</code> and <code className="ep-stat text-xs">correctWords</code>.
        Max {VOCAB_MAX_PASSAGES_PER_SET} passages per slot.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        placeholder='[ { "passageNumber": 1, "titleEn": "Campus Life", "passageText": "… [BLANK] …", "blanks": [ … ], "correctWords": [ … ] } ]'
        className="w-full border-2 border-black bg-neutral-50 p-3 ep-stat text-xs"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={apply}
        className="mt-3 w-full border-2 border-black bg-ep-blue py-3 text-sm font-black text-white shadow-[4px_4px_0_0_#000]"
      >
        Import vocabulary questions
      </button>
      <div className="mt-4 rounded-[4px] border-2 border-black bg-neutral-50 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-neutral-700">
          Preview (admin)
        </p>
        {difficultyPassages.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600">
            No passages yet for R{selectedRound} slot {selectedSet} ({selectedDifficulty}).
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {difficultyPassages.map((p) => (
              <li
                key={`${p.passageNumber}-${p.titleEn ?? "untitled"}`}
                className="rounded-[4px] border border-black bg-white px-3 py-2 text-sm"
              >
                <p className="font-bold">
                  Passage {p.passageNumber}: {p.titleEn ?? "Untitled"}
                </p>
                <p className="text-xs text-neutral-600">
                  Blanks: {p.blanks.length} · Correct words: {p.correctWords.length}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-4 rounded-[4px] border-2 border-black bg-neutral-50 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-neutral-700">
          Upload summary (questions by difficulty)
        </p>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-[420px] border-collapse text-xs">
            <thead>
              <tr>
                <th className="border border-black bg-white px-2 py-1 text-left">Difficulty</th>
                <th className="border border-black bg-white px-2 py-1">Questions uploaded</th>
                <th className="border border-black bg-white px-2 py-1">Groups with questions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black bg-white px-2 py-1 font-bold">Easy</td>
                <td className="border border-black bg-white px-2 py-1 text-center">
                  {summary.testsByDifficulty.easy}
                </td>
                <td className="border border-black bg-white px-2 py-1 text-center">
                  {summary.setsWithTestsByDifficulty.easy}
                </td>
              </tr>
              <tr>
                <td className="border border-black bg-white px-2 py-1 font-bold">Medium</td>
                <td className="border border-black bg-white px-2 py-1 text-center">
                  {summary.testsByDifficulty.medium}
                </td>
                <td className="border border-black bg-white px-2 py-1 text-center">
                  {summary.setsWithTestsByDifficulty.medium}
                </td>
              </tr>
              <tr>
                <td className="border border-black bg-white px-2 py-1 font-bold">Hard</td>
                <td className="border border-black bg-white px-2 py-1 text-center">
                  {summary.testsByDifficulty.hard}
                </td>
                <td className="border border-black bg-white px-2 py-1 text-center">
                  {summary.setsWithTestsByDifficulty.hard}
                </td>
              </tr>
              <tr>
                <td className="border border-black bg-white px-2 py-1 font-black">Total</td>
                <td className="border border-black bg-white px-2 py-1 text-center font-black">
                  {summary.totalTests}
                </td>
                <td className="border border-black bg-white px-2 py-1 text-center font-black">
                  {new Set(
                    coverage
                      .filter((r) => r.easy > 0 || r.medium > 0 || r.hard > 0)
                      .map((r) => r.setNumber),
                  ).size}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-4 rounded-[4px] border-2 border-black bg-neutral-50 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-neutral-700">
          Upload coverage (questions per slot x level)
        </p>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-[360px] border-collapse text-xs">
            <thead>
              <tr>
                <th className="border border-black bg-white px-2 py-1 text-left">Slot</th>
                <th className="border border-black bg-white px-2 py-1">Easy</th>
                <th className="border border-black bg-white px-2 py-1">Medium</th>
                <th className="border border-black bg-white px-2 py-1">Hard</th>
              </tr>
            </thead>
            <tbody>
              {coverage.map((row) => (
                <tr key={row.setNumber}>
                  <td className="border border-black bg-white px-2 py-1 font-bold">
                    {row.setNumber}
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
