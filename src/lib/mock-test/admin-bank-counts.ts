import { MOCK_TEST_PHASE_COUNT } from "@/lib/mock-test/constants";
import type { MockBankTierKey } from "@/lib/mock-test/mock-difficulty-tiers";

export type MockBankCountMatrix = {
  byPhase: Record<
    number,
    Record<MockBankTierKey, number> & { total: number }
  >;
  grandTotal: number;
};

const emptyTier = (): Record<MockBankTierKey, number> => ({
  easy: 0,
  medium: 0,
  hard: 0,
});

/** Client-side aggregation from `select("phase, difficulty")` rows. */
export function buildMockBankCountMatrix(
  rows: Array<{ phase: number; difficulty: string } | null> | null,
): MockBankCountMatrix {
  const byPhase: MockBankCountMatrix["byPhase"] = {};
  for (let p = 1; p <= MOCK_TEST_PHASE_COUNT; p++) {
    byPhase[p] = { ...emptyTier(), total: 0 };
  }
  let grandTotal = 0;

  for (const r of rows ?? []) {
    if (!r) continue;
    const ph = r.phase;
    const d = r.difficulty as MockBankTierKey;
    if (ph < 1 || ph > MOCK_TEST_PHASE_COUNT) continue;
    if (d === "easy" || d === "medium" || d === "hard") {
      byPhase[ph][d] += 1;
      byPhase[ph].total += 1;
      grandTotal += 1;
    }
  }

  return { byPhase, grandTotal };
}
