/**
 * Fixed 20-step mock: combine per-step scores into Listening / Reading / Speaking / Writing / Total.
 * Must stay in sync with `submit-step/route.ts` aggregation.
 */

export type FixedMockScoredRow = {
  step_index: number;
  task_type: string;
  score: number;
  /** Optional; ignored by score math. */
  answer?: unknown;
};

function normalize160(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(160, v));
}

export function avgScore(rows: FixedMockScoredRow[], pick: (row: FixedMockScoredRow) => boolean): number {
  const items = rows.filter(pick).map((r) => r.score);
  if (!items.length) return 0;
  return items.reduce((a, b) => a + b, 0) / items.length;
}

export function weighted160(parts: Array<{ score: number; weight: number }>): number {
  return parts.reduce((sum, p) => sum + (p.score * p.weight) / 100, 0);
}

export type FixedMockSkillBuckets = {
  total: number;
  listening: number;
  speaking: number;
  reading: number;
  writing: number;
};

export function scoreBuckets(rows: FixedMockScoredRow[]): FixedMockSkillBuckets {
  const conversationScore = avgScore(rows, (r) => r.step_index === 13);
  const speakingRaw = weighted160([
    { score: conversationScore, weight: 5 },
    { score: avgScore(rows, (r) => r.step_index === 19), weight: 40 },
    { score: avgScore(rows, (r) => r.task_type === "speak_about_photo"), weight: 15 },
    { score: avgScore(rows, (r) => r.task_type === "read_then_speak"), weight: 40 },
  ]);

  const listeningRaw = weighted160([
    { score: conversationScore, weight: 40 },
    { score: avgScore(rows, (r) => r.task_type === "dictation"), weight: 30 },
    { score: avgScore(rows, (r) => r.step_index === 19), weight: 20 },
    {
      score: avgScore(
        rows,
        (r) => r.task_type === "conversation_summary" || r.task_type === "summarize_conversation",
      ),
      weight: 10,
    },
  ]);

  const readingRaw = weighted160([
    { score: avgScore(rows, (r) => r.task_type === "real_english_word"), weight: 20 },
    { score: avgScore(rows, (r) => r.task_type === "vocabulary_reading"), weight: 55 },
    { score: avgScore(rows, (r) => r.task_type === "fill_in_blanks"), weight: 25 },
  ]);

  const writingRaw = weighted160([
    { score: avgScore(rows, (r) => r.task_type === "write_about_photo"), weight: 20 },
    { score: avgScore(rows, (r) => r.task_type === "read_and_write"), weight: 50 },
    { score: avgScore(rows, (r) => r.task_type === "dictation"), weight: 20 },
    {
      score: avgScore(
        rows,
        (r) => r.task_type === "conversation_summary" || r.task_type === "summarize_conversation",
      ),
      weight: 10,
    },
  ]);

  const totalRaw = (speakingRaw + listeningRaw + readingRaw + writingRaw) / 4;

  return {
    total: normalize160(Math.round(totalRaw)),
    listening: normalize160(Math.round(listeningRaw)),
    speaking: normalize160(Math.round(speakingRaw)),
    reading: normalize160(Math.round(readingRaw)),
    writing: normalize160(Math.round(writingRaw)),
  };
}

export type FixedMockSkillId = "speaking" | "listening" | "reading" | "writing";

export type FixedMockWeightRow = {
  name: string;
  pct: number;
  stepsLabel: string;
  /** Average step score(s) feeding this row (0–160). */
  componentScore: number;
};

function roundAvg(rows: FixedMockScoredRow[], pick: (row: FixedMockScoredRow) => boolean): number {
  return Math.round(avgScore(rows, pick));
}

export function buildSkillWeightRows(
  skill: FixedMockSkillId,
  rows: FixedMockScoredRow[],
): FixedMockWeightRow[] {
  const conversationScore = avgScore(rows, (r) => r.step_index === 13);
  if (skill === "speaking") {
    return [
      { name: "Interactive Conversation MCQ", pct: 5, stepsLabel: "Step 13", componentScore: roundAvg(rows, (r) => r.step_index === 13) },
      { name: "Interactive Speaking", pct: 40, stepsLabel: "Step 19", componentScore: roundAvg(rows, (r) => r.step_index === 19) },
      { name: "Speak About Photo", pct: 15, stepsLabel: "Steps 5, 9, 15", componentScore: roundAvg(rows, (r) => r.task_type === "speak_about_photo") },
      { name: "Read Then Speak", pct: 40, stepsLabel: "Step 12", componentScore: roundAvg(rows, (r) => r.task_type === "read_then_speak") },
    ];
  }
  if (skill === "listening") {
    return [
      { name: "Interactive Conversation MCQ", pct: 40, stepsLabel: "Step 13", componentScore: roundAvg(rows, (r) => r.step_index === 13) },
      { name: "Dictation", pct: 30, stepsLabel: "Steps 3, 16, 17, 18", componentScore: roundAvg(rows, (r) => r.task_type === "dictation") },
      { name: "Interactive Speaking", pct: 20, stepsLabel: "Step 19", componentScore: roundAvg(rows, (r) => r.step_index === 19) },
      {
        name: "Conversation Summary",
        pct: 10,
        stepsLabel: "Step 14",
        componentScore: roundAvg(
          rows,
          (r) => r.task_type === "conversation_summary" || r.task_type === "summarize_conversation",
        ),
      },
    ];
  }
  if (skill === "reading") {
    return [
      { name: "Real English Word", pct: 20, stepsLabel: "Step 20", componentScore: roundAvg(rows, (r) => r.task_type === "real_english_word") },
      { name: "Vocabulary Reading", pct: 55, stepsLabel: "Step 8", componentScore: roundAvg(rows, (r) => r.task_type === "vocabulary_reading") },
      { name: "Fill in the Blanks", pct: 25, stepsLabel: "Steps 1, 4, 6, 11", componentScore: roundAvg(rows, (r) => r.task_type === "fill_in_blanks") },
    ];
  }
  // writing
  return [
    { name: "Write About Photo", pct: 20, stepsLabel: "Steps 2, 7", componentScore: roundAvg(rows, (r) => r.task_type === "write_about_photo") },
    { name: "Read and Write", pct: 50, stepsLabel: "Step 10", componentScore: roundAvg(rows, (r) => r.task_type === "read_and_write") },
    { name: "Dictation", pct: 20, stepsLabel: "Steps 3, 16, 17, 18", componentScore: roundAvg(rows, (r) => r.task_type === "dictation") },
    {
      name: "Conversation Summary",
      pct: 10,
      stepsLabel: "Step 14",
      componentScore: roundAvg(
        rows,
        (r) => r.task_type === "conversation_summary" || r.task_type === "summarize_conversation",
      ),
    },
  ];
}
