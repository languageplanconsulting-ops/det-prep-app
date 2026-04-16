import { FIXED_MOCK_STEP_COUNT, FIXED_SEQUENCE_TEMPLATE } from "@/lib/mock-test/fixed-sequence";
import type { FixedSetUploadRow, FixedTaskType } from "@/lib/mock-test/fixed-types";

const ALLOWED_TASKS = new Set<FixedTaskType>(
  FIXED_SEQUENCE_TEMPLATE.map((s) => s.taskType),
);

function toInt(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

function csvEscape(value: string): string {
  if (/[,"\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function normalizeRow(raw: Record<string, unknown>): FixedSetUploadRow {
  return {
    step_index: toInt(raw.step_index),
    task_type: String(raw.task_type) as FixedTaskType,
    time_limit_sec: toInt(raw.time_limit_sec),
    rest_after_step_sec:
      raw.rest_after_step_sec == null ? undefined : toInt(raw.rest_after_step_sec),
    is_ai_graded: raw.is_ai_graded === true,
    content: (raw.content ?? {}) as Record<string, unknown>,
    correct_answer:
      raw.correct_answer && typeof raw.correct_answer === "object"
        ? (raw.correct_answer as Record<string, unknown>)
        : null,
  };
}

function normalizeGroupedItem(
  raw: Record<string, unknown>,
  taskType: FixedTaskType,
  stepIndex: number,
  defaultTimeLimitSec: number,
  defaultRestAfterSec: number,
): FixedSetUploadRow {
  return {
    step_index: stepIndex,
    task_type: taskType,
    time_limit_sec:
      raw.time_limit_sec == null ? defaultTimeLimitSec : toInt(raw.time_limit_sec),
    rest_after_step_sec:
      raw.rest_after_step_sec == null ? defaultRestAfterSec : toInt(raw.rest_after_step_sec),
    is_ai_graded: raw.is_ai_graded === true,
    content: (raw.content ?? raw) as Record<string, unknown>,
    correct_answer:
      raw.correct_answer && typeof raw.correct_answer === "object"
        ? (raw.correct_answer as Record<string, unknown>)
        : null,
  };
}

function isMcBlock(x: unknown): boolean {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.question === "string" &&
    Array.isArray(o.options) &&
    o.options.length >= 2 &&
    typeof o.correctAnswer === "string"
  );
}

export function parseFixedMockUploadJson(text: string): {
  rows: FixedSetUploadRow[];
  error?: string;
} {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      const grouped =
        (obj.grouped_items as Record<string, unknown[]>) ??
        (obj.by_task as Record<string, unknown[]>) ??
        obj;

      const hasTaskBuckets = FIXED_SEQUENCE_TEMPLATE.some((s) =>
        Array.isArray(grouped[s.taskType]),
      );
      if (hasTaskBuckets) {
        const buckets = new Map<FixedTaskType, Record<string, unknown>[]>();
        for (const step of FIXED_SEQUENCE_TEMPLATE) {
          const list = grouped[step.taskType];
          if (!Array.isArray(list)) {
            buckets.set(step.taskType, []);
            continue;
          }
          buckets.set(
            step.taskType,
            list.filter((x): x is Record<string, unknown> => !!x && typeof x === "object"),
          );
        }

        const rows: FixedSetUploadRow[] = [];
        for (const step of FIXED_SEQUENCE_TEMPLATE) {
          const bucket = buckets.get(step.taskType) ?? [];
          const item = bucket.shift();
          if (!item) {
            return {
              rows: [],
              error: `Grouped JSON missing item for task "${step.taskType}" at step ${step.stepIndex}`,
            };
          }
          rows.push(
            normalizeGroupedItem(
              item,
              step.taskType,
              step.stepIndex,
              step.timeLimitSec,
              step.restAfterStepSec,
            ),
          );
        }

        for (const [taskType, remain] of buckets.entries()) {
          if (remain.length > 0) {
            return {
              rows: [],
              error: `Grouped JSON has too many items for "${taskType}" (extra ${remain.length})`,
            };
          }
        }
        return validateFixedRows(rows);
      }
    }
    const list =
      Array.isArray(parsed) ? parsed : (parsed as { items?: unknown[] })?.items;
    if (!Array.isArray(list)) {
      return {
        rows: [],
        error:
          "JSON must be an array (or { items: [...] }) OR grouped buckets by task_type (e.g. { fill_in_blanks:[...], dictation:[...], ... }).",
      };
    }
    const rows = list
      .filter((x) => x && typeof x === "object")
      .map((x) => normalizeRow(x as Record<string, unknown>));
    return validateFixedRows(rows);
  } catch {
    return { rows: [], error: "Invalid JSON" };
  }
}

