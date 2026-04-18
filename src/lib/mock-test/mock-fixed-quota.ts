/** First instant of the current calendar month in local time (same logic as mock session routes). */
export function mockFixedMonthStartIso(now = new Date()): string {
  const d = new Date(now);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Sessions that consume the learner monthly mock quota.
 * Admin preview runs and single-step previews do not count.
 */
export function isBillableMockFixedSession(targets: unknown): boolean {
  if (!targets || typeof targets !== "object" || Array.isArray(targets)) return true;
  const t = targets as Record<string, unknown>;
  if (t.adminPreviewMode === true) return false;
  if (t.singleStepPreview === true) return false;
  return true;
}

export function countBillableMockFixedSessions(
  rows: Array<{ targets?: unknown }> | null | undefined,
): number {
  return (rows ?? []).filter((r) => isBillableMockFixedSession(r.targets)).length;
}
