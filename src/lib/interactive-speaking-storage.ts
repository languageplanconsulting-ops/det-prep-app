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
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ep-interactive-speaking-report-saved"));
  }
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

/** All saved interactive-speaking reports in localStorage (client only). */
export function loadAllInteractiveSpeakingReports(): InteractiveSpeakingAttemptReport[] {
  if (typeof window === "undefined") return [];
  const out: InteractiveSpeakingAttemptReport[] = [];
  const prefix = INTERACTIVE_SPEAKING_REPORT_PREFIX;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(prefix)) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const r = JSON.parse(raw) as InteractiveSpeakingAttemptReport;
      if (r?.kind === "interactive-speaking" && typeof r.scenarioId === "string") {
        out.push(r);
      }
    } catch {
      /* skip corrupt */
    }
  }
  return out;
}

/** Most recent attempt for a scenario (by `submittedAt`). */
export function getLatestInteractiveSpeakingReportForScenario(
  scenarioId: string,
): InteractiveSpeakingAttemptReport | null {
  const matches = loadAllInteractiveSpeakingReports().filter((r) => r.scenarioId === scenarioId);
  if (matches.length === 0) return null;
  return matches.reduce((best, r) => {
    const ta = Date.parse(r.submittedAt);
    const tb = Date.parse(best.submittedAt);
    return Number.isFinite(ta) && Number.isFinite(tb) && ta >= tb ? r : best;
  });
}
