export type ConversationDifficulty = "easy" | "medium" | "hard";

export interface ConversationHighlightedWord {
  word: string;
  translation: string;
}

export interface ConversationScenarioQuestion {
  question: string;
  audioBase64?: string;
  audioMimeType?: string;
  /** When true, audio is in IndexedDB (localStorage quota); hydrate before playback. */
  audioInIndexedDb?: boolean;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ConversationMainQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  /** Spoken line (Web Speech API) — options stay hidden until playback starts. */
  transcript: string;
  audioBase64?: string;
  audioMimeType?: string;
  /** When true, transcript audio is in IndexedDB. */
  audioInIndexedDb?: boolean;
}

export interface ConversationExam {
  id: string;
  title: string;
  difficulty: ConversationDifficulty;
  /** Round 1 on the interactive dashboard. Defaults to 1 when omitted (legacy JSON). */
  round?: number;
  maxScore?: number;
  scenario: string;
  scenarioAudioBase64?: string;
  scenarioAudioMimeType?: string;
  /** When true, scenario audio is in IndexedDB. */
  scenarioAudioInIndexedDb?: boolean;
  highlightedWords: ConversationHighlightedWord[];
  scenarioQuestions: ConversationScenarioQuestion[];
  mainQuestions: ConversationMainQuestion[];
  setNumber: number;
}

export interface ConversationProgressRecord {
  bestScore: number;
  maxScore: number;
  lastItemOk: boolean[];
  updatedAt: string;
}

/** Bank keyed by round (currently only 1), then difficulty, then list of sets. */
export type ConversationBankByRound = Record<
  number,
  Record<ConversationDifficulty, ConversationExam[]>
>;
