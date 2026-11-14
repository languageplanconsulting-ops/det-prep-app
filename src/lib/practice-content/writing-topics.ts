import type { WritingFollowUpPrompt, WritingTopic } from "@/types/writing";

/**
 * Read-and-write (essay) topics from the shared content bank (`ep-writing-topics`).
 * Pure — no browser storage — so the web client store and the Bearer-auth route
 * the mobile app calls both normalize topics the same way.
 */
export const WRITING_TOPICS_BANK_KEY = "ep-writing-topics";

function normalizeFollowUps(raw: unknown): WritingFollowUpPrompt[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const clean = raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const promptEn = typeof row.promptEn === "string" ? row.promptEn.trim() : "";
      const promptTh = typeof row.promptTh === "string" ? row.promptTh.trim() : "";
      if (!promptEn) return null;
      return { promptEn, promptTh };
    })
    .filter((item): item is WritingFollowUpPrompt => Boolean(item))
    .slice(0, 3);
  return clean.length > 0 ? clean : undefined;
}

export function normalizeWritingTopic(input: unknown): WritingTopic | null {
  if (!input || typeof input !== "object") return null;
  const t = input as Record<string, unknown>;
  const id = typeof t.id === "string" ? t.id.trim() : "";
  const titleEn = typeof t.titleEn === "string" ? t.titleEn.trim() : "";
  const titleTh = typeof t.titleTh === "string" ? t.titleTh.trim() : "";
  const promptEn = typeof t.promptEn === "string" ? t.promptEn.trim() : "";
  const promptTh = typeof t.promptTh === "string" ? t.promptTh.trim() : "";
  if (!id || !titleEn || !promptEn) return null;

  const r = t.round;
  const round: 1 | 2 | 3 | 4 | 5 =
    r === 1 || r === 2 || r === 3 || r === 4 || r === 5 ? r : 1;
  const followUps = normalizeFollowUps(t.followUps);
  return {
    id,
    titleEn,
    titleTh,
    promptEn,
    promptTh,
    round,
    followUps,
  };
}

/** Parse a raw bank value (JSON array); invalid rows are dropped, bad JSON yields []. */
export function parseWritingTopicsJson(raw: string | null | undefined): WritingTopic[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeWritingTopic)
      .filter((topic): topic is WritingTopic => Boolean(topic));
  } catch {
    return [];
  }
}

/** Topics for one round (or all), sorted by id — same order as the web round page. */
export function listWritingTopics(
  snapshot: Record<string, string>,
  round?: number,
): WritingTopic[] {
  const all = parseWritingTopicsJson(snapshot[WRITING_TOPICS_BANK_KEY]);
  const filtered = round ? all.filter((t) => (t.round ?? 1) === round) : all;
  return filtered.sort((a, b) => a.id.localeCompare(b.id));
}
