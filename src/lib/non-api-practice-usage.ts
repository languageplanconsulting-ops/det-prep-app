import { getSetLimit, type ContentSkill, type Tier } from "@/lib/access-control";
import { getCurrentBrowserUserId } from "@/lib/browser-user-scope";
import { loadConversationProgressMap } from "@/lib/conversation-storage";
import { loadDictationProgressMap } from "@/lib/dictation-storage";
import { loadFitbProgressMap } from "@/lib/fitb-storage";
import { loadReadingProgressMap } from "@/lib/reading-storage";
import { loadRealWordProgressMap } from "@/lib/realword-storage";
import { loadVocabProgressMap } from "@/lib/vocab-storage";

export type NonApiReminderExam =
  | "reading"
  | "vocabulary"
  | "dictation"
  | "fitb"
  | "realword"
  | "conversation";

export type NonApiReminderSnapshot = {
  exam: NonApiReminderExam;
  examLabel: string;
  skill: ContentSkill;
  skillLabel: string;
  limit: number;
  used: number;
  remaining: number;
  monthLabel: string;
  cycleLabel: string;
  cycleKind: "monthly" | "lifetime";
  sharesPool: boolean;
  poolMessage: string;
};

function isCurrentMonth(iso: string | null | undefined, now: Date): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function belongsToCurrentUser(record: { userId?: string } | undefined, currentUserId: string | null): boolean {
  if (!currentUserId) return true;
  return record?.userId === currentUserId;
}

function countCurrentMonthEntries(
  records: Record<string, { updatedAt: string; userId?: string }>,
  now: Date,
  currentUserId: string | null,
): number {
  let count = 0;
  for (const value of Object.values(records)) {
    if (!belongsToCurrentUser(value, currentUserId)) continue;
    if (isCurrentMonth(value.updatedAt, now)) count += 1;
  }
  return count;
}

function countLifetimeEntries(
  records: Record<string, { updatedAt: string; userId?: string }>,
  currentUserId: string | null,
): number {
  let count = 0;
  for (const value of Object.values(records)) {
    if (!belongsToCurrentUser(value, currentUserId)) continue;
    count += 1;
  }
  return count;
}

function getMonthLabel(now: Date): string {
  return now.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function getLiteracyUsage(now: Date): number {
  const currentUserId = getCurrentBrowserUserId();
  return (
    countCurrentMonthEntries(loadDictationProgressMap(), now, currentUserId) +
    countCurrentMonthEntries(loadFitbProgressMap(), now, currentUserId) +
    countCurrentMonthEntries(loadRealWordProgressMap(), now, currentUserId)
  );
}

function getExamUsage(exam: NonApiReminderExam, now: Date, cycleKind: "monthly" | "lifetime"): number {
  const currentUserId = getCurrentBrowserUserId();
  const records =
    exam === "reading"
      ? loadReadingProgressMap()
      : exam === "vocabulary"
        ? loadVocabProgressMap()
        : exam === "conversation"
          ? loadConversationProgressMap()
          : exam === "dictation"
            ? loadDictationProgressMap()
            : exam === "fitb"
              ? loadFitbProgressMap()
              : loadRealWordProgressMap();

  return cycleKind === "lifetime"
    ? countLifetimeEntries(records, currentUserId)
    : countCurrentMonthEntries(records, now, currentUserId);
}

export function getNonApiReminderSnapshot(
  exam: NonApiReminderExam,
  tier: Tier,
  now = new Date(),
): NonApiReminderSnapshot {
  const isFree = tier === "free";
  const cycleKind = isFree ? "lifetime" : "monthly";
  const monthLabel = getMonthLabel(now);
  const cycleLabel = isFree ? "Lifetime free access" : monthLabel;

  if (exam === "reading") {
    const skill: ContentSkill = "comprehension";
    const limit = getSetLimit(tier, skill);
    const rawUsed = getExamUsage(exam, now, cycleKind);
    const used = isFree ? Math.min(limit, rawUsed) : rawUsed;
    return {
      exam,
      examLabel: "Reading",
      skill,
      skillLabel: "reading",
      limit,
      used,
      remaining: Math.max(0, limit - used),
      monthLabel,
      cycleLabel,
      cycleKind,
      sharesPool: false,
      poolMessage: isFree
        ? "Free users can try one Reading exam for life. After that, you can still browse the bank, but the sets are locked until you upgrade."
        : "This reminder tracks your Reading comprehension sets for the current month.",
    };
  }

  if (exam === "vocabulary") {
    const skill: ContentSkill = "vocabulary";
    const limit = getSetLimit(tier, skill);
    const rawUsed = getExamUsage(exam, now, cycleKind);
    const used = isFree ? Math.min(limit, rawUsed) : rawUsed;
    return {
      exam,
      examLabel: "Vocabulary",
      skill,
      skillLabel: "vocabulary",
      limit,
      used,
      remaining: Math.max(0, limit - used),
      monthLabel,
      cycleLabel,
      cycleKind,
      sharesPool: false,
      poolMessage: isFree
        ? "Free users can try one Vocabulary question set for life. After that, the bank stays visible, but the sets are locked until you upgrade."
        : "This reminder tracks your Vocabulary practice questions for the current month.",
    };
  }

  if (exam === "conversation") {
    const skill: ContentSkill = "conversation";
    const limit = getSetLimit(tier, skill);
    const rawUsed = getExamUsage(exam, now, cycleKind);
    const used = isFree ? Math.min(limit, rawUsed) : rawUsed;
    return {
      exam,
      examLabel: "Interactive conversation",
      skill,
      skillLabel: "interactive conversation",
      limit,
      used,
      remaining: Math.max(0, limit - used),
      monthLabel,
      cycleLabel,
      cycleKind,
      sharesPool: false,
      poolMessage: isFree
        ? "Free users can try one Interactive Conversation set for life. After that, the bank stays open to browse, but the sets are locked until you upgrade."
        : "This reminder tracks your Interactive Conversation sets for the current month.",
    };
  }

  const skill: ContentSkill = "literacy";
  const examLabel =
    exam === "dictation"
      ? "Dictation"
      : exam === "fitb"
        ? "Fill in the blank"
        : "Choose the real word";

  if (isFree) {
    const limit = 1;
    const rawUsed = getExamUsage(exam, now, cycleKind);
    const used = Math.min(limit, rawUsed);
    return {
      exam,
      examLabel,
      skill,
      skillLabel: "literacy",
      limit,
      used,
      remaining: Math.max(0, limit - used),
      monthLabel,
      cycleLabel,
      cycleKind,
      sharesPool: false,
      poolMessage: `Free users can try ${examLabel} one time for life. After that, the exam bank stays visible, but each set is locked until you upgrade.`,
    };
  }

  const limit = getSetLimit(tier, skill);
  const used = getLiteracyUsage(now);

  return {
    exam,
    examLabel,
    skill,
    skillLabel: "literacy",
    limit,
    used,
    remaining: Math.max(0, limit - used),
    monthLabel,
    cycleLabel,
    cycleKind,
    sharesPool: true,
    poolMessage: "Dictation, Fill in the Blank, and Real Word share the same Literacy pool on Basic.",
  };
}
