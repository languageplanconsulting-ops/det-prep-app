"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BrutalPanel } from "@/components/ui/BrutalPanel";
import { getStoredGeminiKey } from "@/lib/gemini-key-storage";
import {
  CONVERSATION_MAIN_Q_COUNT,
  CONVERSATION_ROUND_COUNT,
  CONVERSATION_SCENARIO_Q_COUNT,
  CONVERSATION_TOTAL_STEPS,
} from "@/lib/conversation-constants";
import { CONVERSATION_BULK_JSON_TEMPLATE } from "@/lib/conversation-bulk-json-template";
import {
  ELEVENLABS_INTER_REQUEST_MS,
  sleep,
  speechSynthesisWorkerCount,
  synthesizeSpeechWithRetry,
} from "@/lib/admin-batch-speech";
import { appendAdminUploadLog, loadAdminUploadLog } from "@/lib/admin-upload-log";
import {
  applyConversationUploadSlotDefaults,
  emptyConversationAggMatrix,
  summarizeRowsIntoAggMatrix,
  summarizeStoredExamsIntoAggMatrix,
  type ConversationUploadInputRow,
} from "@/lib/conversation-upload-defaults";
import { wipeInteractiveConversationClientData } from "@/lib/conversation-client-wipe";
import {
  conversationAudioKey,
  putConversationAudioByKey,
} from "@/lib/conversation-audio-indexeddb";
import {
  countConversationExamsInBank,
  getAllConversationExams,
  loadConversationBank,
  mergeConversationBankFromAdmin,
} from "@/lib/conversation-storage";
import { dbService } from "@/lib/dbService";
import { playBlinkBeep } from "@/lib/play-blink-beep";
import type { ConversationDifficulty, ConversationExam } from "@/types/conversation";

const DIFFICULTIES: ConversationDifficulty[] = ["easy", "medium", "hard"];

