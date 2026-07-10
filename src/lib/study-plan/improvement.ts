import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase-admin";

/**
 * "Attempt improvement" detection for the study-plan dashboard.
 *
 * Groups the caller's `practice_attempts` into (task_type, difficulty) cohorts
 * — same grouping key as weakness.ts's auto-graded aggregation — and looks
 * for cohorts with a real recent uptick: the mean score of the most recent 5
 * attempts vs. the mean of the 5 attempts immediately before that. Cohorts
 * need at least 10 attempts total to be eligible (5 "before" + 5 "after").
 * Most cohorts won't qualify most of the time — that's expected, not a bug.
 */

const MIN_ATTEMPTS_FOR_COHORT = 10;
const WINDOW_SIZE = 5;

// Calibrated from a live-data audit of practice_attempts (not a guess): a
// delta below this is within normal attempt-to-attempt noise, so only a
// >=10pp jump between the two 5-attempt windows counts as real improvement.
const IMPROVEMENT_THRESHOLD_POINTS = 10;

const RECENT_ATTEMPTS_LIMIT = 2000;

export type ImprovementCohort = {
  taskType: string;
  /** Friendly Thai label for taskType, ready to render (falls back to raw taskType). */
  taskLabel: string;
  difficulty: string;
  /** Friendly Thai label for difficulty (ง่าย/ปานกลาง/ยาก), ready to render. */
  difficultyLabel: string;
  attempts: number;
  beforeAvgScorePct: number;
  afterAvgScorePct: number;
  deltaPoints: number;
  message: string;
};

export type ImprovementReport = {
  cohorts: ImprovementCohort[];
};

/** Friendly Thai coaching labels per task_type, for the celebratory message. */
const TASK_TYPE_LABEL_TH: Record<string, string> = {
  fill_in_blanks: "เติมคำในช่องว่าง",
  dictation: "ฟังแล้วพิมพ์ตาม (Dictation)",
  real_english_word: "แยกคำจริง/คำปลอม",
  vocabulary_reading: "คำศัพท์ + การอ่าน",
  write_about_photo: "เขียนบรรยายภาพ",
  speak_about_photo: "พูดบรรยายภาพ",
  read_and_write: "อ่านแล้วเขียนสรุป",
  read_then_speak: "อ่านแล้วพูดด้วยคำตัวเอง",
  interactive_conversation_mcq: "บทสนทนาโต้ตอบ (เลือกตอบ)",
  interactive_speaking: "พูดโต้ตอบสด",
  conversation_summary: "สรุปบทสนทนา",
};

/** Friendly Thai difficulty labels, matching the practice UI's ง่าย/ปานกลาง/ยาก pills. */
const DIFFICULTY_LABEL_TH: Record<string, string> = {
  easy: "ง่าย",
  medium: "ปานกลาง",
  hard: "ยาก",
};

function buildCelebrationMessage(taskLabel: string, difficultyLabel: string, deltaPoints: number): string {
  return `🎉 เก่งขึ้นแล้ว! ช่วงหลังทำ "${taskLabel}" (ระดับ${difficultyLabel}) คะแนนเฉลี่ยขยับขึ้น ${deltaPoints} จุดจาก 5 ครั้งก่อนหน้า เทียบกับ 5 ครั้งล่าสุด สิ่งที่ฝึกมาเริ่มเห็นผลจริงแล้ว รักษาจังหวะนี้ไว้แล้วจะขยับขึ้นไปอีกครับ`;
}

type AttemptRow = {
  task_type: string;
  score_pct: number | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

function average(list: number[]): number {
  return list.reduce((a, b) => a + b, 0) / list.length;
}

export async function computeImprovementReport(userId: string): Promise<ImprovementReport> {
  const supabase = createServiceRoleSupabase();

  const { data: attempts } = await supabase
    .from("practice_attempts")
    .select("task_type, score_pct, detail, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(RECENT_ATTEMPTS_LIMIT);

  const byCohort = new Map<string, AttemptRow[]>();
  for (const row of (attempts ?? []) as AttemptRow[]) {
    const difficulty = typeof row.detail?.difficulty === "string" ? (row.detail.difficulty as string) : null;
    if (!difficulty || difficulty === "unknown") continue;
    const key = `${row.task_type}:${difficulty}`;
    const bucket = byCohort.get(key) ?? [];
    bucket.push(row);
    byCohort.set(key, bucket);
  }

  const cohorts: ImprovementCohort[] = [];
  for (const [key, rows] of byCohort.entries()) {
    if (rows.length < MIN_ATTEMPTS_FOR_COHORT) continue;

    // rows is already ordered by created_at ascending (query order preserved).
    const after = rows.slice(-WINDOW_SIZE);
    const before = rows.slice(-WINDOW_SIZE * 2, -WINDOW_SIZE);
    if (before.length < WINDOW_SIZE || after.length < WINDOW_SIZE) continue;

    const beforeAvg = average(before.map((r) => r.score_pct ?? 0));
    const afterAvg = average(after.map((r) => r.score_pct ?? 0));
    const delta = afterAvg - beforeAvg;
    if (delta < IMPROVEMENT_THRESHOLD_POINTS) continue;

    const [taskType, difficulty] = key.split(":");
    const taskLabel = TASK_TYPE_LABEL_TH[taskType] ?? taskType;
    const difficultyLabel = DIFFICULTY_LABEL_TH[difficulty] ?? difficulty;
    const beforeAvgScorePct = Math.round(beforeAvg);
    const afterAvgScorePct = Math.round(afterAvg);
    const deltaPoints = Math.round(delta);
    cohorts.push({
      taskType,
      taskLabel,
      difficulty,
      difficultyLabel,
      attempts: rows.length,
      beforeAvgScorePct,
      afterAvgScorePct,
      deltaPoints,
      message: buildCelebrationMessage(taskLabel, difficultyLabel, deltaPoints),
    });
  }

  cohorts.sort((a, b) => b.deltaPoints - a.deltaPoints);

  return { cohorts };
}
