type GrammarFixSource = {
  excerpt?: string;
  suggestionEn?: string;
  suggestionTh?: string;
  noteEn?: string;
  noteTh?: string;
};

type ParsedSwap = {
  before?: string;
  after?: string;
};

function cleanPhrase(value?: string): string {
  return String(value ?? "")
    .trim()
    .replace(/^["“”'`]+|["“”'`]+$/g, "")
    .replace(/\s+/g, " ");
}

function parseSwap(text?: string): ParsedSwap {
  const value = cleanPhrase(text);
  if (!value) return {};

  const arrow = value.match(/^(.+?)\s*(?:→|->)\s*(.+)$/);
  if (arrow) {
    return {
      before: cleanPhrase(arrow[1]),
      after: cleanPhrase(arrow[2]),
    };
  }

  const replaceWith = value.match(/^replace\s+(.+?)\s+with\s+(.+)$/i);
  if (replaceWith) {
    return {
      before: cleanPhrase(replaceWith[1]),
      after: cleanPhrase(replaceWith[2]),
    };
  }

  const useInstead = value.match(/^use\s+(.+?)\s+instead of\s+(.+)$/i);
  if (useInstead) {
    return {
      before: cleanPhrase(useInstead[2]),
      after: cleanPhrase(useInstead[1]),
    };
  }

  const changeTo = value.match(/^(?:change|correct)\s+(.+?)\s+to\s+(.+)$/i);
  if (changeTo) {
    return {
      before: cleanPhrase(changeTo[1]),
      after: cleanPhrase(changeTo[2]),
    };
  }

  const quotedInstead = value.match(/^(.+?)\s+instead of\s+(.+)$/i);
  if (quotedInstead) {
    return {
      before: cleanPhrase(quotedInstead[2]),
      after: cleanPhrase(quotedInstead[1]),
    };
  }

  return {};
}

function firstMeaningful(...values: Array<string | undefined>): string {
  for (const value of values) {
    const cleaned = cleanPhrase(value);
    if (cleaned) return cleaned;
  }
  return "";
}

export function resolveGrammarFixDisplay(source: GrammarFixSource): {
  wrong: string;
  betterEn: string;
  betterTh: string;
} {
  const excerpt = cleanPhrase(source.excerpt);
  const parsedEn = parseSwap(source.suggestionEn);
  const parsedTh = parseSwap(source.suggestionTh);
  const noteBefore = parseSwap(source.noteEn).before || parseSwap(source.noteTh).before;

  const betterEn = firstMeaningful(parsedEn.after, source.suggestionEn);
  const betterTh = firstMeaningful(parsedTh.after, source.suggestionTh);

  let wrong = firstMeaningful(excerpt, parsedEn.before, parsedTh.before, noteBefore);

  const clashesWithBetter =
    wrong &&
    [betterEn, betterTh]
      .filter(Boolean)
      .some((candidate) => wrong.toLowerCase() === candidate.toLowerCase());

  if (!wrong || clashesWithBetter) {
    wrong = firstMeaningful(parsedEn.before, parsedTh.before, noteBefore, excerpt);
  }

  return { wrong, betterEn, betterTh };
}
