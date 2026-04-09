"use client";

import { useEffect, useState } from "react";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { getStoredGeminiKey } from "@/lib/gemini-key-storage";
import {
  DICTATION_DIFFICULTY_LABEL,
  DICTATION_ROUND_NUMBERS,
  DICTATION_SET_COUNT,
} from "@/lib/dictation-constants";
import {
  ELEVENLABS_INTER_REQUEST_MS,
  sleep,
  speechSynthesisWorkerCount,
  synthesizeSpeechWithRetry,
} from "@/lib/admin-batch-speech";
import { appendAdminUploadLog } from "@/lib/admin-upload-log";
import {
  clearAllDictationData,
  clearDictationAudio,
  countDictationSetsInBank,
  ensureDictationBankReady,
  loadDictationBank,
  mergeDictationBankFromAdmin,
  migrateDictationBankInlineAudioToIndexedDb,
  removeDictationItemsByIds,
} from "@/lib/dictation-storage";
import { dbService } from "@/lib/dbService";
import type { DictationDifficulty, DictationRoundNum } from "@/types/dictation";

type DictationAdminInputRow = {
  difficulty?: unknown;
  correctText?: unknown;
  hintText?: unknown;
};

const DIFFICULTIES: DictationDifficulty[] = ["easy", "medium", "hard"];
const DICTATION_BULK_TEMPLATE = `[
  {
    "correctText": "The committee will announce the results on Monday morning.",
    "hintText": "Listen for articles and final consonants."
  },
  {
    "correctText": "Although it rained, the festival continued without delay.",
    "hintText": "Notice the comma after the opening clause."
  },
  {
    "correctText": "Researchers observed a steady improvement across all groups.",
    "hintText": "Pay attention to past tense verb endings."
  }
]`;

