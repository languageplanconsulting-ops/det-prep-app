export type PhotoSpeakTaskType = "write_about_photo" | "speak_about_photo";

export interface PhotoSpeakItemProgress {
  item_id: string;
  latest_score160: number;
  best_score160: number;
  latest_attempt_id: string;
  attempt_count: number;
  updated_at: string;
}

export interface PhotoSpeakItemWithProgress {
  id: string;
  title_en: string;
  title_th: string;
  image_url: string;
  prompt_en: string;
  prompt_th: string;
  keywords: string[];
  context_en: string | null;
  license: string | null;
  license_version: string | null;
  license_url: string | null;
  creator: string | null;
  attribution: string | null;
  landing_url: string | null;
  provider: string | null;
  sort_order: number;
  progress: PhotoSpeakItemProgress | null;
}

// Same-page components (hub label, set list, session view) often request the same
// taskType during one navigation; cache in-flight/resolved requests so they share one call.
const cache = new Map<PhotoSpeakTaskType, Promise<PhotoSpeakItemWithProgress[]>>();

async function fetchFresh(taskType: PhotoSpeakTaskType): Promise<PhotoSpeakItemWithProgress[]> {
  const res = await fetch(`/api/photo-speak/items?taskType=${taskType}`, {
    credentials: "same-origin",
  });
  const data = (await res.json()) as { items?: PhotoSpeakItemWithProgress[]; error?: string };
  if (!res.ok) throw new Error(data.error || `Failed to load items (${res.status})`);
  return data.items ?? [];
}

export function fetchPhotoSpeakItems(taskType: PhotoSpeakTaskType): Promise<PhotoSpeakItemWithProgress[]> {
  const cached = cache.get(taskType);
  if (cached) return cached;
  const promise = fetchFresh(taskType).catch((err) => {
    cache.delete(taskType);
    throw err;
  });
  cache.set(taskType, promise);
  return promise;
}

/** Call after a submission so the next fetch reflects the fresh server-tracked progress. */
export function invalidatePhotoSpeakItemsCache(taskType?: PhotoSpeakTaskType): void {
  if (taskType) cache.delete(taskType);
  else cache.clear();
}

export function photoSpeakRoundNumber(sortOrder: number, itemsPerRound = 10): number {
  return Math.floor(sortOrder / itemsPerRound) + 1;
}
