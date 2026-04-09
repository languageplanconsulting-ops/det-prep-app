import type { SpeakingQuestion, SpeakingTopic } from "@/types/speaking";

function parseQuestion(item: unknown, i: number, j: number): SpeakingQuestion {
  if (!item || typeof item !== "object") {
    throw new Error(`Invalid question at topic ${i}, question ${j}.`);
  }
  const o = item as Record<string, unknown>;
  if (!o.id || !o.promptEn || o.thumbnail === undefined || o.thumbnail === null) {
    throw new Error(
      `Question at topic ${i}, index ${j} needs id, thumbnail, and promptEn.`,
    );
  }
  return {
    id: String(o.id),
    thumbnail: String(o.thumbnail),
    promptEn: String(o.promptEn),
    promptTh: String(o.promptTh ?? ""),
  };
}

export function parseSpeakingTopicsJson(raw: string): SpeakingTopic[] {
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error("JSON must be an array of topics.");
  return data.map((item, i) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Invalid entry at index ${i}.`);
    }
    const o = item as Record<string, unknown>;
    if (!o.id || !o.titleEn || !o.promptEn) {
      throw new Error(
        `Topic at index ${i} needs id, titleEn, and promptEn (titleTh / promptTh recommended).`,
      );
    }
    const qRaw = o.questions;
    if (!Array.isArray(qRaw) || qRaw.length === 0) {
      throw new Error(`Topic at index ${i} needs a non-empty "questions" array.`);
    }
    const questions = qRaw.map((q, j) => parseQuestion(q, i, j));
    return {
      id: String(o.id),
      titleEn: String(o.titleEn),
      titleTh: String(o.titleTh ?? ""),
      promptEn: String(o.promptEn),
      promptTh: String(o.promptTh ?? ""),
      questions,
    };
  });
}