export function AdminDictationPaste() {
  const [audioProvider, setAudioProvider] = useState<"elevenlabs" | "gemini">("elevenlabs");
  const [tab, setTab] = useState<"upload" | "manage">("upload");
  const [text, setText] = useState("");
  const [selectedSet, setSelectedSet] = useState<number>(1);
  const [selectedRound, setSelectedRound] = useState<DictationRoundNum>(1);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DictationDifficulty>("easy");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [slotPreview, setSlotPreview] = useState<{ transcript: string; hintText: string } | null>(null);
  const [countsGrid, setCountsGrid] = useState<
    { round: DictationRoundNum; easy: number; medium: number; hard: number }[]
  >([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manageRows, setManageRows] = useState<
    {
      id: string;
      round: DictationRoundNum;
      difficulty: DictationDifficulty;
      setNumber: number;
      correctText: string;
      hasAudio: boolean;
    }[]
  >([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    sentence: string;
    success: number;
    fail: number;
  }>({ current: 0, total: 0, sentence: "", success: 0, fail: 0 });

  useEffect(() => {
    void (async () => {
      await ensureDictationBankReady();
      await migrateDictationBankInlineAudioToIndexedDb().catch(() => {});
    })();
  }, []);

  useEffect(() => {
    const refresh = () => {
      void ensureDictationBankReady().then(() => {
      const bank = loadDictationBank();
      const countUploaded = (
        rows: Array<{
          id: string;
        }>,
      ) => rows.filter((r) => r.id.endsWith("-admin")).length;
      setTotalRows(
        DICTATION_ROUND_NUMBERS.reduce(
          (sum, r) =>
            sum +
            countUploaded(bank[r].easy) +
            countUploaded(bank[r].medium) +
            countUploaded(bank[r].hard),
          0,
        ),
      );
      setCountsGrid(
        DICTATION_ROUND_NUMBERS.map((r) => ({
          round: r,
          easy: countUploaded(bank[r].easy),
          medium: countUploaded(bank[r].medium),
          hard: countUploaded(bank[r].hard),
        })),
      );
      const row =
        bank[selectedRound][selectedDifficulty].find(
          (x) => x.setNumber === selectedSet && x.id.endsWith("-admin"),
        ) ?? null;
      setSlotPreview(
        row
          ? {
              transcript: row.transcript,
              hintText: row.hintText,
            }
          : null,
      );
      });
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("ep-dictation-storage", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ep-dictation-storage", refresh);
    };
  }, [message, selectedDifficulty, selectedSet, selectedRound]);

  const refreshManageRows = async () => {
    const tasks = await dbService.getDictationTasks();
    const rows = tasks
      .filter((t) => t.id.endsWith("-admin"))
      .map((t) => ({
        id: t.id,
        round: t.round,
        difficulty: t.difficulty,
        setNumber: t.setNumber,
        correctText: t.transcript,
        hasAudio: Boolean(t.audioBase64?.trim() || t.audioInIndexedDb),
      }))
      .sort((a, b) => {
        if (a.round !== b.round) return a.round - b.round;
        if (a.difficulty !== b.difficulty) return a.difficulty.localeCompare(b.difficulty);
        return a.setNumber - b.setNumber;
      });
    setManageRows(rows);
  };

  useEffect(() => {
    void refreshManageRows();
  }, [message]);

  const applySelectionDefaults = (
    rows: DictationAdminInputRow[],
  ): { difficulty: DictationDifficulty; correctText: string; hintText?: string }[] => {
    return rows.map((row) => ({
      difficulty: selectedDifficulty,
      correctText: typeof row.correctText === "string" ? row.correctText : "",
      hintText: typeof row.hintText === "string" ? row.hintText : undefined,
    }));
  };

  const apply = async () => {
    setMessage(null);
    setError(null);
    try {
      await ensureDictationBankReady();
      const raw = text.trim();
      if (!raw) {
        throw new Error("Please paste JSON or upload a JSON file first.");
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("JSON must be a non-empty array");
      }
      const selectedRows = applySelectionDefaults(parsed as DictationAdminInputRow[]);
      if (selectedRows.length === 0) {
        throw new Error("No dictation row found in uploaded data.");
      }
      const bank = loadDictationBank();
      const occupied = new Set(bank[selectedRound][selectedDifficulty].map((r) => r.setNumber));
      const available: number[] = [];
      for (let n = selectedSet; n <= DICTATION_SET_COUNT; n++) {
        if (!occupied.has(n)) available.push(n);
      }
      if (available.length < selectedRows.length) {
        throw new Error(
          `Not enough empty slots from set ${selectedSet}. Need ${selectedRows.length}, but only ${available.length} slot(s) free.`,
        );
      }
      const assignedSets = available.slice(0, selectedRows.length);
      const withAnchoredRows = selectedRows.map((row, idx) => ({
        ...row,
        setNumber: assignedSets[idx],
      }));
      const { patchCount } = await mergeDictationBankFromAdmin(
        JSON.stringify(withAnchoredRows),
        selectedRound,
      );
      const logResult = appendAdminUploadLog({
        examKind: "dictation",
        fileName: selectedFileName,
        summary: `R${selectedRound} · ${selectedDifficulty} · sets ${assignedSets.join(", ")}`,
        rawText: raw,
        revertSpec: {
          kind: "dictation",
          round: selectedRound,
          difficulty: selectedDifficulty,
          setNumbers: assignedSets,
        },
      });
      setMessage(
        `Imported ${patchCount} dictation question(s) into R${selectedRound} ${selectedDifficulty} empty sets: ${assignedSets.join(", ")}.${
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

  const useTemplate = () => {
    setMessage(null);
    setError(null);
    setText(DICTATION_BULK_TEMPLATE);
    setSelectedFileName(null);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const generateAudioFor = async (
    mode: "all-missing" | "current-round" | "selected-only",
  ) => {
    setMessage(null);
    setError(null);
    if (running) return;

    const geminiKey = getStoredGeminiKey();
    const pool = [...manageRows];
    let targets =
      mode === "selected-only"
        ? pool.filter((r) => r.correctText.trim() && selectedIds.has(r.id))
        : pool.filter((r) => r.correctText.trim() && !r.hasAudio);
    if (mode === "current-round") {
      targets = targets.filter((r) => r.round === selectedRound);
    } else if (mode === "selected-only") {
      targets = targets.filter((r) => selectedIds.has(r.id));
    }

    if (targets.length === 0) {
      setError(
        mode === "selected-only"
          ? "No selected tasks with text."
          : "No matching tasks without audio.",
      );
      return;
    }

    setRunning(true);
    setProgress({ current: 0, total: targets.length, sentence: "", success: 0, fail: 0 });
    let success = 0;
    let fail = 0;
    let completed = 0;
    let failReason: string | null = null;
    const speechHeaders: Record<string, string> =
      audioProvider === "gemini" && geminiKey ? { "x-gemini-api-key": geminiKey } : {};

    const runOne = async (t: (typeof targets)[number]) => {
      try {
        const data = await synthesizeSpeechWithRetry({
          text: t.correctText,
          provider: audioProvider,
          headers: speechHeaders,
        });
        await dbService.updateTask("dictation", t.id, {
          audioBase64: data.audioBase64,
          audioMimeType: data.mimeType || "audio/wav",
        });
        success += 1;
      } catch (err) {
        failReason = err instanceof Error ? err.message : "Unknown synthesis error";
        fail += 1;
      } finally {
        completed += 1;
        setProgress({
          current: completed,
          total: targets.length,
          sentence: t.correctText.slice(0, 120),
          success,
          fail,
        });
      }
    };

    if (audioProvider === "elevenlabs") {
      for (let i = 0; i < targets.length; i++) {
        if (i > 0) await sleep(ELEVENLABS_INTER_REQUEST_MS);
        const t = targets[i]!;
        await runOne(t);
      }
    } else {
      let nextIndex = 0;
      const workerCount = speechSynthesisWorkerCount(audioProvider, targets.length);
      const worker = async () => {
        while (nextIndex < targets.length) {
          const idx = nextIndex;
          nextIndex += 1;
          const t = targets[idx];
          if (!t) return;
          await runOne(t);
        }
      };
      await Promise.all(Array.from({ length: workerCount }, () => worker()));
    }
    setRunning(false);
    await refreshManageRows();
    setMessage(
      `Audio generation complete (${audioProvider === "elevenlabs" ? "ElevenLabs" : "Gemini"}). Success: ${success} · Failed: ${fail}`,
    );
    if (fail > 0) {
      setError(
        `Some rows failed. ${failReason ? `Last error: ${failReason}` : "Check Gemini key/model support for TTS."}`,
      );
    }
  };

  const clearAudio = async (mode: "all" | "current-round") => {
    if (running) return;
    setMessage(null);
    setError(null);
    try {
      const cleared =
        mode === "all"
          ? await clearDictationAudio()
          : await clearDictationAudio({ round: selectedRound });
      await refreshManageRows();
      setMessage(
        mode === "all"
          ? `Cleared saved audio from ${cleared} dictation task(s).`
          : `Cleared saved audio from ${cleared} task(s) in round ${selectedRound}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear audio.");
    }
  };

  const removeSelectedRows = async () => {
    if (running) return;
    if (selectedIds.size === 0) {
      setError("No selected tasks to remove.");
      return;
    }
    setMessage(null);
    setError(null);
    try {
      const removed = await removeDictationItemsByIds([...selectedIds]);
      setSelectedIds(new Set());
      await refreshManageRows();
      setMessage(`Removed ${removed} selected dictation task(s).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove selected tasks.");
    }
  };

  const clearAllDictation = async () => {
    if (running) return;
    setMessage(null);
    setError(null);
    try {
      clearAllDictationData();
      setSelectedIds(new Set());
      await refreshManageRows();
      setMessage("Cleared all dictation content and progress. You can start fresh.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear dictation data.");
    }
  };

  return (
    <BrutalPanel title="Dictation bank — JSON upload">
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("upload")}
          className={`border-2 border-black px-3 py-1 text-xs font-black uppercase ${
            tab === "upload" ? "bg-ep-blue text-white" : "bg-white"
          }`}
        >
          Upload
        </button>
        <button
          type="button"
          onClick={() => setTab("manage")}
          className={`border-2 border-black px-3 py-1 text-xs font-black uppercase ${
            tab === "manage" ? "bg-ep-blue text-white" : "bg-white"
          }`}
        >
          Manage audio
        </button>
      </div>

      {tab === "upload" ? (
        <>
      <p className="mb-2 text-sm text-neutral-600">
        Choose <strong>round (1–5)</strong>, <strong>set</strong> and <strong>difficulty</strong>, then upload or
        paste JSON. Import fills the next empty sets starting from the selected set (no overwrite).
      </p>
      <p className="mb-2 text-sm text-neutral-600">
        Total rows in browser: <strong>{totalRows}</strong> · Selected:{" "}
        <strong>
          R{selectedRound} · {selectedDifficulty} / set {selectedSet}
        </strong>
      </p>
      <div className="mb-2 rounded-[4px] border-2 border-black bg-neutral-50 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-neutral-700">
          Uploaded questions by round &amp; level
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
                    {row.easy} / {DICTATION_SET_COUNT}
                  </td>
                  <td className="border border-black bg-white px-2 py-1 text-center">
                    {row.medium} / {DICTATION_SET_COUNT}
                  </td>
                  <td className="border border-black bg-white px-2 py-1 text-center">
                    {row.hard} / {DICTATION_SET_COUNT}
                  </td>
                </tr>
              ))}
              <tr className="bg-neutral-100">
                <td className="border border-black px-2 py-1 font-black">Total</td>
                <td
                  className="border border-black px-2 py-1 text-center font-black"
                  colSpan={3}
                >
                  {totalRows} / {DICTATION_SET_COUNT * 3 * 5}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p className="mb-2 text-sm text-neutral-600">
        Dictation uses computer voice (Text-to-Speech) at runtime, so admin does not need to upload MP3 files.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-bold uppercase tracking-wide text-neutral-700">
          Round
          <select
            value={selectedRound}
            onChange={(e) => setSelectedRound(Number(e.target.value) as DictationRoundNum)}
            className="mt-1 w-full border-2 border-black bg-white px-2 py-2 text-sm font-bold"
          >
            {DICTATION_ROUND_NUMBERS.map((r) => (
              <option key={r} value={r}>
                Round {r}
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
            {Array.from({ length: DICTATION_SET_COUNT }, (_, i) => i + 1).map((n) => (
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
            onChange={(e) => setSelectedDifficulty(e.target.value as DictationDifficulty)}
            className="mt-1 w-full border-2 border-black bg-white px-2 py-2 text-sm font-bold"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {DICTATION_DIFFICULTY_LABEL[d]}
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
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={useTemplate}
          className="border-2 border-black bg-white px-3 py-1 text-xs font-black uppercase shadow-[2px_2px_0_0_#000] hover:bg-ep-yellow/30"
        >
          Insert bulk template
        </button>
        <button
          type="button"
          onClick={() => void clearAllDictation()}
          disabled={running}
          className="border-2 border-black bg-red-600 px-3 py-1 text-xs font-black uppercase text-white shadow-[2px_2px_0_0_#000] disabled:opacity-50"
        >
          Clear all dictation data
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        placeholder={DICTATION_BULK_TEMPLATE}
        className="w-full border-2 border-black bg-neutral-50 p-3 ep-stat text-xs"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={() => void apply()}
        className="mt-3 w-full border-2 border-black bg-ep-blue py-3 text-sm font-black text-white shadow-[4px_4px_0_0_#000]"
      >
        Import dictation set
      </button>
      <div className="mt-4 rounded-[4px] border-2 border-black bg-neutral-50 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-neutral-700">
          Set preview (admin)
        </p>
        {!slotPreview ? (
          <p className="mt-2 text-sm text-neutral-600">
            No dictation content yet for R{selectedRound} · {selectedDifficulty} set {selectedSet}.
          </p>
        ) : (
          <div className="mt-2 space-y-2 rounded-[4px] border border-black bg-white px-3 py-2 text-sm">
            <p className="font-bold">Transcript</p>
            <p className="text-neutral-700">{slotPreview.transcript}</p>
            <p className="font-bold">Hint</p>
            <p className="text-neutral-700">{slotPreview.hintText || "—"}</p>
          </div>
        )}
      </div>
      </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-neutral-600">
            Existing tasks are updated in place (no duplicates). Generation writes only{" "}
            <code className="ep-stat text-xs">audioBase64</code> and{" "}
            <code className="ep-stat text-xs">audioMimeType</code>.
          </p>
          <label className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-neutral-700">
            Provider
            <select
              value={audioProvider}
              onChange={(e) => setAudioProvider(e.target.value as "elevenlabs" | "gemini")}
              disabled={running}
              className="border-2 border-black bg-white px-2 py-1 text-xs font-bold"
            >
              <option value="elevenlabs">ElevenLabs</option>
              <option value="gemini">Gemini</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={running}
              onClick={() => void generateAudioFor("all-missing")}
              className="border-2 border-black bg-ep-yellow px-3 py-2 text-xs font-black uppercase disabled:opacity-50"
            >
              Generate audio for all tasks missing audio
            </button>
            <button
              type="button"
              disabled={running}
              onClick={() => void generateAudioFor("current-round")}
              className="border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase disabled:opacity-50"
            >
              Generate audio for current round only
            </button>
            <button
              type="button"
              disabled={running || selectedIds.size === 0}
              onClick={() => void generateAudioFor("selected-only")}
              className="border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase disabled:opacity-50"
            >
              Generate audio for selected tasks only
            </button>
            <button
              type="button"
              disabled={running || selectedIds.size === 0}
              onClick={() => void removeSelectedRows()}
              className="border-2 border-black bg-red-600 px-3 py-2 text-xs font-black uppercase text-white disabled:opacity-50"
            >
              Remove selected tasks
            </button>
            <button
              type="button"
              disabled={running}
              onClick={() => void clearAudio("current-round")}
              className="border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase text-red-700 disabled:opacity-50"
            >
              Clear saved audio (current round)
            </button>
            <button
              type="button"
              disabled={running}
              onClick={() => void clearAudio("all")}
              className="border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase text-red-700 disabled:opacity-50"
            >
              Clear saved audio (all rounds)
            </button>
          </div>

          <div className="rounded-[4px] border-2 border-black bg-neutral-50 p-3 text-xs">
            <p className="font-black">
              Processing {progress.current} / {progress.total}
            </p>
            <p className="mt-1 text-neutral-700">{progress.sentence || "—"}</p>
            <p className="mt-1 font-bold text-neutral-700">
              Success: {progress.success} · Fail: {progress.fail}
            </p>
          </div>

          <div className="max-h-72 overflow-auto rounded-[4px] border-2 border-black">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-100">
                  <th className="border border-black px-2 py-1 text-left">Sel</th>
                  <th className="border border-black px-2 py-1 text-left">Slot</th>
                  <th className="border border-black px-2 py-1 text-left">Audio</th>
                  <th className="border border-black px-2 py-1 text-left">Sentence</th>
                </tr>
              </thead>
              <tbody>
                {manageRows.map((r) => (
                  <tr key={r.id}>
                    <td className="border border-black px-2 py-1">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.id)}
                        onChange={() => toggleSelected(r.id)}
                      />
                    </td>
                    <td className="border border-black px-2 py-1">
                      R{r.round} · {r.difficulty} · set {r.setNumber}
                    </td>
                    <td className="border border-black px-2 py-1 font-bold">
                      {r.hasAudio ? "Yes" : "Missing"}
                    </td>
                    <td className="border border-black px-2 py-1">{r.correctText}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {message ? <p className="mt-2 text-sm font-bold text-green-800">{message}</p> : null}
      {error ? <p className="mt-2 text-sm font-bold text-red-700">{error}</p> : null}
    </BrutalPanel>
  );
}
