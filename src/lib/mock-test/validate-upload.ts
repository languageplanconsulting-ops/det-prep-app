import type { MockQuestionType, MockSkill } from "@/lib/mock-test/types";
import { MOCK_TEST_PHASE_COUNT, PHASE_QUESTION_TYPE } from "@/lib/mock-test/constants";
import { normalizeMockDifficulty } from "@/lib/mock-test/mock-difficulty-tiers";

const TYPES: MockQuestionType[] = [
  "fill_in_blanks",
  "dictation",
  "real_english_word",
  "vocabulary_reading",
  "read_and_write",
  "read_then_speak",
  "write_about_photo",
  "speak_about_photo",
  "interactive_speaking",
  "conversation_summary",
  "read_and_select",
  "interactive_listening",
  "vocabulary_in_context",
  "summarize_conversation",
  "essay_writing",
];

const SKILLS: MockSkill[] = ["literacy", "comprehension", "conversation", "production"];

export type ParsedQuestion = {
  phase: number;
  question_type: MockQuestionType;
  skill: MockSkill;
  difficulty: "easy" | "medium" | "hard";
  content: Record<string, unknown>;
  correct_answer: Record<string, unknown> | null;
  is_ai_graded: boolean;
  errors: string[];
};

function isMcBlock(x: unknown): x is {
  question: string;
  correctAnswer: string;
  options: string[];
} {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.question === "string" &&
    typeof o.correctAnswer === "string" &&
    Array.isArray(o.options) &&
    o.options.length === 4 &&
    o.options.every((t) => typeof t === "string")
  );
}

function requireInstructionPair(c: Record<string, unknown>, errors: string[]) {
  if (typeof c.instruction !== "string" || !c.instruction.trim()) {
    errors.push("content.instruction required");
  }
  if (typeof c.instruction_th !== "string" || !c.instruction_th.trim()) {
    errors.push("content.instruction_th required");
  }
}

