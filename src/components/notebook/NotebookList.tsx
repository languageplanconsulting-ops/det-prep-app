"use client";

import { Caveat } from "next/font/google";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NotebookProductionReportFullView } from "@/components/notebook/NotebookProductionReportFullView";
import { NotebookSpeakingHighlightCard } from "@/components/notebook/NotebookSpeakingHighlightCard";
import { BrutalPanel } from "@/components/ui/BrutalPanel";

const notebookHand = Caveat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
import {
  addCustomCategory,
  backfillNotebookEntriesToServer,
  canRemovePremadeCategory,
  deleteCustomCategory,
  deleteNotebookEntry,
  loadCustomCategories,
  loadNotebook,
  normalizeCategoryIds,
  NOTEBOOK_BUILTIN,
  NOTEBOOK_BUILTIN_LABELS,
  persistMigratedNotebook,
  renameCustomCategory,
  updateNotebookEntry,
} from "@/lib/notebook-storage";
import { tryParseNotebookProductionReport } from "@/lib/notebook-production-report-parse";
import type { NotebookCustomCategory, NotebookEntry } from "@/types/writing";

type SortMode = "recent" | "alpha";

const PREMADE_IDS = [
  NOTEBOOK_BUILTIN.grammar,
  NOTEBOOK_BUILTIN.vocabulary,
  NOTEBOOK_BUILTIN.productionFeedback,
] as const;

function entryHaystack(e: NotebookEntry): string {
  const origin =
    e.source === "speaking-read-and-speak"
      ? "speaking speak"
      : e.source === "speak-about-photo"
        ? "photo picture speak about image"
        : e.source === "write-about-photo"
          ? "write photo picture describe image production"
          : e.source === "reading-comprehension"
          ? "reading comprehension passage vocabulary"
          : e.source === "vocabulary-comprehension"
            ? "vocabulary context blanks synonyms"
            : e.source === "fill-in-blank"
              ? "fill blank cloze fitb literacy"
              : e.source === "interactive-conversation"
                ? "interactive conversation listening dialogue"
                : e.source === "real-word"
                  ? "real english word vocabulary authentic fake"
                  : e.source === "dialogue-summary"
                    ? "dialogue summary listening scenario transcript"
                    : e.source === "interactive-speaking"
                      ? "interactive speaking interview follow up conversation"
                      : "writing write";
  return [
    origin,
    e.titleEn,
    e.titleTh,
    e.bodyEn,
    e.bodyTh,
    e.fullBodyEn ?? "",
    e.fullBodyTh ?? "",
    e.userNote,
    e.excerpt ?? "",
    e.rubricHighlightCard
      ? [
          e.rubricHighlightCard.highlightedSnippet,
          e.rubricHighlightCard.noteEn,
          e.rubricHighlightCard.noteTh,
          e.rubricHighlightCard.topicTitleEn,
          e.rubricHighlightCard.topicTitleTh,
          String(e.rubricHighlightCard.score160),
        ].join(" ")
      : "",
  ]
    .join(" ")
    .toLowerCase();
}

function matchesSearch(e: NotebookEntry, q: string): boolean {
  const t = q.trim().toLowerCase();
  if (!t) return true;
  const h = entryHaystack(e);
  return t.split(/\s+/).every((w) => w.length === 0 || h.includes(w));
}

function categoryLabel(
  id: string,
  customs: NotebookCustomCategory[],
): string {
  if (NOTEBOOK_BUILTIN_LABELS[id]) return NOTEBOOK_BUILTIN_LABELS[id];
  return customs.find((c) => c.id === id)?.name ?? id;
}

/** Titles that are folder labels, not the learning substance — substance lives in body. */
function isGenericCategoryTitle(titleEn: string): boolean {
  const t = titleEn.trim().toLowerCase();
  if (!t) return true;
  const generic = new Set([
    ...Object.values(NOTEBOOK_BUILTIN_LABELS).map((x) => x.toLowerCase()),
    "vocabulary",
    "grammar",
    "production feedback",
    "production",
    "feedback",
    "default",
  ]);
  return generic.has(t);
}