export function parseFixedMockUploadCsv(text: string): {
  rows: FixedSetUploadRow[];
  error?: string;
} {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return { rows: [], error: "CSV must include header + at least one row" };
  const headers = parseCsvLine(lines[0]!);
  const getIdx = (name: string) => headers.indexOf(name);
  const required = ["step_index", "task_type", "time_limit_sec", "content_json"];
  for (const r of required) {
    if (getIdx(r) < 0) return { rows: [], error: `CSV missing header: ${r}` };
  }
  const rows: FixedSetUploadRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]!);
    const contentJson = cols[getIdx("content_json")] ?? "{}";
    const correctJson = cols[getIdx("correct_answer_json")] ?? "";
    let content: Record<string, unknown> = {};
    let correctAnswer: Record<string, unknown> | null = null;
    try {
      content = JSON.parse(contentJson) as Record<string, unknown>;
      correctAnswer = correctJson ? (JSON.parse(correctJson) as Record<string, unknown>) : null;
    } catch {
      return { rows: [], error: `CSV row ${i + 1} has invalid JSON in content_json/correct_answer_json` };
    }
    rows.push(
      normalizeRow({
        step_index: cols[getIdx("step_index")],
        task_type: cols[getIdx("task_type")],
        time_limit_sec: cols[getIdx("time_limit_sec")],
        rest_after_step_sec: cols[getIdx("rest_after_step_sec")],
        is_ai_graded: cols[getIdx("is_ai_graded")] === "true",
        content,
        correct_answer: correctAnswer,
      }),
    );
  }
  return validateFixedRows(rows);
}

