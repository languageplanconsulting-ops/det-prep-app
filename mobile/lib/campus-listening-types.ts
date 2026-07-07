export type CampusFitbQuestion = {
  /** Sentence with ___ marking the blank (display only). */
  promptEn: string;
  correctWord: string;
  /** How many leading letters are shown as hints (1–3). */
  prefixLength: number;
  coachTh: string;
  coachEn: string;
  explanationTh: string;
  explanationEn: string;
};

export type CampusListeningScenario = {
  id: string;
  titleTh: string;
  titleEn: string;
  /** 1–2 sentences read aloud — campus dialogue context. */
  scenarioEn: string;
  keywords: string[];
  questions: [CampusFitbQuestion, CampusFitbQuestion, CampusFitbQuestion];
};

export type CampusLessonPhase =
  | "intro"
  | "listen"
  | "coach"
  | "answer"
  | "feedback"
  | "complete";
