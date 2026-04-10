import {
  CONVERSATION_MAIN_Q_COUNT,
  CONVERSATION_ROUND_COUNT,
  CONVERSATION_SCENARIO_Q_COUNT,
} from "@/lib/conversation-constants";
import type {
  ConversationDifficulty,
  ConversationExam,
  ConversationHighlightedWord,
  ConversationMainQuestion,
  ConversationScenarioQuestion,
} from "@/types/conversation";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Accepts JSON that used string indices (e.g. "2") from spreadsheets or generators. */
function parseIntegerField(v: unknown, fieldLabel: string): number {
  if (typeof v === "number" && Number.isInteger(v)) return v;
  if (typeof v === "string" && /^\s*-?\d+\s*$/.test(v)) {
    const n = Number.parseInt(v.trim(), 10);
    if (Number.isInteger(n)) return n;
  }
  throw new Error(`${fieldLabel} must be an integer`);
}

export function mapConversationDifficulty(raw: string): ConversationDifficulty | null {
  const s = raw.trim().toLowerCase();
  if (s === "easy" || s === "foundational") return "easy";
  if (s === "medium" || s === "intermediate") return "medium";
  if (s === "hard" || s === "advanced") return "hard";
  return null;
}

function parseSetNumberFromId(id: string): number | null {
  const m = id.match(/(\d+)\s*$/);
  if (!m) return null;
  const n = Number.parseInt(m[1]!, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

function parseHighlighted(raw: unknown, i: number): ConversationHighlightedWord {
  if (!isRecord(raw)) throw new Error(`highlightedWords[${i}] must be an object`);
  const word = raw.word;
  const translation = raw.translation;
  if (typeof word !== "string" || !word.trim()) throw new Error(`highlightedWords[${i}].word required`);
  if (typeof translation !== "string" || !translation.trim()) {
    throw new Error(`highlightedWords[${i}].translation required`);
  }
  return { word: word.trim(), translation: translation.trim() };
}

function parseScenarioQ(raw: unknown, i: number): ConversationScenarioQuestion {
  if (!isRecord(raw)) throw new Error(`scenarioQuestions[${i}] must be an object`);
  const question = raw.question;
  const options = raw.options;
  const correctIndex = raw.correctIndex;
  const legacyCorrectAnswer = raw.correctAnswer;
  const explanation = raw.explanation;
  if (typeof question !== "string" || !question.trim()) throw new Error(`scenarioQuestions[${i}].question required`);
  if (!Array.isArray(options) || options.length < 2) {
    throw new Error(`scenarioQuestions[${i}].options must be an array with at least 2 strings`);
  }
  const opts = options.map((o, j) => {
    if (typeof o !== "string" || !o.trim()) throw new Error(`scenarioQuestions[${i}].options[${j}] invalid`);
    return o.trim();
  });
  let idx = -1;
  try {
    const parsed = parseIntegerField(correctIndex, `scenarioQuestions[${i}].correctIndex`);
    idx = parsed;
  } catch {
    idx = -1;
  }
  if (idx < 0 || idx >= opts.length) {
    if (typeof legacyCorrectAnswer === "string" && legacyCorrectAnswer.trim()) {
      idx = opts.findIndex(
        (opt) => opt.trim().toLowerCase() === legacyCorrectAnswer.trim().toLowerCase(),
      );
    }
  }
  if (idx < 0 || idx >= opts.length) {
    throw new Error(`scenarioQuestions[${i}].correctIndex invalid`);
  }
  if (typeof explanation !== "string" || !explanation.trim()) {
    throw new Error(`scenarioQuestions[${i}].explanation required`);
  }
  return {
    question: question.trim(),
    options: opts,
    correctIndex: idx,
    explanation: explanation.trim(),
  };
}

function parseMainQ(raw: unknown, i: number): ConversationMainQuestion {
  if (!isRecord(raw)) throw new Error(`mainQuestions[${i}] must be an object`);
  const question = raw.question;
  const options = raw.options;
  const correctIndex = raw.correctIndex;
  const explanation = raw.explanation;
  const transcript = raw.transcript;
  if (typeof question !== "string" || !question.trim()) throw new Error(`mainQuestions[${i}].question required`);
  if (!Array.isArray(options) || options.length < 2) {
    throw new Error(`mainQuestions[${i}].options must be an array with at least 2 strings`);
  }
  const opts = options.map((o, j) => {
    if (typeof o !== "string" || !o.trim()) throw new Error(`mainQuestions[${i}].options[${j}] invalid`);
    return o.trim();
  });
  const ci = parseIntegerField(correctIndex, `mainQuestions[${i}].correctIndex`);
  if (ci < 0 || ci >= opts.length) {
    throw new Error(`mainQuestions[${i}].correctIndex invalid`);
  }
  if (typeof explanation !== "string" || !explanation.trim()) {
    throw new Error(`mainQuestions[${i}].explanation required`);
  }
  if (typeof transcript !== "string" || !transcript.trim()) {
    throw new Error(`mainQuestions[${i}].transcript required (used for TTS)`);
  }
  return {
    question: question.trim(),
    options: opts,
    correctIndex: ci,
    explanation: explanation.trim(),
    transcript: transcript.trim(),
  };
}

export function parseConversationBankJson(text: string): ConversationExam[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Invalid JSON");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("JSON must be a non-empty array");
  }

  const out: ConversationExam[] = [];
  const counters: Record<ConversationDifficulty, number> = { easy: 0, medium: 0, hard: 0 };

  parsed.forEach((raw, idx) => {
    if (!isRecord(raw)) throw new Error(`Row ${idx + 1}: must be an object`);
    const idRaw = raw.id;
    const title = raw.title;
    const difficultyRaw = raw.difficulty;
    const scenario = raw.scenario;
    const hw = raw.highlightedWords;
    const sq = raw.scenarioQuestions;
    const mq = raw.mainQuestions;

    if (typeof title !== "string" || !title.trim()) throw new Error(`Row ${idx + 1}: title required`);
    if (typeof difficultyRaw !== "string") throw new Error(`Row ${idx + 1}: difficulty required`);
    const difficulty = mapConversationDifficulty(difficultyRaw);
    if (!difficulty) throw new Error(`Row ${idx + 1}: unknown difficulty`);
    if (typeof scenario !== "string" || !scenario.trim()) throw new Error(`Row ${idx + 1}: scenario required`);
    if (!Array.isArray(hw) || hw.length === 0) {
      throw new Error(`Row ${idx + 1}: highlightedWords must be a non-empty array`);
    }
    if (!Array.isArray(sq) || sq.length !== CONVERSATION_SCENARIO_Q_COUNT) {
      throw new Error(`Row ${idx + 1}: need exactly ${CONVERSATION_SCENARIO_Q_COUNT} scenarioQuestions`);
    }
    if (!Array.isArray(mq) || mq.length !== CONVERSATION_MAIN_Q_COUNT) {
      throw new Error(`Row ${idx + 1}: need exactly ${CONVERSATION_MAIN_Q_COUNT} mainQuestions`);
    }

    let setNumber: number | null = null;
    if (raw.setNumber !== undefined) {
      try {
        const sn = parseIntegerField(raw.setNumber, `Row ${idx + 1}: setNumber`);
        if (sn < 1) throw new Error(`Row ${idx + 1}: setNumber must be >= 1`);
        setNumber = sn;
      } catch (e) {
        if (e instanceof Error && e.message.includes("setNumber")) throw e;
        throw new Error(`Row ${idx + 1}: setNumber must be a positive integer`);
      }
    }

    const idStr = typeof idRaw === "string" && idRaw.trim() ? idRaw.trim() : "";
    if (setNumber == null && idStr) {
      setNumber = parseSetNumberFromId(idStr);
    }
    if (setNumber == null) {
      counters[difficulty] += 1;
      setNumber = counters[difficulty];
    }
    if (!Number.isInteger(setNumber) || setNumber < 1) {
      throw new Error(`Row ${idx + 1}: set number must be a positive integer`);
    }

    const id = idStr || `conv_${difficulty}_${String(setNumber).padStart(2, "0")}`;

    let round = 1;
    if (raw.round !== undefined) {
      try {
        const rn = parseIntegerField(raw.round, `Row ${idx + 1}: round`);
        round = rn;
      } catch {
        throw new Error(`Row ${idx + 1}: round must be an integer 1–${CONVERSATION_ROUND_COUNT}`);
      }
    }
    if (round < 1 || round > CONVERSATION_ROUND_COUNT) {
      throw new Error(`Row ${idx + 1}: round must be 1–${CONVERSATION_ROUND_COUNT}`);
    }

    out.push({
      id,
      title: title.trim(),
      difficulty,
      round,
      maxScore: typeof raw.maxScore === "number" ? raw.maxScore : undefined,
      scenario: scenario.trim(),
      highlightedWords: hw.map((h, i) => parseHighlighted(h, i)),
      scenarioQuestions: sq.map((q, i) => parseScenarioQ(q, i)),
      mainQuestions: mq.map((q, i) => parseMainQ(q, i)),
      setNumber,
    });
  });

  return out;
}