export function validateQuestionRow(raw: Record<string, unknown>): ParsedQuestion {
  const errors: string[] = [];
  const phase = Number(raw.phase);
  if (!Number.isInteger(phase) || phase < 1 || phase > MOCK_TEST_PHASE_COUNT) {
    errors.push(`phase must be 1–${MOCK_TEST_PHASE_COUNT}`);
  }

  const qt = raw.question_type;
  if (typeof qt !== "string" || !TYPES.includes(qt as MockQuestionType)) {
    errors.push("invalid question_type");
  }

  const skill = raw.skill;
  if (typeof skill !== "string" || !SKILLS.includes(skill as MockSkill)) {
    errors.push("invalid skill");
  }

  const normalizedDiff = normalizeMockDifficulty(raw.difficulty);
  if (!normalizedDiff) {
    errors.push(
      "difficulty must be easy|medium|hard or DET pool tier 85 | 125 | 150 (number or string)",
    );
  }

  const content = raw.content;
  if (!content || typeof content !== "object") {
    errors.push("content must be an object");
  }

  const isAi = Boolean(raw.is_ai_graded);
  const ca = raw.correct_answer;

  if (!isAi) {
    if ((ca == null || typeof ca !== "object") && qt !== "vocabulary_reading") {
      errors.push("correct_answer required for non-AI questions");
    }
  } else if (ca != null && typeof ca !== "object") {
    errors.push("correct_answer must be null or object for AI");
  }

  const cObj = (content ?? {}) as Record<string, unknown>;
  const qType = qt as MockQuestionType;

  if (content && typeof content === "object") {
    requireInstructionPair(cObj, errors);

    const needsFourOptions =
      qType === "fill_in_blanks" ||
      qType === "read_and_select" ||
      qType === "vocabulary_in_context" ||
      qType === "real_english_word";

    if (needsFourOptions) {
      const opts = cObj.options;
      if (!Array.isArray(opts) || opts.length !== 4) {
        errors.push("options must be array of 4");
      }
    }

    if (qType === "interactive_listening") {
      if (typeof cObj.audio_url !== "string" || !cObj.audio_url) {
        errors.push("interactive_listening requires audio_url");
      }
    }

    if (qType === "dictation") {
      if (typeof cObj.reference_sentence !== "string" || !cObj.reference_sentence.trim()) {
        errors.push("dictation requires content.reference_sentence (learner types what they hear)");
      }
    }

    if (qType === "read_and_write" || qType === "essay_writing") {
      if (typeof cObj.prompt !== "string" && typeof cObj.prompt_th !== "string") {
        errors.push("read_and_write needs content.prompt or content.prompt_th");
      }
    }

    if (qType === "conversation_summary" || qType === "summarize_conversation") {
      const turns = cObj.turns;
      const legacyOk =
        typeof cObj.audio_url === "string" ||
        (Array.isArray(cObj.dialogue_lines) && cObj.dialogue_lines.length > 0);
      if (Array.isArray(turns) && turns.length >= 2) {
        turns.forEach((row, i) => {
          if (!row || typeof row !== "object") {
            errors.push(`turns[${i}] must be an object`);
            return;
          }
          const o = row as Record<string, unknown>;
          if (typeof o.question_en !== "string" || !String(o.question_en).trim()) {
            errors.push(`turns[${i}].question_en required`);
          }
          if (typeof o.reference_answer_en !== "string" || !String(o.reference_answer_en).trim()) {
            errors.push(`turns[${i}].reference_answer_en required`);
          }
        });
      } else if (!legacyOk) {
        errors.push(
          "conversation_summary: provide turns[] (≥2 with question_en + reference_answer_en) or legacy audio_url / dialogue_lines[]",
        );
      }
    }

    if (qType === "interactive_speaking") {
      if (typeof cObj.starter_prompt_en !== "string" && typeof cObj.scenario_title_en !== "string") {
        errors.push("interactive_speaking: starter_prompt_en or scenario_title_en");
      }
    }

    if (qType === "vocabulary_reading") {
      const pass = cObj.passage;
      if (!pass || typeof pass !== "object") {
        errors.push("vocabulary_reading: passage { p1, p2, p3 } required");
      } else {
        const p = pass as Record<string, unknown>;
        for (const k of ["p1", "p2", "p3"]) {
          if (typeof p[k] !== "string" || !String(p[k]).trim()) {
            errors.push(`vocabulary_reading: passage.${k} required`);
          }
        }
      }
      const vq = cObj.vocabularyQuestions;
      if (!Array.isArray(vq) || vq.length !== 5) {
        errors.push("vocabulary_reading: vocabularyQuestions must be an array of 5 MC blocks");
      } else {
        vq.forEach((item, i) => {
          if (!isMcBlock(item)) {
            errors.push(`vocabulary_reading: vocabularyQuestions[${i}] needs question, correctAnswer, options[4]`);
          }
        });
      }
      for (const key of [
        "missingParagraph",
        "informationLocation",
        "bestTitle",
        "mainIdea",
      ] as const) {
        if (!isMcBlock(cObj[key])) {
          errors.push(`vocabulary_reading: ${key} must be MC block (question, correctAnswer, options[4])`);
        }
      }
      const hv = cObj.highlightedVocab;
      if (hv != null && !Array.isArray(hv)) {
        errors.push("vocabulary_reading: highlightedVocab must be array if present");
      }
    }
  }

  const expectedForPhase =
    phase >= 1 && phase <= MOCK_TEST_PHASE_COUNT ? PHASE_QUESTION_TYPE[phase] : undefined;
  const legacyOk =
    expectedForPhase &&
    ((phase === 5 && (qt === "essay_writing" || qt === "read_and_write")) ||
      (phase === 10 && (qt === "summarize_conversation" || qt === "conversation_summary")));
  if (expectedForPhase && qt !== expectedForPhase && !legacyOk) {
    errors.push(`for phase ${phase} expected question_type "${expectedForPhase}" (got "${String(qt)}")`);
  }

  return {
    phase: Number.isFinite(phase) ? phase : 0,
    question_type: (qt as MockQuestionType) ?? "fill_in_blanks",
    skill: (skill as MockSkill) ?? "literacy",
    difficulty: normalizedDiff ?? "medium",
    content: (content as Record<string, unknown>) ?? {},
    correct_answer: (ca as Record<string, unknown> | null) ?? null,
    is_ai_graded: isAi,
    errors,
  };
}

export function parseUploadJson(text: string): {
  questions: ParsedQuestion[];
  parseError?: string;
} {
  try {
    const j = JSON.parse(text) as { questions?: unknown[] };
    if (!j.questions || !Array.isArray(j.questions)) {
      return { questions: [], parseError: "JSON must have { questions: [...] }" };
    }
    const questions = j.questions
      .filter((q) => q && typeof q === "object")
      .map((q) => validateQuestionRow(q as Record<string, unknown>));
    return { questions };
  } catch {
    return { questions: [], parseError: "Invalid JSON" };
  }
}