export function validateFixedRows(rows: FixedSetUploadRow[]): { rows: FixedSetUploadRow[]; error?: string } {
  if (rows.length !== FIXED_MOCK_STEP_COUNT) {
    return { rows: [], error: `Expected exactly ${FIXED_MOCK_STEP_COUNT} rows (steps 1..20)` };
  }
  const byStep = new Map<number, FixedSetUploadRow>();
  for (const row of rows) {
    if (!Number.isInteger(row.step_index) || row.step_index < 1 || row.step_index > FIXED_MOCK_STEP_COUNT) {
      return { rows: [], error: `Invalid step_index ${row.step_index}` };
    }
    if (!ALLOWED_TASKS.has(row.task_type)) {
      return { rows: [], error: `Invalid task_type "${row.task_type}"` };
    }
    if (!Number.isInteger(row.time_limit_sec) || row.time_limit_sec <= 0) {
      return { rows: [], error: `Invalid time_limit_sec for step ${row.step_index}` };
    }
    if (!row.content || typeof row.content !== "object") {
      return { rows: [], error: `content must be object at step ${row.step_index}` };
    }
    if ([1, 4, 6, 11].includes(row.step_index) && row.task_type === "fill_in_blanks") {
      const c = row.content as Record<string, unknown>;
      const hasPracticeStyle =
        typeof c.passage === "string" &&
        Array.isArray(c.missingWords) &&
        c.missingWords.length > 0;
      if (!hasPracticeStyle) {
        return {
          rows: [],
          error:
            `Step ${row.step_index} fill_in_blanks must match normal fill-in-blank format: ` +
            `content.passage + content.missingWords[]`,
        };
      }
    }
    if (row.step_index === 8 && row.task_type === "vocabulary_reading") {
      const c = row.content as Record<string, unknown>;
      const passage = c.passage as Record<string, unknown> | undefined;
      if (!passage || typeof passage.p1 !== "string" || typeof passage.p2 !== "string" || typeof passage.p3 !== "string") {
        return { rows: [], error: "Step 8 requires content.passage with p1/p2/p3 strings" };
      }
      const vocabQs = Array.isArray(c.vocabularyQuestions) ? c.vocabularyQuestions : [];
      if (vocabQs.length < 6 || !vocabQs.slice(0, 6).every(isMcBlock)) {
        return { rows: [], error: "Step 8 requires at least 6 valid vocabularyQuestions blocks" };
      }
      if (!isMcBlock(c.missingParagraph)) {
        return { rows: [], error: "Step 8 requires valid missingParagraph block" };
      }
      if (!isMcBlock(c.informationLocation)) {
        return { rows: [], error: "Step 8 requires valid informationLocation block" };
      }
      if (!isMcBlock(c.bestTitle)) {
        return { rows: [], error: "Step 8 requires valid bestTitle block" };
      }
      if (!isMcBlock(c.mainIdea)) {
        return { rows: [], error: "Step 8 requires valid mainIdea block" };
      }
    }
    if (row.step_index === 13 && row.task_type === "interactive_conversation_mcq") {
      const c = row.content as Record<string, unknown>;
      const turns = Array.isArray(c.turns) ? c.turns : [];
      const validTurns =
        turns.length >= 2 &&
        turns.every((t) => {
          if (!t || typeof t !== "object") return false;
          const o = t as Record<string, unknown>;
          const opts = Array.isArray(o.options) ? o.options : [];
          return (
            typeof o.question_en === "string" &&
            opts.length >= 2 &&
            opts.every((x) => typeof x === "string") &&
            typeof o.correct_answer === "string"
          );
        });
      if (!validTurns) {
        return {
          rows: [],
          error:
            "Step 13 interactive_conversation_mcq requires content.turns with question_en, options[], and correct_answer",
        };
      }
    }
    if (row.step_index === 20 && row.task_type === "real_english_word") {
      const c = row.content as Record<string, unknown>;
      const realWords = Array.isArray(c.real_words) ? c.real_words.map((x) => String(x).trim()).filter(Boolean) : [];
      const fakeWords = Array.isArray(c.fake_words) ? c.fake_words.map((x) => String(x).trim()).filter(Boolean) : [];
      if (realWords.length !== 32 || fakeWords.length !== 48) {
        return { rows: [], error: "Step 20 real_english_word requires exactly 32 real_words and 48 fake_words (80 total)." };
      }
    }
    if (row.step_index === 14 && row.task_type === "conversation_summary") {
      const c = row.content as Record<string, unknown>;
      if (c.mock_linked_from_interactive === true) {
        byStep.set(row.step_index, row);
        continue;
      }
      const turns = Array.isArray(c.turns) ? c.turns : [];
      const validTurns =
        turns.length >= 2 &&
        turns.every((t) => {
          if (!t || typeof t !== "object") return false;
          const o = t as Record<string, unknown>;
          return typeof o.question_en === "string" && typeof o.reference_answer_en === "string";
        });
      if (!validTurns) {
        return { rows: [], error: "Step 14 conversation_summary requires content.turns with question_en and reference_answer_en" };
      }
    }
    byStep.set(row.step_index, row);
  }
  if (byStep.size !== FIXED_MOCK_STEP_COUNT) {
    return { rows: [], error: "Duplicate or missing step_index values" };
  }
  for (const t of FIXED_SEQUENCE_TEMPLATE) {
    const row = byStep.get(t.stepIndex)!;
    if (row.task_type !== t.taskType) {
      return {
        rows: [],
        error: `Step ${t.stepIndex} must be task_type "${t.taskType}"`,
      };
    }
  }
  return {
    rows: [...byStep.values()].sort((a, b) => a.step_index - b.step_index),
  };
}

