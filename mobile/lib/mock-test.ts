/**
 * Mock test center — shared types, task labels, score breakdown and Thai/English
 * coaching copy for the fixed 20-step mock (mirrors the website's
 * src/lib/mock-test/fixed-mock-score-buckets.ts and MockFixedResultsClient).
 */

type T = (th: string, en: string) => string;

export const MOCK_STEP_COUNT = 20;

export type MockTaskType =
  | "fill_in_blanks"
  | "write_about_photo"
  | "dictation"
  | "speak_about_photo"
  | "vocabulary_reading"
  | "read_and_write"
  | "read_then_speak"
  | "interactive_conversation_mcq"
  | "conversation_summary"
  | "interactive_speaking"
  | "real_english_word";

export type MockSetRow = { id: string; name: string; stepCount: number };

export type MockInProgressRow = {
  sessionId: string;
  setId: string;
  currentStep: number;
  answeredCount: number;
  startedAt: string | null;
};

export type MockPendingReportRow = { sessionId: string; setId: string; completedAt: string | null };

export type MockActiveRuns = {
  inProgress: MockInProgressRow[];
  pendingReports: MockPendingReportRow[];
};

export type MockStepItem = {
  step_index: number;
  task_type: string;
  time_limit_sec?: number;
  rest_after_step_sec?: number;
  content: Record<string, unknown> | null;
  correct_answer?: Record<string, unknown> | null;
  is_ai_graded?: boolean;
};

export type MockResponseEntry = {
  step_index: number;
  task_type: string;
  answer?: unknown;
  score?: number | null;
  ai_pending?: boolean;
};

export type MockSessionPayload = {
  id: string;
  set_id: string;
  status: string;
  current_step: number;
  responses: MockResponseEntry[];
  targets: Record<string, unknown> | null;
  started_at?: string | null;
  mock_fixed_sets?: { name: string; user_title?: string | null };
  mock_fixed_set_items: MockStepItem[];
};

export type MockFixedResult = {
  session_id: string;
  set_id: string;
  created_at: string;
  actual_total: number;
  actual_listening: number;
  actual_speaking: number;
  actual_reading: number;
  actual_writing: number;
  target_total: number | null;
  target_listening?: number | null;
  target_speaking?: number | null;
  target_reading?: number | null;
  target_writing?: number | null;
  report_payload?: { responses?: MockResponseEntry[] } | null;
};

// ── Mini diagnosis (9 steps) ────────────────────────────────────────────────

export const MINI_STEP_COUNT = 9;

export type MiniSetRow = { id: string; name: string; stepCount: number };

export type MiniLatestResult = {
  sessionId: string;
  total: number;
  levelLabel: string | null;
  createdAt: string;
};

export type MiniSetsResponse = {
  sets: MiniSetRow[];
  latestResult: MiniLatestResult | null;
  freeLimitReached: boolean;
};

export type MiniResponseEntry = MockResponseEntry & {
  review?: {
    score160?: number;
    summaryTh?: string;
    summaryEn?: string;
    improvementPoints?: { id?: string; category?: string; en?: string; th?: string }[];
  } | null;
};

export type MiniSessionPayload = {
  id: string;
  set_id: string;
  status: string;
  current_step: number;
  responses: MiniResponseEntry[];
  targets: Record<string, unknown> | null;
  mini_diagnosis_sets?: { id: string; name: string; user_title?: string | null };
  mini_diagnosis_set_items: MockStepItem[];
};

export type MiniResult = {
  session_id: string;
  set_id: string;
  created_at: string;
  actual_total: number;
  actual_listening: number;
  actual_speaking: number;
  actual_reading: number;
  actual_writing: number;
  level_label?: string | null;
  report_payload?: {
    responses?: MiniResponseEntry[];
    scoreBreakdown?: Record<string, Record<string, number>>;
  } | null;
};

/** Steps graded by the server's writing/speaking grader — their submit can be slow. */
export const SLOW_GRADED_TASKS = new Set<string>([
  "write_about_photo",
  "speak_about_photo",
  "read_then_speak",
  "read_and_write",
  "conversation_summary",
  "interactive_speaking",
]);

