import { answersMatch } from "@/lib/reading-utils";
import type { ReadingMcBlock, ReadingVocabItem } from "@/types/reading";

/** One mock phase-4 exam: 5 vocab MC (gap) + missing paragraph + same 3 as practice reading. */
export type VocabularyReadingMockContent = {
  titleEn?: string;
  passage: { p1: string; p2: string; p3: string };
  highlightedVocab: ReadingVocabItem[];
  /** Five MCQs with paragraph 2 hidden (vocabulary in context). */
  vocabularyQuestions: ReadingMcBlock[];
  /** Most suitable paragraph for the gap (then reveal p2). */
  missingParagraph: ReadingMcBlock;
  informationLocation: ReadingMcBlock;
  bestTitle: ReadingMcBlock;
  mainIdea: ReadingMcBlock;
};

export const VOCAB_READING_MOCK_STEPS = 9;
// Combined fixed-mock steps: 6 vocab MCQs + missing paragraph + 3 reading MCQs
// (information location, best title, main idea).
export const VOCAB_READING_COMBINED_STEPS = 10;

export function getVocabularyReadingBlocks(
  content: VocabularyReadingMockContent,
): ReadingMcBlock[] {
  return [
    ...content.vocabularyQuestions,
    content.missingParagraph,
    content.informationLocation,
    content.bestTitle,
    content.mainIdea,
  ];
}

/** Fixed mock combined mode: 6 vocab (with p2 hidden) + missing paragraph. */
export function getVocabularyReadingCombinedBlocks(
  content: VocabularyReadingMockContent,
): ReadingMcBlock[] {
  return [
    ...content.vocabularyQuestions.slice(0, 6),
    content.missingParagraph,
    content.informationLocation,
    content.bestTitle,
    content.mainIdea,
  ];
}

export function gradeVocabularyReadingStep(
  content: VocabularyReadingMockContent,
  step: number,
  choice: string,
): boolean {
  const blocks = getVocabularyReadingBlocks(content);
  const block = blocks[step];
  if (!block) return false;
  return answersMatch(choice, block.correctAnswer);
}
