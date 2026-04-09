import type { MockQuestionType, MockSkill } from "@/lib/mock-test/types";

const TYPES: MockQuestionType[] = [
  "fill_in_blanks",
  "read_and_select",
  "interactive_listening",
  "vocabulary_in_context",
  "read_then_speak",
  "write_about_photo",
  "speak_about_photo",
  "summarize_conversation",
  "essay_writing",
];

const SKILLS: MockSkill[] = [
  "literacy",
  "comprehension",
  "conversation",
  "production",
];

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

export function validateQuestionRow(
  raw: Record<string, unknown>,
): ParsedQuestion {
  const errors: string[] = [];
  const phase = Number(raw.phase);
  if (!Number.isInteger(phase) || phase < 1 || phase > 9) {
    errors.push("phase must be 1–9");
  }

  const qt = raw.question_type;
  if (typeof qt !== "string" || !TYPES.includes(qt as MockQuestionType)) {
    errors.push("invalid question_type");
  }

  const skill = raw.skill;
  if (typeof skill !== "string" || !SKILLS.includes(skill as MockSkill)) {
    errors.push("invalid skill");
  }

  const diff = raw.difficulty;
  if (diff !== "easy" && diff !== "medium" && diff !== "hard") {
    errors.push("difficulty must be easy|medium|hard");
  }

  const content = raw.content;
  if (!content || typeof content !== "object") {
    errors.push("content must be an object");
  } else {
    const c = content as Record<string, unknown>;
    if (typeof c.instruction !== "string" || !c.instruction.trim()) {
      errors.push("content.instruction required");
    }
    if (typeof c.instruction_th !== "string" || !c.instruction_th.trim()) {
      errors.push("content.instruction_th required");
    }
  }

  const isAi = Boolean(raw.is_ai_graded);
  const ca = raw.correct_answer;

  if (!isAi) {
    if (ca == null || typeof ca !== "object") {
      errors.push("correct_answer required for non-AI questions");
    }
  } else {
    if (ca != null && typeof ca !== "object") {
      errors.push("correct_answer must be null or object for AI");
    }
  }

  const cObj = (content ?? {}) as Record<string, unknown>;

  if (qt === "fill_in_blanks" || qt === "read_and_select" || qt === "vocabulary_in_context") {
    const opts = cObj.options;
    if (!Array.isArray(opts) || opts.length !== 4) {
      errors.push("options must be array of 4");
    }
  }

  if (qt === "interactive_listening") {
    if (typeof cObj.audio_url !== "string" || !cObj.audio_url) {
      errors.push("interactive_listening requires audio_url");
    }
  }

  return {
    phase: Number.isFinite(phase) ? phase : 0,
    question_type: (qt as MockQuestionType) ?? "fill_in_blanks",
    skill: (skill as MockSkill) ?? "literacy",
    difficulty: (diff as "easy" | "medium" | "hard") ?? "medium",
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