type TaskMeta = { th: string; en: string; emoji: string; hintTh: string; hintEn: string };

const TASK_META: Record<string, TaskMeta> = {
  fill_in_blanks: {
    th: "เติมคำในช่องว่าง",
    en: "Fill in the blanks",
    emoji: "📝",
    hintTh: "อ่านทั้งประโยคก่อนเติมแต่ละคำ",
    hintEn: "Read the full context before deciding each word.",
  },
  write_about_photo: {
    th: "เขียนจากภาพ",
    en: "Write about the photo",
    emoji: "✍️",
    hintTh: "เขียนให้ตรงประเด็นและอ่านเข้าใจง่าย",
    hintEn: "Stay direct and keep your writing easy to follow.",
  },
  dictation: {
    th: "ฟังแล้วพิมพ์",
    en: "Dictation",
    emoji: "🎧",
    hintTh: "ฟังเสียงให้จบ แล้วพิมพ์ตามที่ได้ยินให้ตรงที่สุด",
    hintEn: "Listen to the audio, then type exactly what you hear.",
  },
  speak_about_photo: {
    th: "พูดจากภาพ",
    en: "Speak about the photo",
    emoji: "🗣️",
    hintTh: "บรรยายภาพให้ชัดก่อน แล้วค่อยเพิ่มรายละเอียด",
    hintEn: "Describe clearly first, then add supporting detail.",
  },
  vocabulary_reading: {
    th: "คำศัพท์ + การอ่าน",
    en: "Vocabulary + reading",
    emoji: "📖",
    hintTh: "แบ่งเวลาให้พอสำหรับทั้งชุดการอ่าน",
    hintEn: "Manage your time across the full reading block.",
  },
  read_and_write: {
    th: "อ่านแล้วเขียน",
    en: "Read, then write",
    emoji: "📄",
    hintTh: "ตอบโจทย์ตรง ๆ และจัดลำดับความคิดให้ดี",
    hintEn: "Answer the prompt directly and structure your response.",
  },
  read_then_speak: {
    th: "อ่านแล้วพูด",
    en: "Read, then speak",
    emoji: "📑",
    hintTh: "อ่านโจทย์ก่อน แล้วพูดให้ครบอย่างใจเย็น",
    hintEn: "Scan first, then speak in a calm and complete way.",
  },
  interactive_conversation_mcq: {
    th: "บทสนทนาโต้ตอบ",
    en: "Interactive conversation",
    emoji: "💬",
    hintTh: "เลือกคำตอบที่ต่อบทสนทนาได้เหมาะที่สุดในแต่ละรอบ",
    hintEn: "Choose the best continuation at each turn.",
  },
  conversation_summary: {
    th: "สรุปบทสนทนา",
    en: "Conversation summary",
    emoji: "🧾",
    hintTh: "จับใจความหลัก รายละเอียดสำคัญ และข้อสรุป",
    hintEn: "Capture the main point, useful details, and outcome.",
  },
  interactive_speaking: {
    th: "พูดโต้ตอบ",
    en: "Interactive speaking",
    emoji: "🎙️",
    hintTh: "ตอบให้เป็นธรรมชาติ อย่าตอบแค่ประโยคเดียว",
    hintEn: "Keep answering naturally and avoid one-line responses.",
  },
  interactive_listening: {
    th: "ฟังแล้วตอบ",
    en: "Interactive listening",
    emoji: "👂",
    hintTh: "ฟังสถานการณ์ให้จบ แล้วตอบทุกข้อ",
    hintEn: "Listen to each situation, then answer every item.",
  },
  real_english_word: {
    th: "คำจริง / คำลวง",
    en: "Real English word",
    emoji: "🔤",
    hintTh: "ตัดสินใจให้ไวและเชื่อสัญชาตญาณคำศัพท์ของตัวเอง",
    hintEn: "Decide quickly and trust your vocabulary instincts.",
  },
};

export function taskMeta(taskType: string | undefined): TaskMeta {
  return (
    TASK_META[taskType ?? ""] ?? {
      th: "แบบฝึกจำลอง",
      en: "Mock task",
      emoji: "•",
      hintTh: "ตั้งสมาธิแล้วทำต่อไปเรื่อย ๆ",
      hintEn: "Stay focused and keep moving through the section.",
    }
  );
}

