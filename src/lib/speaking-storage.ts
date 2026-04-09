import { SPEAKING_ADMIN_UPLOAD_ROUND, SPEAKING_ROUND_NUMBERS } from "@/lib/speaking-constants";
import type { SpeakingAttemptReport, SpeakingQuestion, SpeakingRoundNum, SpeakingTopic } from "@/types/speaking";

const TOPICS_KEY = "ep-speaking-topics";
const LATEST_KEY = "ep-speaking-read-speak-latest";
const REPORT_PREFIX = "ep-speaking-report:";
/** Latest score per topic+question card (composite key `topicId::questionId`). */
const QUESTION_LATEST_KEY = "ep-speaking-question-latest";

export type SpeakingQuestionLatestScore = {
  score160: number;
  attemptId: string;
  submittedAt: string;
};

type QuestionLatestMap = Record<string, SpeakingQuestionLatestScore>;

function questionCompositeKey(topicId: string, questionId: string): string {
  return `${topicId}::${questionId}`;
}

function loadQuestionLatestMap(): QuestionLatestMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(QUESTION_LATEST_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as unknown;
    if (!p || typeof p !== "object") return {};
    return p as QuestionLatestMap;
  } catch {
    return {};
  }
}

function saveQuestionLatestMap(m: QuestionLatestMap): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUESTION_LATEST_KEY, JSON.stringify(m));
}

/** Last submitted score for this question card (for thumbnail badge). */
export function getSpeakingQuestionLatestScore(
  topicId: string,
  questionId: string,
): SpeakingQuestionLatestScore | null {
  const row = loadQuestionLatestMap()[questionCompositeKey(topicId, questionId)];
  return row ?? null;
}

function setSpeakingQuestionLatestScore(report: SpeakingAttemptReport): void {
  const m = loadQuestionLatestMap();
  m[questionCompositeKey(report.topicId, report.questionId)] = {
    score160: report.score160,
    attemptId: report.attemptId,
    submittedAt: report.submittedAt,
  };
  saveQuestionLatestMap(m);
}

export interface SpeakingAttemptSummary {
  attemptId: string;
  topicId: string;
  topicTitleEn: string;
  score160: number;
  submittedAt: string;
  canRedeem: boolean;
}

function emitSpeakingUpdate(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("ep-speaking-storage"));
}

function parseBank(raw: string | null): SpeakingTopic[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is SpeakingTopic => !!x && typeof x === "object" && typeof (x as SpeakingTopic).id === "string");
  } catch {
    return [];
  }
}

/** Raw bank in localStorage (admin + all rounds). No premade defaults. */
export function loadSpeakingBank(): SpeakingTopic[] {
  if (typeof window === "undefined") return [];
  return parseBank(localStorage.getItem(TOPICS_KEY));
}

function saveSpeakingBank(topics: SpeakingTopic[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOPICS_KEY, JSON.stringify(topics));
  emitSpeakingUpdate();
}

/** True if this topic should appear in the learner hub for the given round. */
function isVisibleSpeakingTopicForRound(t: SpeakingTopic, round: SpeakingRoundNum): boolean {
  const r = t.round ?? 1;
  if (r !== round) return false;
  if (t.uploadedByAdmin === true) return true;
  // Legacy rows (merged before flags): treat as round-1 admin content only
  if (t.uploadedByAdmin === undefined && round === 1) return true;
  return false;
}

export function loadSpeakingVisibleTopicsForRound(round: SpeakingRoundNum): SpeakingTopic[] {
  return loadSpeakingBank()
    .filter((t) => isVisibleSpeakingTopicForRound(t, round))
    .sort((a, b) => a.titleEn.localeCompare(b.titleEn));
}

export function countSpeakingVisibleTopicsInRound(round: SpeakingRoundNum): number {
  return loadSpeakingVisibleTopicsForRound(round).length;
}

/** Admin tools: all stored topics (any round / flags). */
export function loadSpeakingTopics(): SpeakingTopic[] {
  return loadSpeakingBank();
}

export function mergeSpeakingTopicsFromAdmin(incoming: SpeakingTopic[]): SpeakingTopic[] {
  const current = loadSpeakingBank();
  const map = new Map<string, SpeakingTopic>();
  for (const t of current) map.set(t.id, t);
  for (const t of incoming) {
    map.set(t.id, {
      ...t,
      round: SPEAKING_ADMIN_UPLOAD_ROUND,
      uploadedByAdmin: true,
    });
  }
  const merged = [...map.values()];
  saveSpeakingBank(merged);
  return merged;
}

export function removeSpeakingTopicsByIds(ids: string[]): void {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  const next = loadSpeakingBank().filter((t) => !idSet.has(t.id));
  saveSpeakingBank(next);
}

export function getSpeakingTopicById(id: string): SpeakingTopic | undefined {
  return loadSpeakingBank().find((t) => t.id === id);
}

export function getSpeakingVisibleTopicById(
  id: string,
  round: SpeakingRoundNum,
): SpeakingTopic | undefined {
  const t = getSpeakingTopicById(id);
  if (!t || !isVisibleSpeakingTopicForRound(t, round)) return undefined;
  return t;
}

export function getSpeakingQuestion(
  topicId: string,
  questionId: string,
): { topic: SpeakingTopic; question: SpeakingQuestion } | undefined {
  const topic = getSpeakingTopicById(topicId);
  if (!topic) return undefined;
  const question = topic.questions.find((q) => q.id === questionId);
  if (!question) return undefined;
  return { topic, question };
}

export function saveSpeakingReport(report: SpeakingAttemptReport): void {
  localStorage.setItem(`${REPORT_PREFIX}${report.attemptId}`, JSON.stringify(report));
  const summary: SpeakingAttemptSummary = {
    attemptId: report.attemptId,
    topicId: report.topicId,
    topicTitleEn: report.topicTitleEn,
    score160: report.score160,
    submittedAt: report.submittedAt,
    canRedeem: true,
  };
  localStorage.setItem(LATEST_KEY, JSON.stringify(summary));
  setSpeakingQuestionLatestScore(report);
  emitSpeakingUpdate();
}

export function loadSpeakingReport(attemptId: string): SpeakingAttemptReport | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${REPORT_PREFIX}${attemptId}`);
    if (!raw) return null;
    return JSON.parse(raw) as SpeakingAttemptReport;
  } catch {
    return null;
  }
}

export function getSpeakingRoundStatsForHub(): { round: SpeakingRoundNum; topicCount: number }[] {
  return SPEAKING_ROUND_NUMBERS.map((round) => ({
    round,
    topicCount: countSpeakingVisibleTopicsInRound(round),
  }));
}
