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
  /** Former "hard" uploads are stored as Medium so scoring stays on the two supported tiers. */
  if (s === "hard" || s === "advanced") return "medium";
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

type ExpandedConversationRow = {
  label: string;
  row: Record<string, unknown>;
};

function expandConversationRows(
  rows: unknown[],
  inherited: Record<string, unknown> = {},
  prefix = "Row",
): ExpandedConversationRow[] {
  const out: ExpandedConversationRow[] = [];

  rows.forEach((raw, idx) => {
    const label = `${prefix} ${idx + 1}`;
    if (!isRecord(raw)) throw new Error(`${label}: must be an object`);

    const groupedKey = Array.isArray(raw.sets)
      ? "sets"
      : Array.isArray(raw.scenarios)
        ? "scenarios"
        : null;

    if (groupedKey) {
      const groupedRows = raw[groupedKey];
      if (!Array.isArray(groupedRows) || groupedRows.length === 0) {
        throw new Error(`${label}: ${groupedKey} must be a non-empty array`);
      }
      const base: Record<string, unknown> = { ...inherited };
      for (const [key, value] of Object.entries(raw)) {
        if (key === "sets" || key === "scenarios") continue;
        base[key] = value;
      }
      out.push(...expandConversationRows(groupedRows, base, `${label}.${groupedKey}`));
      return;
    }

    out.push({
      label,
      row: {
        ...inherited,
        ...raw,
      },
    });
  });

  return out;
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

  const expandedRows = expandConversationRows(parsed);
  const out: ConversationExam[] = [];
  const counters: Record<"easy" | "medium", number> = { easy: 0, medium: 0 };

  expandedRows.forEach(({ label, row }) => {
    const idRaw = row.id;
    const title = row.title;
    const difficultyRaw = row.difficulty;
    const scenario = row.scenario;
    const hw = row.highlightedWords;
    const sq = row.scenarioQuestions;
    const mq = row.mainQuestions;

    if (typeof title !== "string" || !title.trim()) throw new Error(`${label}: title required`);
    if (typeof difficultyRaw !== "string") throw new Error(`${label}: difficulty required`);
    const difficulty = mapConversationDifficulty(difficultyRaw);
    if (!difficulty) throw new Error(`${label}: unknown difficulty`);
    if (typeof scenario !== "string" || !scenario.trim()) throw new Error(`${label}: scenario required`);
    if (!Array.isArray(hw) || hw.length === 0) {
      throw new Error(`${label}: highlightedWords must be a non-empty array`);
    }
    if (!Array.isArray(sq) || sq.length !== CONVERSATION_SCENARIO_Q_COUNT) {
      throw new Error(`${label}: need exactly ${CONVERSATION_SCENARIO_Q_COUNT} scenarioQuestions`);
    }
    if (!Array.isArray(mq) || mq.length !== CONVERSATION_MAIN_Q_COUNT) {
      throw new Error(`${label}: need exactly ${CONVERSATION_MAIN_Q_COUNT} mainQuestions`);
    }

    let setNumber: number | null = null;
    if (row.setNumber !== undefined) {
      try {
        const sn = parseIntegerField(row.setNumber, `${label}: setNumber`);
        if (sn < 1) throw new Error(`${label}: setNumber must be >= 1`);
        setNumber = sn;
      } catch (e) {
        if (e instanceof Error && e.message.includes("setNumber")) throw e;
        throw new Error(`${label}: setNumber must be a positive integer`);
      }
    }

    const idStr = typeof idRaw === "string" && idRaw.trim() ? idRaw.trim() : "";
    if (setNumber == null && idStr) {
      setNumber = parseSetNumberFromId(idStr);
    }
    if (setNumber == null) {
      const tier: "easy" | "medium" = difficulty === "easy" ? "easy" : "medium";
      counters[tier] += 1;
      setNumber = counters[tier];
    }
    if (!Number.isInteger(setNumber) || setNumber < 1) {
      throw new Error(`${label}: set number must be a positive integer`);
    }

    const id = idStr || `conv_${difficulty}_${String(setNumber).padStart(2, "0")}`;

    let round = 1;
    if (row.round !== undefined) {
      try {
        const rn = parseIntegerField(row.round, `${label}: round`);
        round = rn;
      } catch {
        throw new Error(`${label}: round must be an integer 1–${CONVERSATION_ROUND_COUNT}`);
      }
    }
    if (round < 1 || round > CONVERSATION_ROUND_COUNT) {
      throw new Error(`${label}: round must be 1–${CONVERSATION_ROUND_COUNT}`);
    }

    out.push({
      id,
      title: title.trim(),
      difficulty,
      round,
      maxScore: typeof row.maxScore === "number" ? row.maxScore : undefined,
      scenario: scenario.trim(),
      highlightedWords: hw.map((h, i) => parseHighlighted(h, i)),
      scenarioQuestions: sq.map((q, i) => parseScenarioQ(q, i)),
      mainQuestions: mq.map((q, i) => parseMainQ(q, i)),
      setNumber,
    });
  });

  return out;
}
