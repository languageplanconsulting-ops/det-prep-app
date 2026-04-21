import { MINI_DIAGNOSIS_SEQUENCE_TEMPLATE, MINI_DIAGNOSIS_STEP_COUNT } from "@/lib/mini-diagnosis/sequence";
import type { MiniDiagnosisTaskType, MiniDiagnosisUploadRow } from "@/lib/mini-diagnosis/types";

const ALLOWED_TASKS = new Set<MiniDiagnosisTaskType>(
  MINI_DIAGNOSIS_SEQUENCE_TEMPLATE.map((step) => step.taskType),
);

function toInt(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
}

function normalizeRow(raw: Record<string, unknown>): MiniDiagnosisUploadRow {
  return {
    step_index: toInt(raw.step_index),
    task_type: String(raw.task_type) as MiniDiagnosisTaskType,
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
  taskType: MiniDiagnosisTaskType,
  stepIndex: number,
  defaultTimeLimitSec: number,
  defaultRestAfterStepSec: number,
  defaultIsAiGraded: boolean,
): MiniDiagnosisUploadRow {
  return {
    step_index: stepIndex,
    task_type: taskType,
    time_limit_sec:
      raw.time_limit_sec == null ? defaultTimeLimitSec : toInt(raw.time_limit_sec),
    rest_after_step_sec:
      raw.rest_after_step_sec == null ? defaultRestAfterStepSec : toInt(raw.rest_after_step_sec),
    is_ai_graded: raw.is_ai_graded == null ? defaultIsAiGraded : raw.is_ai_graded === true,
    content: (raw.content ?? raw) as Record<string, unknown>,
    correct_answer:
      raw.correct_answer && typeof raw.correct_answer === "object"
        ? (raw.correct_answer as Record<string, unknown>)
        : null,
  };
}

function validateRows(rows: MiniDiagnosisUploadRow[]) {
  if (rows.length !== MINI_DIAGNOSIS_STEP_COUNT) {
    return { rows: [], error: `Expected exactly ${MINI_DIAGNOSIS_STEP_COUNT} rows (steps 1..9)` };
  }
  const byStep = new Map<number, MiniDiagnosisUploadRow>();
  for (const row of rows) {
    if (!Number.isInteger(row.step_index) || row.step_index < 1 || row.step_index > MINI_DIAGNOSIS_STEP_COUNT) {
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
    byStep.set(row.step_index, row);
  }

  for (const template of MINI_DIAGNOSIS_SEQUENCE_TEMPLATE) {
    const row = byStep.get(template.stepIndex);
    if (!row) {
      return { rows: [], error: `Missing step ${template.stepIndex}` };
    }
    if (row.task_type !== template.taskType) {
      return {
        rows: [],
        error: `Step ${template.stepIndex} must be "${template.taskType}"`,
      };
    }
  }

  return {
    rows: rows.slice().sort((a, b) => a.step_index - b.step_index),
  };
}

export function parseMiniDiagnosisUploadJson(text: string): {
  rows: MiniDiagnosisUploadRow[];
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
      const hasTaskBuckets = MINI_DIAGNOSIS_SEQUENCE_TEMPLATE.some((step) =>
        Array.isArray(grouped[step.taskType]),
      );
      if (hasTaskBuckets) {
        const buckets = new Map<MiniDiagnosisTaskType, Record<string, unknown>[]>();
        for (const step of MINI_DIAGNOSIS_SEQUENCE_TEMPLATE) {
          const list = grouped[step.taskType];
          buckets.set(
            step.taskType,
            Array.isArray(list)
              ? list.filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
              : [],
          );
        }
        const rows: MiniDiagnosisUploadRow[] = [];
        for (const step of MINI_DIAGNOSIS_SEQUENCE_TEMPLATE) {
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
              step.isAiGraded === true,
            ),
          );
        }
        return validateRows(rows);
      }
    }

    const list =
      Array.isArray(parsed) ? parsed : (parsed as { items?: unknown[] })?.items;
    if (!Array.isArray(list)) {
      return {
        rows: [],
        error:
          "JSON must be an array (or { items: [...] }) OR grouped buckets by task_type.",
      };
    }
    const rows = list
      .filter((x) => x && typeof x === "object")
      .map((x) => normalizeRow(x as Record<string, unknown>));
    return validateRows(rows);
  } catch {
    return { rows: [], error: "Invalid JSON" };
  }
}

