/**
 * Admin-facing DET-style pool tiers. Stored in DB as easy | medium | hard (unchanged at runtime).
 */
export type MockBankTierKey = "easy" | "medium" | "hard";

export const MOCK_DET_TIERS: readonly {
  key: MockBankTierKey;
  detPoints: 85 | 125 | 150;
  shortLabel: string;
  description: string;
}[] = [
  {
    key: "easy",
    detPoints: 85,
    shortLabel: "85",
    description: "Easier pool (maps to easy)",
  },
  {
    key: "medium",
    detPoints: 125,
    shortLabel: "125",
    description: "Standard pool (maps to medium)",
  },
  {
    key: "hard",
    detPoints: 150,
    shortLabel: "150",
    description: "Hard pool (maps to hard)",
  },
] as const;

/** Accept easy|medium|hard or DET labels 85, 125, 150 (string or number). */
export function normalizeMockDifficulty(raw: unknown): MockBankTierKey | null {
  if (raw === "easy" || raw === "medium" || raw === "hard") return raw;
  if (raw === 85 || raw === "85") return "easy";
  if (raw === 125 || raw === "125") return "medium";
  if (raw === 150 || raw === "150") return "hard";
  return null;
}
