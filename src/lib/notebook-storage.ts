import type { NotebookCustomCategory, NotebookEntry } from "@/types/writing";

const ENTRIES_KEY = "ep-notebook-entries";
const CATEGORIES_KEY = "ep-notebook-categories";

/** Built-in category ids (stable). Every entry should include `all` plus ≥1 premade content bucket. */
export const NOTEBOOK_BUILTIN = {
  all: "all",
  grammar: "grammar",
  vocabulary: "vocabulary",
  productionFeedback: "production-feedback",
} as const;

export const NOTEBOOK_BUILTIN_LABELS: Record<string, string> = {
  [NOTEBOOK_BUILTIN.all]: "All",
  [NOTEBOOK_BUILTIN.grammar]: "Grammar",
  [NOTEBOOK_BUILTIN.vocabulary]: "Vocabulary",
  [NOTEBOOK_BUILTIN.productionFeedback]: "Production feedback",
};

const PREMADE_CONTENT = [
  NOTEBOOK_BUILTIN.grammar,
  NOTEBOOK_BUILTIN.vocabulary,
  NOTEBOOK_BUILTIN.productionFeedback,
] as const;

type LegacyNotebookRow = {
  id: string;
  source?: string;
  category: string;
  titleEn: string;
  titleTh: string;
  bodyEn: string;
  bodyTh: string;
  excerpt?: string;
  attemptId?: string;
  createdAt: string;
};

function isLegacyRow(o: Record<string, unknown>): o is LegacyNotebookRow {
  return typeof o.category === "string" && !Array.isArray(o.categoryIds);
}

function migrateEntry(raw: unknown): NotebookEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!o.id || !o.createdAt) return null;

  let categoryIds: string[];
  let userNote: string;

  if (isLegacyRow(o)) {
    const map: Record<string, string[]> = {
      grammar: [NOTEBOOK_BUILTIN.all, NOTEBOOK_BUILTIN.grammar],
      vocabulary: [NOTEBOOK_BUILTIN.all, NOTEBOOK_BUILTIN.vocabulary],
      coherence: [NOTEBOOK_BUILTIN.all, NOTEBOOK_BUILTIN.productionFeedback],
      task: [NOTEBOOK_BUILTIN.all, NOTEBOOK_BUILTIN.productionFeedback],
      improvement: [NOTEBOOK_BUILTIN.all, NOTEBOOK_BUILTIN.productionFeedback],
      general: [NOTEBOOK_BUILTIN.all, NOTEBOOK_BUILTIN.productionFeedback],
    };
    categoryIds = map[o.category] ?? [
      NOTEBOOK_BUILTIN.all,
      NOTEBOOK_BUILTIN.productionFeedback,
    ];
    userNote = "";
  } else {
    categoryIds = Array.isArray(o.categoryIds)
      ? (o.categoryIds as string[]).filter((s) => typeof s === "string")
      : [NOTEBOOK_BUILTIN.all, NOTEBOOK_BUILTIN.productionFeedback];
    userNote = typeof o.userNote === "string" ? o.userNote : "";
  }

  const rawSource = o.source;
  const source: NotebookEntry["source"] =
    rawSource === "speaking-read-and-speak"
      ? "speaking-read-and-speak"
      : rawSource === "speak-about-photo"
        ? "speak-about-photo"
        : rawSource === "write-about-photo"
          ? "write-about-photo"
          : rawSource === "reading-comprehension"
          ? "reading-comprehension"
          : rawSource === "vocabulary-comprehension"
            ? "vocabulary-comprehension"
            : rawSource === "fill-in-blank"
              ? "fill-in-blank"
              : rawSource === "interactive-conversation"
                ? "interactive-conversation"
                : rawSource === "real-word"
                  ? "real-word"
                  : rawSource === "dialogue-summary"
                    ? "dialogue-summary"
                    : "writing-read-and-write";

  return {
    id: String(o.id),
    source,
    categoryIds: normalizeCategoryIds(categoryIds),
    titleEn: String(o.titleEn ?? ""),
    titleTh: String(o.titleTh ?? ""),
    bodyEn: String(o.bodyEn ?? ""),
    bodyTh: String(o.bodyTh ?? ""),
    fullBodyEn: typeof o.fullBodyEn === "string" ? o.fullBodyEn : undefined,
    fullBodyTh: typeof o.fullBodyTh === "string" ? o.fullBodyTh : undefined,
    userNote,
    excerpt: o.excerpt != null ? String(o.excerpt) : undefined,
    attemptId: o.attemptId != null ? String(o.attemptId) : undefined,
    createdAt: String(o.createdAt),
  };
}