export function buildMiniDiagnosisTemplateJson(): string {
  const grouped = {
    dictation: [
      { content: { reference_sentence: "Students should review their notes before the final exam." } },
      { content: { reference_sentence: "The professor reminded everyone to submit the report by Friday." } },
    ],
    real_english_word: [
      {
        content: {
          real_words: [
            "market","travel","language","student","campus","holiday","project","budget",
            "lecture","science","library","research","teacher","airport","culture","meeting",
          ],
          fake_words: [
            "blonter","sproke","drimble","claned","plartic","snorvy","trandle","mepish",
            "glinter","brasted","sholtic","frelten","clorvid","pransic","droven","smurtle",
            "grendle","slarmic","troven","plimsy","crondel","brivon","snertal","frandic",
          ],
          rounds: 1,
          words_per_round: 40,
          round_duration_sec: 60,
          score_per_correct: 5,
        },
      },
    ],
    vocabulary_reading: [
      {
        content: {
          mock_combined_mode: true,
          titleEn: "Campus Climate Study",
          passage: {
            p1: "Students at the university joined a project about [BLANK 1] and energy use on campus.",
            p2: "Researchers found that simple changes could lower costs and improve daily comfort.",
            p3: "The report encouraged students to take more responsibility for environmental action.",
          },
          highlightedVocab: [],
          vocabularyQuestions: [
            { question: "Which word is closest in meaning to project?", options: ["plan", "accident", "holiday", "debate"], correctAnswer: "plan" },
            { question: "Which word best replaces energy?", options: ["power", "silence", "crowd", "paper"], correctAnswer: "power" },
            { question: "Which word best fits blank 1?", options: ["recycling", "recycled", "recycle", "recycles"], correctAnswer: "recycling" },
            { question: "Which word is closest in meaning to lower?", options: ["reduce", "hide", "divide", "collect"], correctAnswer: "reduce" },
            { question: "Which word best replaces comfort?", options: ["convenience", "argument", "danger", "anger"], correctAnswer: "convenience" },
            { question: "Which word is closest in meaning to responsibility?", options: ["duty", "grade", "luck", "choice"], correctAnswer: "duty" },
          ],
          missingParagraph: { question: "Which paragraph fits the missing gap?", options: ["Option A", "Option B", "Option C", "Option D"], correctAnswer: "Option A" },
          informationLocation: { question: "Where should a sentence about lower bills go?", options: ["Paragraph 1", "Paragraph 2", "Paragraph 3", "Nowhere"], correctAnswer: "Paragraph 2" },
          bestTitle: { question: "What is the best title?", options: ["A University Climate Project", "How to Borrow Library Books", "Student Fashion Week", "A New Sports Club"], correctAnswer: "A University Climate Project" },
          mainIdea: { question: "What is the main idea?", options: ["Students can improve campus life with practical environmental action.", "Students dislike science research.", "The campus has too many sports clubs.", "Researchers only studied library books."], correctAnswer: "Students can improve campus life with practical environmental action." },
        },
      },
    ],
    fill_in_blanks: [
      {
        content: {
          passage: "The professor asked the students to [BLANK 1] their essays before the final [BLANK 2].",
          missingWords: [
            { correctWord: "revise", clue: "To improve by checking and changing errors.", explanationThai: "แก้ไขปรับปรุง", prefix_length: 2 },
            { correctWord: "submission", clue: "The act of formally sending work to be checked.", explanationThai: "การส่งงาน", prefix_length: 3 },
          ],
        },
        correct_answer: { answers: ["revise", "submission"] },
      },
      {
        content: {
          passage: "Many students choose public transport because it is more [BLANK 1] and often less [BLANK 2] than driving.",
          missingWords: [
            { correctWord: "convenient", clue: "Easy and practical to use.", explanationThai: "สะดวก", prefix_length: 3 },
            { correctWord: "expensive", clue: "Costing a lot of money.", explanationThai: "แพง", prefix_length: 2 },
          ],
        },
        correct_answer: { answers: ["convenient", "expensive"] },
      },
    ],
    interactive_listening: [
      {
        content: {
          instruction: "Listen to the audio. You may play it up to 3 times, then answer the 5 questions.",
          instruction_th: "ฟังเสียงนี้ได้สูงสุด 3 ครั้ง แล้วตอบคำถาม 5 ข้อ",
          audio_url: "https://example.com/listening-mini-test.mp3",
          questions: [
            { question: "Why did the student visit the office?", options: ["To ask about housing", "To ask about an internship", "To change a class", "To borrow a book"], correctAnswer: "To ask about an internship" },
            { question: "What support does the office provide?", options: ["Gym membership", "Transport card", "Partner company list", "Dormitory discount"], correctAnswer: "Partner company list" },
            { question: "What is the student unsure about?", options: ["Salary details", "Application process", "Exam date", "Scholarship deadline"], correctAnswer: "Application process" },
            { question: "What will the office explain?", options: ["Dress code", "Application steps", "Cafeteria rules", "Parking rules"], correctAnswer: "Application steps" },
            { question: "What does the student say at the end?", options: ["That would be really helpful.", "I will cancel my application.", "I do not need any support.", "I already know the process."], correctAnswer: "That would be really helpful." },
          ],
        },
      },
    ],
    write_about_photo: [
      {
        content: {
          image_url: "https://example.com/mini-write-photo.jpg",
          instruction: "Write one short paragraph describing what is happening in this image.",
          instruction_th: "เขียนหนึ่งย่อหน้าสั้นๆ อธิบายสิ่งที่เกิดขึ้นในภาพนี้",
        },
      },
    ],
    read_then_speak: [
      {
        content: {
          titleEn: "Mini read then speak",
          titleTh: "มินิอ่านแล้วพูด",
          prompt_en: "Read the short text, then summarize the main idea and respond naturally.",
          prompt_th: "อ่านบทสั้นๆ แล้วสรุปใจความสำคัญพร้อมพูดตอบอย่างเป็นธรรมชาติ",
          passage: "Many students prefer blended learning because it combines flexibility with in-person interaction, which can improve both convenience and engagement.",
        },
      },
    ],
  };
  return JSON.stringify({ grouped_items: grouped }, null, 2);
}