export function buildFixedTemplateJson(): string {
  const groupedItems = FIXED_SEQUENCE_TEMPLATE.reduce(
    (acc, s) => {
      if (!acc[s.taskType]) acc[s.taskType] = [];
      acc[s.taskType]!.push({
        content:
          [1, 4, 6, 11].includes(s.stepIndex)
            ? {
                passage:
                  "Sarah arrived at the busy airport with her heavy [BLANK 1]. She looked at the board for her [BLANK 2].",
                missingWords: [
                  {
                    correctWord: "luggage",
                    clue: "The bags and suitcases you take when you travel.",
                    explanationThai: "กระเป๋าเดินทาง",
                    prefix_length: 3,
                    synonyms: ["baggage"],
                  },
                  {
                    correctWord: "flight",
                    clue: "A journey made in an airplane.",
                    explanationThai: "เที่ยวบิน",
                    prefix_length: 2,
                    synonyms: ["plane journey"],
                  },
                ],
              }
            : { instruction: "Replace with real content" },
        correct_answer: null,
      });
      return acc;
    },
    {} as Partial<Record<FixedTaskType, Array<Record<string, unknown>>>>,
  );

  const items = FIXED_SEQUENCE_TEMPLATE.map((s) => ({
    step_index: s.stepIndex,
    task_type: s.taskType,
    time_limit_sec: s.timeLimitSec,
    rest_after_step_sec: s.restAfterStepSec,
    is_ai_graded: ["write_about_photo", "speak_about_photo", "read_and_write", "read_then_speak", "interactive_speaking", "conversation_summary"].includes(
      s.taskType,
    ),
    content:
      s.stepIndex === 8
        ? {
            mock_combined_mode: true,
            titleEn: "Vocabulary + Reading (Combined)",
            passage: {
              p1: "Paragraph 1 with context and six vocabulary blanks spread across paragraph 1 and paragraph 3.",
              p2: "This is the missing paragraph that should be hidden first and revealed after Q7 selection.",
              p3: "Paragraph 3 continues the topic with more blank-based vocabulary context.",
            },
            highlightedVocab: [],
            vocabularyQuestions: [
              { question: "Q1 vocab blank", options: ["A", "B", "C", "D"], correctAnswer: "A" },
              { question: "Q2 vocab blank", options: ["A", "B", "C", "D"], correctAnswer: "A" },
              { question: "Q3 vocab blank", options: ["A", "B", "C", "D"], correctAnswer: "A" },
              { question: "Q4 vocab blank", options: ["A", "B", "C", "D"], correctAnswer: "A" },
              { question: "Q5 vocab blank", options: ["A", "B", "C", "D"], correctAnswer: "A" },
              { question: "Q6 vocab blank", options: ["A", "B", "C", "D"], correctAnswer: "A" },
            ],
            missingParagraph: {
              question: "What is the best missing paragraph?",
              options: ["Option A", "Option B", "Option C", "Option D"],
              correctAnswer: "Option A",
            },
            informationLocation: {
              question: "Which location best matches the gap?",
              options: ["Option A", "Option B", "Option C", "Option D"],
              correctAnswer: "Option B",
            },
            bestTitle: {
              question: "What is the best title for this reading?",
              options: ["Option A", "Option B", "Option C", "Option D"],
              correctAnswer: "Option C",
            },
            mainIdea: {
              question: "What is the main idea of the passage?",
              options: ["Option A", "Option B", "Option C", "Option D"],
              correctAnswer: "Option D",
            },
          }
        : [1, 4, 6, 11].includes(s.stepIndex)
          ? {
              passage:
                "Sarah arrived at the busy airport with her heavy [BLANK 1]. She looked at the board for her [BLANK 2].",
              cefr_level: "A2-B1",
              difficulty: "easy",
              set_id: "set_mock_fill_001",
              missingWords: [
                {
                  correctWord: "luggage",
                  clue: "The bags and suitcases you take when you travel.",
                  explanationThai: "กระเป๋าเดินทาง",
                  prefix_length: 3,
                  synonyms: ["baggage"],
                },
                {
                  correctWord: "flight",
                  clue: "A journey made in an airplane.",
                  explanationThai: "เที่ยวบิน",
                  prefix_length: 2,
                  synonyms: ["plane journey"],
                },
              ],
            }
        : s.stepIndex === 20 && s.taskType === "real_english_word"
          ? {
              real_words: Array.from({ length: 32 }, (_, i) => `real_word_${String(i + 1).padStart(2, "0")}`),
              fake_words: Array.from({ length: 48 }, (_, i) => `fake_word_${String(i + 1).padStart(2, "0")}`),
              rounds: 4,
              words_per_round: 20,
              round_duration_sec: 60,
              score_per_correct: 5,
            }
        : s.stepIndex === 13 && s.taskType === "interactive_conversation_mcq"
          ? {
              scenario_title_en: "Linked conversation mock scenario",
              turns: [
                {
                  question_en: "Could you tell me your travel plan for this weekend?",
                  options: [
                    "I plan to visit Chiang Mai on Saturday and return Sunday evening.",
                    "I did not make any travel plan yet.",
                    "I want to buy a new suitcase first.",
                    "I plan to skip the weekend trip.",
                  ],
                  correct_answer: "I plan to visit Chiang Mai on Saturday and return Sunday evening.",
                },
                {
                  question_en: "What is your main reason for this trip?",
                  options: [
                    "I want to attend a short workshop and meet a friend.",
                    "I want to avoid all classes next week.",
                    "I want to move to another city permanently.",
                    "I want to cancel my current plans.",
                  ],
                  correct_answer: "I want to attend a short workshop and meet a friend.",
                },
              ],
            }
          : s.stepIndex === 14
            ? {
                mock_linked_from_interactive: true,
                summary_instruction_en: "Summarize the conversation after interactive turns.",
                summary_instruction_th: "สรุปบทสนทนาหลังทำ interactive",
              }
          : {
            instruction: "Replace with real content",
            instruction_th: "แทนที่ด้วยเนื้อหาจริง",
          },
    correct_answer: null,
  }));
  return JSON.stringify(
    {
      _notes: [
        "You can upload either exact items[] (step_index 1..20) OR grouped_items by task type.",
        "In grouped_items mode, rows are auto-distributed into the fixed sequence.",
      ],
      grouped_items: groupedItems,
      items,
    },
    null,
    2,
  );
}

