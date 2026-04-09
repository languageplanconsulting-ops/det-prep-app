/** One navigation tick: stash report in sessionStorage so the report route can read it before localStorage race. */
const PREFIX = "ep-grading-handoff:";

export function stashReportForNavigation(attemptId: string, report: unknown): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${PREFIX}${attemptId}`, JSON.stringify(report));
  } catch {
    /* quota / private mode */
  }
}

export function takeReportHandoff<T>(attemptId: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const key = `${PREFIX}${attemptId}`;
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    sessionStorage.removeItem(key);
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
