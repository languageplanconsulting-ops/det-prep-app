/**
 * Present-simple -s/-es drilled through speech, not just typing.
 *
 * The learner inflects the verb in a fixed DET answer pattern, then says the
 * finished sentence aloud. Scoring reuses pronunciation-match.ts, where a
 * dropped -s/-es fails the take outright even at 95%+ word match — which is the
 * whole point: Thai speakers routinely write the ending correctly and then
 * swallow it when speaking.
 */

export type SpeakPatternItem = {
  id: string;
  /** Where this pattern is used on the real test. */
  context: "photo" | "topic";
  /** The sentence frame, with __ where the inflected verb goes. */
  frameEn: string;
  /** Bare form the learner must inflect, e.g. "depict". */
  baseVerb: string;
  /** The correct inflected form, e.g. "depicts". */
  inflected: string;
  /** The full sentence once the blank is filled — this is what they say. */
  fullSentence: string;
  promptTh: string;
  whyTh: string;
};

export const SPEAK_PATTERN_ITEMS: SpeakPatternItem[] = [
  {
    id: "sp-pat-1",
    context: "photo",
    frameEn: "This picture __ a busy market in the early morning.",
    baseVerb: "depict",
    inflected: "depicts",
    fullSentence: "This picture depicts a busy market in the early morning.",
    promptTh: "เติมกริยาให้ถูกรูป แล้วพูดทั้งประโยค",
    whyTh: "ประธาน “This picture” เป็นเอกพจน์ กริยาจึงต้องเติม -s",
  },
  {
    id: "sp-pat-2",
    context: "photo",
    frameEn: "Judging from the background, I believe that the man __ for a train.",
    baseVerb: "wait",
    inflected: "waits",
    fullSentence:
      "Judging from the background, I believe that the man waits for a train.",
    promptTh: "เติม -s ให้กริยา แล้วพูดให้ได้ยินเสียงท้ายคำชัด",
    whyTh: "ประธาน “the man” เอกพจน์ ต้องเติม -s ที่ wait",
  },
  {
    id: "sp-pat-3",
    context: "topic",
    frameEn: "In my opinion, technology __ the way students learn today.",
    baseVerb: "change",
    inflected: "changes",
    fullSentence:
      "In my opinion, technology changes the way students learn today.",
    promptTh: "เติมกริยาให้ถูกรูป แล้วพูดทั้งประโยค",
    whyTh: "technology เป็นนามนับไม่ได้ ถือเป็นเอกพจน์ จึงเติม -s",
  },
  {
    id: "sp-pat-4",
    context: "topic",
    frameEn: "From my experience, a good teacher __ every student to speak up.",
    baseVerb: "encourage",
    inflected: "encourages",
    fullSentence:
      "From my experience, a good teacher encourages every student to speak up.",
    promptTh: "เติม -s แล้วพูด — เสียงท้ายคำต้องชัด",
    whyTh: "“a good teacher” เอกพจน์ กริยาจึงเติม -s",
  },
];

export function speakPatternsFor(context: "photo" | "topic"): SpeakPatternItem[] {
  return SPEAK_PATTERN_ITEMS.filter((i) => i.context === context);
}

/** Case-insensitive check of the inflected form the learner typed. */
export function inflectionIsCorrect(item: SpeakPatternItem, typed: string): boolean {
  return typed.trim().toLowerCase() === item.inflected.toLowerCase();
}
