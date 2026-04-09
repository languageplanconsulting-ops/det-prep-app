import type { PhotoSpeakItem } from "@/types/photo-speak";

export function parsePhotoSpeakItemsJson(raw: string): PhotoSpeakItem[] {
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error("JSON must be an array of photo tasks.");
  return data.map((item, i) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Invalid entry at index ${i}.`);
    }
    const o = item as Record<string, unknown>;
    if (!o.id || !o.titleEn || !o.imageUrl || !o.promptEn) {
      throw new Error(
        `Item at index ${i} needs id, titleEn, imageUrl, and promptEn (titleTh / promptTh / keywords recommended).`,
      );
    }
    const kw = o.keywords;
    const keywords = Array.isArray(kw)
      ? kw.map((k) => String(k).trim()).filter(Boolean)
      : [];
    return {
      id: String(o.id),
      titleEn: String(o.titleEn),
      titleTh: String(o.titleTh ?? ""),
      imageUrl: String(o.imageUrl),
      promptEn: String(o.promptEn),
      promptTh: String(o.promptTh ?? ""),
      keywords,
    };
  });
}
