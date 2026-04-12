import {
  MOCK_TEST_PHASE_COUNT,
  PHASE_QUESTION_TYPE,
} from "@/lib/mock-test/constants";
import type { MockBankTierKey } from "@/lib/mock-test/mock-difficulty-tiers";
import type { MockSkill } from "@/lib/mock-test/types";

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

function buildQuestionPayload(
  phase: number,
  tier: MockBankTierKey,
): Record<string, unknown> {
  const qt = PHASE_QUESTION_TYPE[phase];
  const skill = PHASE_SKILL[phase] ?? "literacy";
  const isAi = phase >= 5 && phase <= 10;

  const base: Record<string, unknown> = {
    phase,
    question_type: qt,
    skill,
    difficulty: tier,
    is_ai_graded: isAi,
  };

  if (phase === 1) {
    return {
      ...base,
      content: {
        ...instructionPair(),
        sentence: "The weather was ___ yesterday.",
        options: ["nice", "nicely", "nicest", "nicer"],
      },
      correct_answer: { answer: "nice" },
    };
  }

  if (phase === 2) {
    return {
      ...base,
      content: {
        ...instructionPair(),
        reference_sentence: "Type exactly what you hear in the audio.",
        audio_url: "",
      },
      correct_answer: { answer: "Type exactly what you hear in the audio." },
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

/** Copy-paste JSON for one phase; `tier` is easy|medium|hard (shown in admin as 85/125/150). */
export function buildMockUploadTemplateJson(
  phase: number,
  tier: MockBankTierKey,
): string {
  if (phase < 1 || phase > MOCK_TEST_PHASE_COUNT) {
    return JSON.stringify({ questions: [] }, null, 2);
  }
  const q = buildQuestionPayload(phase, tier);
  return JSON.stringify({ questions: [q] }, null, 2);
}