export function taskLabel(t: T, taskType: string): string {
  const m = taskMeta(taskType);
  return t(m.th, m.en);
}

// ── Scores ──────────────────────────────────────────────────────────────────

export type MockSkill = "listening" | "speaking" | "reading" | "writing";

export const SKILL_META: Record<MockSkill, { th: string; en: string; emoji: string; color: string }> = {
  speaking: { th: "การพูด", en: "Speaking", emoji: "🗣️", color: "#004AAD" },
  listening: { th: "การฟัง", en: "Listening", emoji: "👂", color: "#7C3AED" },
  reading: { th: "การอ่าน", en: "Reading", emoji: "📖", color: "#0D9488" },
  writing: { th: "การเขียน", en: "Writing", emoji: "✍️", color: "#EA580C" },
};

/** Where to practise each skill in the app. */
export const SKILL_PRACTICE_HREF: Record<MockSkill, string> = {
  writing: "/dialogue-summary",
  listening: "/dictation",
  reading: "/reading",
  speaking: "/interactive-speaking",
};

type ScoredRow = { step_index: number; task_type: string; score: number };

function avgScore(rows: ScoredRow[], pick: (r: ScoredRow) => boolean): number {
  const items = rows.filter(pick).map((r) => r.score);
  if (!items.length) return 0;
  return items.reduce((a, b) => a + b, 0) / items.length;
}

const isSummary = (r: ScoredRow) =>
  r.task_type === "conversation_summary" || r.task_type === "summarize_conversation";

export type WeightRow = { taskType: string; pct: number; steps: string; score: number };

/** Which tasks feed each skill and by how much (same weights as the website). */
export function skillWeightRows(skill: MockSkill, rows: ScoredRow[]): WeightRow[] {
  const r = (taskType: string, pct: number, steps: string, pick: (x: ScoredRow) => boolean): WeightRow => ({
    taskType,
    pct,
    steps,
    score: Math.round(avgScore(rows, pick)),
  });
  if (skill === "speaking") {
    return [
      r("interactive_conversation_mcq", 5, "13", (x) => x.step_index === 13),
      r("interactive_speaking", 40, "19", (x) => x.step_index === 19),
      r("speak_about_photo", 15, "5, 9, 15", (x) => x.task_type === "speak_about_photo"),
      r("read_then_speak", 40, "12", (x) => x.task_type === "read_then_speak"),
    ];
  }
  if (skill === "listening") {
    return [
      r("interactive_conversation_mcq", 40, "13", (x) => x.step_index === 13),
      r("dictation", 30, "3, 16, 17, 18", (x) => x.task_type === "dictation"),
      r("interactive_speaking", 20, "19", (x) => x.step_index === 19),
      r("conversation_summary", 10, "14", isSummary),
    ];
  }
  if (skill === "reading") {
    return [
      r("real_english_word", 20, "20", (x) => x.task_type === "real_english_word"),
      r("vocabulary_reading", 55, "8", (x) => x.task_type === "vocabulary_reading"),
      r("fill_in_blanks", 25, "1, 4, 6, 11", (x) => x.task_type === "fill_in_blanks"),
    ];
  }
  return [
    r("write_about_photo", 20, "2, 7", (x) => x.task_type === "write_about_photo"),
    r("read_and_write", 50, "10", (x) => x.task_type === "read_and_write"),
    r("dictation", 20, "3, 16, 17, 18", (x) => x.task_type === "dictation"),
    r("conversation_summary", 10, "14", isSummary),
  ];
}

export function scoredRows(responses: MockResponseEntry[] | undefined): ScoredRow[] {
  return (responses ?? []).map((r) => ({
    step_index: Number(r.step_index),
    task_type: String(r.task_type),
    score: Number(r.score ?? 0),
  }));
}