export function buildFixedTemplateCsv(): string {
  const head =
    "step_index,task_type,time_limit_sec,rest_after_step_sec,is_ai_graded,content_json,correct_answer_json";
  const rows = FIXED_SEQUENCE_TEMPLATE.map((s) => {
    const isAi = ["write_about_photo", "speak_about_photo", "read_and_write", "read_then_speak", "interactive_speaking", "conversation_summary"].includes(
      s.taskType,
    );
    const contentObj =
      s.stepIndex === 8
        ? {
            mock_combined_mode: true,
            titleEn: "Vocabulary + Reading (Combined)",
            passage: {
              p1: "Paragraph 1 with [BLANK 1] ... [BLANK 3]",
              p2: "Missing paragraph to be revealed after selection.",
              p3: "Paragraph 3 with [BLANK 4] ... [BLANK 6]",
            },
            highlightedVocab: [],
            vocabularyQuestions: [
              { question: "Q1 vocab blank", options: ["A", "B", "C", "D"], correctAnswer: "A" },
              { question: "Q2 vocab blank", options: ["A", "B", "C", "D"], correctAnswer: "A" },
              { question: "Q3 vocab blank", options: ["A", "B", "C", "D"], correctAnswer: "A" },
              { question: "Q4 vocab blank", options: ["A", "B", "C", "D"], correctAnswer: "A" },
              { question: "Q5 vocab blank", options: ["A", "B", "C", "D"], correctAnswer: "A" },
              { question: "Q6 vocab blank", options: ["A", "B", "C", "D"], correctAnswer: "A" },
            ],
            missingParagraph: {
              question: "What is the best missing paragraph?",
              options: ["Option A", "Option B", "Option C", "Option D"],
              correctAnswer: "Option A",
            },
            informationLocation: {
              question: "Which location best matches the gap?",
              options: ["Option A", "Option B", "Option C", "Option D"],
              correctAnswer: "Option B",
            },
            bestTitle: {
              question: "What is the best title for this reading?",
              options: ["Option A", "Option B", "Option C", "Option D"],
              correctAnswer: "Option C",
            },
            mainIdea: {
              question: "What is the main idea of the passage?",
              options: ["Option A", "Option B", "Option C", "Option D"],
              correctAnswer: "Option D",
            },
          }
        : [1, 4, 6, 11].includes(s.stepIndex)
          ? {
              passage:
                "Sarah arrived at the busy airport with her heavy [BLANK 1]. She looked at the board for her [BLANK 2].",
              cefr_level: "A2-B1",
              difficulty: "easy",
              set_id: "set_mock_fill_001",
              missingWords: [
                {
                  correctWord: "luggage",
                  clue: "The bags and suitcases you take when you travel.",
                  explanationThai: "กระเป๋าเดินทาง",
                  prefix_length: 3,
                  synonyms: ["baggage"],
                },
                {
                  correctWord: "flight",
                  clue: "A journey made in an airplane.",
                  explanationThai: "เที่ยวบิน",
                  prefix_length: 2,
                  synonyms: ["plane journey"],
                },
              ],
            }
        : s.stepIndex === 20 && s.taskType === "real_english_word"
          ? {
              real_words: Array.from({ length: 32 }, (_, i) => `real_word_${String(i + 1).padStart(2, "0")}`),
              fake_words: Array.from({ length: 48 }, (_, i) => `fake_word_${String(i + 1).padStart(2, "0")}`),
              rounds: 4,
              words_per_round: 20,
              round_duration_sec: 60,
              score_per_correct: 5,
            }
        : s.stepIndex === 13 && s.taskType === "interactive_conversation_mcq"
          ? {
              scenario_title_en: "Linked conversation mock scenario",
              turns: [
                {
                  question_en: "Could you tell me your travel plan for this weekend?",
                  options: [
                    "I plan to visit Chiang Mai on Saturday and return Sunday evening.",
                    "I did not make any travel plan yet.",
                    "I want to buy a new suitcase first.",
                    "I plan to skip the weekend trip.",
                  ],
                  correct_answer:
                    "I plan to visit Chiang Mai on Saturday and return Sunday evening.",
                },
                {
                  question_en: "What is your main reason for this trip?",
                  options: [
                    "I want to attend a short workshop and meet a friend.",
                    "I want to avoid all classes next week.",
                    "I want to move to another city permanently.",
                    "I want to cancel my current plans.",
                  ],
                  correct_answer:
                    "I want to attend a short workshop and meet a friend.",
                },
              ],
            }
          : s.stepIndex === 14
            ? {
                mock_linked_from_interactive: true,
                summary_instruction_en: "Summarize the conversation after interactive turns.",
                summary_instruction_th: "สรุปบทสนทนาหลังทำ interactive",
              }
          : {
              instruction: "Replace with real content",
              instruction_th: "แทนที่ด้วยเนื้อหาจริง",
            };
    const content = csvEscape(JSON.stringify(contentObj));
    const correct = "";
    return `${s.stepIndex},${s.taskType},${s.timeLimitSec},${s.restAfterStepSec},${isAi},${content},${correct}`;
  });
  return [head, ...rows].join("\n");
}
