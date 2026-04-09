import type { PhotoSpeakItem } from "@/types/photo-speak";

import type { WriteAboutPhotoRoundNum } from "@/lib/write-about-photo-storage";

function assertRound(n: unknown): WriteAboutPhotoRoundNum {
  const x = typeof n === "string" ? Number(n) : n;
  if (x === 1 || x === 2 || x === 3 || x === 4 || x === 5) return x;
  throw new Error(`round must be 1–5 (got ${String(n)}).`);
}

function normalizeItem(input: unknown, index: number): PhotoSpeakItem {
  if (!input || typeof input !== "object") {
    throw new Error(`Invalid entry at index ${index}.`);
  }
  const o = input as Record<string, unknown>;
  if (!o.id || !o.imageUrl) {
    throw new Error(`Item at index ${index} needs id and imageUrl.`);
  }
  const context = o.context != null ? String(o.context).trim() : "";
  const promptEn = o.promptEn != null ? String(o.promptEn).trim() : "";
  const promptFinal =
    promptEn ||
    context ||
    "Describe what you see in the photo. Say what might be happening and how the place feels.";
  const titleEnRaw = o.titleEn != null ? String(o.titleEn).trim() : "";
  const titleEn =
    titleEnRaw ||
    (context
      ? context.length > 60
        ? `${context.slice(0, 57)}…`
        : context
      : `Photo ${index + 1}`);
  const kw = o.keywords;
  const keywords = Array.isArray(kw)
    ? kw.map((k) => String(k).trim()).filter(Boolean)
    : [];

  return {
    id: String(o.id),
    titleEn,
    titleTh: String(o.titleTh ?? ""),
    imageUrl: String(o.imageUrl),
    promptEn: promptFinal,
    promptTh: String(o.promptTh ?? ""),
    keywords,
    ...(context ? { contextEn: context } : {}),
  };
}

/** Parse admin JSON: either { round, items } or array of { round, items } or array of items with round on each. */
export function parseWriteAboutPhotoAdminJson(raw: string): {
  round: WriteAboutPhotoRoundNum;
  items: PhotoSpeakItem[];
}[] {
  const data: unknown = JSON.parse(raw);
  const batches: { round: WriteAboutPhotoRoundNum; items: PhotoSpeakItem[] }[] = [];

  if (Array.isArray(data)) {
    if (data.length === 0) throw new Error("JSON array is empty.");
    const first = data[0];
    if (first && typeof first === "object" && "round" in (first as object) && "items" in (first as object)) {
      for (let i = 0; i < data.length; i++) {
        const block = data[i];
        if (!block || typeof block !== "object") throw new Error(`Invalid batch at index ${i}.`);
        const b = block as Record<string, unknown>;
        const round = assertRound(b.round);
        const itemsRaw = b.items;
        if (!Array.isArray(itemsRaw)) throw new Error(`Batch ${i}: items must be an array.`);
        batches.push({ round, items: itemsRaw.map((x, j) => normalizeItem(x, j)) });
      }
      return batches;
    }
    const byRound = new Map<WriteAboutPhotoRoundNum, PhotoSpeakItem[]>();
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || typeof row !== "object") throw new Error(`Invalid entry at index ${i}.`);
      const o = row as Record<string, unknown>;
      const round = assertRound(o.round);
      const item = normalizeItem(row, i);
      const list = byRound.get(round) ?? [];
      list.push(item);
      byRound.set(round, list);
    }
    for (const [round, items] of byRound) {
      batches.push({ round, items });
    }
    return batches.sort((a, b) => a.round - b.round);
  }

  if (data && typeof data === "object" && "round" in data && "items" in data) {
    const o = data as Record<string, unknown>;
    const round = assertRound(o.round);
    const itemsRaw = o.items;
    if (!Array.isArray(itemsRaw)) throw new Error("items must be an array.");
    return [{ round, items: itemsRaw.map((x, j) => normalizeItem(x, j)) }];
  }

  throw new Error("JSON must be { round, items } or an array of items (each with round) or batches.");
}
