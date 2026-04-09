/**
 * Weight targets for AI-graded productive tasks (speaking / writing reports).
 * Pair with bilingual copy + notebook hooks in the report UI.
 */
export const SPEAKING_WEIGHTS = {
  grammar: 0.3,
  vocabulary: 0.25,
  coherence: 0.25,
  taskRelevancy: 0.2,
} as const;

export const WRITING_SUMMARY_WEIGHTS = {
  grammar: 0.5,
  vocabulary: 0.2,
  coherence: 0.3,
} as const;
