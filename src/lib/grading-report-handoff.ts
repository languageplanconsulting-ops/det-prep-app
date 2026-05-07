/** One navigation tick: stash report in sessionStorage so the report route can read it before localStorage race. */
const PREFIX = "ep-grading-handoff:";
const memoryHandoff = new Map<string, unknown>();

export function stashReportForNavigation(attemptId: string, report: unknown): void {
  if (typeof window === "undefined") return;
  const key = `${PREFIX}${attemptId}`;
  memoryHandoff.set(key, report);
  try {
    sessionStorage.setItem(key, JSON.stringify(report));
  } catch {
    /* Safari/private mode/quota: memory fallback still works for same-tab navigation. */
  }
}

export function takeReportHandoff<T>(attemptId: string): T | null {
  if (typeof window === "undefined") return null;
  const key = `${PREFIX}${attemptId}`;
  const mem = memoryHandoff.get(key);
  if (mem) {
    memoryHandoff.delete(key);
    return mem as T;
  }
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    sessionStorage.removeItem(key);
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
