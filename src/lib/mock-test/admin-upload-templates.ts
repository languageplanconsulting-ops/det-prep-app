import {
  MOCK_PHASES_FIXED_MEDIUM_POOL,
  MOCK_TEST_PHASE_COUNT,
  PHASE_QUESTION_TYPE,
} from "@/lib/mock-test/constants";
import type { MockBankTierKey } from "@/lib/mock-test/mock-difficulty-tiers";
import type { MockSkill } from "@/lib/mock-test/types";
import { READING_VOCAB_UNIFIED_BAND } from "@/lib/mock-test/v2/config";
import {
  buildFixedTemplateCsv as buildFixedTemplateCsvCore,
  buildFixedTemplateJson as buildFixedTemplateJsonCore,
} from "@/lib/mock-test/fixed-upload";

const PHASE_SKILL: Record<number, MockSkill> = {
  1: "literacy",
  2: "literacy",
  3: "literacy",
  4: "comprehension",
  5: "production",
  6: "production",
  7: "production",
  8: "production",
  9: "conversation",
  10: "comprehension",
};

function mc(question: string, correctAnswer: string) {
  return {
    question,
    correctAnswer,
    options: [correctAnswer, "Distractor B", "Distractor C", "Distractor D"],
  };
}

function instructionPair() {
  return {
    instruction: "Replace with English instructions for learners.",
    instruction_th: "แทนที่ด้วยคำแนะนำภาษาไทย",
  };
}

/** Shown in copied JSON as `_notes` (ignored by parseUploadJson — only `questions` is read). */
function buildUploadNotes(phase: number): string[] {
  const unified = READING_VOCAB_UNIFIED_BAND;
  const global: string[] = [
    "Only the \"questions\" array is uploaded. This _notes block is documentation.",
    `Mock test v2: fill_in_blanks, real_english_word, vocabulary_reading share one calibrated pool at target_band ${unified} (125 / medium in DB).`,
    "Mock test v2: dictation, interactive_listening, read_then_speak, write_about_photo, speak_about_photo, read_and_write, interactive_speaking use routed 85 / 125 / 150 from Stage 1 — bank rows must exist at each band; engine falls back to medium if a band is empty.",
    "Mock test v1: phases 1–3 use adaptive easy|medium|hard. Phases 4–10 always draw the medium pool (no per-item level in the learner UI).",
  ];

  const byPhase: Record<number, string[]> = {
    1: [
      "Phase 1 — fill_in_blanks: (1) Prefix mode: blank_prefix (1–6 chars) + sentence_before / sentence_after + optional blank_hint; remove sentence; all 4 options must start with that prefix. (2) Legacy: content.sentence with ___ and 4 options — omit blank_prefix.",
    ],
    2: [
      "Phase 2 — dictation: reference_sentence required. Omit audio_url → server generates audio via Inworld TTS (INWORLD_API_KEY) or Gemini fallback. Optional audio_url: hosted MP3 URL instead.",
    ],
    3: [
      "Phase 3 — real_english_word: legacy sentence + 4 spellings is typical. Prefix mode works only if every option shares the same leading letters as blank_prefix.",
    ],
    4: [
      `Phase 4 — vocabulary_reading: composite passage + MC blocks. For v2, upload at band ${unified} only (unified reading/vocab pool).`,
    ],
  };

  return [...global, ...(byPhase[phase] ?? [])];
}

