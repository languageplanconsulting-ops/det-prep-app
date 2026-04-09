import { READING_DIFFICULTIES, READING_ROUND_NUMBERS } from "@/lib/reading-constants";
import type {
  ReadingDifficulty,
  ReadingExamUnit,
  ReadingFullBank,
  ReadingRoundNum,
  ReadingSet,
} from "@/types/reading";

const DOLPHIN_EXAM: ReadingExamUnit = {
  passage: {
    p1: "Dolphins are intelligent marine mammals that live in oceans and rivers around the world. They are known for their playful behaviour and their ability to communicate with each other using a variety of sounds, including clicks and whistles.",
    p2: "[MISSING PARAGRAPH]",
    p3: "Unfortunately, dolphins face many threats in the modern world. Pollution from plastic waste and chemicals harms the water they live in. Conservation organisations around the world are working to protect dolphins and their habitats.",
  },
  highlightedVocab: [
    {
      word: "marine",
      meaningEn: "relating to the sea",
      meaningTh: "เกี่ยวกับทะเล",
      example: "Marine biologists study animals that live in the ocean.",
    },
    {
      word: "habitats",
      meaningEn: "the natural environments where animals live",
      meaningTh: "ที่อยู่อาศัย (ตามธรรมชาติ)",
      example: "Deforestation destroys the habitats of many animals.",
    },
  ],
  missingSentence: {
    question:
      "Choose the sentence or paragraph that best fills the gap between paragraph 1 and paragraph 3.",
    correctAnswer:
      "Dolphins are also remarkably intelligent animals. They can solve problems, learn new tasks quickly, and even recognise themselves in a mirror.",
    options: [
      "Dolphins are also remarkably intelligent animals. They can solve problems, learn new tasks quickly, and even recognise themselves in a mirror.",
      "Whales are the largest animals on Earth and are closely related to dolphins.",
      "Dolphins have been important in human culture for thousands of years.",
      "Aquariums and marine parks around the world keep dolphins in captivity.",
    ],
    explanationThai:
      "ย่อหน้า 2 ควรขยายเรื่องความฉลาดของโลมา เพื่อเชื่อมกับย่อหน้า 3 ที่พูดถึงภัยคุกคามและการอนุรักษ์",
  },
  informationLocation: {
    question: "Which part of the passage tells us that dolphins use sounds to communicate?",
    correctAnswer:
      "communicate with each other using a variety of sounds, including clicks and whistles",
    options: [
      "communicate with each other using a variety of sounds, including clicks and whistles",
      "They are known for their playful behaviour",
      "Pollution from plastic waste and chemicals harms the water",
      "Conservation organisations around the world are working to protect dolphins",
    ],
    explanationThai: "คำถามถามเรื่องการสื่อสารด้วยเสียง — ประโยคนี้อยู่ในย่อหน้าแรก",
  },
  bestTitle: {
    question: "What is the best title for this passage?",
    correctAnswer: "Dolphins: Intelligent Animals Facing Modern Threats",
    options: [
      "Dolphins: Intelligent Animals Facing Modern Threats",
      "How Whales and Dolphins Communicate Using Sound",
      "Why Keeping Dolphins in Captivity Is Wrong",
      "The History of Marine Biology",
    ],
    explanationThai: "หัวข้อที่ดีครอบคลุมทั้งความฉลาดและภัยคุกคามในย่อหน้าสุดท้าย",
  },
  mainIdea: {
    question: "What is the main idea of this passage?",
    correctAnswer:
      "Dolphins are intelligent, social animals, but human activity threatens their survival.",
    options: [
      "Dolphins are intelligent, social animals, but human activity threatens their survival.",
      "Dolphins use clicks and whistles to talk to each other.",
      "Plastic pollution is the only problem dolphins face.",
      "Marine mammals live in every ocean on Earth.",
    ],
    explanationThai: "Main idea ต้องรวมทั้งจุดเด่น (ฉลาด) และประเด็นหลักของย่อหน้าสุดท้าย (ภัยคุกคาม)",
  },
};

/** Starter set with 10 exams (same passage for demo; replace via Admin). */
export const DEFAULT_READING_SETS: ReadingSet[] = [
  {
    setNumber: 1,
    exams: Array.from({ length: 10 }, (_, i) => ({
      ...DOLPHIN_EXAM,
      highlightedVocab: DOLPHIN_EXAM.highlightedVocab.map((v) => ({ ...v })),
      titleEn: `Exam ${i + 1}`,
    })),
  },
];

export function emptyReadingFullBank(): ReadingFullBank {
  const b = {} as ReadingFullBank;
  for (const r of READING_ROUND_NUMBERS) {
    b[r] = { easy: [], medium: [], hard: [] };
  }
  return b;
}

/** Defaults only in round 1 (mirrored to all three difficulties, matching legacy hub). */
export function defaultReadingFullBank(): ReadingFullBank {
  const bank = emptyReadingFullBank();
  const r = 1 as ReadingRoundNum;
  for (const d of READING_DIFFICULTIES as ReadingDifficulty[]) {
    for (const set of DEFAULT_READING_SETS) {
      bank[r][d].push({
        ...structuredClone(set),
        setNumber: set.setNumber,
        difficulty: d,
        round: r,
      });
    }
  }
  return bank;
}