export function taskAverages(rows: ScoredRow[]): { task: string; average: number }[] {
  const byTask = new Map<string, number[]>();
  for (const r of rows) {
    const list = byTask.get(r.task_type) ?? [];
    list.push(r.score);
    byTask.set(r.task_type, list);
  }
  return [...byTask.entries()].map(([task, scores]) => ({
    task,
    average: Math.round(scores.reduce((a, b) => a + b, 0) / (scores.length || 1)),
  }));
}

/** CEFR level for a 10–160 DET-scale score (same cut-offs as the website's mini diagnosis). */
export function cefrFromTotal(score: number): string {
  if (score >= 150) return "C2";
  if (score >= 130) return "C1";
  if (score >= 110) return "B2";
  if (score >= 90) return "B1";
  if (score >= 60) return "A2";
  return "A1";
}

/** Server level labels are stored as "English / ไทย"; pick the UI language. */
export function pickBilingual(label: string | null | undefined, lang: "th" | "en"): string {
  if (!label) return "";
  const parts = label.split(" / ");
  if (parts.length < 2) return label;
  return lang === "th" ? parts.slice(1).join(" / ") : parts[0]!;
}

/** Mini diagnosis: what to practise for the weakest skill (web copy, plus English). */
export const MINI_PRACTICE_NOTE: Record<MockSkill, { th: string; en: string }> = {
  listening: { th: "ฝึก Dictation + การฟังบทสนทนา", en: "Practise dictation + conversation listening" },
  speaking: { th: "ฝึก Read Then Speak + พูดโต้ตอบ", en: "Practise read-then-speak + interactive speaking" },
  reading: { th: "ฝึก Reading + เติมคำในช่องว่าง", en: "Practise reading + fill in the blanks" },
  writing: { th: "ฝึก Write About Photo + Read & Write", en: "Practise writing about photos + read & write" },
};

/** Mini diagnosis formula parts per skill (website score-buckets.ts). */
export const MINI_BREAKDOWN: Record<MockSkill, { key: string; pct: number }[]> = {
  listening: [
    { key: "dictation", pct: 50 },
    { key: "interactive_listening", pct: 50 },
  ],
  speaking: [{ key: "read_then_speak", pct: 100 }],
  reading: [
    { key: "fill_in_blanks", pct: 50 },
    { key: "vocabulary_reading", pct: 50 },
  ],
  writing: [
    { key: "write_about_photo", pct: 55 },
    { key: "dictation", pct: 30 },
    { key: "fill_in_blanks", pct: 15 },
  ],
};

// ── Coaching copy ───────────────────────────────────────────────────────────

