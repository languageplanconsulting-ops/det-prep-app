import type { WritingFollowUpPrompt, WritingTopic } from "@/types/writing";

function parseRound(raw: unknown): 1 | 2 | 3 | 4 | 5 | undefined {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return undefined;
}

function parseFollowUps(raw: unknown, topicIndex: number): WritingFollowUpPrompt[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) {
    throw new Error(`Topic at index ${topicIndex}: followUps must be an array.`);
  }
  if (raw.length > 3) {
    throw new Error(`Topic at index ${topicIndex}: at most 3 followUps allowed.`);
  }
  return raw.map((item, j) => {
    if (!item || typeof item !== "object") {
      throw new Error(`followUps[${j}] invalid at topic index ${topicIndex}.`);
    }
    const fo = item as Record<string, unknown>;
    if (!fo.promptEn || String(fo.promptEn).trim() === "") {
      throw new Error(
        `followUps[${j}] needs non-empty promptEn at topic index ${topicIndex}.`,
      );
    }
    return {
      promptEn: String(fo.promptEn),
      promptTh: String(fo.promptTh ?? ""),
    };
  });
}

export function parseWritingTopicsJson(raw: string): WritingTopic[] {
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
    const diff = o.difficulty;
    const round = parseRound(o.round);
    const followUps = parseFollowUps(o.followUps ?? o.followUpQuestions, i);
    return {
      id: String(o.id),
      titleEn: String(o.titleEn),
      titleTh: String(o.titleTh ?? ""),
      promptEn: String(o.promptEn),
      promptTh: String(o.promptTh ?? ""),
      ...(followUps?.length ? { followUps } : {}),
      round: round ?? 1,
      difficulty:
        diff === "easy" || diff === "medium" || diff === "hard" ? diff : undefined,
    };
  });
}
