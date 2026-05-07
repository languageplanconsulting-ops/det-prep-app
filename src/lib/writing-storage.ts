import type {
  WritingAttemptReport,
  WritingFollowUpPrompt,
  WritingTopic,
} from "@/types/writing";
import defaultTopics from "@/data/default-writing-topics.json";
import { WRITING_ROUND_NUMBERS, type WritingRoundNum } from "@/lib/writing-constants";

const TOPICS_KEY = "ep-writing-topics";
const LATEST_KEY = "ep-writing-read-write-latest";
const REPORT_PREFIX = "ep-writing-report:";
const READ_WRITE_TOPIC_PROGRESS_KEY = "ep-read-write-topic-progress-v1";

export interface ReadWriteTopicProgress {
  latestScore160: number;
  latestAttemptId: string;
}

function emitWritingTopicsUpdate(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("ep-writing-topics"));
}

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

function normalizeTopic(input: unknown): WritingTopic | null {
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

function bundledWritingTopics(): WritingTopic[] {
  return (defaultTopics as unknown[])
    .map(normalizeTopic)
    .filter((topic): topic is WritingTopic => Boolean(topic));
}

export interface WritingAttemptSummary {
  attemptId: string;
  topicId: string;
  topicTitleEn: string;
  score160: number;
  submittedAt: string;
  canRedeem: boolean;
}

export function loadWritingTopics(): WritingTopic[] {
  const bundled = bundledWritingTopics();
  const hasBundled = bundled.length > 0;

  if (typeof window === "undefined") {
    return bundled;
  }
  try {
    const raw = localStorage.getItem(TOPICS_KEY);
    if (!raw) return hasBundled ? bundled : [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return hasBundled ? bundled : [];
    const normalized = parsed
      .map(normalizeTopic)
      .filter((topic): topic is WritingTopic => Boolean(topic));
    if (normalized.length === 0) return hasBundled ? bundled : [];
    return normalized;
  } catch {
    return hasBundled ? bundled : [];
  }
}

export function subscribeWritingTopics(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("ep-writing-topics", onStoreChange);
  window.addEventListener("focus", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("ep-writing-topics", onStoreChange);
    window.removeEventListener("focus", onStoreChange);
  };
}

export function getWritingTopicsSnapshotToken(): string {
  if (typeof window === "undefined") {
    return JSON.stringify(bundledWritingTopics());
  }
  try {
    return localStorage.getItem(TOPICS_KEY) ?? "__bundled__";
  } catch {
    return "__bundled__";
  }
}

export function saveWritingTopics(topics: WritingTopic[]): void {
  try {
    const normalized = topics
      .map(normalizeTopic)
      .filter((topic): topic is WritingTopic => Boolean(topic));
    localStorage.setItem(TOPICS_KEY, JSON.stringify(normalized));
  } catch {
    /* Safari/private mode: keep bundled/default topics available. */
  }
  emitWritingTopicsUpdate();
}

/**
 * Clears `localStorage` for writing topics. Topics shown afterward come only from
 * bundled JSON (if any); with an empty bundle, the bank is empty until admin import.
 */
export function resetWritingTopicsToDefaults(): void {
  localStorage.removeItem(TOPICS_KEY);
  emitWritingTopicsUpdate();
}

export function loadWritingTopicsByRound(round: WritingRoundNum): WritingTopic[] {
  return loadWritingTopics()
    .filter((t) => (t.round ?? 1) === round)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function countWritingTopicsByRound(): Record<WritingRoundNum, number> {
  const out = {} as Record<WritingRoundNum, number>;
  for (const r of WRITING_ROUND_NUMBERS) out[r] = 0;
  for (const t of loadWritingTopics()) {
    const rr = (t.round ?? 1) as WritingRoundNum;
    if (rr >= 1 && rr <= 5) out[rr] = (out[rr] ?? 0) + 1;
  }
  return out;
}

export function mergeWritingTopicsFromAdmin(incoming: WritingTopic[]): WritingTopic[] {
  const current = loadWritingTopics();
  const map = new Map<string, WritingTopic>();
  for (const t of current) map.set(t.id, t);
  for (const t of incoming) {
    const normalized = normalizeTopic(t);
    if (normalized) map.set(normalized.id, normalized);
  }
  const merged = [...map.values()];
  saveWritingTopics(merged);
  return merged;
}

export function removeWritingTopicsByIds(ids: string[]): void {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  const next = loadWritingTopics().filter((t) => !idSet.has(t.id));
  saveWritingTopics(next);
}

export function getTopicById(id: string): WritingTopic | undefined {
  return loadWritingTopics().find((t) => t.id === id);
}

export function saveWritingReport(report: WritingAttemptReport): void {
  try {
    localStorage.setItem(`${REPORT_PREFIX}${report.attemptId}`, JSON.stringify(report));
    const summary: WritingAttemptSummary = {
      attemptId: report.attemptId,
      topicId: report.topicId,
      topicTitleEn: report.topicTitleEn,
      score160: report.score160,
      submittedAt: report.submittedAt,
      canRedeem: true,
    };
    localStorage.setItem(LATEST_KEY, JSON.stringify(summary));
  } catch {
    /* Safari/private mode: report route can still use handoff memory/session. */
  }
}

export function loadWritingReport(attemptId: string): WritingAttemptReport | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${REPORT_PREFIX}${attemptId}`);
    if (!raw) return null;
    return JSON.parse(raw) as WritingAttemptReport;
  } catch {
    return null;
  }
}

export function loadLatestWritingSummary(): WritingAttemptSummary | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LATEST_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WritingAttemptSummary;
  } catch {
    return null;
  }
}

function loadReadWriteTopicProgressMap(): Record<string, ReadWriteTopicProgress> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(READ_WRITE_TOPIC_PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, ReadWriteTopicProgress>)
      : {};
  } catch {
    return {};
  }
}

export function getReadWriteTopicProgressSnapshotToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(READ_WRITE_TOPIC_PROGRESS_KEY) ?? "";
  } catch {
    return "";
  }
}

export function getReadWriteTopicProgress(topicId: string): ReadWriteTopicProgress | undefined {
  return loadReadWriteTopicProgressMap()[topicId];
}

export function recordReadWriteTopicProgress(
  topicId: string,
  score160: number,
  attemptId: string,
): void {
  if (typeof window === "undefined") return;
  try {
    const map = loadReadWriteTopicProgressMap();
    map[topicId] = { latestScore160: score160, latestAttemptId: attemptId };
    localStorage.setItem(READ_WRITE_TOPIC_PROGRESS_KEY, JSON.stringify(map));
    window.dispatchEvent(new Event("ep-read-write-topic-progress"));
  } catch {
    /* ignore */
  }
}

/** For `useSyncExternalStore` on read-and-write topic tiles and session page. */
export function subscribeReadWriteTopicProgress(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("ep-read-write-topic-progress", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("ep-read-write-topic-progress", onStoreChange);
  };
}