export function normalizeCategoryIds(ids: string[]): string[] {
  const set = new Set(ids.map((s) => s.trim()).filter(Boolean));
  set.add(NOTEBOOK_BUILTIN.all);
  const hasPremade = PREMADE_CONTENT.some((p) => set.has(p));
  if (!hasPremade) set.add(NOTEBOOK_BUILTIN.productionFeedback);
  return [...set];
}

function premadeCount(ids: string[]): number {
  return PREMADE_CONTENT.filter((p) => ids.includes(p)).length;
}

export function canRemovePremadeCategory(
  ids: string[],
  removeId: string,
): boolean {
  if (!PREMADE_CONTENT.includes(removeId as (typeof PREMADE_CONTENT)[number]))
    return true;
  const next = ids.filter((x) => x !== removeId);
  return premadeCount(next) >= 1;
}

export function loadNotebook(): NotebookEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    const migrated = parsed
      .map(migrateEntry)
      .filter((e): e is NotebookEntry => e !== null);
    return migrated;
  } catch {
    return [];
  }
}

export function saveNotebook(entries: NotebookEntry[]): void {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

export function loadCustomCategories(): NotebookCustomCategory[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NotebookCustomCategory[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomCategories(cats: NotebookCustomCategory[]): void {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats));
}

export function addCustomCategory(name: string): NotebookCustomCategory {
  const trimmed = name.trim();
  const cat: NotebookCustomCategory = {
    id: `custom-${crypto.randomUUID()}`,
    name: trimmed || "Untitled",
    createdAt: new Date().toISOString(),
  };
  const list = loadCustomCategories();
  list.push(cat);
  saveCustomCategories(list);
  return cat;
}

export function renameCustomCategory(id: string, name: string): void {
  const list = loadCustomCategories().map((c) =>
    c.id === id ? { ...c, name: name.trim() || c.name } : c,
  );
  saveCustomCategories(list);
}

export function deleteCustomCategory(id: string): void {
  saveCustomCategories(loadCustomCategories().filter((c) => c.id !== id));
  const entries = loadNotebook().map((e) => ({
    ...e,
    categoryIds: normalizeCategoryIds(e.categoryIds.filter((c) => c !== id)),
  }));
  saveNotebook(entries);
}

export function addNotebookEntry(
  entry: Omit<NotebookEntry, "id" | "createdAt">,
): NotebookEntry {
  const src: NotebookEntry["source"] =
    entry.source === "speaking-read-and-speak"
      ? "speaking-read-and-speak"
      : entry.source === "speak-about-photo"
        ? "speak-about-photo"
        : entry.source === "write-about-photo"
          ? "write-about-photo"
          : entry.source === "reading-comprehension"
          ? "reading-comprehension"
          : entry.source === "vocabulary-comprehension"
            ? "vocabulary-comprehension"
            : entry.source === "fill-in-blank"
              ? "fill-in-blank"
              : entry.source === "interactive-conversation"
                ? "interactive-conversation"
                : entry.source === "real-word"
                  ? "real-word"
                  : entry.source === "dialogue-summary"
                    ? "dialogue-summary"
                    : "writing-read-and-write";
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `nb-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  const full: NotebookEntry = {
    ...entry,
    source: src,
    categoryIds: normalizeCategoryIds(entry.categoryIds),
    userNote: entry.userNote?.trim() ?? "",
    id,
    createdAt: new Date().toISOString(),
  };
  const list = loadNotebook();
  list.unshift(full);
  try {
    saveNotebook(list);
  } catch {
    throw new Error(
      "Notebook save failed — this browser may block storage or be full.",
    );
  }
  return full;
}

export function updateNotebookEntry(
  id: string,
  patch: Partial<Pick<NotebookEntry, "categoryIds" | "userNote" | "fullBodyEn" | "fullBodyTh">>,
): void {
  const list = loadNotebook();
  const i = list.findIndex((e) => e.id === id);
  if (i === -1) return;
  const next = { ...list[i], ...patch };
  if (patch.categoryIds) {
    next.categoryIds = normalizeCategoryIds(patch.categoryIds);
  }
  list[i] = next;
  saveNotebook(list);
}

export function deleteNotebookEntry(id: string): void {
  saveNotebook(loadNotebook().filter((e) => e.id !== id));
}

/** One-time rewrite after migration (optional compact). */
export function persistMigratedNotebook(): void {
  saveNotebook(loadNotebook());
}
