export type PracticeContentSnapshot = Record<string, string>;

export type PracticeSkillId =
  | "dictation"
  | "fitb"
  | "reading"
  | "vocab"
  | "realword"
  | "conversation"
  | "dialogue_summary";

export type PracticeSetQuery = {
  skill: PracticeSkillId;
  round: number;
  difficulty?: string;
  set: number;
  exam?: number;
  passage?: number;
  sessionLevel?: string;
};
