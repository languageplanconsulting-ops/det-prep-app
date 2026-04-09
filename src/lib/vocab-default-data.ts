import { VOCAB_ROUND_NUMBERS } from "@/lib/vocab-constants";
import type { VocabFullBank, VocabPassageUnit, VocabRoundNum, VocabSet } from "@/types/vocab";

function makePassage(
  passageNumber: number,
  contentLevel: VocabPassageUnit["contentLevel"],
  titleEn: string,
): VocabPassageUnit {
  return {
    passageNumber,
    contentLevel,
    titleEn,
    passageText:
      "The crisp [BLANK] air felt fresh in the [BLANK]. A narrow [BLANK] wound between the trees, and a gentle [BLANK] flowed beside the path. Birds sang [BLANK] overhead while pale [BLANK] warmed the mossy ground.",
    blanks: [
      {
        question: "Which word best fits the first blank?",
        correctAnswer: "morning",
        options: ["morning", "evening", "midnight", "noon"],
        explanationThai:
          "คำว่า morning สอดคล้องกับ crisp air และบรรยากาศเริ่มวัน — evening/midnight/noon ไม่เข้ากับ crisp ในบริบทนี้",
      },
      {
        question: "Which word best fits the second blank?",
        correctAnswer: "forest",
        options: ["forest", "kitchen", "stadium", "library"],
        explanationThai: "มีต้นไม้และทางเดิน — forest เหมาะสมที่สุด",
      },
      {
        question: "Which word best fits the third blank?",
        correctAnswer: "trail",
        options: ["trail", "elevator", "tunnel", "highway"],
        explanationThai: "wound between the trees บ่งบอกทางเดินในป่า = trail",
      },
      {
        question: "Which word best fits the fourth blank?",
        correctAnswer: "stream",
        options: ["stream", "mirror", "blanket", "ladder"],
        explanationThai: "flowed beside the path = ลำธาร stream",
      },
      {
        question: "Which word best fits the fifth blank?",
        correctAnswer: "loudly",
        options: ["loudly", "silently", "rarely", "never"],
        explanationThai: "นกร้อง — loudly เหมาะกับการเน้นเสียง",
      },
      {
        question: "Which word best fits the sixth blank?",
        correctAnswer: "sunlight",
        options: ["sunlight", "thunder", "fog", "shadow"],
        explanationThai: "warmed the mossy ground = แสงแดด sunlight",
      },
    ],
    correctWords: [
      { word: "morning", synonyms: ["dawn", "daybreak", "AM"] },
      { word: "forest", synonyms: ["woods", "woodland", "grove"] },
      { word: "trail", synonyms: ["path", "track", "route"] },
      { word: "stream", synonyms: ["brook", "creek", "rivulet"] },
      { word: "loudly", synonyms: ["noisily", "clearly", "strongly"] },
      { word: "sunlight", synonyms: ["sunshine", "daylight", "rays"] },
    ],
  };
}

export const DEFAULT_VOCAB_SETS: VocabSet[] = [
  {
    setNumber: 1,
    passages: [
      makePassage(1, "easy", "Woodland walk (easy)"),
      makePassage(2, "medium", "Woodland walk (medium)"),
      makePassage(3, "hard", "Woodland walk (hard)"),
    ],
  },
];

export function emptyVocabFullBank(): VocabFullBank {
  const b = {} as VocabFullBank;
  for (const r of VOCAB_ROUND_NUMBERS) {
    b[r] = [];
  }
  return b;
}

/** Defaults only in round 1. */
export function defaultVocabFullBank(): VocabFullBank {
  const bank = emptyVocabFullBank();
  const r = 1 as VocabRoundNum;
  bank[r] = JSON.parse(JSON.stringify(DEFAULT_VOCAB_SETS)) as VocabSet[];
  for (const s of bank[r]) {
    s.round = r;
  }
  return bank;
}
