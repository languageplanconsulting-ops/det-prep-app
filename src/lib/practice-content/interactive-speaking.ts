import defaultScenarios from "@/data/default-interactive-speaking-scenarios.json";
import { PRACTICE_BANK_KEY, snapGet } from "@/lib/practice-content/keys";
import type { InteractiveSpeakingScenario } from "@/types/interactive-speaking";

export function parseInteractiveSpeakingScenariosFromJson(
  raw: string | null,
): InteractiveSpeakingScenario[] {
  const fallback = defaultScenarios as InteractiveSpeakingScenario[];
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return fallback;
    return parsed.filter(
      (s): s is InteractiveSpeakingScenario =>
        !!s &&
        typeof s === "object" &&
        typeof (s as InteractiveSpeakingScenario).id === "string" &&
        typeof (s as InteractiveSpeakingScenario).starterQuestionEn === "string",
    );
  } catch {
    return fallback;
  }
}

export function listInteractiveSpeakingScenarios(
  snapshot: Record<string, string>,
  round?: number,
): InteractiveSpeakingScenario[] {
  const raw = snapGet(snapshot, PRACTICE_BANK_KEY.interactiveSpeaking);
  const all = parseInteractiveSpeakingScenariosFromJson(raw);
  if (!round) return all;
  return all.filter((s) => (s.round ?? 1) === round);
}

export function getInteractiveSpeakingScenario(
  snapshot: Record<string, string>,
  id: string,
): InteractiveSpeakingScenario | null {
  return listInteractiveSpeakingScenarios(snapshot).find((s) => s.id === id) ?? null;
}
