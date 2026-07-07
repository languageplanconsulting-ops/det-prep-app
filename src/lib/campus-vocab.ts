/**
 * คำศัพท์ในมหาวิทยาลัย (Campus Vocabulary) — a guided lesson under บทเรียน.
 *
 * Web port of det-mobile/src/lib/campus-vocab.ts. Each item is a short campus-life
 * scenario (professor↔student or classmate↔classmate) that uses specific campus
 * vocabulary (e.g. "recommendation letter", "syllabus"). The learner reads the
 * scenario, then answers 3 fill-in-the-blank questions — one per target word —
 * each shown as a short paraphrased clue sentence with a letter-count hint.
 */
import { CAMPUS_VOCAB_SCENARIOS } from "./campus-vocab-lessons-data";

export type CampusVocabBlank = {
  /** Sentence with exactly one "[BLANK 1]" placeholder. */
  clueEn: string;
  answer: string;
  /** How many starting letters are shown as a hint (1–3). */
  prefixLength: number;
  synonyms?: string[];
  ruleEn: string;
  ruleTh: string;
};

/** A big-topic "world" in the campus-vocab journey — groups related scenarios together. */
export type CampusVocabTopicId = "coursework" | "thesis" | "grades" | "money" | "campus-life" | "careers";

export type CampusVocabScenario = {
  id: string;
  topic: CampusVocabTopicId;
  scenarioEn: string;
  scenarioTh: string;
  blanks: CampusVocabBlank[];
};

export type CampusVocabTopicMeta = {
  id: CampusVocabTopicId;
  th: string;
  en: string;
  icon: string;
};

/** Journey order — easier/earlier topics first. */
export const CAMPUS_VOCAB_TOPICS: CampusVocabTopicMeta[] = [
  { id: "coursework", th: "การเรียนในห้อง", en: "Coursework & Classes", icon: "📚" },
  { id: "grades", th: "เกรดและสถานะทางวิชาการ", en: "Grades & Academic Standing", icon: "📝" },
  { id: "money", th: "เงินและทุนการศึกษา", en: "Money & Scholarships", icon: "💰" },
  { id: "campus-life", th: "ชีวิตในมหาวิทยาลัย", en: "Campus Life", icon: "🏫" },
  { id: "thesis", th: "วิทยานิพนธ์และงานวิจัย", en: "Thesis & Research", icon: "🎓" },
  { id: "careers", th: "อาชีพและการสำเร็จการศึกษา", en: "Careers & Graduation", icon: "🚀" },
];

export function campusVocabTopicMeta(id: CampusVocabTopicId): CampusVocabTopicMeta {
  return CAMPUS_VOCAB_TOPICS.find((t) => t.id === id) ?? CAMPUS_VOCAB_TOPICS[0]!;
}

export { CAMPUS_VOCAB_SCENARIOS };

export function campusVocabScenario(id: string): CampusVocabScenario | undefined {
  return CAMPUS_VOCAB_SCENARIOS.find((s) => s.id === id);
}
