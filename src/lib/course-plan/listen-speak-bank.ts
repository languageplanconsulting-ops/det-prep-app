/**
 * "Listen and speak" guided builder — content straight from the course lecture
 * [โจทย์ใหม่] เทคนิคการทำโจทย์ listen and speak (chapter "Speaking (1-3 minutes)").
 *
 * The lecture teaches one answer skeleton (intro → body 1 → body 2 → conclusion)
 * plus a fixed phrase bank, then walks three model answers. This file is that
 * lecture as data: the same skeleton, the same phrases, and the three model
 * answers trimmed to ~100 words each so a learner can rebuild one word by word,
 * hear it, and then say it back.
 *
 * Used by ListenSpeakBuilder (the guided drill) and by SpeakingHintPanel (the
 * pattern + recommended vocabulary shown on the un-guided "real speaking" runs),
 * so the drill and the exam help can never drift apart.
 */

/** Which move of the lecture's skeleton a sentence belongs to. */
export type ListenSpeakMoveKind = "intro" | "body1" | "body2" | "conclude";

export const LISTEN_SPEAK_MOVES: Record<
  ListenSpeakMoveKind,
  { th: string; en: string; hintTh: string }
> = {
  intro: {
    th: "บทนำ",
    en: "Introduction",
    hintTh: "ทวนคำถาม → บอกว่าบางคนคิดแบบหนึ่ง คนอื่นคิดอีกแบบ → บอกจุดยืนของคุณ แล้วบอกว่าจะอธิบายเหตุผล",
  },
  body1: {
    th: "เนื้อหาส่วนที่ 1",
    en: "Body 1",
    hintTh: "จุดยืน (First of all…) → เหตุผล (To explain it simply…) → เหตุผลเสริม (Moreover…) → ตัวอย่างจริง (Take me, for example;) → สรุปย่อย",
  },
  body2: {
    th: "เนื้อหาส่วนที่ 2",
    en: "Body 2",
    hintTh: "เหตุผลชุดที่สอง ขึ้นด้วย Moreover, I would also personally say that… แล้วทำแบบเดียวกับส่วนที่ 1",
  },
  conclude: {
    th: "บทสรุป",
    en: "Conclusion",
    hintTh: "To sum up, because SV, SV → I would wholeheartedly support my answer that…",
  },
};

export const LISTEN_SPEAK_MOVE_ORDER: ListenSpeakMoveKind[] = ["intro", "body1", "body2", "conclude"];

/** The lecture's "here are phrases you need to use" list, verbatim. */
export const LISTEN_SPEAK_PHRASES: { en: string; th: string }[] = [
  { en: "I think / consider / view that…", th: "ฉันคิดว่า / มองว่า" },
  { en: "I firmly / strongly believe that…", th: "ฉันเชื่ออย่างยิ่งว่า" },
  { en: "Personally, …", th: "ส่วนตัวแล้ว" },
  { en: "According to my point of view, …", th: "ตามมุมมองของฉัน" },
  { en: "Take me, for example; S+V", th: "ยกตัวอย่างเช่นฉัน" },
];

/** The skeleton, as the learner should carry it into the exam. */
export const LISTEN_SPEAK_SKELETON: { move: ListenSpeakMoveKind; en: string; th: string }[] = [
  { move: "intro", en: "It is not easy to answer the question about ______.", th: "ทวนคำถาม — บอกว่าไม่ใช่เรื่องง่ายที่จะตอบ" },
  { move: "intro", en: "On the one hand, some people say ______. On the other hand, others might say ______.", th: "บอกสองมุมที่ต่างกัน" },
  { move: "intro", en: "Personally, I would say that ______, and I will explain my reasons.", th: "บอกจุดยืน แล้วบอกว่าจะอธิบายเหตุผล" },
  { move: "body1", en: "First of all, I would say that ______.", th: "จุดยืนหลักของส่วนที่ 1" },
  { move: "body1", en: "To explain it simply, this is because ______.", th: "ให้เหตุผลว่าทำไม" },
  { move: "body1", en: "Moreover / furthermore / additionally, ______.", th: "ให้เหตุผลเพิ่มอีกหนึ่งข้อ" },
  { move: "body1", en: "Take me, for example; ______.", th: "ยกตัวอย่างจากชีวิตจริง ใส่ชื่อสถานที่ / ปี ให้ดูจริง" },
  { move: "body1", en: "From this perspective, it is clear that ______.", th: "สรุปเหตุผลของส่วนที่ 1" },
  { move: "body2", en: "Moreover, I would also personally say that ______.", th: "ขึ้นส่วนที่ 2 แล้วทำแบบเดียวกัน" },
  { move: "conclude", en: "To sum up, because ______, ______.", th: "สรุปสิ่งที่พูดไปอีกครั้ง" },
  { move: "conclude", en: "I would wholeheartedly support my answer that ______.", th: "ย้ำจุดยืนปิดท้าย" },
];

