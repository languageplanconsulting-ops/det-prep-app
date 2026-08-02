/**
 * Drag-and-drop cloze mechanics, shared by the guided speaking drills
 * (ListenSpeakBuilder) and the guided writing drill (WriteTopicBuilder).
 *
 * Two kinds of gap:
 *
 *   • WORD gaps — every Nth word is lifted into a pool and dragged back. Tests
 *     that the learner can reproduce the model answer.
 *   • CHOICE gaps — a phrase the author nominates, offered as a short list of
 *     inflections ("depict / depicts / depicted", "is working out / are working
 *     out / works out"). Tests that they can pick the right FORM, which is the
 *     thing the exam actually marks and the thing a drag-the-exact-word drill
 *     cannot test at all.
 *
 * Nothing is random at render time — a learner who retries gets the drill they
 * practised, not a fresh one.
 */

/** A phrase in the model answer that becomes a pick-the-right-form gap. */
export type ChoiceBlank = {
  /** Exact text as it appears in the essay, e.g. "are working out". */
  phrase: string;
  /** The correct form plus its plausible wrong forms, in author order. */
  options: string[];
};

export type ClozeToken = {
  /** Display text: the word, or the whole phrase for a choice gap. */
  word: string;
  /** Trailing punctuation kept out of the chip, e.g. "." or ",". */
  suffix: string;
  /** Index into the drag pool; -1 when this is not a word gap. */
  blankIndex: number;
  /** Index into the choice list; -1 when this is not a choice gap. */
  choiceIndex: number;
  /** Options for a choice gap, already in a stable shuffled order. */
  options?: string[];
};

const TRAILING_PUNCT = /[.,;:!?"']+$/;

function splitWord(raw: string): { word: string; suffix: string } {
  const m = raw.match(TRAILING_PUNCT);
  const suffix = m ? m[0] : "";
  return { word: suffix ? raw.slice(0, -suffix.length) : raw, suffix };
}

/**
 * Build the token list.
 *
 * Choice phrases are matched first and claim their words; the every-Nth rhythm
 * then runs over what is left, so a choice gap never sits inside a word gap.
 */
export function buildCloze(
  essay: string,
  choices: ChoiceBlank[] = [],
  everyN = 3,
): ClozeToken[] {
  const raws = essay.trim().split(/\s+/).filter(Boolean);
  const parts = raws.map(splitWord);

  /** word index → the choice that starts there, and how many words it spans. */
  const startsChoice = new Map<number, { choice: ChoiceBlank; span: number }>();
  const claimed = new Set<number>();

  for (const choice of choices) {
    const want = choice.phrase.trim().split(/\s+/);
    for (let i = 0; i + want.length <= parts.length; i++) {
      if (claimed.has(i)) continue;
      const hit = want.every((w, k) => parts[i + k]!.word === w);
      if (!hit) continue;
      startsChoice.set(i, { choice, span: want.length });
      for (let k = 0; k < want.length; k++) claimed.add(i + k);
      break; // first occurrence only — a phrase is nominated once
    }
  }

  const out: ClozeToken[] = [];
  let blank = 0;
  let choiceIdx = 0;
  for (let i = 0; i < parts.length; i++) {
    const started = startsChoice.get(i);
    if (started) {
      const last = parts[i + started.span - 1]!;
      out.push({
        word: started.choice.phrase,
        suffix: last.suffix,
        blankIndex: -1,
        choiceIndex: choiceIdx++,
        options: stableShuffle(started.choice.options, `${essay.length}:${started.choice.phrase}`),
      });
      i += started.span - 1;
      continue;
    }
    const { word, suffix } = parts[i]!;
    // Position-based, counting every word including those inside a choice, so
    // the rhythm of the drill does not shift when choices are added or removed.
    const isGap = (i + 1) % everyN === 0 && word.length > 0 && !claimed.has(i);
    out.push({
      word,
      suffix,
      blankIndex: isGap ? blank++ : -1,
      choiceIndex: -1,
    });
  }
  return out;
}

/** The answers for the drag pool, indexed by blank number. */
export function clozeAnswers(tokens: ClozeToken[]): string[] {
  const out: string[] = [];
  for (const t of tokens) if (t.blankIndex >= 0) out[t.blankIndex] = t.word;
  return out;
}

/** The correct option for each choice gap, indexed by choice number. */
export function clozeChoiceAnswers(tokens: ClozeToken[]): string[] {
  const out: string[] = [];
  for (const t of tokens) if (t.choiceIndex >= 0) out[t.choiceIndex] = t.word;
  return out;
}

function hashOf(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

function stableShuffle<T>(items: T[], seed: string): T[] {
  const a = [...items];
  let h = hashOf(seed);
  for (let i = a.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Stable shuffle for the word pool — seeded off the item id so the chips sit in
 * a fixed scrambled order every time rather than re-randomising on each render
 * (which would also break React keys mid-drag).
 */
export function shuffledPool(
  answers: string[],
  seed: string,
): { word: string; blankIndex: number }[] {
  const chips = answers.map((word, blankIndex) => ({ word, blankIndex }));
  return stableShuffle(chips, seed);
}

/** Case-insensitive match — a chip is right if it spells the gap's word. */
export function chipFits(chipWord: string, answer: string): boolean {
  return chipWord.toLowerCase() === answer.toLowerCase();
}