function sourceHashtag(e: NotebookEntry): string {
  const m: Record<NotebookEntry["source"], string> = {
    "writing-read-and-write": "writing",
    "speaking-read-and-speak": "speaking",
    "speak-about-photo": "photo-speak",
    "write-about-photo": "photo-write",
    "reading-comprehension": "reading",
    "vocabulary-comprehension": "vocab-blanks",
    "fill-in-blank": "fitb",
    "interactive-conversation": "conversation",
    "real-word": "real-word",
    "dialogue-summary": "dialogue-summary",
    "interactive-speaking": "interactive-speaking",
  };
  return m[e.source] ?? "note";
}

function premadeHashtagId(id: string): string {
  if (id === NOTEBOOK_BUILTIN.grammar) return "grammar";
  if (id === NOTEBOOK_BUILTIN.vocabulary) return "vocabulary";
  if (id === NOTEBOOK_BUILTIN.productionFeedback) return "production";
  return id;
}

function renderFeedbackRichText(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line, idx, arr) => !(line === "" && arr[idx - 1] === ""));

  return lines.map((line, idx) => {
    const clean = line.trim();
    const key = `${idx}-${clean.slice(0, 24)}`;
    if (!clean) {
      return <div key={key} className="h-2" />;
    }

    const isHeading =
      clean.endsWith(":") ||
      /^score\b/i.test(clean) ||
      /^overall\b/i.test(clean) ||
      /^grammar\b/i.test(clean) ||
      /^vocabulary\b/i.test(clean) ||
      /^coherence\b/i.test(clean) ||
      /^strengths?\b/i.test(clean) ||
      /^improvement\b/i.test(clean) ||
      /^suggestions?\b/i.test(clean);
    const isBullet = /^([-*•]|\d+[.)])\s+/.test(clean);

    if (isHeading) {
      return (
        <p key={key} className="mt-3 text-xs font-black uppercase tracking-wide text-ep-blue">
          {clean}
        </p>
      );
    }

    if (isBullet) {
      return (
        <p key={key} className="pl-4 text-sm leading-relaxed text-neutral-800">
          <span className="mr-2 font-black text-ep-blue">•</span>
          {clean.replace(/^([-*•]|\d+[.)])\s+/, "")}
        </p>
      );
    }

    return (
      <p key={key} className="text-sm leading-relaxed text-neutral-900">
        {clean}
      </p>
    );
  });
}

function splitReportSections(text: string): Array<{ heading: string; body: string[] }> {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  const sections: Array<{ heading: string; body: string[] }> = [];
  let current: { heading: string; body: string[] } | null = null;

  for (const line of lines) {
    const clean = line.trim();
    const isHeading =
      clean.endsWith(":") ||
      /^overall\b/i.test(clean) ||
      /^score\b/i.test(clean) ||
      /^grammar\b/i.test(clean) ||
      /^vocabulary\b/i.test(clean) ||
      /^coherence\b/i.test(clean) ||
      /^task\b/i.test(clean) ||
      /^strengths?\b/i.test(clean) ||
      /^weaknesses?\b/i.test(clean) ||
      /^improvement\b/i.test(clean) ||
      /^suggestions?\b/i.test(clean) ||
      /^action plan\b/i.test(clean);

    if (isHeading) {
      if (current && current.body.length > 0) sections.push(current);
      current = { heading: clean.replace(/:$/, ""), body: [] };
      continue;
    }

    if (!current) current = { heading: "Report details", body: [] };
    current.body.push(clean);
  }

  if (current && current.body.length > 0) sections.push(current);
  if (sections.length === 0 && text.trim()) {
    sections.push({ heading: "Report details", body: text.split(/\r?\n/) });
  }
  return sections;
}

function refreshAll(): {
  entries: NotebookEntry[];
  categories: NotebookCustomCategory[];
} {
  return { entries: loadNotebook(), categories: loadCustomCategories() };
}

