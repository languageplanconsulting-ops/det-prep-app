import type { SpeakingAttemptReport, SpeakingTranscriptHighlight } from "@/types/speaking";

/** Admin-uploaded scenario: only the opening question; AI generates follow-ups (see INTERACTIVE_SPEAKING_FOLLOWUP_COUNT). */
export interface InteractiveSpeakingScenario {
  id: string;
  titleEn: string;
  titleTh: string;
  starterQuestionEn: string;
  starterQuestionTh: string;
  /** Learner hub round (1–5). Admin merge defaults to 1. */
  round?: 1 | 2 | 3 | 4 | 5;
  uploadedByAdmin?: boolean;
}

export interface InteractiveSpeakingTurnRecord {
  turnIndex: number;
  questionEn: string;
  questionTh: string;
  transcript: string;
  punctuatedTranscript?: string;
}

/** One row in the report recap: question + answer with span highlights on the answer only. */
export interface InteractiveSpeakingRecapRow {
  turnIndex: number;
  questionEn: string;
  questionTh: string;
  answerPunctuated: string;
  highlights: SpeakingTranscriptHighlight[];
}

/** Key learning: exact speech quote + speaking-focused improvement; optional American idiom (1–3 per report in generation). */
export interface InteractiveSpeakingKeyLearningQuote {
  id: string;
  turnIndex: number;
  exactQuoteFromSpeech: string;
  improvementEn: string;
  improvementTh: string;
  suggestedIdiomEn?: string;
  suggestedIdiomMeaningTh?: string;
  suggestedIdiomExampleEn?: string;
}

export interface InteractiveSpeakingAttemptReport extends SpeakingAttemptReport {
  kind: "interactive-speaking";
  scenarioId: string;
  scenarioTitleEn: string;
  scenarioTitleTh: string;
  /** All turns (opening + follow-ups), ordered by turnIndex. */
  turns: InteractiveSpeakingTurnRecord[];
  conversationRecap: InteractiveSpeakingRecapRow[];
  /** Up to 10: verbatim quotes from submitted speech with improvements (primary key-learning UI). */
  keyLearningQuotes?: InteractiveSpeakingKeyLearningQuote[];
}