const TASK_TIPS: Record<string, { th: string; en: string }> = {
  fill_in_blanks: {
    th: "ส่วนใหญ่พลาดเพราะไวยากรณ์ ไม่ใช่คำศัพท์ — เช็กรูปกริยา (-ed, -s, -ing) และคำเชื่อมประโยค อ่านทั้งประโยคก่อนเดาคำเสมอ",
    en: "Most misses are grammar, not vocabulary — check verb forms (-ed, -s, -ing) and linking words, and always read the whole sentence first.",
  },
  dictation: {
    th: "ระวัง 3 จุด: การเติม -ed/-es ท้ายกริยา, ตำแหน่ง comma ตรงจังหวะที่ผู้พูดหยุด, และคำที่ออกเสียงคล้ายกัน (there/their, its/it's)",
    en: "Watch three things: -ed/-es endings, commas where the speaker pauses, and sound-alike words (there/their, its/it's).",
  },
  real_english_word: {
    th: "อาศัยคลังคำศัพท์ที่คุ้นตา ฝึกอ่านคำใหม่ทุกวัน จะช่วยให้จับความผิดปกติของคำลวงได้เร็วขึ้น",
    en: "This relies on a wide sight vocabulary — read new words every day so fake spellings stand out faster.",
  },
  vocabulary_reading: {
    th: "ฝึกแยกใจความหลักกับรายละเอียดย่อยในแต่ละย่อหน้าก่อน แล้วค่อยโฟกัสคำศัพท์ที่ไม่รู้จัก เก็บคำศัพท์ทีละนิดทุกวัน",
    en: "Practise separating the main idea from details in each paragraph, then focus on unknown words — a few new words a day adds up.",
  },
  write_about_photo: {
    th: "เตรียมโครงประโยคที่ใช้ซ้ำได้ไว้ล่วงหน้า: มีใคร/อะไรอยู่ตรงไหน กำลังทำอะไร บรรยากาศเป็นอย่างไร",
    en: "Prepare reusable sentence frames: who/what is where, what they're doing, and the mood of the scene.",
  },
  speak_about_photo: {
    th: "ใช้หลักเดียวกับเขียนบรรยายภาพ แต่ต้องพูดให้ลื่นใน 1 นาที ฝึกพูดจับเวลาจริงบ่อย ๆ",
    en: "Same frames as writing about a photo, but spoken smoothly within a minute — practise with a real timer.",
  },
  read_and_write: {
    th: "จับใจความให้ไวแล้วเรียบเรียงเป็นคำของตัวเอง อย่าลอกประโยคจากโจทย์มาตรง ๆ",
    en: "Grasp the point quickly and rephrase it in your own words — don't copy sentences from the prompt.",
  },
  read_then_speak: {
    th: "ระวังอย่าท่องประโยคจากโจทย์ตรง ๆ ฝึกจับใจความแล้วพูดด้วยคำของตัวเองให้เป็นธรรมชาติ",
    en: "Don't read the prompt back word for word — pick out the idea and say it naturally in your own words.",
  },
  interactive_conversation_mcq: {
    th: "ฟังให้เข้าใจสถานการณ์ทั้งหมดก่อน แล้วเลือกคำตอบที่เข้ากับบริบทที่สุด ไม่ใช่แค่ถูกไวยากรณ์",
    en: "Understand the whole situation first, then pick the reply that fits the context — not just the grammatical one.",
  },
  interactive_speaking: {
    th: "ขยายความอย่างน้อย 2–3 ประโยคทุกคำถามพร้อมยกตัวอย่าง จะช่วยให้ได้คะแนนดีขึ้นมาก",
    en: "Expand every answer to at least 2–3 sentences with an example — it lifts the score a lot.",
  },
  conversation_summary: {
    th: "จับให้ครบ 3 อย่าง: ใจความหลัก รายละเอียดสำคัญ และข้อสรุปท้ายบทสนทนา",
    en: "Cover three things: the main point, the key details, and how the conversation ends.",
  },
};

export function mockRecommendations(
  t: T,
  total: number,
  target: number,
  rows: ScoredRow[],
): string[] {
  const out: string[] = [];
  const gap = target - total;
  if (target > 0 && gap > 0) {
    out.push(
      t(
        `ตอนนี้ได้ ${total} คะแนน ห่างจากเป้า ${target} อยู่ ${gap} คะแนน — เก็บ 2 จุดที่อ่อนที่สุดก่อน คะแนนรวมจะขยับเร็วที่สุด`,
        `You scored ${total}, ${gap} points below your ${target} target — fix your two weakest tasks first for the fastest gain.`,
      ),
    );
  } else if (target > 0) {
    out.push(
      t(
        `ถึงเป้า ${target} คะแนนแล้ว เก่งมาก! ลองตั้งเป้าให้สูงขึ้นอีกนิด`,
        `You reached your ${target} target — great work! Try setting a slightly higher goal.`,
      ),
    );
  }
  const low = [...taskAverages(rows)].sort((a, b) => a.average - b.average).slice(0, 2);
  for (const { task, average } of low) {
    const tip = TASK_TIPS[task];
    if (!tip) continue;
    const m = taskMeta(task);
    out.push(`${m.emoji} ${t(m.th, m.en)} (${average}/160) — ${t(tip.th, tip.en)}`);
  }
  if (out.length <= 1) {
    out.push(
      t(
        "คะแนนค่อนข้างสมดุลทุกทักษะแล้ว ฝึกแบบสุ่มทุกประเภทต่อไปเพื่อรักษาระดับและขยับขึ้นทีละนิด",
        "Your skills are well balanced — keep mixing all task types to hold your level and climb steadily.",
      ),
    );
  }
  return out;
}

export function fmtDateTime(iso: string | null | undefined, lang: "th" | "en"): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(lang === "th" ? "th-TH" : "en-US", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.ceil(totalSec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
