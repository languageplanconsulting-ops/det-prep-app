import defaultScenarios from "@/data/default-interactive-speaking-scenarios.json";
import {
  INTERACTIVE_SPEAKING_REPORT_PREFIX,
  INTERACTIVE_SPEAKING_STORAGE_KEY,
} from "@/lib/interactive-speaking-constants";
import type {
  InteractiveSpeakingAttemptReport,
  InteractiveSpeakingScenario,
} from "@/types/interactive-speaking";

export function loadInteractiveSpeakingScenarios(): InteractiveSpeakingScenario[] {
  if (typeof window === "undefined") {
    return defaultScenarios as InteractiveSpeakingScenario[];
  }
  try {
    const raw = localStorage.getItem(INTERACTIVE_SPEAKING_STORAGE_KEY);
    if (!raw) return defaultScenarios as InteractiveSpeakingScenario[];
    const parsed = JSON.parse(raw) as InteractiveSpeakingScenario[];
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : (defaultScenarios as InteractiveSpeakingScenario[]);
  } catch {
    return defaultScenarios as InteractiveSpeakingScenario[];
  }
}

export function saveInteractiveSpeakingScenarios(items: InteractiveSpeakingScenario[]): void {
  localStorage.setItem(INTERACTIVE_SPEAKING_STORAGE_KEY, JSON.stringify(items));
}

export function mergeInteractiveSpeakingScenariosFromAdmin(
  incoming: InteractiveSpeakingScenario[],
): InteractiveSpeakingScenario[] {
  const current = loadInteractiveSpeakingScenarios();
  const map = new Map<string, InteractiveSpeakingScenario>();
  for (const t of current) map.set(t.id, t);
  for (const t of incoming) map.set(t.id, { ...t, uploadedByAdmin: true });
  const merged = [...map.values()];
  saveInteractiveSpeakingScenarios(merged);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ep-interactive-speaking-storage"));
  }
  return merged;
}

export function removeInteractiveSpeakingScenariosByIds(ids: string[]): void {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  const next = loadInteractiveSpeakingScenarios().filter((t) => !idSet.has(t.id));
  saveInteractiveSpeakingScenarios(next);
}

export function getInteractiveSpeakingScenarioById(
  id: string,
): InteractiveSpeakingScenario | undefined {
  return loadInteractiveSpeakingScenarios().find((t) => t.id === id);
}

export function saveInteractiveSpeakingReport(report: InteractiveSpeakingAttemptReport): void {
  localStorage.setItem(`${INTERACTIVE_SPEAKING_REPORT_PREFIX}${report.attemptId}`, JSON.stringify(report));
}

export function loadInteractiveSpeakingReport(attemptId: string): InteractiveSpeakingAttemptReport | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${INTERACTIVE_SPEAKING_REPORT_PREFIX}${attemptId}`);
    if (!raw) return null;
    return JSON.parse(raw) as InteractiveSpeakingAttemptReport;
  } catch {
    return null;
  }
}
