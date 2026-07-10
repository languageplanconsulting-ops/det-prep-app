"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { NotebookMatchingGame } from "@/components/notebook/NotebookMatchingGame";
import { NotebookProductionReportFullView } from "@/components/notebook/NotebookProductionReportFullView";
import { NotebookSpeakingHighlightCard } from "@/components/notebook/NotebookSpeakingHighlightCard";
import { tryParseNotebookProductionReport } from "@/lib/notebook-production-report-parse";
import {
  addCustomCategory,
  backfillNotebookEntriesToServer,
  deleteNotebookEntry,
  hydrateNotebookFromServer,
  loadCustomCategories,
  loadNotebook,
  NOTEBOOK_BUILTIN,
  NOTEBOOK_BUILTIN_LABELS,
  updateNotebookEntry,
} from "@/lib/notebook-storage";
import type { NotebookCustomCategory, NotebookEntry } from "@/types/writing";

/**
 * NotebookListV2 — soft-modern redesign (Cagan + Krug), launched to all users.
 * Reuses the EXACT same storage layer, report parser, and sub-components as the
 * original NotebookList, which remains in git history for rollback.
 */

const SOURCE_TAG: Record<NotebookEntry["source"], string> = {
  "writing-read-and-write": "read-write",
  "speaking-read-and-speak": "read-speak",
  "speak-about-photo": "speak-photo",
  "write-about-photo": "write-photo",
  "reading-comprehension": "reading",
  "vocabulary-comprehension": "vocabulary",
  "fill-in-blank": "fill-blank",
  "interactive-conversation": "conversation",
  "real-word": "real-word",
  "dialogue-summary": "dialogue",
  "interactive-speaking": "interactive-speak",
  "mini-study-lesson": "mini-study",
  "campus-vocab": "campus-vocab",
};

type EntryType = "production" | "grammar" | "vocabulary" | "note";

function entryType(e: NotebookEntry): EntryType {
  if (e.categoryIds.includes(NOTEBOOK_BUILTIN.productionFeedback)) return "production";
  if (e.categoryIds.includes(NOTEBOOK_BUILTIN.grammar)) return "grammar";
  if (e.categoryIds.includes(NOTEBOOK_BUILTIN.vocabulary)) return "vocabulary";
  return "note";
}

