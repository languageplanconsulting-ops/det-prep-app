import type { PhotoSpeakAttemptReport, PhotoSpeakItem } from "@/types/photo-speak";
import defaultItems from "@/data/default-photo-speak-items.json";

const ITEMS_KEY = "ep-photo-speak-items";
const REPORT_PREFIX = "ep-photo-speak-report:";

export function loadPhotoSpeakItems(): PhotoSpeakItem[] {
  if (typeof window === "undefined") return defaultItems as PhotoSpeakItem[];
  try {
    const raw = localStorage.getItem(ITEMS_KEY);
    if (!raw) return defaultItems as PhotoSpeakItem[];
    const parsed = JSON.parse(raw) as PhotoSpeakItem[];
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : (defaultItems as PhotoSpeakItem[]);
  } catch {
    return defaultItems as PhotoSpeakItem[];
  }
}

export function savePhotoSpeakItems(items: PhotoSpeakItem[]): void {
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
}

export function mergePhotoSpeakItemsFromAdmin(incoming: PhotoSpeakItem[]): PhotoSpeakItem[] {
  const current = loadPhotoSpeakItems();
  const map = new Map<string, PhotoSpeakItem>();
  for (const t of current) map.set(t.id, t);
  for (const t of incoming) map.set(t.id, t);
  const merged = [...map.values()];
  savePhotoSpeakItems(merged);
  return merged;
}

export function removePhotoSpeakItemsByIds(ids: string[]): void {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  const next = loadPhotoSpeakItems().filter((t) => !idSet.has(t.id));
  savePhotoSpeakItems(next);
}

export function getPhotoSpeakItemById(id: string): PhotoSpeakItem | undefined {
  return loadPhotoSpeakItems().find((t) => t.id === id);
}

export function savePhotoSpeakReport(report: PhotoSpeakAttemptReport): void {
  localStorage.setItem(`${REPORT_PREFIX}${report.attemptId}`, JSON.stringify(report));
}

export function loadPhotoSpeakReport(attemptId: string): PhotoSpeakAttemptReport | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${REPORT_PREFIX}${attemptId}`);
    if (!raw) return null;
    return JSON.parse(raw) as PhotoSpeakAttemptReport;
  } catch {
    return null;
  }
}