function buildQuestionPayload(
  phase: number,
  tier: MockBankTierKey,
): Record<string, unknown> {
  const qt = PHASE_QUESTION_TYPE[phase];
  const skill = PHASE_SKILL[phase] ?? "literacy";
  const isAi = phase >= 5 && phase <= 10;
  const poolTier: MockBankTierKey = MOCK_PHASES_FIXED_MEDIUM_POOL.has(phase)
    ? "medium"
    : tier;

  const base: Record<string, unknown> = {
    phase,
    question_type: qt,
    skill,
    difficulty: poolTier,
    is_ai_graded: isAi,
  };

  // Phase 1 FITB: optional blank_prefix (1–6 chars) + sentence_before / sentence_after / blank_hint; else legacy `sentence`.
  if (phase === 1) {
    return {
      ...base,
      content: {
        ...instructionPair(),
        blank_prefix: "pr",
        sentence_before: "We use the ",
        sentence_after: " tense in this clause.",
        blank_hint: "(= present)",
        options: ["present", "prevent", "prepare", "presume"],
      },
      correct_answer: { answer: "present" },
    };
  }

  // Dictation: optional `audio_url`; if omitted, mock test synthesizes audio from `reference_sentence` via Inworld/Gemini.
  if (phase === 2) {
    return {
      ...base,
      content: {
        ...instructionPair(),
        reference_sentence: "She rarely arrives late to class.",
      },
      correct_answer: { answer: "She rarely arrives late to class." },
    };
  }

  if (phase === 3) {
    return {
      ...base,
      content: {
        ...instructionPair(),
        sentence: "Select the real English word.",
        options: ["accommodate", "acommodate", "accomodate", "acomodate"],
      },
      correct_answer: { answer: "accommodate" },
    };
  }

  if (phase === 4) {
    const v = (n: number) =>
      mc(`Vocabulary in context (Q${n}). Choose the best word.`, "choice");
    return {
      ...base,
      content: {
        ...instructionPair(),
        titleEn: "Template passage",
        passage: {
          p1: "First paragraph text.",
          p2: "Second paragraph (reference for missing gap).",
          p3: "Third paragraph text.",
        },
        highlightedVocab: [],
        vocabularyQuestions: [v(1), v(2), v(3), v(4), v(5)],
        missingParagraph: mc(
          "Which paragraph best fills the gap?",
          "Second paragraph (reference for missing gap).",
        ),
        informationLocation: mc(
          "Where does the passage mention X?",
          "First paragraph text.",
        ),
        bestTitle: mc("What is the best title?", "A Sample Passage"),
        mainIdea: mc("What is the main idea?", "It introduces a three-part structure."),
      },
      correct_answer: {},
    };
  }

  if (phase === 5) {
    return {
      ...base,
      content: {
        ...instructionPair(),
        prompt: "Write a short essay (replace with real prompt).",
        prompt_th: "เขียนเรียงความสั้น ๆ",
      },
      correct_answer: null,
    };
  }

  if (phase === 6) {
    return {
      ...base,
      content: {
        ...instructionPair(),
        passage: "Replace with reading passage for read-then-speak.",
      },
      correct_answer: null,
    };
  }

  if (phase === 7) {
    return {
      ...base,
      content: {
        ...instructionPair(),
        image_url: "",
      },
      correct_answer: null,
    };
  }

  if (phase === 8) {
    return {
      ...base,
      content: {
        ...instructionPair(),
        image_url: "",
      },
      correct_answer: null,
    };
  }

  if (phase === 9) {
    return {
      ...base,
      content: {
        ...instructionPair(),
        starter_prompt_en:
          "You are at reception. Explain you have an appointment and ask where to wait.",
        scenario_title_en: "At reception",
      },
      correct_answer: null,
    };
  }

  if (phase === 10) {
    return {
      ...base,
      content: {
        ...instructionPair(),
        summary_instruction_en: "Summarize the conversation in 3–5 sentences.",
        summary_instruction_th: "สรุปบทสนทนา 3–5 ประโยค",
        turns: [
          {
            question_en: "What brings you in today?",
            question_th: "วันนี้มาด้วยเรื่องอะไร?",
            reference_answer_en: "I need help with my study plan for next term.",
            reference_answer_th: "ต้องการความช่วยเหลือเรื่องแผนการเรียนเทอมหน้า",
          },
          {
            question_en: "Have you spoken to your advisor yet?",
            reference_answer_en: "Not yet — that is why I came to reception first.",
          },
        ],
      },
      correct_answer: null,
    };
  }

  return base;
}

function buildPhase1BulkTemplateQuestions(tier: MockBankTierKey): Record<string, unknown>[] {
  const base = {
    phase: 1,
    question_type: "fill_in_blanks",
    skill: "literacy",
    difficulty: tier,
    is_ai_graded: false,
  } as const;
  return [
    {
      ...base,
      content: {
        ...instructionPair(),
        sentence: "Before getting on the airplane, every ___ must show their ticket.",
        options: ["passenger", "passion", "passage", "passing"],
      },
      correct_answer: { answer: "passenger" },
    },
    {
      ...base,
      content: {
        ...instructionPair(),
        sentence: "You must hand over your ___ at immigration.",
        options: ["passport", "postcard", "parachute", "passage"],
      },
      correct_answer: { answer: "passport" },
    },
    {
      ...base,
      content: {
        ...instructionPair(),
        sentence: "Then, you walk through the ___ checkpoint for safety.",
        options: ["security", "section", "secrecy", "secondary"],
      },
      correct_answer: { answer: "security" },
    },
    {
      ...base,
      content: {
        ...instructionPair(),
        sentence: "You check the screen for your exact ___ time.",
        options: ["departure", "decision", "delight", "defender"],
      },
      correct_answer: { answer: "departure" },
    },
    {
      ...base,
      content: {
        ...instructionPair(),
        sentence: "The plane flies to your final ___.",
        options: ["destination", "destruction", "designation", "description"],
      },
      correct_answer: { answer: "destination" },
    },
    {
      ...base,
      content: {
        ...instructionPair(),
        sentence: "After landing, you collect your ___.",
        options: ["luggage", "language", "lineage", "leverage"],
      },
      correct_answer: { answer: "luggage" },
    },
  ];
}

/** Copy-paste JSON for one phase; phases 1–3 respect `tier`; phases 4–10 always use medium. */
export function buildMockUploadTemplateJson(
  phase: number,
  tier: MockBankTierKey,
): string {
  if (phase < 1 || phase > MOCK_TEST_PHASE_COUNT) {
    return JSON.stringify(
      { _notes: ["phase must be 1–10"], questions: [] },
      null,
      2,
    );
  }
  if (phase === 1) {
    return JSON.stringify(
      {
        _notes: [
          ...buildUploadNotes(phase),
          "Phase 1 bulk tip: one question object = one blank. If one passage has 6 blanks, create 6 objects.",
          "For large uploads (e.g. 10 passages x 6 blanks), put 60 objects in questions[].",
        ],
        questions: buildPhase1BulkTemplateQuestions(tier),
      },
      null,
      2,
    );
  }
  const tierUse = MOCK_PHASES_FIXED_MEDIUM_POOL.has(phase) ? "medium" : tier;
  const q = buildQuestionPayload(phase, tierUse);
  return JSON.stringify(
    {
      _notes: buildUploadNotes(phase),
      questions: [q],
    },
    null,
    2,
  );
}

export function buildFixedMockUploadTemplateJson(): string {
  return buildFixedTemplateJsonCore();
}

export function buildFixedMockUploadTemplateCsv(): string {
  return buildFixedTemplateCsvCore();
}
