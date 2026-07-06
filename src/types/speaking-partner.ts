import type { SpeakingAttemptReport } from "@/types/speaking";
import type {
  InteractiveSpeakingRecapRow,
  InteractiveSpeakingTurnRecord,
} from "@/types/interactive-speaking";

export interface SpeakingPartnerGrammarFinding {
  id: string;
  turnIndex: number;
  topicEn: string;
  topicTh: string;
  originalExcerpt: string;
  correctedExcerpt: string;
  explanationTh: string;
}

export interface SpeakingPartnerVocabularyFinding {
  id: string;
  turnIndex: number;
  topicEn?: string;
  topicTh?: string;
  originalWord: string;
  upgradedWord: string;
  meaningTh: string;
  exampleEn?: string;
  exampleTh?: string;
}

export interface SpeakingPartnerTransitionFinding {
  id: string;
  turnIndex: number;
  topicEn: string;
  topicTh: string;
  locationExcerpt: string;
  suggestedTransitionEn: string;
  explanationTh: string;
}

export interface SpeakingPartnerWeaknessTopic {
  topicKind: "grammar" | "transition";
  topicEn: string;
  topicTh: string;
}

export interface SpeakingPartnerWeaknessDelta {
  /** Previously flagged, not seen in this session — the learner improved. */
  improvedTopics: SpeakingPartnerWeaknessTopic[];
  /** Previously flagged AND seen again this session. */
  persistingTopics: SpeakingPartnerWeaknessTopic[];
}

export interface SpeakingPartnerAttemptReport extends SpeakingAttemptReport {
  kind: "speaking-partner";
  /** The learner's own chosen topic (turn 1's answer, punctuated). */
  topicSeedEn: string;
  turns: InteractiveSpeakingTurnRecord[];
  conversationRecap: InteractiveSpeakingRecapRow[];
  grammarFindings: SpeakingPartnerGrammarFinding[];
  vocabularyFindings: SpeakingPartnerVocabularyFinding[];
  transitionFindings: SpeakingPartnerTransitionFinding[];
  weaknessDelta?: SpeakingPartnerWeaknessDelta;
}
