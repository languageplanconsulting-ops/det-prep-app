import { getSetLimit, type ContentSkill, type Tier } from "@/lib/access-control";
import { loadConversationProgressMap } from "@/lib/conversation-storage";
import { loadDictationProgressMap } from "@/lib/dictation-storage";
import { loadFitbProgressMap } from "@/lib/fitb-storage";
import { loadRealWordProgressMap } from "@/lib/realword-storage";
import { loadVocabProgressMap } from "@/lib/vocab-storage";

export type NonApiReminderExam =
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
  sharesPool: boolean;
  poolMessage: string;
};

function isCurrentMonth(iso: string | null | undefined, now: Date): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function countCurrentMonthEntries(records: Record<string, { updatedAt: string }>, now: Date): number {
  let count = 0;
  for (const value of Object.values(records)) {
    if (isCurrentMonth(value.updatedAt, now)) count += 1;
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
  return (
    countCurrentMonthEntries(loadDictationProgressMap(), now) +
    countCurrentMonthEntries(loadFitbProgressMap(), now) +
    countCurrentMonthEntries(loadRealWordProgressMap(), now)
  );
}

export function getNonApiReminderSnapshot(
  exam: NonApiReminderExam,
  tier: Tier,
  now = new Date(),
): NonApiReminderSnapshot {
  const monthLabel = getMonthLabel(now);

  if (exam === "vocabulary") {
    const skill: ContentSkill = "vocabulary";
    const limit = getSetLimit(tier, skill);
    const used = countCurrentMonthEntries(loadVocabProgressMap(), now);
    return {
      exam,
      examLabel: "Vocabulary",
      skill,
      skillLabel: "vocabulary",
      limit,
      used,
      remaining: Math.max(0, limit - used),
      monthLabel,
      sharesPool: false,
      poolMessage: "This reminder tracks your Vocabulary practice questions for the current month.",
    };
  }

  if (exam === "conversation") {
    const skill: ContentSkill = "conversation";
    const limit = getSetLimit(tier, skill);
    const used = countCurrentMonthEntries(loadConversationProgressMap(), now);
    return {
      exam,
      examLabel: "Interactive conversation",
      skill,
      skillLabel: "interactive conversation",
      limit,
      used,
      remaining: Math.max(0, limit - used),
      monthLabel,
      sharesPool: false,
      poolMessage: "This reminder tracks your Interactive Conversation sets for the current month.",
    };
  }

  const skill: ContentSkill = "literacy";
  const limit = getSetLimit(tier, skill);
  const used = getLiteracyUsage(now);
  const examLabel =
    exam === "dictation"
      ? "Dictation"
      : exam === "fitb"
        ? "Fill in the blank"
        : "Choose the real word";

  return {
    exam,
    examLabel,
    skill,
    skillLabel: "literacy",
    limit,
    used,
    remaining: Math.max(0, limit - used),
    monthLabel,
    sharesPool: true,
    poolMessage: "Dictation, Fill in the Blank, and Real Word share the same Literacy pool on Basic.",
  };
}