const TYPE_BADGE: Record<EntryType, { label: string; cls: string }> = {
  production: { label: "📊 รายงาน", cls: "bg-sky-100 text-sky-700" },
  grammar: { label: "✍️ ไวยากรณ์", cls: "bg-violet-100 text-violet-700" },
  vocabulary: { label: "📚 คำศัพท์", cls: "bg-emerald-100 text-emerald-700" },
  note: { label: "📝 โน้ต", cls: "bg-slate-100 text-slate-600" },
};

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function haystack(e: NotebookEntry): string {
  return [e.titleEn, e.titleTh, e.bodyEn, e.bodyTh, e.userNote, e.excerpt]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function NotebookListV2() {
  const [entries, setEntries] = useState<NotebookEntry[]>([]);
  const [categories, setCategories] = useState<NotebookCustomCategory[]>([]);
  const [activeTab, setActiveTab] = useState<string>(NOTEBOOK_BUILTIN.all);
  const [search, setSearch] = useState("");
  const [newCat, setNewCat] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [fullOpen, setFullOpen] = useState<Record<string, boolean>>({});
  const [review, setReview] = useState<{ open: boolean; idx: number; flipped: boolean }>({
    open: false,
    idx: 0,
    flipped: false,
  });
  const [reviewMode, setReviewMode] = useState<"closed" | "choice" | "flip" | "match">("closed");
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  // Lock background scroll while any review overlay is open — otherwise a
  // touchmove/scroll behind a fixed-inset modal can still move the page. This is
  // the ONLY place that touches document.body.style.overflow for review overlays —
  // NotebookMatchingGame does NOT lock its own (two independent lock/restore
  // effects race on cleanup order and can leave scroll permanently stuck off).
  useEffect(() => {
    if (reviewMode === "closed") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [reviewMode]);

  const reload = useCallback(() => {
    setEntries(loadNotebook());
    setCategories(loadCustomCategories());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Pull in entries saved elsewhere (mobile app, other browsers/devices) — the
  // list would otherwise only ever show this browser's localStorage cache.
  useEffect(() => {
    let cancelled = false;
    void hydrateNotebookFromServer()
      .then((serverEntries) => {
        if (cancelled) return;
        setEntries(serverEntries);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // One-time: push any entries that only ever made it to localStorage (e.g. a
  // save that happened while the server sync call failed) up to the server too.
  useEffect(() => {
    const key = "ep-notebook-server-backfill-v1";
    if (typeof sessionStorage === "undefined") return;
    if (sessionStorage.getItem(key)) return;
    const snapshot = loadNotebook();
    if (snapshot.length === 0) {
      sessionStorage.setItem(key, "1");
      return;
    }
    void backfillNotebookEntriesToServer(snapshot).finally(() => {
      sessionStorage.setItem(key, "1");
    });
  }, []);

  const MASTERED_TAB = "mastered";

  const counts = useMemo(
    () => ({
      vocabulary: entries.filter(
        (e) => e.categoryIds.includes(NOTEBOOK_BUILTIN.vocabulary) && !e.mastered,
      ).length,
      grammar: entries.filter((e) => e.categoryIds.includes(NOTEBOOK_BUILTIN.grammar)).length,
      production: entries.filter((e) =>
        e.categoryIds.includes(NOTEBOOK_BUILTIN.productionFeedback),
      ).length,
      mastered: entries.filter((e) => e.mastered).length,
    }),
    [entries],
  );

  const chips = useMemo(() => {
    const base: { id: string; label: string }[] = [
      { id: NOTEBOOK_BUILTIN.all, label: `ทั้งหมด · ${entries.length}` },
      { id: NOTEBOOK_BUILTIN.vocabulary, label: `📚 คำศัพท์ · ${counts.vocabulary}` },
      { id: NOTEBOOK_BUILTIN.grammar, label: `✍️ ไวยากรณ์ · ${counts.grammar}` },
      { id: NOTEBOOK_BUILTIN.productionFeedback, label: `📊 รายงาน · ${counts.production}` },
    ];
    if (counts.mastered > 0) {
      base.push({ id: MASTERED_TAB, label: `🧠 จำได้แล้ว · ${counts.mastered}` });
    }
    const custom = categories.map((c) => ({
      id: c.id,
      label: `${c.name} · ${entries.filter((e) => e.categoryIds.includes(c.id)).length}`,
    }));
    return [...base, ...custom];
  }, [entries, categories, counts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries
      .filter((e) => {
        if (activeTab === MASTERED_TAB) return !!e.mastered;
        if (activeTab === NOTEBOOK_BUILTIN.all) return true;
        if (activeTab === NOTEBOOK_BUILTIN.vocabulary) {
          return e.categoryIds.includes(activeTab) && !e.mastered;
        }
        return e.categoryIds.includes(activeTab);
      })
      .filter((e) => !q || haystack(e).includes(q))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [entries, activeTab, search]);

  const reviewDeck = useMemo(
    () =>
      entries.filter(
        (e) => e.categoryIds.includes(NOTEBOOK_BUILTIN.vocabulary) && !e.mastered,
      ),
    [entries],
  );

  const saveNote = (id: string) => {
    const value = noteDraft[id];
    if (value === undefined) return;
    updateNotebookEntry(id, { userNote: value });
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, userNote: value } : e)));
  };

  const removeEntry = (id: string) => {
    if (!window.confirm("ลบโน้ตนี้ออกจาก Notebook?")) return;
    deleteNotebookEntry(id);
    reload();
  };

  const setMastered = (id: string, mastered: boolean) => {
    updateNotebookEntry(id, { mastered });
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, mastered } : e)));
  };

  const createCategory = () => {
    const name = newCat.trim();
    if (!name) return;
    addCustomCategory(name);
    setNewCat("");
    setAddingCat(false);
    reload();
  };

  // Review deck = vocabulary entries only. Never fall back to all entries —
  // production-report/grammar cards have no front-of-card word and would render blank.
  const deck = reviewDeck;
  const reviewCard = deck[review.idx];

  return (
    <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-wider text-[#004AAD]">สมุดของฉัน</p>
      <h1 className="mt-1 text-3xl font-bold">Notebook</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        ทุกคำศัพท์ จุดไวยากรณ์ และรายงานที่คุณเก็บจากการฝึก · เก็บไว้ทบทวนก่อนสอบ
      </p>

      {/* Outcome strip (Cagan) */}
      <div className="mt-4 flex flex-col gap-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200 sm:flex-row sm:items-center">
        <div className="grid flex-1 grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-3xl font-bold leading-none text-[#004AAD]">{counts.vocabulary}</p>
            <p className="mt-1 text-xs text-slate-500">📚 คำศัพท์</p>
          </div>
          <div>
            <p className="text-3xl font-bold leading-none text-violet-600">{counts.grammar}</p>
            <p className="mt-1 text-xs text-slate-500">✍️ ไวยากรณ์</p>
          </div>
          <div>
            <p className="text-3xl font-bold leading-none text-emerald-600">{counts.production}</p>
            <p className="mt-1 text-xs text-slate-500">📊 รายงาน</p>
          </div>
        </div>
        <div className="text-center sm:border-l sm:border-slate-200 sm:pl-5">
          <p className="mb-2 text-xs text-slate-500">{reviewDeck.length} คำพร้อมทบทวน</p>
          <button
            type="button"
            disabled={!deck.length}
            onClick={() => setReviewMode("choice")}
            className="inline-flex items-center gap-2 rounded-xl bg-[#004AAD] px-5 py-2.5 text-sm font-bold text-[#FFCC00] disabled:opacity-40"
          >
            🎴 เริ่มทบทวน
          </button>
        </div>
      </div>

      {/* Coach tip */}
      <div className="mt-4 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#004AAD] text-xl font-extrabold text-[#FFCC00] ring-[2.5px] ring-[#FFCC00]">
          D
        </div>
        <div className="relative flex-1 rounded-2xl rounded-tl-sm border border-[#004AAD]/10 bg-white px-3.5 py-3 shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
          <span className="absolute -left-[7px] top-3.5 h-0 w-0 border-y-[6px] border-r-[7px] border-y-transparent border-r-white" />
          <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-[#FFCC00] px-2.5 py-[5px] text-[10px] font-extrabold uppercase leading-none tracking-wide text-[#004AAD]">
            <span className="text-[11px] leading-none">✨</span>Tips from P&apos;Doy
          </span>
          <p className="text-[13px] leading-6 text-slate-800">
            กด <strong>&ldquo;เริ่มทบทวน&rdquo;</strong> วันละ 5 นาที — ทบทวนคำที่เคยเก็บไว้
            จำได้แน่นกว่าท่องเฉยๆ
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mt-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-[#004AAD] focus:outline-none"
          placeholder="🔍 ค้นหาคำหรือข้อความที่เก็บไว้…"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiveTab(c.id)}
            className={`rounded-full border px-4 py-1.5 text-[13px] font-bold transition ${
              activeTab === c.id
                ? "border-[#004AAD] bg-[#004AAD] text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-[#004AAD]"
            }`}
          >
            {c.label}
          </button>
        ))}
        {addingCat ? (
          <span className="inline-flex items-center gap-1">
            <input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createCategory()}
              autoFocus
              placeholder="ชื่อโฟลเดอร์"
              className="rounded-full border border-slate-300 px-3 py-1.5 text-[13px]"
            />
            <button
              type="button"
              onClick={createCategory}
              className="rounded-full bg-[#004AAD] px-3 py-1.5 text-[13px] font-bold text-white"
            >
              เพิ่ม
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setAddingCat(true)}
            className="rounded-full border border-dashed border-slate-300 px-4 py-1.5 text-[13px] font-bold text-slate-500 hover:border-[#004AAD]"
          >
            ＋ โฟลเดอร์ใหม่
          </button>
        )}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          ยังไม่มีรายการในหมวดนี้ · กด &ldquo;Add to notebook&rdquo; จากหน้าผลข้อสอบเพื่อเก็บคำหรือจุดที่ต้องทบทวน
        </div>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {filtered.map((e) => {
            const t = entryType(e);
            const badge = TYPE_BADGE[t];
            const showFull = !!fullOpen[e.id];
            return (
              <div
                key={e.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[#004AAD] hover:shadow-[0_8px_22px_rgba(0,74,173,0.07)]"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${badge.cls}`}
                  >
                    {badge.label}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    #{SOURCE_TAG[e.source]} · {fmtDate(e.createdAt)}
                  </span>
                </div>

                {e.rubricHighlightCard ? (
                  <NotebookSpeakingHighlightCard
                    data={e.rubricHighlightCard}
                    titleEn={e.titleEn}
                    titleTh={e.titleTh}
                  />
                ) : (
                  <>
                    {e.titleEn ? <p className="text-xl font-bold text-slate-900">{e.titleEn}</p> : null}
                    {e.titleTh ? <p className="mt-0.5 text-sm text-slate-600">{e.titleTh}</p> : null}
                    {e.bodyEn ? (
                      <p className="mt-2 text-[13px] leading-6 text-slate-700">{e.bodyEn}</p>
                    ) : null}
                    {e.bodyTh ? (
                      <p className="mt-1 text-[13px] leading-6 text-slate-500">{e.bodyTh}</p>
                    ) : null}
                    {e.excerpt ? (
                      <p className="mt-2 border-l-2 border-slate-200 pl-2.5 text-[13px] italic text-slate-400">
                        {e.excerpt}
                      </p>
                    ) : null}
                  </>
                )}

                {e.fullBodyEn ? (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setFullOpen((p) => ({ ...p, [e.id]: !p[e.id] }))}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      {showFull ? "ซ่อนรายงาน" : "📖 ดูรายงานเต็ม"}
                    </button>
                    {showFull ? (
                      <div className="mt-3 max-h-[min(72vh,38rem)] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                        {(() => {
                          const parsed = tryParseNotebookProductionReport({
                            fullBodyEn: e.fullBodyEn ?? "",
                            fullBodyTh: e.fullBodyTh ?? "",
                            source: e.source,
                          });
                          return parsed ? (
                            <NotebookProductionReportFullView data={parsed} />
                          ) : (
                            <p className="whitespace-pre-wrap p-3 text-[13px] text-slate-700">
                              {e.fullBodyEn}
                            </p>
                          );
                        })()}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* Note */}
                <div className="mt-3 rounded-lg bg-amber-50 p-3 ring-1 ring-amber-100">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                    โน้ตของฉัน
                  </p>
                  <textarea
                    key={e.id + e.userNote}
                    defaultValue={e.userNote}
                    onChange={(ev) => setNoteDraft((p) => ({ ...p, [e.id]: ev.target.value }))}
                    onBlur={() => saveNote(e.id)}
                    rows={2}
                    placeholder="จดอะไรไว้สักหน่อย…"
                    className="w-full resize-none rounded-md bg-transparent text-[13px] text-slate-700 placeholder:text-amber-700/40 focus:outline-none"
                  />
                </div>

                <div className="mt-2 flex justify-end gap-2">
                  {e.mastered ? (
                    <button
                      type="button"
                      onClick={() => setMastered(e.id, false)}
                      className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                    >
                      ↩️ กลับไปทบทวน
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeEntry(e.id)}
                    className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mode choice — portaled to <body> so it always centers on the viewport,
          never on an ancestor's scroll height (see NOTEBOOK flashcard fix). */}
      {reviewMode === "choice" && portalReady
        ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800">อยากทบทวนแบบไหน?</p>
              <button
                type="button"
                onClick={() => setReviewMode("closed")}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600"
              >
                ✕ ปิด
              </button>
            </div>
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => {
                  setReview({ open: true, idx: 0, flipped: false });
                  setReviewMode("flip");
                }}
                className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-[#004AAD]"
              >
                <p className="text-sm font-bold text-slate-900">🎴 พลิกการ์ด</p>
                <p className="mt-1 text-xs text-slate-500">
                  ไล่ดูคำศัพท์ทีละใบ พลิกดูคำแปล
                </p>
              </button>
              <button
                type="button"
                onClick={() => setReviewMode("match")}
                className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-[#004AAD]"
              >
                <p className="text-sm font-bold text-slate-900">🧩 เกมจับคู่</p>
                <p className="mt-1 text-xs text-slate-500">
                  แตะคำศัพท์แล้วแตะความหมายที่ตรงกัน (สูงสุด 20 คำ)
                </p>
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
        : null}

      {/* Matching game — self-portals internally, see NotebookMatchingGame.tsx */}
      {reviewMode === "match" ? (
        <NotebookMatchingGame
          deck={deck}
          onMastered={(id) => setMastered(id, true)}
          onClose={() => setReviewMode("closed")}
        />
      ) : null}

      {/* Review overlay (flashcard) — portaled to <body>, same reason as the choice modal. */}
      {reviewMode === "flip" && review.open && reviewCard && portalReady
        ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto">
            <div className="mb-3 flex items-center justify-between text-white">
              <span className="text-xs font-bold uppercase tracking-wide text-[#FFCC00]">
                การ์ด {review.idx + 1} / {deck.length}
              </span>
              <button
                type="button"
                onClick={() => {
                  setReview({ open: false, idx: 0, flipped: false });
                  setReviewMode("closed");
                }}
                className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold"
              >
                ✕ ปิด
              </button>
            </div>
            <button
              type="button"
              onClick={() => setReview((r) => ({ ...r, flipped: !r.flipped }))}
              className="flex min-h-[200px] w-full flex-col items-center justify-center rounded-2xl bg-white p-8 text-center shadow-xl"
            >
              {review.flipped ? (
                <>
                  <p className="text-lg font-semibold text-slate-900">
                    {reviewCard.titleTh || reviewCard.bodyTh || reviewCard.bodyEn}
                  </p>
                  {reviewCard.bodyEn ? (
                    <p className="mt-2 text-sm text-slate-500">{reviewCard.bodyEn}</p>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-slate-900">{reviewCard.titleEn}</p>
                  <p className="mt-4 text-xs text-slate-400">แตะเพื่อดูคำแปล →</p>
                </>
              )}
            </button>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setReview((r) => ({
                    open: true,
                    idx: Math.min(r.idx + 1, deck.length - 1),
                    flipped: false,
                  }))
                }
                className="rounded-xl bg-white/15 px-5 py-2 text-sm font-bold text-white"
              >
                😕 ยังไม่แม่น
              </button>
              <button
                type="button"
                onClick={() => {
                  if (review.idx + 1 >= deck.length) {
                    setReview({ open: false, idx: 0, flipped: false });
                  } else {
                    setReview((r) => ({ open: true, idx: r.idx + 1, flipped: false }));
                  }
                }}
                className="rounded-xl bg-[#FFCC00] px-5 py-2 text-sm font-bold text-[#004AAD]"
              >
                😎 จำได้แล้ว
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
        : null}
    </main>
  );
}