export function NotebookList() {
  const [entries, setEntries] = useState<NotebookEntry[]>([]);
  const [categories, setCategories] = useState<NotebookCustomCategory[]>([]);
  const [activeTab, setActiveTab] = useState<string>(NOTEBOOK_BUILTIN.all);
  const [sort, setSort] = useState<SortMode>("recent");
  const [search, setSearch] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [fullExpanded, setFullExpanded] = useState<Record<string, boolean>>({});

  const reload = useCallback(() => {
    const { entries: e, categories: c } = refreshAll();
    setEntries(e);
    setCategories(c);
  }, []);

  useEffect(() => {
    persistMigratedNotebook();
    reload();
  }, [reload]);

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

  const tabs = useMemo(() => {
    const built = [
      NOTEBOOK_BUILTIN.all,
      NOTEBOOK_BUILTIN.grammar,
      NOTEBOOK_BUILTIN.vocabulary,
      NOTEBOOK_BUILTIN.productionFeedback,
    ].map((id) => ({ id, label: NOTEBOOK_BUILTIN_LABELS[id] }));
    const customs = [...categories].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
    return [...built, ...customs.map((c) => ({ id: c.id, label: c.name }))];
  }, [categories]);

  const filteredSorted = useMemo(() => {
    let list = entries.filter((e) => e.categoryIds.includes(activeTab));
    list = list.filter((e) => matchesSearch(e, search));
    if (sort === "alpha") {
      list = [...list].sort((a, b) => {
        const ka = (a.titleEn.trim() || a.bodyEn).toLowerCase();
        const kb = (b.titleEn.trim() || b.bodyEn).toLowerCase();
        return ka.localeCompare(kb, undefined, { sensitivity: "base" });
      });
    } else {
      list = [...list].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return list;
  }, [entries, activeTab, search, sort]);

  const toggleCategory = (entry: NotebookEntry, catId: string, on: boolean) => {
    if (catId === NOTEBOOK_BUILTIN.all) return;
    let next = [...entry.categoryIds];
    if (on) {
      if (!next.includes(catId)) next.push(catId);
    } else {
      if (!canRemovePremadeCategory(entry.categoryIds, catId)) return;
      next = next.filter((c) => c !== catId);
    }
    updateNotebookEntry(entry.id, { categoryIds: normalizeCategoryIds(next) });
    reload();
  };

  const saveUserNote = (id: string, userNote: string) => {
    updateNotebookEntry(id, { userNote });
    reload();
  };

  const onAddCategory = () => {
    if (!newCatName.trim()) return;
    addCustomCategory(newCatName);
    setNewCatName("");
    reload();
  };

  const onDeleteCustom = (id: string) => {
    if (!confirm("Delete this category? Notes stay — they are removed from this label only."))
      return;
    deleteCustomCategory(id);
    if (activeTab === id) setActiveTab(NOTEBOOK_BUILTIN.all);
    reload();
  };

  if (entries.length === 0) {
    return (
      <BrutalPanel title="No entries yet">
        <p className="text-sm text-neutral-700">
          Use “Add to notebook” on read-and-write or read-then-speak reports. Each save goes
          into <strong>All</strong> and the folder you pick. You can recategorise and add
          your own notes here.
        </p>
      </BrutalPanel>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:justify-between">
        <label className="block min-w-[12rem] flex-1 text-sm font-bold">
          Search
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type to find text you saved…"
            className="mt-1 w-full border-2 border-black bg-white px-3 py-2 ep-stat text-sm"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase text-neutral-500">
            Sort
          </span>
          <button
            type="button"
            onClick={() => setSort("recent")}
            className={`border-2 border-black px-3 py-1.5 text-xs font-bold ${
              sort === "recent" ? "bg-ep-blue text-white" : "bg-white"
            }`}
          >
            Most recent
          </button>
          <button
            type="button"
            onClick={() => setSort("alpha")}
            className={`border-2 border-black px-3 py-1.5 text-xs font-bold ${
              sort === "alpha" ? "bg-ep-blue text-white" : "bg-white"
            }`}
          >
            A–Z
          </button>
        </div>
      </div>

      <div className="ep-brutal-sm rounded-sm border-black bg-white p-4">
        <p className="ep-stat mb-2 text-[10px] font-bold uppercase tracking-widest text-ep-blue">
          Categories
        </p>
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`rounded-sm border-2 border-black px-3 py-1.5 text-xs font-bold ${
                activeTab === t.id
                  ? "bg-ep-yellow shadow-[2px_2px_0_0_#000]"
                  : "bg-neutral-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-2 border-t-2 border-neutral-200 pt-4">
          <label className="text-xs font-bold">
            New category
            <input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Exam week"
              className="ml-2 border-2 border-black bg-white px-2 py-1 ep-stat text-sm"
            />
          </label>
          <button
            type="button"
            onClick={onAddCategory}
            className="border-2 border-black bg-ep-blue px-3 py-1.5 text-xs font-bold text-white"
          >
            Create
          </button>
        </div>
      </div>

      {categories.length > 0 ? (
        <BrutalPanel title="Rename or delete your categories">
          <ul className="space-y-3">
            {categories
              .slice()
              .sort((a, b) =>
                a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
              )
              .map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center gap-2 border-2 border-neutral-200 bg-neutral-50 p-2"
                >
                  <input
                    defaultValue={c.name}
                    key={`${c.id}:${c.name}`}
                    className="min-w-[8rem] flex-1 border-2 border-black bg-white px-2 py-1 text-sm"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== c.name) renameCustomCategory(c.id, v);
                      reload();
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => onDeleteCustom(c.id)}
                    className="border-2 border-black bg-white px-2 py-1 text-xs font-bold text-red-800"
                  >
                    Delete
                  </button>
                </li>
              ))}
          </ul>
        </BrutalPanel>
      ) : null}

      <p className="text-xs text-neutral-600">
        Showing <strong>{filteredSorted.length}</strong> in “
        {categoryLabel(activeTab, categories)}”. Tick boxes on a card to move it
        between folders. “All” is always on for every note.
      </p>

      {filteredSorted.length === 0 ? (
        <BrutalPanel title="Nothing matches">
          <p className="text-sm text-neutral-700">
            Try another category tab, clear the search, or change sort order.
          </p>
        </BrutalPanel>
      ) : (
        <ul className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-x-6 lg:gap-y-8">
          {filteredSorted.map((e) => {
            const genericTitle = isGenericCategoryTitle(e.titleEn);
            const folderTags = PREMADE_IDS.filter((id) => e.categoryIds.includes(id)).map(
              (id) => premadeHashtagId(id),
            );
            const customTags = categories
              .filter((c) => e.categoryIds.includes(c.id))
              .map((c) => c.name.replace(/\s+/g, "-").toLowerCase());
            const tagParts = [`#${sourceHashtag(e)}`, ...folderTags.map((t) => `#${t}`), ...customTags.map((t) => `#${t}`)];
            const metaTitleLine =
              genericTitle && (e.titleEn.trim() || e.titleTh.trim())
                ? [e.titleEn.trim(), e.titleTh.trim()].filter(Boolean).join(" · ")
                : null;

            const hasFullNote =
              !!(e.fullBodyEn?.trim() || e.fullBodyTh?.trim());
            const showFull = !!fullExpanded[e.id];

            return (
              <li key={e.id}>
                <section className="relative overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-br from-[#fffdf8] via-[#fffaf3] to-[#f7f4eb] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] ring-1 ring-black/[0.04] transition-shadow hover:shadow-[0_12px_36px_rgb(0,0,0,0.08)]">
                  <p className="text-[11px] leading-relaxed text-neutral-500">
                    <span className="text-neutral-500">{tagParts.join(" ")}</span>
                    <span className="text-neutral-300"> · </span>
                    <time dateTime={e.createdAt} className="text-neutral-400">
                      {new Date(e.createdAt).toLocaleString()}
                    </time>
                    {metaTitleLine ? (
                      <>
                        <span className="text-neutral-300"> · </span>
                        <span className="text-neutral-400">{metaTitleLine}</span>
                      </>
                    ) : null}
                  </p>

                  {e.rubricHighlightCard ? (
                    <div className="mt-3">
                      <NotebookSpeakingHighlightCard
                        data={e.rubricHighlightCard}
                        titleEn={e.titleEn}
                        titleTh={e.titleTh}
                      />
                    </div>
                  ) : genericTitle ? (
                    (() => {
                      const bodyEn = e.bodyEn.trim();
                      const titleTh = e.titleTh.trim();
                      const bodyTh = e.bodyTh.trim();
                      let hero: string | null = null;
                      let showThaiBelow = false;
                      if (bodyEn) {
                        hero = bodyEn;
                        showThaiBelow = !!bodyTh;
                      } else if (titleTh) {
                        hero = titleTh;
                        showThaiBelow = !!bodyTh;
                      } else if (bodyTh) {
                        hero = bodyTh;
                        showThaiBelow = false;
                      }
                      return (
                        <>
                          {hero ? (
                            <p className="mt-3 text-xl font-black leading-snug tracking-tight text-neutral-900">
                              {hero}
                            </p>
                          ) : (
                            <p className="mt-3 text-xl font-black leading-snug text-neutral-500">Saved note</p>
                          )}
                          {showThaiBelow ? (
                            <p className="mt-3 text-base leading-relaxed text-neutral-700">{bodyTh}</p>
                          ) : null}
                        </>
                      );
                    })()
                  ) : (
                    <>
                      <h2 className="mt-3 text-2xl font-black leading-tight tracking-tight text-neutral-900">
                        {e.titleEn}
                      </h2>
                      {e.titleTh.trim() ? (
                        <p className="mt-1 text-base font-semibold text-neutral-700">{e.titleTh}</p>
                      ) : null}
                      {e.bodyEn.trim() ? (
                        <p
                          className={`mt-4 text-sm leading-relaxed text-neutral-900 ${
                            hasFullNote ? "line-clamp-4" : ""
                          }`}
                        >
                          {e.bodyEn}
                        </p>
                      ) : null}
                      {e.bodyTh.trim() ? (
                        <p
                          className={`mt-2 text-sm leading-relaxed text-neutral-600 ${
                            hasFullNote ? "line-clamp-3" : ""
                          }`}
                        >
                          {e.bodyTh}
                        </p>
                      ) : null}
                    </>
                  )}

                  {e.excerpt && !e.rubricHighlightCard ? (
                    <p className="ep-stat mt-3 border-l-2 border-ep-blue/40 pl-3 text-xs italic text-neutral-500">
                      {e.excerpt}
                    </p>
                  ) : null}

                  {hasFullNote ? (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() =>
                          setFullExpanded((prev) => ({
                            ...prev,
                            [e.id]: !prev[e.id],
                          }))
                        }
                        className="rounded-lg border border-ep-blue/90 bg-ep-blue px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-ep-blue/95"
                      >
                        {showFull ? "Show less" : "See in full"}
                      </button>
                      {showFull ? (
                        <div className="mt-3 max-h-[min(72vh,38rem)] space-y-4 overflow-y-auto rounded-xl border-2 border-black/80 bg-[#f8f7f4] p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                          {(() => {
                            const parsed = tryParseNotebookProductionReport({
                              fullBodyEn: e.fullBodyEn ?? "",
                              fullBodyTh: e.fullBodyTh ?? "",
                              source: e.source,
                            });
                            if (parsed) {
                              return <NotebookProductionReportFullView data={parsed} />;
                            }
                            return (
                              <>
                                <div className="sticky top-0 z-[1] -mx-1 rounded-lg border-2 border-black bg-ep-blue px-3 py-2 text-white shadow-[2px_2px_0_0_#000]">
                                  <p className="ep-stat text-[10px] font-black uppercase tracking-widest text-ep-yellow">
                                    English Plan
                                  </p>
                                  <p className="text-sm font-black">Production Feedback Report</p>
                                </div>
                                {e.fullBodyEn?.trim() ? (
                                  <div className="rounded-lg border-2 border-black/20 bg-white p-3 shadow-sm">
                                    <p className="ep-stat inline-flex rounded-full border-2 border-black/20 bg-ep-blue/10 px-2 py-0.5 text-[10px] font-black uppercase text-ep-blue">
                                      Full feedback (EN)
                                    </p>
                                    <div className="mt-3 space-y-3">
                                      {splitReportSections(e.fullBodyEn).map((section, idx) => (
                                        <section
                                          key={`en-${idx}-${section.heading}`}
                                          className="rounded-md border border-black/10 bg-neutral-50 p-3"
                                        >
                                          <p className="ep-stat text-[10px] font-black uppercase tracking-wide text-ep-blue">
                                            {section.heading}
                                          </p>
                                          <div className="mt-2 space-y-1">
                                            {renderFeedbackRichText(section.body.join("\n"))}
                                          </div>
                                        </section>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                                {e.fullBodyTh?.trim() ? (
                                  <div className="rounded-lg border-2 border-black/20 bg-white p-3 shadow-sm">
                                    <p className="ep-stat inline-flex rounded-full border-2 border-black/20 bg-amber-100/70 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800">
                                      Full feedback (TH)
                                    </p>
                                    <div className="mt-3 space-y-3">
                                      {splitReportSections(e.fullBodyTh).map((section, idx) => (
                                        <section
                                          key={`th-${idx}-${section.heading}`}
                                          className="rounded-md border border-black/10 bg-neutral-50 p-3"
                                        >
                                          <p className="ep-stat text-[10px] font-black uppercase tracking-wide text-amber-800">
                                            {section.heading}
                                          </p>
                                          <div className="mt-2 space-y-1">
                                            {renderFeedbackRichText(section.body.join("\n"))}
                                          </div>
                                        </section>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                              </>
                            );
                          })()}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-5 border-t border-amber-200/60 pt-4">
                    <p
                      className={`${notebookHand.className} mb-2 text-lg font-semibold tracking-wide text-amber-900/70`}
                    >
                      Your note
                    </p>
                    <textarea
                      defaultValue={e.userNote}
                      key={e.id + e.userNote}
                      rows={4}
                      placeholder="Jot something down…"
                      className={`${notebookHand.className} w-full min-h-[6.5rem] resize-y rounded-2xl border border-dashed border-amber-400/45 bg-[linear-gradient(transparent_1.74rem,rgba(251,191,36,0.18)_1.75rem)] bg-[length:100%_1.75rem] bg-local px-4 py-3 text-xl leading-[1.75rem] text-neutral-800 placeholder:text-amber-900/30 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] outline-none transition-[box-shadow,border-color] focus:border-amber-500/55 focus:shadow-[inset_0_0_0_1px_rgba(245,158,11,0.15)]`}
                      onBlur={(ev) => {
                        if (ev.target.value !== e.userNote)
                          saveUserNote(e.id, ev.target.value);
                      }}
                    />
                  </div>

                  <div className="mt-4 border-t border-neutral-200 pt-4">
                    <p className="ep-stat mb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Folders
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 ep-stat text-[11px] text-neutral-600">
                      <label className="flex cursor-not-allowed items-center gap-1.5 opacity-60">
                        <input type="checkbox" checked readOnly disabled className="h-3.5 w-3.5" />
                        <span className="text-neutral-500">
                          {NOTEBOOK_BUILTIN_LABELS[NOTEBOOK_BUILTIN.all]}
                        </span>
                      </label>
                      {PREMADE_IDS.map((id) => (
                        <label key={id} className="flex cursor-pointer items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={e.categoryIds.includes(id)}
                            onChange={(ev) => toggleCategory(e, id, ev.target.checked)}
                            disabled={
                              e.categoryIds.includes(id) &&
                              !canRemovePremadeCategory(e.categoryIds, id)
                            }
                            className="h-3.5 w-3.5"
                          />
                          <span>#{premadeHashtagId(id)}</span>
                        </label>
                      ))}
                      {categories.map((c) => (
                        <label key={c.id} className="flex cursor-pointer items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={e.categoryIds.includes(c.id)}
                            onChange={(ev) => toggleCategory(e, c.id, ev.target.checked)}
                            className="h-3.5 w-3.5"
                          />
                          <span>#{c.name.replace(/\s+/g, "-").toLowerCase()}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!confirm("Remove this note from the notebook?")) return;
                        deleteNotebookEntry(e.id);
                        reload();
                      }}
                      className="rounded-lg border border-red-200/90 bg-white/80 px-3 py-1.5 text-xs font-bold text-red-800 shadow-sm transition hover:bg-red-50"
                    >
                      Delete note
                    </button>
                  </div>
                </section>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
