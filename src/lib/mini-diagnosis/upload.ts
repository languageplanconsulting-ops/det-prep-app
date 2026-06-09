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
          real_words_per_round: 20,
          round_duration_sec: 60,
          score_per_correct: 8,
          score_penalty_per_fake_pick: 3,
          max_score: 160,
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
          instruction: "You are about to take a short listening test. You will hear three short scenarios. You can press play up to 3 times per scenario, then answer the questions before moving on.",
          instruction_th: "คุณกำลังจะทำข้อสอบการฟังสั้นๆ จะมีทั้งหมด 3 สถานการณ์ คุณสามารถกดฟังได้ไม่เกิน 3 ครั้งต่อหนึ่งสถานการณ์ จากนั้นตอบคำถามทั้งหมดก่อนไปต่อ",
          pre_break_seconds: 20,
          pre_break_message_th: "พักสายตา 20 วินาทีก่อนเริ่มทำข้อสอบการฟัง เตรียมหูฟังและสมาธิให้พร้อม เพราะหลังจากนี้คุณจะได้ฟังบทสนทนาและตอบคำถาม",
          pre_break_message_en: "Take a 20 second rest before the listening exam begins. Put on your headphones and get ready, because right after this you will listen to short scenarios and answer questions.",
          max_plays: 3,
          tts_provider: "deepgram",
          scenarios: [
            {
              id: 1,
              kind: "mcq",
              title_en: "Scenario 1",
              title_th: "สถานการณ์ที่ 1",
              passage:
                "Maya went to see Professor Carter because she had not picked up the reading list for next week's class. Her financial aid was late, so she could not buy the books yet. Carter told her she could find the books at the school library and read the first chapter on the class website.",
              questions: [
                {
                  question: "Why did Maya go to see the professor?",
                  options: [
                    "To explain that she was not ready",
                    "To return some borrowed books",
                    "To ask for money back from the shop",
                    "To change to a new class",
                  ],
                  correctAnswer: "To explain that she was not ready",
                },
                {
                  question: "Why couldn't Maya buy the books?",
                  options: [
                    "The shop had no copies",
                    "Her money came late",
                    "Her family had a problem",
                    "Her job took too much time",
                  ],
                  correctAnswer: "Her money came late",
                },
                {
                  question: "What did the professor suggest?",
                  options: [
                    "Lending his own books to her",
                    "Moving the class to a later date",
                    "Borrowing books from the campus shelves and reading the start of the book online",
                    "Asking the shop to let her pay later",
                  ],
                  correctAnswer:
                    "Borrowing books from the campus shelves and reading the start of the book online",
                },
              ],
            },
            {
              id: 2,
              kind: "fitb",
              title_en: "Scenario 2",
              title_th: "สถานการณ์ที่ 2",
              passage:
                "Daniel wants to apply for the Asia Pacific exchange programme, and the deadline is in ten days. He has finished the forms, but he still has to write a personal statement that sounds compelling enough to win a place. Professor Hahn has agreed to send a letter of support before the closing date.",
              sentences: [
                {
                  text: "Daniel is writing a [BLANK 1] letter to explain why he should be chosen for the exchange.",
                  missingWords: [
                    {
                      correctWord: "motivation",
                      prefix_length: 3,
                      clue: "Personal statement explaining why you want the opportunity.",
                      explanationThai: "จดหมายแสดงเหตุผลที่อยากเข้าร่วม",
                    },
                  ],
                },
                {
                  text: "He has to send everything before the [BLANK 1] in ten days.",
                  missingWords: [
                    {
                      correctWord: "deadline",
                      prefix_length: 3,
                      clue: "The final date by which something must be done.",
                      explanationThai: "วันสุดท้ายที่ต้องส่ง",
                    },
                  ],
                },
                {
                  text: "Without Hahn's support, his application may not seem [BLANK 1] enough to beat hundreds of other students.",
                  missingWords: [
                    {
                      correctWord: "compelling",
                      prefix_length: 3,
                      clue: "Strong and convincing enough to grab attention (C1).",
                      explanationThai: "น่าเชื่อถือและโน้มน้าวใจ",
                    },
                  ],
                },
              ],
            },
            {
              id: 3,
              kind: "fitb_with_summary",
              title_en: "Scenario 3",
              title_th: "สถานการณ์ที่ 3",
              passage:
                "Priya went to see Professor Idris to ask him to excuse her from two missed lab classes. She had a job interview on one day and a clinic visit on the other, and the teaching assistant never replied to her emails. Idris said he would accept the absences once she sent him the emails, so she only had to do one extra report.",
              sentences: [
                {
                  text: "Priya is asking the professor to [BLANK 1] her absences so they do not hurt her grade.",
                  missingWords: [
                    {
                      correctWord: "excuse",
                      prefix_length: 3,
                      clue: "To officially forgive an absence.",
                      explanationThai: "ยกเว้นการขาดเรียนอย่างเป็นทางการ",
                    },
                  ],
                },
                {
                  text: "Once Idris reads the forwarded emails, both absences will be officially [BLANK 1].",
                  missingWords: [
                    {
                      correctWord: "authorised",
                      prefix_length: 3,
                      clue: "Given official permission or approval.",
                      explanationThai: "ได้รับอนุญาตอย่างเป็นทางการ",
                    },
                  ],
                },
              ],
              summary: {
                question: "Which sentence best summarises the conversation?",
                options: [
                  "Priya gave good reasons for missing class, and the professor agreed she only needs to do one extra report.",
                  "Priya is being punished for missing two lab classes even though she had already written to the teaching assistant about her job interview and her clinic visit beforehand.",
                  "Priya is leaving the course because the professor did not accept her reasons.",
                  "Idris told Priya that no other absences would be allowed for any reason in the future.",
                ],
                correctAnswer:
                  "Priya gave good reasons for missing class, and the professor agreed she only needs to do one extra report.",
              },
            },
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
      real_words_per_round: 20,
      round_duration_sec: 60,
      score_per_correct: 8,
      score_penalty_per_fake_pick: 3,
      max_score: 160,
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
      instruction:
        "You are about to take a short listening test. You will hear three short scenarios. You can press play up to 3 times per scenario, then answer the questions before moving on.",
      instruction_th:
        "คุณกำลังจะทำข้อสอบการฟังสั้นๆ จะมีทั้งหมด 3 สถานการณ์ คุณสามารถกดฟังได้ไม่เกิน 3 ครั้งต่อหนึ่งสถานการณ์ จากนั้นตอบคำถามทั้งหมดก่อนไปต่อ",
      pre_break_seconds: 20,
      pre_break_message_th:
        "พักสายตา 20 วินาทีก่อนเริ่มทำข้อสอบการฟัง เตรียมหูฟังและสมาธิให้พร้อม เพราะหลังจากนี้คุณจะได้ฟังบทสนทนาและตอบคำถาม",
      pre_break_message_en:
        "Take a 20 second rest before the listening exam begins. Put on your headphones and get ready, because right after this you will listen to short scenarios and answer questions.",
      max_plays: 3,
      tts_provider: "deepgram",
      scenarios: [
        {
          id: 1,
          kind: "mcq",
          title_en: "Scenario 1",
          title_th: "สถานการณ์ที่ 1",
          passage: "Replace this with a 3 sentence narration for scenario 1.",
          questions: [
            {
              question: "Question 1 text?",
              options: ["Option A", "Option B", "Option C", "Option D"],
              correctAnswer: "Option A",
            },
          ],
        },
        {
          id: 2,
          kind: "fitb",
          title_en: "Scenario 2",
          title_th: "สถานการณ์ที่ 2",
          passage: "Replace this with a 3 sentence narration for scenario 2.",
          sentences: [
            {
              text: "Sentence with a [BLANK 1] to fill in.",
              missingWords: [
                {
                  correctWord: "example",
                  prefix_length: 3,
                  clue: "Hint shown to the learner.",
                  explanationThai: "คำอธิบายภาษาไทย",
                },
              ],
            },
          ],
        },
        {
          id: 3,
          kind: "fitb_with_summary",
          title_en: "Scenario 3",
          title_th: "สถานการณ์ที่ 3",
          passage: "Replace this with a 3 sentence narration for scenario 3.",
          sentences: [
            {
              text: "Sentence with a [BLANK 1] to fill in.",
              missingWords: [
                {
                  correctWord: "example",
                  prefix_length: 3,
                  clue: "Hint shown to the learner.",
                  explanationThai: "คำอธิบายภาษาไทย",
                },
              ],
            },
          ],
          summary: {
            question: "Which sentence best summarises the conversation?",
            options: ["Best option", "Distractor 1", "Distractor 2", "Distractor 3"],
            correctAnswer: "Best option",
          },
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
