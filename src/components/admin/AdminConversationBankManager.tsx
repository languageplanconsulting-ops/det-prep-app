"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { deleteConversationAudioKeysForExamId } from "@/lib/conversation-audio-indexeddb";
import { CONVERSATION_ROUND_COUNT } from "@/lib/conversation-constants";
import { getAllConversationExams, removeConversationExamsByIds } from "@/lib/conversation-storage";
import { playBlinkBeep } from "@/lib/play-blink-beep";
import type { ConversationExam } from "@/types/conversation";

function sortExamsForTable(list: ConversationExam[]): ConversationExam[] {
  const diffOrder = (d: string) => (d === "easy" ? 0 : d === "medium" ? 1 : 2);
  return [...list].sort((a, b) => {
    const ra = a.round ?? 1;
    const rb = b.round ?? 1;
    if (ra !== rb) return ra - rb;
    const da = diffOrder(a.difficulty);
    const db = diffOrder(b.difficulty);
    if (da !== db) return da - db;
    return a.setNumber - b.setNumber;
  });
}

export function AdminConversationBankManager() {
  const [query, setQuery] = useState("");
  const [roundFilter, setRoundFilter] = useState<number>(0);
  const [difficultyFilter, setDifficultyFilter] = useState<"all" | "easy" | "medium" | "hard">("all");
  const [setFilter, setSetFilter] = useState<number>(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    const on = () => refresh();
    window.addEventListener("ep-conversation-storage", on);
    return () => window.removeEventListener("ep-conversation-storage", on);
  }, [refresh]);

  const allExams = useMemo(() => {
    void tick;
    return sortExamsForTable(getAllConversationExams());
  }, [tick]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allExams.filter((e) => {
      if (roundFilter > 0 && (e.round ?? 1) !== roundFilter) return false;
      if (difficultyFilter !== "all" && e.difficulty !== difficultyFilter) return false;
      if (setFilter > 0 && e.setNumber !== setFilter) return false;
      if (!q) return true;
      const hay = `${e.title} ${e.id} ${e.scenario} ${e.difficulty} ${e.setNumber} ${e.round ?? 1}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allExams, difficultyFilter, query, roundFilter, setFilter]);

  const distinctSetNumbers = useMemo(
    () => [...new Set(allExams.map((e) => e.setNumber))].sort((a, b) => a - b),
    [allExams],
  );

  const countsByDifficulty = useMemo(
    () => ({
      easy: allExams.filter((e) => e.difficulty === "easy").length,
      medium: allExams.filter((e) => e.difficulty === "medium").length,
      hard: allExams.filter((e) => e.difficulty === "hard").length,
    }),
    [allExams],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelected(new Set(filtered.map((e) => e.id)));
    playBlinkBeep();
  };

  const clearSelection = () => setSelected(new Set());

  const removeSelected = () => {
    if (selected.size === 0) return;
    const n = selected.size;
    if (
      !window.confirm(
        `Remove ${n} interactive conversation test(s) from this browser?\n\n• Exam data (localStorage)\n• Learner progress for those sets\n• Generated TTS clips in IndexedDB for those exams\n\nThis cannot be undone.`,
      )
    ) {
      return;
    }
    void (async () => {
      setBusy(true);
      setNotice(null);
      try {
        const ids = [...selected];
        removeConversationExamsByIds(ids);
        await Promise.all(ids.map((id) => deleteConversationAudioKeysForExamId(id)));
        setSelected(new Set());
        setNotice(`Removed ${n} test(s).`);
        playBlinkBeep();
        refresh();
      } catch (e) {
        setNotice(e instanceof Error ? e.message : "Remove failed.");
      } finally {
        setBusy(false);
      }
    })();
  };

  const removeSingle = (id: string, title: string) => {
    if (
      !window.confirm(
        `Remove this uploaded interactive conversation set?\n\n${title}\n\nThis will delete the set, its learner progress, and generated TTS clips from this browser.`,
      )
    ) {
      return;
    }
    void (async () => {
      setBusy(true);
      setNotice(null);
      try {
        removeConversationExamsByIds([id]);
        await deleteConversationAudioKeysForExamId(id);
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setNotice(`Removed "${title}".`);
        playBlinkBeep();
        refresh();
      } catch (e) {
        setNotice(e instanceof Error ? e.message : "Remove failed.");
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-700">
        Uploaded interactive-conversation sets in this browser are listed below. Filter the table, inspect what is
        already in the bank, then remove selected uploads when needed.
      </p>
      <div className="grid gap-2 sm:grid-cols-4">
        <div className="rounded-[4px] border-2 border-black bg-white px-3 py-2">
          <p className="text-[10px] font-black uppercase text-neutral-500">Total uploaded</p>
          <p className="text-lg font-black text-neutral-900">{allExams.length}</p>
        </div>
        <div className="rounded-[4px] border-2 border-black bg-white px-3 py-2">
          <p className="text-[10px] font-black uppercase text-neutral-500">Easy-tagged</p>
          <p className="text-lg font-black text-ep-blue">{countsByDifficulty.easy}</p>
        </div>
        <div className="rounded-[4px] border-2 border-black bg-white px-3 py-2">
          <p className="text-[10px] font-black uppercase text-neutral-500">Medium-tagged</p>
          <p className="text-lg font-black text-ep-blue">{countsByDifficulty.medium}</p>
        </div>
        <div className="rounded-[4px] border-2 border-black bg-white px-3 py-2">
          <p className="text-[10px] font-black uppercase text-neutral-500">Selected</p>
          <p className="text-lg font-black text-red-800">{selected.size}</p>
        </div>
      </div>
      {notice ? (
        <p className="rounded border-2 border-emerald-700 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900">
          {notice}
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-bold uppercase text-neutral-700">
          Search
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title, id, scenario…"
            className="mt-1 block w-[min(100%,280px)] border-2 border-black bg-white px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-bold uppercase text-neutral-700">
          Round
          <select
            value={roundFilter}
            onChange={(e) => setRoundFilter(Number(e.target.value))}
            className="mt-1 block border-2 border-black bg-white px-2 py-1.5 text-sm font-bold"
          >
            <option value={0}>All rounds</option>
            {Array.from({ length: CONVERSATION_ROUND_COUNT }, (_, i) => i + 1).map((r) => (
              <option key={r} value={r}>
                Round {r}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold uppercase text-neutral-700">
          Tag
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value as "all" | "easy" | "medium" | "hard")}
            className="mt-1 block border-2 border-black bg-white px-2 py-1.5 text-sm font-bold"
          >
            <option value="all">All tags</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <label className="text-xs font-bold uppercase text-neutral-700">
          Set
          <select
            value={setFilter}
            onChange={(e) => setSetFilter(Number(e.target.value))}
            className="mt-1 block border-2 border-black bg-white px-2 py-1.5 text-sm font-bold"
          >
            <option value={0}>All sets</option>
            {distinctSetNumbers.map((setNumber) => (
              <option key={setNumber} value={setNumber}>
                Set {setNumber}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={selectAllFiltered}
          className="border-2 border-black bg-neutral-100 px-3 py-1.5 text-xs font-black uppercase"
        >
          Select all (filtered)
        </button>
        <button
          type="button"
          onClick={clearSelection}
          className="border-2 border-black bg-white px-3 py-1.5 text-xs font-black uppercase"
        >
          Clear selection
        </button>
        <button
          type="button"
          disabled={busy || selected.size === 0}
          onClick={removeSelected}
          className="border-2 border-red-700 bg-red-50 px-3 py-1.5 text-xs font-black uppercase text-red-900 disabled:opacity-40"
        >
          {busy ? "Removing…" : `Remove selected (${selected.size})`}
        </button>
      </div>

      <div className="overflow-x-auto rounded-[4px] border-2 border-black bg-white">
        <table className="w-full min-w-[720px] border-collapse text-left text-[11px]">
          <thead>
            <tr className="bg-neutral-100">
              <th className="border border-black px-2 py-1.5 font-black w-10"> </th>
              <th className="border border-black px-2 py-1.5 font-black">R</th>
              <th className="border border-black px-2 py-1.5 font-black">Tag</th>
              <th className="border border-black px-2 py-1.5 font-black">Set</th>
              <th className="border border-black px-2 py-1.5 font-black">Title</th>
              <th className="border border-black px-2 py-1.5 font-black">Id</th>
              <th className="border border-black px-2 py-1.5 font-black">Scenario (preview)</th>
              <th className="border border-black px-2 py-1.5 font-black">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="border border-black px-3 py-6 text-center font-semibold text-neutral-500">
                  No tests match this filter.
                </td>
              </tr>
            ) : (
              filtered.map((e) => {
                const prev = (e.scenario ?? "").replace(/\s+/g, " ").trim().slice(0, 72);
                return (
                  <tr key={e.id} className="odd:bg-white even:bg-neutral-50">
                    <td className="border border-black px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={selected.has(e.id)}
                        onChange={() => toggle(e.id)}
                        className="h-4 w-4 accent-ep-blue"
                      />
                    </td>
                    <td className="border border-black px-2 py-1.5 font-bold">{e.round ?? 1}</td>
                    <td className="border border-black px-2 py-1.5 ep-stat">{e.difficulty}</td>
                    <td className="border border-black px-2 py-1.5 font-mono font-bold">{e.setNumber}</td>
                    <td className="border border-black px-2 py-1.5 font-semibold text-neutral-900">{e.title}</td>
                    <td className="border border-black px-2 py-1.5 font-mono text-[10px] text-neutral-600">{e.id}</td>
                    <td className="border border-black px-2 py-1.5 text-neutral-700">{prev || "—"}</td>
                    <td className="border border-black px-2 py-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => removeSingle(e.id, e.title)}
                        className="border border-red-700 bg-red-50 px-2 py-1 text-[10px] font-black uppercase text-red-900 disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-neutral-500">
        Data lives in this browser only (localStorage + IndexedDB). Removing here does not affect other admins’ machines.
      </p>
    </div>
  );
}
