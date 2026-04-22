/** Shared text blocks for “full report → notebook” dumps. */

import { resolveGrammarFixDisplay } from "@/lib/grammar-fix-display";

export type NotebookCriterionSlice = {
  scorePercent: number;
  weight: number;
  pointsOn160: number;
  summary: { en: string; th: string };
  breakdown: Array<{
    en: string;
    th: string;
    excerpt?: string;
    suggestionEn?: string;
    suggestionTh?: string;
  }>;
};

export function appendCriterion(
  partsEn: string[],
  partsTh: string[],
  label: string,
  r: NotebookCriterionSlice,
) {
  partsEn.push(
    `\n--- ${label} (${Math.round(r.scorePercent)}% · weight ${Math.round(r.weight * 100)}%) — ≈ ${r.pointsOn160}/160 ---\n`,
  );
  partsEn.push(`${r.summary.en}\n`);
  partsTh.push(
    `\n--- ${label} (${Math.round(r.scorePercent)}%) — ≈ ${r.pointsOn160}/160 ---\n`,
  );
  partsTh.push(`${r.summary.th}\n`);
  for (const b of r.breakdown) {
    const display = resolveGrammarFixDisplay({
      excerpt: b.excerpt,
      suggestionEn: b.suggestionEn,
      suggestionTh: b.suggestionTh,
      noteEn: b.en,
      noteTh: b.th,
    });
    partsEn.push(`• ${b.en}\n`);
    partsTh.push(`• ${b.th}\n`);
    if (display.wrong) {
      partsEn.push(`  “${display.wrong}”\n`);
    }
    if (b.suggestionEn?.trim()) partsEn.push(`  → ${b.suggestionEn}\n`);
    if (b.suggestionTh?.trim()) partsTh.push(`  → ${b.suggestionTh}\n`);
  }
}