function ConversationAggTable({
  title,
  matrix,
  subtitle,
}: {
  title: string;
  matrix: ReturnType<typeof emptyConversationAggMatrix>;
  subtitle?: string;
}) {
  const rounds = Array.from({ length: CONVERSATION_ROUND_COUNT }, (_, i) => i + 1);
  return (
    <div className="rounded-[4px] border-2 border-black bg-white p-3">
      <p className="text-xs font-black uppercase tracking-wide text-neutral-800">{title}</p>
      {subtitle ? <p className="mt-1 text-[11px] text-neutral-600">{subtitle}</p> : null}
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse text-left text-[11px]">
          <thead>
            <tr className="bg-neutral-100">
              <th className="border border-black px-2 py-1.5 font-black">Round</th>
              {DIFFICULTIES.map((d) => (
                <th key={d} className="border border-black px-2 py-1.5 font-black capitalize">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rounds.map((r) => (
              <tr key={r}>
                <td className="border border-black px-2 py-1.5 font-bold">R{r}</td>
                {DIFFICULTIES.map((d) => {
                  const cell = matrix[r]?.[d] ?? { exams: 0, mcqItems: 0 };
                  const label =
                    cell.exams === 0
                      ? "—"
                      : `${cell.exams} set${cell.exams === 1 ? "" : "s"} · ${cell.mcqItems} Q`;
                  return (
                    <td key={d} className="border border-black px-2 py-1.5 ep-stat text-neutral-800">
                      {label}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10px] text-neutral-500">
        Q = scored steps per set (scenario + main MCQs). A complete exam has {CONVERSATION_TOTAL_STEPS} questions (
        {CONVERSATION_SCENARIO_Q_COUNT} scenario + {CONVERSATION_MAIN_Q_COUNT} main).
      </p>
    </div>
  );
}

export function AdminConversationPaste() {
  const [tab, setTab] = useState<"upload" | "manage-audio">("upload");
  const [text, setText] = useState("");
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [selectedSet, setSelectedSet] = useState<number>(1);
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<ConversationDifficulty>("easy");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [totalExams, setTotalExams] = useState(0);
  const [byDifficulty, setByDifficulty] = useState({ easy: 0, medium: 0, hard: 0 });
  const [conversationImportBatches, setConversationImportBatches] = useState(0);
  const [previewExam, setPreviewExam] = useState<ConversationExam | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showMissingOnly, setShowMissingOnly] = useState(true);
  const [manageRound, setManageRound] = useState<number>(0);
  const [manageSet, setManageSet] = useState<number>(0);
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [audioProvider, setAudioProvider] = useState<"polly" | "elevenlabs" | "gemini">("polly");
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    preview: "",
    success: 0,
    fail: 0,
  });

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const exams = getAllConversationExams();
  const bankAggMatrix = useMemo(
    () => summarizeStoredExamsIntoAggMatrix(exams),
    [totalExams, byDifficulty.easy, byDifficulty.medium, byDifficulty.hard, conversationImportBatches],
  );

  const pastePreview = useMemo(() => {
    const raw = text.trim();
    if (!raw) return { kind: "empty" as const };
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return { kind: "error" as const, message: "JSON must be a non-empty array." };
      }
      const bank = loadConversationBank();
      const withDefaults = applyConversationUploadSlotDefaults(
        parsed as ConversationUploadInputRow[],
        bank,
        selectedRound,
        selectedSet,
        selectedDifficulty,
      );
      return {
        kind: "ok" as const,
        rowCount: parsed.length,
        matrix: summarizeRowsIntoAggMatrix(withDefaults),
      };
    } catch {
      return { kind: "error" as const, message: "Invalid JSON (cannot parse)." };
    }
  }, [
    text,
    selectedRound,
    selectedSet,
    selectedDifficulty,
    totalExams,
    byDifficulty.easy,
    byDifficulty.medium,
    byDifficulty.hard,
  ]);

  useEffect(() => {
    const refreshBankUi = () => {
      setTotalExams(countConversationExamsInBank());
      const all = getAllConversationExams();
      setByDifficulty({
        easy: all.filter((e) => e.difficulty === "easy").length,
        medium: all.filter((e) => e.difficulty === "medium").length,
        hard: all.filter((e) => e.difficulty === "hard").length,
      });
      setConversationImportBatches(
        loadAdminUploadLog().filter((e) => e.examKind === "conversation").length,
      );
      const bank = loadConversationBank();
      const slot =
        bank[selectedRound]?.[selectedDifficulty]?.find(
          (x) => x.setNumber === selectedSet,
        ) ?? null;
      setPreviewExam(slot);
    };
    refreshBankUi();
    const onUploadLog = () => refreshBankUi();
    window.addEventListener("ep-conversation-storage", refreshBankUi);
    window.addEventListener("storage", refreshBankUi);
    window.addEventListener("admin-upload-log-changed", onUploadLog);
    return () => {
      window.removeEventListener("ep-conversation-storage", refreshBankUi);
      window.removeEventListener("storage", refreshBankUi);
      window.removeEventListener("admin-upload-log-changed", onUploadLog);
    };
  }, [message, selectedRound, selectedSet, selectedDifficulty]);

  const distinctManageSets = [...new Set(exams.map((e) => e.setNumber))].sort((a, b) => a - b);
  const lineRows = exams.flatMap((exam) => {
    const scenarioLine = {
      id: `${exam.id}::scenario`,
      examId: exam.id,
      round: exam.round ?? 1,
      setNumber: exam.setNumber,
      difficulty: exam.difficulty,
      kind: "scenario" as const,
      text: exam.scenario,
      hasAudio: Boolean(exam.scenarioAudioBase64?.trim()) || Boolean(exam.scenarioAudioInIndexedDb),
    };
    const scenarioQs = exam.scenarioQuestions.map((q, idx) => ({
      id: `${exam.id}::scenarioQ::${idx}`,
      examId: exam.id,
      round: exam.round ?? 1,
      setNumber: exam.setNumber,
      difficulty: exam.difficulty,
      kind: "scenarioQ" as const,
      index: idx,
      text: q.question,
      hasAudio: Boolean(q.audioBase64?.trim()) || Boolean(q.audioInIndexedDb),
    }));
    const mainLines = exam.mainQuestions.map((q, idx) => ({
      id: `${exam.id}::mainT::${idx}`,
      examId: exam.id,
      round: exam.round ?? 1,
      setNumber: exam.setNumber,
      difficulty: exam.difficulty,
      kind: "mainT" as const,
      index: idx,
      text: q.transcript,
      hasAudio: Boolean(q.audioBase64?.trim()) || Boolean(q.audioInIndexedDb),
    }));
    return [scenarioLine, ...scenarioQs, ...mainLines];
  });

  const filteredLineRows = lineRows.filter((r) => {
    if (showMissingOnly && r.hasAudio) return false;
    if (manageRound > 0 && r.round !== manageRound) return false;
    if (manageSet > 0 && r.setNumber !== manageSet) return false;
    const q = search.trim().toLowerCase();
    if (q && !r.text.toLowerCase().includes(q)) return false;
    return true;
  });

  const toggleLineSelected = (id: string) => {
    setSelectedLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateExamLineAudio = async (
    line: (typeof lineRows)[number],
    audioBase64: string,
    audioMimeType: string,
  ) => {
    const all = await dbService.getConversationTasks();
    const exam = all.find((x) => x.id === line.examId);
    if (!exam) return false;

    try {
      if (line.kind === "scenario") {
        const key = conversationAudioKey(exam.id, "scenario");
        await putConversationAudioByKey({ key, audioBase64, mimeType: audioMimeType });
        return (
          await dbService.updateTask("conversation", exam.id, {
            scenarioAudioBase64: undefined,
            scenarioAudioMimeType: audioMimeType,
            scenarioAudioInIndexedDb: true,
          })
        ).ok;
      }
      if (line.kind === "scenarioQ") {
        const idx = line.index ?? 0;
        const key = conversationAudioKey(exam.id, { kind: "sq", index: idx });
        await putConversationAudioByKey({ key, audioBase64, mimeType: audioMimeType });
        const next = exam.scenarioQuestions.map((q, i) =>
          i === idx
            ? { ...q, audioBase64: undefined, audioMimeType, audioInIndexedDb: true }
            : q,
        );
        return (await dbService.updateTask("conversation", exam.id, { scenarioQuestions: next })).ok;
      }
      const idx = line.index ?? 0;
      const key = conversationAudioKey(exam.id, { kind: "mt", index: idx });
      await putConversationAudioByKey({ key, audioBase64, mimeType: audioMimeType });
      const next = exam.mainQuestions.map((q, i) =>
        i === idx ? { ...q, audioBase64: undefined, audioMimeType, audioInIndexedDb: true } : q,
      );
      return (await dbService.updateTask("conversation", exam.id, { mainQuestions: next })).ok;
    } catch (err) {
      console.error("[conversation audio]", err);
      return false;
    }
  };

  const runGenerate = async (mode: "all-missing" | "current-round" | "selected") => {
    setMessage(null);
    setError(null);
    if (running) return;
    const geminiKey = getStoredGeminiKey();
    let targets =
      mode === "selected"
        ? lineRows.filter((r) => r.text.trim() && selectedLineIds.has(r.id))
        : lineRows.filter((r) => r.text.trim() && !r.hasAudio);
    if (mode === "current-round") {
      targets = targets.filter(
        (r) => (manageRound <= 0 || r.round === manageRound) && (manageSet <= 0 || r.setNumber === manageSet),
      );
    }
    if (mode === "selected") {
      targets = targets.filter((r) => selectedLineIds.has(r.id));
    }
    if (targets.length === 0) {
      setError(
        mode === "selected"
          ? "No selected conversation lines with text."
          : "No matching conversation lines without audio.",
      );
      return;
    }
    setRunning(true);
    let success = 0;
    let fail = 0;
    let completed = 0;
    let failReason: string | null = null;
    const errorHistogram = new Map<string, number>();
    const noteFailure = (message: string) => {
      failReason = message;
      const key = message.length > 280 ? `${message.slice(0, 280)}…` : message;
      errorHistogram.set(key, (errorHistogram.get(key) ?? 0) + 1);
    };
    setProgress({ current: 0, total: targets.length, preview: "", success, fail });
    const speechHeaders: Record<string, string> =
      audioProvider === "gemini" && geminiKey ? { "x-gemini-api-key": geminiKey } : {};

    const runOne = async (t: (typeof targets)[number]) => {
      try {
        const data = await synthesizeSpeechWithRetry({
          text: t.text,
          provider: audioProvider,
          headers: speechHeaders,
        });
        const ok = await updateExamLineAudio(t, data.audioBase64, data.mimeType || "audio/mpeg");
        if (!ok) throw new Error("Save failed (IndexedDB or exam update). Check console.");
        success += 1;
      } catch (err) {
        noteFailure(err instanceof Error ? err.message : "Unknown synthesis error");
        fail += 1;
      } finally {
        completed += 1;
        setProgress({
          current: completed,
          total: targets.length,
          preview: t.text.slice(0, 140),
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
    setMessage(
      `Conversation audio generation done (${
        audioProvider === "elevenlabs"
          ? "ElevenLabs"
          : audioProvider === "polly"
            ? "Amazon Polly"
            : "Gemini"
      }). Success: ${success} · Fail: ${fail}`,
    );
    if (fail > 0) {
      const top = [...errorHistogram.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([m, n]) => `(${n}×) ${m}`)
        .join("\n");
      setError(
        `${fail} row(s) failed. Most common messages:\n${top || failReason || "Unknown"}\n\nTips: scenario text must be under ~12k chars per line (Polly uses 3k per request — long lines fall back to Gemini on the server). ElevenLabs 401/402 = key or billing. Save errors = browser storage / console.`,
      );
    }
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
      const selectedRows = applyConversationUploadSlotDefaults(
        parsed as ConversationUploadInputRow[],
        loadConversationBank(),
        selectedRound,
        selectedSet,
        selectedDifficulty,
      );
      const { count } = mergeConversationBankFromAdmin(JSON.stringify(selectedRows));
      const slots = selectedRows.map((r) => ({
        round: typeof r.round === "number" ? r.round : 1,
        difficulty: r.difficulty as ConversationDifficulty,
        setNumber: r.setNumber as number,
      }));
      const summaryParts = slots.map((s) => `R${s.round}·${s.difficulty}·S${s.setNumber}`);
      const logResult = appendAdminUploadLog({
        examKind: "conversation",
        fileName: selectedFileName,
        summary: `${count} exam(s): ${summaryParts.join("; ")}`,
        rawText: raw,
        revertSpec: { kind: "conversation", slots },
      });
      setMessage(
        `Imported ${count} conversation exam(s) at ${summaryParts.join("; ")}.${logResult.ok ? "" : ` (${logResult.error})`}`,
      );
      setText("");
      setSelectedFileName(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  const wipeAllConversationData = async () => {
    if (
      !window.confirm(
        "Remove ALL interactive conversation data in this browser?\n\n• Exam bank\n• Learner progress\n• Conversation upload log entries\n• Generated TTS audio (IndexedDB)\n\nThis cannot be undone.",
      )
    ) {
      return;
    }
    setMessage(null);
    setError(null);
    try {
      await wipeInteractiveConversationClientData();
      setMessage(
        "Interactive conversation cleared — empty bank. Re-import JSON to add sets again.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wipe failed");
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

  const copyBulkTemplate = async () => {
    setError(null);
    try {
      await navigator.clipboard.writeText(CONVERSATION_BULK_JSON_TEMPLATE);
      playBlinkBeep();
      setMessage("Sample bulk JSON copied — paste into the box below and edit.");
    } catch {
      setError("Clipboard copy failed — click the sample box and press Cmd/Ctrl+A, then copy.");
    }
  };

  const selectAllPastedJson = () => {
    playBlinkBeep();
    const el = textAreaRef.current;
    if (!el) return;
    el.focus();
    el.select();
  };

  return (
    <BrutalPanel title="Interactive conversation — JSON upload">
      <div className="mb-3 flex flex-wrap items-center gap-2">
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
          onClick={() => setTab("manage-audio")}
          className={`border-2 border-black px-3 py-1 text-xs font-black uppercase ${
            tab === "manage-audio" ? "bg-ep-blue text-white" : "bg-white"
          }`}
        >
          Manage audio
        </button>
        <button
          type="button"
          onClick={() => void wipeAllConversationData()}
          className="ml-auto border-2 border-red-700 bg-white px-3 py-1 text-xs font-black uppercase text-red-800 hover:bg-red-50"
        >
          Reset all (this browser)
        </button>
      </div>
      {tab === "upload" ? (
        <>
      <p className="mb-2 text-sm text-neutral-600">
        Choose round, <strong>default</strong> difficulty, and the first set number. Paste or upload a JSON array.
        If each object includes <code className="ep-stat text-xs">&quot;difficulty&quot;</code>, that value wins — the
        dropdown is ignored for that row. Use <code className="ep-stat text-xs">&quot;medium&quot;</code> in JSON for
        Medium, or remove <code className="ep-stat text-xs">difficulty</code> from objects to follow the dropdown.
      </p>
      <p className="ep-stat mb-3 text-xs text-neutral-500">
        Exams in browser: <strong>{totalExams}</strong> (easy {byDifficulty.easy} · medium {byDifficulty.medium} · hard{" "}
        {byDifficulty.hard}) · Import batches logged: <strong>{conversationImportBatches}</strong> · Preview slot: round{" "}
        {selectedRound} / {selectedDifficulty} / set {selectedSet}
      </p>
      <div className="mb-4">
        <ConversationAggTable
          title="Uploaded bank — sets & questions by round / difficulty"
          subtitle="Each cell: number of conversation sets and total scored MCQ steps in this browser."
          matrix={bankAggMatrix}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-bold uppercase tracking-wide text-neutral-700">
          Round
          <select
            value={selectedRound}
            onChange={(e) => setSelectedRound(Number(e.target.value))}
            className="mt-1 w-full border-2 border-black bg-white px-2 py-2 text-sm font-bold"
          >
            {Array.from({ length: CONVERSATION_ROUND_COUNT }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Round {n}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold uppercase tracking-wide text-neutral-700">
          Start set #
          <input
            type="number"
            min={1}
            value={selectedSet}
            onChange={(e) => {
              const v = Number.parseInt(e.target.value, 10);
              setSelectedSet(Number.isFinite(v) && v >= 1 ? v : 1);
            }}
            className="mt-1 w-full border-2 border-black bg-white px-2 py-2 text-sm font-bold"
          />
        </label>
        <label className="text-xs font-bold uppercase tracking-wide text-neutral-700">
          Default difficulty (if JSON omits it)
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value as ConversationDifficulty)}
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
        Bulk format: <code className="ep-stat text-xs">title</code>,{" "}
        <code className="ep-stat text-xs">difficulty</code>, <code className="ep-stat text-xs">scenario</code>,{" "}
        <code className="ep-stat text-xs">highlightedWords</code>,{" "}
        {CONVERSATION_SCENARIO_Q_COUNT} <code className="ep-stat text-xs">scenarioQuestions</code>,{" "}
        {CONVERSATION_MAIN_Q_COUNT} <code className="ep-stat text-xs">mainQuestions</code> (each with{" "}
        <code className="ep-stat text-xs">transcript</code>). <code className="ep-stat text-xs">id</code> is optional
        (auto). Per-row <code className="ep-stat text-xs">difficulty</code> / <code className="ep-stat text-xs">round</code>{" "}
        in JSON override the selectors when present.
      </p>
      <div className="mb-3 rounded-[4px] border-2 border-dashed border-neutral-500 bg-neutral-100/90 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-wide text-neutral-800">
            Copyable bulk JSON template
          </p>
          <button
            type="button"
            onClick={() => void copyBulkTemplate()}
            className="border-2 border-black bg-ep-yellow px-3 py-1.5 text-[11px] font-black uppercase shadow-[2px_2px_0_0_#000]"
          >
            Copy template
          </button>
        </div>
        <pre
          tabIndex={0}
          className="mt-2 max-h-40 cursor-text select-all overflow-auto rounded border-2 border-black bg-white p-2 ep-stat text-[10px] leading-snug text-neutral-800 outline-none ring-ep-blue/30 focus:ring-2"
        >
          {CONVERSATION_BULK_JSON_TEMPLATE}
        </pre>
        <p className="mt-1 text-[10px] text-neutral-600">
          Select all in this sample (click, then Cmd/Ctrl+A) or use <strong>Copy template</strong>, then paste into the
          box below.
        </p>
      </div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-700">
        Paste JSON array (bulk upload)
      </label>
      <textarea
        ref={textAreaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder='[ { "id": "conv_easy_01", "title": "…", "difficulty": "easy", "scenario": "…", "highlightedWords": [ … ], "scenarioQuestions": [ … ], "mainQuestions": [ { "transcript": "…", … } ] } ]'
        className="w-full border-2 border-black bg-neutral-50 p-3 ep-stat text-xs"
        spellCheck={false}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={selectAllPastedJson}
          className="border-2 border-black bg-white px-3 py-1.5 text-[11px] font-black uppercase shadow-[2px_2px_0_0_#000]"
        >
          Select all in box
        </button>
      </div>
      {pastePreview.kind === "ok" ? (
        <div className="mt-3">
          <ConversationAggTable
            title={`This paste — ${pastePreview.rowCount} exam row(s) (target slots after defaults)`}
            subtitle="Per-cell counts follow round/difficulty from JSON (or your selectors) and next free set numbers. Q counts use arrays in JSON when present; otherwise 8 per row."
            matrix={pastePreview.matrix}
          />
          {(() => {
            const m = pastePreview.matrix[selectedRound];
            if (!m) return null;
            const parts: string[] = [];
            for (const d of DIFFICULTIES) {
              const n = m[d].exams;
              if (n > 0) parts.push(`${d} ×${n}`);
            }
            const atSelected = m[selectedDifficulty]?.exams ?? 0;
            const mismatch = pastePreview.rowCount > 0 && atSelected === 0;
            return (
              <>
                <p className="mt-2 text-sm font-bold text-neutral-900">
                  Import destination (Round {selectedRound}):{" "}
                  {parts.length > 0 ? parts.join(" · ") : "—"}
                </p>
                {mismatch ? (
                  <p className="mt-2 rounded-[4px] border-2 border-amber-600 bg-amber-50 p-3 text-sm font-bold text-amber-950">
                    Your dropdown is set to <strong>{selectedDifficulty}</strong>, but this paste does not add any
                    sets under {selectedDifficulty}. Your JSON probably has{" "}
                    <code className="ep-stat text-xs">&quot;difficulty&quot;: &quot;easy&quot;</code> on each row —
                    learners will see new content under <strong>Easy</strong>, not Medium/Hard. To use Medium: change
                    every row to{" "}
                    <code className="ep-stat text-xs">&quot;difficulty&quot;: &quot;medium&quot;</code>, or remove the
                    difficulty field so the dropdown above applies.
                  </p>
                ) : null}
              </>
            );
          })()}
        </div>
      ) : pastePreview.kind === "error" ? (
        <p className="mt-3 text-xs font-bold text-amber-900">{pastePreview.message}</p>
      ) : null}
      <button
        type="button"
        onClick={apply}
        className="mt-3 w-full border-2 border-black bg-ep-blue py-3 text-sm font-black text-white shadow-[4px_4px_0_0_#000]"
      >
        Import JSON (bulk)
      </button>
      <div className="mt-4 rounded-[4px] border-2 border-black bg-neutral-50 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-neutral-700">
          Set preview (admin)
        </p>
        {!previewExam ? (
          <p className="mt-2 text-sm text-neutral-600">
            No exam yet for round {selectedRound}, {selectedDifficulty}, set {selectedSet}.
          </p>
        ) : (
          <div className="mt-2 space-y-2 rounded-[4px] border border-black bg-white px-3 py-2 text-sm">
            <p className="font-bold">{previewExam.title}</p>
            <p className="text-neutral-700">
              Scenario questions: {previewExam.scenarioQuestions.length} · Main questions:{" "}
              {previewExam.mainQuestions.length}
            </p>
          </div>
        )}
      </div>
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-neutral-600">
            Amazon Polly and Gemini use a small parallel pool with retries. ElevenLabs runs one request at a time.
            Learners hear saved clips first; missing lines use API then browser voice.
          </p>
          <label className="block text-xs font-bold uppercase tracking-wide text-neutral-700">
            TTS provider
            <select
              value={audioProvider}
              onChange={(e) =>
                setAudioProvider(e.target.value as "polly" | "elevenlabs" | "gemini")
              }
              className="mt-1 w-full max-w-xs border-2 border-black bg-white px-2 py-2 text-sm font-bold"
            >
              <option value="polly">Amazon Polly (AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY)</option>
              <option value="elevenlabs">ElevenLabs (ELEVENLABS_API_KEY)</option>
              <option value="gemini">Gemini (Setup key or GEMINI_API_KEY)</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={running}
              onClick={() => void runGenerate("all-missing")}
              className="border-2 border-black bg-ep-yellow px-3 py-2 text-xs font-black uppercase disabled:opacity-50"
            >
              Generate audio for all items missing audio
            </button>
            <button
              type="button"
              disabled={running}
              onClick={() => void runGenerate("current-round")}
              className="border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase disabled:opacity-50"
            >
              Generate audio for current set / round only
            </button>
            <button
              type="button"
              disabled={running || selectedLineIds.size === 0}
              onClick={() => void runGenerate("selected")}
              className="border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase disabled:opacity-50"
            >
              Generate audio for selected items only
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <label className="text-xs font-bold uppercase tracking-wide text-neutral-700">
              Round
              <select
                value={manageRound}
                onChange={(e) => setManageRound(Number(e.target.value))}
                className="mt-1 w-full border-2 border-black bg-white px-2 py-2 text-xs font-bold"
              >
                <option value={0}>All</option>
                {Array.from({ length: CONVERSATION_ROUND_COUNT }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    Round {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-neutral-700">
              Set
              <select
                value={manageSet}
                onChange={(e) => setManageSet(Number(e.target.value))}
                className="mt-1 w-full border-2 border-black bg-white px-2 py-2 text-xs font-bold"
              >
                <option value={0}>All</option>
                {distinctManageSets.map((n) => (
                  <option key={n} value={n}>
                    Set {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-neutral-700">
              <input
                type="checkbox"
                checked={showMissingOnly}
                onChange={(e) => setShowMissingOnly(e.target.checked)}
              />
              Missing audio only
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-neutral-700">
              Search
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mt-1 w-full border-2 border-black bg-white px-2 py-2 text-xs"
                placeholder="Find by text"
              />
            </label>
          </div>

          <div className="rounded-[4px] border-2 border-black bg-neutral-50 p-3 text-xs">
            <p className="font-black">
              Processing {progress.current} / {progress.total}
            </p>
            <p className="mt-1 text-neutral-700">{progress.preview || "—"}</p>
            <p className="mt-1 font-bold text-neutral-700">
              Success: {progress.success} · Fail: {progress.fail}
            </p>
            <p className="mt-1 text-neutral-700">
              Total lines: {lineRows.length} · Missing: {lineRows.filter((x) => !x.hasAudio).length} · Selected:{" "}
              {selectedLineIds.size}
            </p>
          </div>

          <div className="max-h-80 overflow-auto rounded-[4px] border-2 border-black">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-100">
                  <th className="border border-black px-2 py-1 text-left">Sel</th>
                  <th className="border border-black px-2 py-1 text-left">Slot</th>
                  <th className="border border-black px-2 py-1 text-left">Type</th>
                  <th className="border border-black px-2 py-1 text-left">Audio</th>
                  <th className="border border-black px-2 py-1 text-left">Text</th>
                </tr>
              </thead>
              <tbody>
                {filteredLineRows.map((r) => (
                  <tr key={r.id}>
                    <td className="border border-black px-2 py-1">
                      <input
                        type="checkbox"
                        checked={selectedLineIds.has(r.id)}
                        onChange={() => toggleLineSelected(r.id)}
                      />
                    </td>
                    <td className="border border-black px-2 py-1">
                      R{r.round} · {r.difficulty} · S{r.setNumber}
                    </td>
                    <td className="border border-black px-2 py-1">{r.kind}</td>
                    <td className="border border-black px-2 py-1 font-bold">
                      {r.hasAudio ? "Yes" : "Missing"}
                    </td>
                    <td className="border border-black px-2 py-1">{r.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {message ? <p className="mt-2 text-sm font-bold text-green-800">{message}</p> : null}
      {error ? (
        <p className="mt-2 whitespace-pre-wrap text-sm font-bold text-red-700">{error}</p>
      ) : null}
    </BrutalPanel>
  );
}