const MINI_DIAGNOSIS_TASK_TEMPLATES: Record<MiniDiagnosisTaskType, unknown> = {
  dictation: {
    content: {
      reference_sentence: "Students should review their notes before the final exam.",
    },
  },
  real_english_word: {
    content: {
      real_words: ["market", "travel", "language"],
      fake_words: ["blonter", "sproke", "drimble"],
      rounds: 1,
      words_per_round: 40,
      round_duration_sec: 60,
      score_per_correct: 5,
    },
  },
  vocabulary_reading: {
    content: {
      mock_combined_mode: true,
      titleEn: "Campus Climate Study",
      passage: {
        p1: "Students at the university joined a project about [BLANK 1] and energy use on campus.",
        p2: "Researchers found that simple changes could lower costs and improve daily comfort.",
        p3: "The report encouraged students to take more responsibility for environmental action.",
      },
      highlightedVocab: [],
      vocabularyQuestions: [
        {
          question: "Which word is closest in meaning to project?",
          options: ["plan", "accident", "holiday", "debate"],
          correctAnswer: "plan",
        },
      ],
      missingParagraph: {
        question: "Which paragraph fits the missing gap?",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: "Option A",
      },
      informationLocation: {
        question: "Where should a sentence about lower bills go?",
        options: ["Paragraph 1", "Paragraph 2", "Paragraph 3", "Nowhere"],
        correctAnswer: "Paragraph 2",
      },
      bestTitle: {
        question: "What is the best title?",
        options: ["Title A", "Title B", "Title C", "Title D"],
        correctAnswer: "Title A",
      },
      mainIdea: {
        question: "What is the main idea?",
        options: ["Idea A", "Idea B", "Idea C", "Idea D"],
        correctAnswer: "Idea A",
      },
    },
  },
  fill_in_blanks: {
    content: {
      passage: "The professor asked the students to [BLANK 1] their essays before the final [BLANK 2].",
      missingWords: [
        {
          correctWord: "revise",
          clue: "To improve by checking and changing errors.",
          explanationThai: "แก้ไขปรับปรุง",
          prefix_length: 2,
        },
        {
          correctWord: "submission",
          clue: "The act of formally sending work to be checked.",
          explanationThai: "การส่งงาน",
          prefix_length: 3,
        },
      ],
    },
    correct_answer: {
      answers: ["revise", "submission"],
    },
  },
  interactive_listening: {
    content: {
      instruction: "Listen to the audio. You may play it up to 3 times, then answer the 5 questions.",
      instruction_th: "ฟังเสียงนี้ได้สูงสุด 3 ครั้ง แล้วตอบคำถาม 5 ข้อ",
      script: "Hello, I am visiting the office to ask about internship opportunities and the application process.",
      questions: [
        {
          question: "Why did the student visit the office?",
          options: ["Choice 1", "Choice 2", "Choice 3", "Choice 4"],
          correctAnswer: "Choice 1",
        },
      ],
    },
  },
  write_about_photo: {
    content: {
      image_url: "https://example.com/mini-write-photo.jpg",
      instruction: "Write one short paragraph describing what is happening in this image.",
      instruction_th: "เขียนหนึ่งย่อหน้าสั้นๆ อธิบายสิ่งที่เกิดขึ้นในภาพนี้",
    },
  },
  read_then_speak: {
    content: {
      titleEn: "Mini read then speak",
      titleTh: "มินิอ่านแล้วพูด",
      topic: "Talk about your favorite book. When did you read it? Who gave it to you? Why do you like it?",
      prompt_en: "Read the cue card, then respond naturally in English.",
      prompt_th: "อ่านหัวข้อแล้วพูดตอบอย่างเป็นธรรมชาติเป็นภาษาอังกฤษ",
      guiding_questions: [
        "When did you read it?",
        "Who gave it to you?",
        "Why do you like it?",
        "What is the story?",
      ],
    },
  },
};

export function buildMiniDiagnosisTaskTemplateJson(taskType: MiniDiagnosisTaskType): string {
  return JSON.stringify(MINI_DIAGNOSIS_TASK_TEMPLATES[taskType], null, 2);
}