export type ListenSpeakItem = {
  id: string;
  /** The examiner's question, exactly as the lecture phrases it. */
  topic: string;
  topicTh: string;
  /** ~100-word model answer, condensed from the lecture's own worked example. */
  essay: string;
  /** Full Thai translation — shown once the rebuild hits 100%. */
  essayTh: string;
  /** Sentence-by-sentence mapping onto the lecture's skeleton. */
  moves: { kind: ListenSpeakMoveKind; en: string }[];
  /** Pick-the-right-form gaps: phrase in the essay → correct form + wrong forms. */
  choices?: { phrase: string; options: string[] }[];
};

export const LISTEN_SPEAK_ITEMS: ListenSpeakItem[] = [
  {
    id: "ls-1",
    choices: [
      { phrase: "is", options: ["is", "are", "be"] },
      { phrase: "can start", options: ["can start", "can starts", "can started"] },
      { phrase: "say", options: ["say", "says", "said"] },
      { phrase: "helped", options: ["help", "helps", "helped"] },
    ],
    topic: "At what age should children be allowed to use social media?",
    topicTh: "เด็กควรเริ่มใช้สื่อสังคมออนไลน์ได้ตอนอายุเท่าไร",
    essay:
      "It is not easy to answer the question about the age at which children can start using social media. On the one hand, some people say that it is okay for them to start in primary school. On the other hand, others might say that it is better to use it after high school. Personally, I would say that waiting is wiser, and I will explain my reasons. First of all, this is because they should spend more time on academic subjects. Take me, for example; when I was young, I read books instead, which helped me enter a good university.",
    essayTh:
      "คำถามที่ว่าเด็กควรเริ่มใช้สื่อสังคมออนไลน์ตอนอายุเท่าไรนั้นไม่ใช่เรื่องง่ายที่จะตอบ ในด้านหนึ่ง บางคนบอกว่าไม่เป็นไรถ้าจะเริ่มใช้ตั้งแต่ชั้นประถม ในอีกด้านหนึ่ง คนอื่นอาจบอกว่าใช้หลังจบมัธยมปลายจะดีกว่า ส่วนตัวแล้ว ฉันคิดว่าการรอจะฉลาดกว่า และฉันจะอธิบายเหตุผลของฉัน ประการแรก เพราะพวกเขาควรใช้เวลาไปกับวิชาการมากกว่า ยกตัวอย่างเช่นฉัน ตอนเด็ก ๆ ฉันอ่านหนังสือแทน ซึ่งช่วยให้ฉันเข้ามหาวิทยาลัยที่ดีได้",
    moves: [
      { kind: "intro", en: "It is not easy to answer the question about the age at which children can start using social media." },
      { kind: "intro", en: "On the one hand, some people say that it is okay for them to start in primary school. On the other hand, others might say that it is better to use it after high school." },
      { kind: "intro", en: "Personally, I would say that waiting is wiser, and I will explain my reasons." },
      { kind: "body1", en: "First of all, this is because they should spend more time on academic subjects." },
      { kind: "body1", en: "Take me, for example; when I was young, I read books instead, which helped me enter a good university." },
    ],
  },
  {
    id: "ls-2",
    choices: [
      { phrase: "is", options: ["is", "are", "be"] },
      { phrase: "might argue", options: ["might argue", "might argues", "might argued"] },
      { phrase: "believe", options: ["believe", "believes", "believed"] },
      { phrase: "told", options: ["tell", "tells", "told"] },
    ],
    topic: "Discuss some tips for a successful negotiation.",
    topicTh: "พูดถึงเคล็ดลับของการเจรจาต่อรองที่ประสบความสำเร็จ",
    essay:
      "It is not easy to discuss successful tips for negotiation because, on the one hand, some people say that compromise is the perfect solution. On the other hand, others might argue that being active is more effective. Personally, I believe that the combination of the two is the best solution, and I will explain my reasons. First of all, I believe that compromise matters most. To explain it simply, this is because it is important for two parties to meet halfway. For example, when I was in a job interview, I told my interviewer about my expected salary and asked their expectations.",
    essayTh:
      "การพูดถึงเคล็ดลับการเจรจาต่อรองที่ประสบความสำเร็จนั้นไม่ใช่เรื่องง่าย เพราะในด้านหนึ่ง บางคนบอกว่าการประนีประนอมคือทางออกที่สมบูรณ์แบบ ในอีกด้านหนึ่ง คนอื่นอาจแย้งว่าการกล้าแสดงออกได้ผลมากกว่า ส่วนตัวแล้ว ฉันเชื่อว่าการผสมผสานทั้งสองอย่างคือทางออกที่ดีที่สุด และฉันจะอธิบายเหตุผลของฉัน ประการแรก ฉันเชื่อว่าการประนีประนอมสำคัญที่สุด อธิบายง่าย ๆ คือ เพราะทั้งสองฝ่ายควรพบกันครึ่งทาง ตัวอย่างเช่น ตอนที่ฉันไปสัมภาษณ์งาน ฉันบอกเงินเดือนที่คาดหวังและถามความคาดหวังของเขาด้วย",
    moves: [
      { kind: "intro", en: "It is not easy to discuss successful tips for negotiation because, on the one hand, some people say that compromise is the perfect solution. On the other hand, others might argue that being active is more effective." },
      { kind: "intro", en: "Personally, I believe that the combination of the two is the best solution, and I will explain my reasons." },
      { kind: "body1", en: "First of all, I believe that compromise matters most." },
      { kind: "body1", en: "To explain it simply, this is because it is important for two parties to meet halfway." },
      { kind: "body1", en: "For example, when I was in a job interview, I told my interviewer about my expected salary and asked their expectations." },
    ],
  },
  {
    id: "ls-3",
    choices: [
      { phrase: "lives", options: ["live", "lives", "lived"] },
      { phrase: "have to wait", options: ["have to wait", "has to wait", "have to waited"] },
      { phrase: "waited", options: ["wait", "waits", "waited"] },
      { phrase: "was situated", options: ["was situated", "were situated", "is situated"] },
    ],
    topic: "Describe a time-consuming process you went through.",
    topicTh: "เล่าถึงเรื่องที่คุณต้องใช้เวลานานมากกว่าจะผ่านไปได้",
    essay:
      "Generally speaking, I am a person who lives in a big city, so I have to wait for a lot of things. Today I decided that I am going to talk about the one time I waited over four hours for a restaurant. This is a restaurant called MK. When it comes to the location, it was situated at a shopping mall in Bangkok. In terms of the food they served, it was mostly Asian food, and my favourite dish was duck rice. Moving on to the reasons, firstly, there were hundreds of people, so we waited a very long time.",
    essayTh:
      "โดยทั่วไปแล้ว ฉันเป็นคนที่อาศัยอยู่ในเมืองใหญ่ ฉันจึงต้องรอหลายอย่าง วันนี้ฉันตัดสินใจว่าจะเล่าถึงครั้งหนึ่งที่ฉันรอร้านอาหารนานกว่าสี่ชั่วโมง ร้านนี้ชื่อ MK เมื่อพูดถึงทำเล ร้านตั้งอยู่ในห้างสรรพสินค้าในกรุงเทพฯ ในแง่ของอาหารที่เสิร์ฟ ส่วนใหญ่เป็นอาหารเอเชีย และจานโปรดของฉันคือข้าวหน้าเป็ด ต่อไปคือเหตุผล ประการแรก มีคนเป็นร้อย เราจึงต้องรอนานมาก",
    moves: [
      { kind: "intro", en: "Generally speaking, I am a person who lives in a big city, so I have to wait for a lot of things." },
      { kind: "intro", en: "Today I decided that I am going to talk about the one time I waited over four hours for a restaurant." },
      { kind: "body1", en: "This is a restaurant called MK. When it comes to the location, it was situated at a shopping mall in Bangkok." },
      { kind: "body1", en: "In terms of the food they served, it was mostly Asian food, and my favourite dish was duck rice." },
      { kind: "body2", en: "Moving on to the reasons, firstly, there were hundreds of people, so we waited a very long time." },
    ],
  },
];

export function listenSpeakItemById(id: string): ListenSpeakItem | null {
  return LISTEN_SPEAK_ITEMS.find((i) => i.id === id) ?? null;
}

// Cloze mechanics live in cloze.ts (shared with the writing drill); re-exported
// here so existing importers keep working.
export {
  buildCloze,
  clozeAnswers,
  shuffledPool,
  chipFits,
  type ClozeToken,
} from "@/lib/course-plan/cloze";

/** Adapt a lecture item to the generic drill shape the runner consumes. */
export function toSpeakDrill(item: ListenSpeakItem) {
  return {
    id: item.id,
    topic: item.topic,
    topicTh: item.topicTh,
    essay: item.essay,
    essayTh: item.essayTh,
    moves: item.moves.map((mv) => ({
      label: `${LISTEN_SPEAK_MOVES[mv.kind].th} · ${LISTEN_SPEAK_MOVES[mv.kind].en}`,
      en: mv.en,
    })),
  };
}
