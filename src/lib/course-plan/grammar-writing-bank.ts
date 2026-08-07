/**
 * Typed-answer grammar exercises the main FITB bank does not cover.
 *
 * The generated question sets left three curriculum exercises empty because
 * grammar-fitb-data.ts has no topic for conjunctions, transitions-as-rewrite,
 * or run-on repair. These are a different mechanic anyway: the learner rewrites
 * a whole sentence rather than filling a blank, so answers are checked on
 * normalised text with the punctuation that is actually being taught preserved.
 */

export type RewriteItem = {
  id: string;
  /** What the learner sees. */
  prompt: string;
  /** Accepted answers. First is the model answer shown in the explanation. */
  answers: string[];
  hintTh: string;
  explanationThai: string;
  /** The grammar rule being tested, named and shown as a pattern. */
  rule: GrammarRule;
  /**
   * Photo-bank id for the picture-description items.
   *
   * "ในภาพมีผู้หญิง 2 คน กำลังออกกำลังกาย" is not answerable without the
   * picture, so these items were unusable until the image was shown. Ids are
   * verified by eye — the bank's `scene` labels are wrong often enough that
   * pairing from the label alone produces a bird where a jogger should be.
   */
  photoId?: string;
};

/**
 * The rule behind an item, surfaced as a short pattern the learner can carry.
 * Seeing "FANBOYS → S+V, but S+V." is more portable than a paragraph.
 */
export type GrammarRule = {
  nameTh: string;
  /** e.g. "S+V, but S+V." */
  pattern: string;
  /** Short Thai bullets — why it is right or wrong. */
  bulletsTh: string[];
};

export const RULES = {
  fanboys: {
    nameTh: "FANBOYS (คำเชื่อมประโยคอิสระ)",
    pattern: "S+V, but S+V.",
    bulletsTh: [
      "for, and, nor, but, or, yet, so = FANBOYS",
      "เชื่อมประโยคสมบูรณ์ (S+V) 2 ประโยค → ต้องมีคอมมา “หน้า” คำเชื่อม",
      "ถ้าหลังคำเชื่อมไม่ใช่ประโยคสมบูรณ์ (S+V) ไม่ต้องใส่คอมมา",
    ],
  },
  subLeading: {
    nameTh: "Subordinating conjunction (ขึ้นต้นประโยค)",
    pattern: "Although S+V, S+V.",
    bulletsTh: [
      "although, even if, because, until, as soon as, as long as",
      "ถ้าอนุประโยค “ขึ้นต้น” → ใส่คอมมาหลังอนุประโยค",
      "ประโยคหลักตามมาโดยไม่ต้องมีคำเชื่อมซ้ำ",
    ],
  },
  subTrailing: {
    nameTh: "Subordinating conjunction (อยู่ท้ายประโยค)",
    pattern: "S+V until S+V.",
    bulletsTh: [
      "ถ้าอนุประโยค “อยู่ท้าย” → ไม่ต้องใส่คอมมา",
      "เป็นข้อผิดที่เจอบ่อย: ใส่คอมมาเกินหน้า because/until",
    ],
  },
  transition: {
    nameTh: "Transitional word",
    pattern: "However, S+V.",
    bulletsTh: [
      "however, moreover, in addition, in contrast, similarly, interestingly",
      "วาง “ต้นประโยคใหม่” แล้วตามด้วยคอมมาเสมอ",
      "ห้ามใช้คอมมาเชื่อมสองประโยคโดยไม่มีจุดหรือ semicolon",
    ],
  },
  runon: {
    nameTh: "Run-on sentence",
    pattern: "S+V. S+V.  /  S+V, so S+V.  /  S+V; S+V.",
    bulletsTh: [
      "run-on = ประโยคสมบูรณ์ (S+V) 2 ประโยคชนกันโดยไม่มีตัวคั่น",
      "แก้ได้ 3 ทาง: ใส่จุด · ใส่ semicolon · ใส่คอมมา + FANBOYS",
      "ใส่คอมมาเฉย ๆ ไม่พอ (comma splice)",
    ],
  },
  relativeNonDefining: {
    nameTh: "which / who แบบข้อมูลเสริม",
    pattern: "N, which S+V, V…",
    bulletsTh: [
      "ถ้าตัดอนุประโยคออกแล้วยังรู้ว่าหมายถึงอะไร → เป็นข้อมูลเสริม",
      "ข้อมูลเสริมต้องมีคอมมา “คร่อมสองข้าง”",
      "กริยาหลักยังต้องผันตามประธานเดิม",
    ],
  },
  relativeDefining: {
    nameTh: "that / who แบบจำกัดความ",
    pattern: "N that S+V …  (ไม่มีคอมมา)",
    bulletsTh: [
      "ถ้าอนุประโยคใช้ “ระบุว่าอันไหน/คนไหน” → ห้ามใส่คอมมา",
      "หลัง that ห้ามมีคอมมาเด็ดขาด",
    ],
  },
  relativeWhere: {
    nameTh: "where ขยายสถานที่",
    pattern: "N where S+V …  (place/situation)",
    bulletsTh: [
      "where ใช้ขยาย “สถานที่” หรือ “สถานการณ์” แทน which/that",
      "ระบุสถานที่ทั่วไป (defining) → ไม่ใส่คอมมา",
      "ชื่อเฉพาะ/สถานที่ที่รู้ตัวอยู่แล้ว (non-defining) → ใส่คอมมาคร่อม เหมือนกับ which",
    ],
  },
  participialReduction: {
    nameTh: "ย่อ “, which V” เป็น “, V-ing”",
    pattern: "S+V, V-ing … (แทน S+V, which V …)",
    bulletsTh: [
      "which ที่อ้างถึง “ทั้งประโยคก่อนหน้า” (ไม่ใช่ noun ตัวใดตัวหนึ่ง) ย่อเป็น V-ing ได้",
      "ตัด which ออก แล้วเปลี่ยนกริยาเป็น V-ing แทน",
      "ความหมายเหมือนเดิมทุกประการ แค่กระชับขึ้น",
    ],
  },
  tenses: {
    nameTh: "Tense ที่ต้องรู้ (6 แบบ)",
    pattern: "S+V.1(s/es) · S+is/am/are+V-ing · S+have/has+V.3 · S+V.2 · used to+V.1 · S+will+V.inf",
    bulletsTh: [
      "Present Simple = สิ่งที่ทำเป็นประจำ / บรรยายภาพ",
      "Present Continuous = กำลังทำอยู่ตอนนี้ (ใช้บรรยายภาพบ่อยที่สุด)",
      "used to + V.1 = เคยทำในอดีต แต่ตอนนี้ไม่ทำแล้ว",
    ],
  },
  presentAgreement: {
    nameTh: "Present Simple: ประธานกับกริยาต้องตรงกัน",
    pattern: "I / you / we / they + V.1   ·   he / she / it + V.1 (s/es)",
    bulletsTh: [
      "ประธานเอกพจน์ (he/she/it/ชื่อเฉพาะ) → กริยาเติม -s / -es",
      "ประธานพหูพจน์ (I/you/we/they) → กริยาไม่เติม",
      "ข้อนี้ผิดบ่อยที่สุดตอนบรรยายภาพ — ระวังเป็นพิเศษ",
    ],
  },
  simpleVsComplex: {
    nameTh: "Simple กับ Complex Sentence",
    pattern: "Simple = S+V.   ·   Complex = S+V, คำเชื่อม S+V.",
    bulletsTh: [
      "ประโยคสั้น ๆ ติดกันหลายประโยค = คะแนนไวยากรณ์ตัน",
      "รวมสองประโยคด้วยคอมมา + FANBOYS เพื่อให้เป็น complex",
      "ต้องมี complex sentence อย่างน้อย 1 ประโยคถึงจะได้คะแนนช่วงสูง",
    ],
  },
  picturePattern: {
    nameTh: "แพตเทิร์นบรรยายภาพ (คน / สถานที่)",
    pattern: "This picture depicts ___ who ___. Judging from ___, ___. Finally, even though ___, ___.",
    bulletsTh: [
      "ประโยคที่ 1 ใช้ who / surrounded by เพื่อให้เป็น complex ทันที",
      "ประโยคที่ 2 ขึ้นด้วย Judging from เพื่อเดาบริบท",
      "ประโยคที่ 3 ขึ้นด้วย Finally, even though เพื่อปิดแบบมีมุมขัดแย้ง",
    ],
  },
} as const satisfies Record<string, GrammarRule>;

/**
 * Comma placement with coordinating (but, and, for) and subordinating
 * (although, even if, because, until, as soon as, as long as) conjunctions.
 *
 * The rule being drilled: a comma before a coordinating conjunction joining two
 * independent clauses; a comma after a leading subordinate clause, none when it
 * trails.
 */
export const CONJUNCTION_ITEMS: RewriteItem[] = [
  {
    id: "cj-1",
    prompt: "She studied all night but she still felt unprepared.",
    answers: ["She studied all night, but she still felt unprepared."],
    hintTh: "“but” เชื่อมสองประโยคสมบูรณ์ (S+V) → ใส่คอมมาหน้า but",
    explanationThai: "เมื่อ but เชื่อมประโยคอิสระสองประโยค ต้องมีคอมมาก่อน but เสมอ",
    rule: RULES.fanboys,
  },
  {
    id: "cj-2",
    prompt: "The library closed early and the students went home.",
    answers: ["The library closed early, and the students went home."],
    hintTh: "“and” เชื่อมสองประโยคสมบูรณ์ (S+V) → ใส่คอมมาหน้า and",
    explanationThai: "and เชื่อมประโยคอิสระสองประโยค จึงต้องมีคอมมาก่อน and",
    rule: RULES.fanboys,
  },
  {
    id: "cj-3",
    prompt: "He packed a jacket for the forecast predicted rain.",
    answers: ["He packed a jacket, for the forecast predicted rain."],
    hintTh: "“for” ที่แปลว่า “เพราะ” เชื่อมสองประโยค → ใส่คอมมาหน้า for",
    explanationThai: "for ในความหมาย “เพราะว่า” ทำหน้าที่เหมือน and/but จึงต้องมีคอมมาก่อน",
    rule: RULES.fanboys,
  },
  {
    id: "cj-4",
    prompt: "Although the exam was difficult she finished on time.",
    answers: ["Although the exam was difficult, she finished on time."],
    hintTh: "อนุประโยค “Although…” มาก่อน → ใส่คอมมาหลังจบอนุประโยค",
    explanationThai: "เมื่อ Although ขึ้นต้นประโยค ต้องมีคอมมาคั่นก่อนประโยคหลัก",
    rule: RULES.subLeading,
  },
  {
    id: "cj-5",
    prompt: "Even if it rains tomorrow the match will continue.",
    answers: ["Even if it rains tomorrow, the match will continue."],
    hintTh: "“Even if…” ขึ้นต้น → ใส่คอมมาหลังอนุประโยค",
    explanationThai: "อนุประโยคที่ขึ้นต้นประโยคต้องตามด้วยคอมมาเสมอ",
    rule: RULES.subLeading,
  },
  {
    id: "cj-6",
    prompt: "She missed the bus because her alarm did not ring.",
    answers: ["She missed the bus because her alarm did not ring."],
    hintTh: "“because” อยู่ตรงกลาง → ไม่ต้องใส่คอมมา",
    explanationThai:
      "เมื่ออนุประโยคอยู่หลังประโยคหลัก ไม่ต้องใส่คอมมา — ประโยคนี้ถูกอยู่แล้ว",
    rule: RULES.subTrailing,
  },
  {
    id: "cj-7",
    prompt: "Until the results arrive we cannot make a decision.",
    answers: ["Until the results arrive, we cannot make a decision."],
    hintTh: "“Until…” ขึ้นต้น → ใส่คอมมาหลังอนุประโยค",
    explanationThai: "Until ขึ้นต้นประโยค จึงต้องมีคอมมาคั่นก่อนประโยคหลัก",
    rule: RULES.subLeading,
  },
  {
    id: "cj-8",
    prompt: "As soon as the bell rang the students left the room.",
    answers: ["As soon as the bell rang, the students left the room."],
    hintTh: "“As soon as…” ขึ้นต้น → ใส่คอมมา",
    explanationThai: "As soon as เป็นอนุประโยคขึ้นต้น ต้องตามด้วยคอมมา",
    rule: RULES.subLeading,
  },
  {
    id: "cj-9",
    prompt: "As long as you submit it today the teacher will accept it.",
    answers: ["As long as you submit it today, the teacher will accept it."],
    hintTh: "“As long as…” ขึ้นต้น → ใส่คอมมา",
    explanationThai: "อนุประโยค As long as ขึ้นต้นประโยค จึงต้องมีคอมมา",
    rule: RULES.subLeading,
  },
  {
    id: "cj-10",
    prompt: "The road was closed but we found another route because the map helped.",
    answers: [
      "The road was closed, but we found another route because the map helped.",
    ],
    hintTh: "คอมมาก่อน but เท่านั้น — because อยู่ท้ายจึงไม่ต้องใส่",
    explanationThai:
      "ประโยคนี้มีทั้งสองแบบ: but เชื่อมประโยคอิสระ (ใส่คอมมา) ส่วน because อยู่ท้าย (ไม่ใส่)",
    rule: RULES.fanboys,
  },
  {
    id: "cj-11",
    prompt: "Even though the traffic was terrible we arrived on time.",
    answers: ["Even though the traffic was terrible, we arrived on time."],
    hintTh: "“Even though…” ขึ้นต้น → ใส่คอมมาหลังอนุประโยค",
    explanationThai: "Even though ขึ้นต้นประโยค จึงต้องมีคอมมาคั่นก่อนประโยคหลัก",
    rule: RULES.subLeading,
  },
  {
    id: "cj-12",
    prompt: "She felt confident since she had practiced every day.",
    answers: ["She felt confident since she had practiced every day."],
    hintTh: "“since” (แปลว่าเพราะ) อยู่ตรงกลาง → ไม่ต้องใส่คอมมา",
    explanationThai: "เมื่ออนุประโยคอยู่หลังประโยคหลัก ไม่ต้องใส่คอมมา — ประโยคนี้ถูกอยู่แล้ว",
    rule: RULES.subTrailing,
  },
  {
    id: "cj-13",
    prompt: "While he agreed with the plan he still had a few concerns.",
    answers: ["While he agreed with the plan, he still had a few concerns."],
    hintTh: "“While…” ขึ้นต้น → ใส่คอมมาหลังอนุประโยค",
    explanationThai: "While ขึ้นต้นประโยค จึงต้องมีคอมมาคั่นก่อนประโยคหลัก",
    rule: RULES.subLeading,
  },
  {
    id: "cj-14",
    prompt: "After the movie ended we went straight home.",
    answers: ["After the movie ended, we went straight home."],
    hintTh: "“After…” ขึ้นต้น → ใส่คอมมาหลังอนุประโยค",
    explanationThai: "After ขึ้นต้นประโยค จึงต้องมีคอมมาคั่นก่อนประโยคหลัก",
    rule: RULES.subLeading,
  },
  {
    id: "cj-15",
    prompt: "We packed our bags before the taxi arrived.",
    answers: ["We packed our bags before the taxi arrived."],
    hintTh: "“before” อยู่ตรงกลาง → ไม่ต้องใส่คอมมา",
    explanationThai: "เมื่ออนุประโยคอยู่หลังประโยคหลัก ไม่ต้องใส่คอมมา — ประโยคนี้ถูกอยู่แล้ว",
    rule: RULES.subTrailing,
  },
  {
    id: "cj-16",
    prompt: "She woke up early so that she could catch the first train.",
    answers: ["She woke up early so that she could catch the first train."],
    hintTh: "“so that” อยู่ตรงกลาง (บอกจุดประสงค์) → ไม่ต้องใส่คอมมา",
    explanationThai: "so that อยู่หลังประโยคหลักเพื่อบอกจุดประสงค์ ไม่ต้องใส่คอมมา — ประโยคนี้ถูกอยู่แล้ว",
    rule: RULES.subTrailing,
  },
];

/**
 * Rewrite using a transitional word. The prompt states which one to use, so the
 * skill being tested is placement and punctuation, not vocabulary recall.
 */
export const TRANSITION_ITEMS: RewriteItem[] = [
  {
    id: "tr-1",
    prompt: 'ใช้ "However" : The plan looked simple. It failed within a week.',
    answers: ["The plan looked simple. However, it failed within a week."],
    hintTh: "However ขึ้นต้นประโยคใหม่ แล้วตามด้วยคอมมา",
    explanationThai: "คำเชื่อมความขึ้นต้นประโยค ต้องตามด้วยคอมมาเสมอ",
    rule: RULES.transition,
  },
  {
    id: "tr-2",
    prompt: 'ใช้ "On the other hand" : City life is convenient. It is expensive.',
    answers: ["City life is convenient. On the other hand, it is expensive."],
    hintTh: "On the other hand ขึ้นต้นประโยคใหม่ + คอมมา",
    explanationThai: "ใช้แสดงมุมตรงข้าม วางต้นประโยคแล้วใส่คอมมา",
    rule: RULES.transition,
  },
  {
    id: "tr-3",
    prompt: 'ใช้ "Moreover" : The course is affordable. It is taught by experts.',
    answers: ["The course is affordable. Moreover, it is taught by experts."],
    hintTh: "Moreover ใช้เสริมข้อดีเพิ่ม วางต้นประโยค + คอมมา",
    explanationThai: "Moreover เสริมข้อมูลไปในทางเดียวกัน ต้องมีคอมมาตามหลัง",
    rule: RULES.transition,
  },
  {
    id: "tr-4",
    prompt: 'ใช้ "In addition" : The city built a new park. It opened two libraries.',
    answers: ["The city built a new park. In addition, it opened two libraries."],
    hintTh: "In addition วางต้นประโยค + คอมมา",
    explanationThai: "In addition ใช้เพิ่มข้อมูล วางต้นประโยคแล้วใส่คอมมา",
    rule: RULES.transition,
  },
  {
    id: "tr-5",
    prompt: 'ใช้ "In contrast" : Rural areas are quiet. Cities are noisy.',
    answers: ["Rural areas are quiet. In contrast, cities are noisy."],
    hintTh: "In contrast ใช้เปรียบเทียบสิ่งตรงข้าม + คอมมา",
    explanationThai: "In contrast เน้นความต่างชัดเจน วางต้นประโยคแล้วใส่คอมมา",
    rule: RULES.transition,
  },
  {
    id: "tr-6",
    prompt: 'ใช้ "Similarly" : Online classes save time. Recorded lectures do too.',
    answers: ["Online classes save time. Similarly, recorded lectures do too."],
    hintTh: "Similarly ใช้เมื่อสองสิ่งคล้ายกัน + คอมมา",
    explanationThai: "Similarly เชื่อมสองสิ่งที่คล้ายกัน ต้องมีคอมมาตามหลัง",
    rule: RULES.transition,
  },
  {
    id: "tr-7",
    prompt: 'ใช้ "Interestingly" : Few students expected the result. The test scores rose.',
    answers: ["Few students expected the result. Interestingly, the test scores rose."],
    hintTh: "Interestingly ใช้ชี้ว่าน่าสนใจ/เกินคาด + คอมมา",
    explanationThai: "Interestingly วางต้นประโยคเพื่อเน้นความน่าสนใจ แล้วใส่คอมมา",
    rule: RULES.transition,
  },
];

/** Seven run-on sentences to repair. */
export const RUNON_ITEMS: RewriteItem[] = [
  {
    id: "ro-1",
    prompt: "I studied hard I passed the exam.",
    answers: [
      "I studied hard, so I passed the exam.",
      "I studied hard. I passed the exam.",
      "I studied hard; I passed the exam.",
    ],
    hintTh: "สองประโยคชนกัน — แยกด้วยจุด หรือใส่คำเชื่อม",
    explanationThai: "แก้ได้หลายแบบ: ใส่จุด, ใส่ semicolon, หรือเติมคำเชื่อม เช่น so",
    rule: RULES.runon,
  },
  {
    id: "ro-2",
    prompt: "The bus was late I missed my first class.",
    answers: [
      "The bus was late, so I missed my first class.",
      "The bus was late. I missed my first class.",
      "The bus was late; I missed my first class.",
    ],
    hintTh: "ใส่ so หรือแยกเป็นสองประโยค",
    explanationThai: "run-on คือสองประโยคอิสระต่อกันโดยไม่มีเครื่องหมายหรือคำเชื่อม",
    rule: RULES.runon,
  },
  {
    id: "ro-3",
    prompt: "She loves reading she goes to the library every weekend.",
    answers: [
      "She loves reading, so she goes to the library every weekend.",
      "She loves reading. She goes to the library every weekend.",
      "She loves reading; she goes to the library every weekend.",
    ],
    hintTh: "แยกสองใจความออกจากกัน",
    explanationThai: "ทั้งสองส่วนเป็นประโยคสมบูรณ์ (S+V) จึงต้องคั่นให้ชัด",
    rule: RULES.runon,
  },
  {
    id: "ro-4",
    prompt: "The weather turned cold we canceled the trip.",
    answers: [
      "The weather turned cold, so we canceled the trip.",
      "The weather turned cold. We canceled the trip.",
      "The weather turned cold; we canceled the trip.",
    ],
    hintTh: "เหตุ–ผล ใช้ so ได้",
    explanationThai: "ความสัมพันธ์เป็นเหตุผล so จึงเหมาะที่สุด",
    rule: RULES.runon,
  },
  {
    id: "ro-5",
    prompt: "He forgot his password he could not log in.",
    answers: [
      "He forgot his password, so he could not log in.",
      "He forgot his password. He could not log in.",
      "He forgot his password; he could not log in.",
    ],
    hintTh: "ใส่คอมมา + so หรือแยกประโยค",
    explanationThai: "คอมมาอย่างเดียวไม่พอ ต้องมีคำเชื่อมหรือเปลี่ยนเป็นจุด",
    rule: RULES.runon,
  },
  {
    id: "ro-6",
    prompt: "The results were surprising nobody had predicted them.",
    answers: [
      "The results were surprising, and nobody had predicted them.",
      "The results were surprising. Nobody had predicted them.",
      "The results were surprising; nobody had predicted them.",
    ],
    hintTh: "เสริมความ ใช้ and ได้",
    explanationThai: "and เชื่อมสองประโยคอิสระ ต้องมีคอมมานำหน้า",
    rule: RULES.runon,
  },
  {
    id: "ro-7",
    prompt: "We arrived early the doors were still locked.",
    answers: [
      "We arrived early, but the doors were still locked.",
      "We arrived early. The doors were still locked.",
      "We arrived early; the doors were still locked.",
    ],
    hintTh: "ความหมายขัดกัน ใช้ but ได้",
    explanationThai: "but เหมาะเมื่อสองใจความขัดแย้งกัน และต้องมีคอมมานำหน้า",
    rule: RULES.runon,
  },
];


/**
 * which / who / that — commas around a non-defining clause, none around a
 * defining one, and never a comma after "that".
 *
 * Prompts are shown with the mistakes in place; the learner retypes the whole
 * sentence correctly, so subject–verb agreement errors planted alongside the
 * punctuation get fixed too.
 */
export const RELATIVE_ITEMS: RewriteItem[] = [
  {
    id: "rel-1",
    prompt: "My car which I bought last year work fine.",
    answers: ["My car, which I bought last year, works fine."],
    hintTh: "อนุประโยค which เป็นข้อมูลเสริม → ใส่คอมมาคร่อมทั้งสองข้าง และแก้ work → works",
    explanationThai:
      "which ที่ให้ข้อมูลเสริมต้องมีคอมมาคร่อม และประธาน My car เอกพจน์ กริยาจึงเป็น works",
    rule: RULES.relativeNonDefining,
  },
  {
    id: "rel-2",
    prompt: "My sister who lives in Chiang Mai visit us every summer.",
    answers: ["My sister, who lives in Chiang Mai, visits us every summer."],
    hintTh: "who เป็นข้อมูลเสริม → คอมมาคร่อม และแก้ visit → visits",
    explanationThai:
      "My sister ระบุตัวชัดอยู่แล้ว อนุประโยค who จึงเป็นข้อมูลเสริม ต้องมีคอมมาคร่อม",
    rule: RULES.relativeNonDefining,
  },
  {
    id: "rel-3",
    prompt: "I think that, she is good at presenting.",
    answers: ["I think that she is good at presenting."],
    hintTh: "หลัง that ห้ามมีคอมมา",
    explanationThai: "that ที่นำอนุประโยคกรรมไม่ต้องมีคอมมาตามหลังเด็ดขาด",
    rule: RULES.relativeDefining,
  },
  {
    id: "rel-4",
    prompt: "The book that, I borrowed from the library were very useful.",
    answers: ["The book that I borrowed from the library was very useful."],
    hintTh: "ตัดคอมมาหลัง that และแก้ were → was",
    explanationThai:
      "that เป็นอนุประโยคจำกัดความ ไม่ใช้คอมมา และ The book เอกพจน์ จึงใช้ was",
    rule: RULES.relativeDefining,
  },
  {
    id: "rel-5",
    prompt: "Bangkok which is the capital of Thailand have many temples.",
    answers: ["Bangkok, which is the capital of Thailand, has many temples."],
    hintTh: "ชื่อเฉพาะ → อนุประโยคเป็นข้อมูลเสริม ใส่คอมมาคร่อม และแก้ have → has",
    explanationThai:
      "ชื่อเฉพาะระบุตัวชัดอยู่แล้ว อนุประโยคจึงเป็นข้อมูลเสริม ต้องมีคอมมาคร่อม",
    rule: RULES.relativeNonDefining,
  },
  {
    id: "rel-6",
    prompt: "The student who answer the question correctly receive a prize.",
    answers: ["The student who answers the question correctly receives a prize."],
    hintTh: "who จำกัดความ → ไม่ใส่คอมมา และแก้กริยาทั้งสองตัวให้เติม -s",
    explanationThai:
      "อนุประโยคนี้ระบุว่า “นักเรียนคนไหน” จึงไม่ใช้คอมมา และประธานเอกพจน์ กริยาต้องเติม -s",
    rule: RULES.relativeDefining,
  },
  {
    id: "rel-7",
    prompt: "She said that, the report which was submitted late need revision.",
    answers: [
      "She said that the report which was submitted late needs revision.",
      "She said that the report, which was submitted late, needs revision.",
    ],
    hintTh: "ตัดคอมมาหลัง that และแก้ need → needs",
    explanationThai:
      "หลัง that ไม่มีคอมมา ส่วน which จะใส่คอมมาคร่อมหรือไม่ก็ได้ตามความหมาย แต่ needs ต้องเติม -s",
    rule: RULES.relativeDefining,
  },
  {
    id: "rel-8",
    prompt: "The cafe where we usually studies is closed today.",
    answers: ["The cafe where we usually study is closed today."],
    hintTh: "where ระบุ “ร้านไหน” (defining) → ไม่ใส่คอมมา และแก้ studies → study",
    explanationThai:
      "where ขยาย the cafe แบบจำกัดความ จึงไม่ใส่คอมมา และประธาน we ใช้กับ study ไม่เติม -s",
    rule: RULES.relativeWhere,
  },
  {
    id: "rel-9",
    prompt: "Chiang Mai where my parents live have cooler weather.",
    answers: ["Chiang Mai, where my parents live, has cooler weather."],
    hintTh: "ชื่อเฉพาะ → where เป็นข้อมูลเสริม ใส่คอมมาคร่อม และแก้ have → has",
    explanationThai:
      "ชื่อเฉพาะระบุตัวชัดอยู่แล้ว อนุประโยค where จึงเป็นข้อมูลเสริม ต้องมีคอมมาคร่อม และ Chiang Mai เอกพจน์ ใช้ has",
    rule: RULES.relativeWhere,
  },
  {
    id: "rel-10",
    prompt: "เปลี่ยนเป็น V-ing แทน which : I just finished my homework, which meant I can play now.",
    answers: ["I just finished my homework, meaning I can play now."],
    hintTh: "ตัด which ออก แล้วเปลี่ยน meant → meaning",
    explanationThai: "which ที่อ้างถึงทั้งประโยคก่อนหน้าย่อเป็น V-ing ได้ ความหมายเหมือนเดิม",
    rule: RULES.participialReduction,
  },
  {
    id: "rel-11",
    prompt: "เปลี่ยนเป็น V-ing แทน which : The cat caught a mouse, which startled everyone in the room.",
    answers: [
      "The cat caught a mouse, startling everyone in the room.",
      "The cat caught a mouse, shocking everyone in the room.",
    ],
    hintTh: "ตัด which ออก แล้วเปลี่ยน startled → startling",
    explanationThai: "which ที่อ้างถึงทั้งประโยคก่อนหน้าย่อเป็น V-ing ได้ ความหมายเหมือนเดิม",
    rule: RULES.participialReduction,
  },
  {
    id: "rel-12",
    prompt: "เปลี่ยนเป็น V-ing แทน which : She baked a delicious cake, which impressed all of her guests.",
    answers: ["She baked a delicious cake, impressing all of her guests."],
    hintTh: "ตัด which ออก แล้วเปลี่ยน impressed → impressing",
    explanationThai: "which ที่อ้างถึงทั้งประโยคก่อนหน้าย่อเป็น V-ing ได้ ความหมายเหมือนเดิม",
    rule: RULES.participialReduction,
  },
  {
    id: "rel-14",
    prompt: "เปลี่ยนเป็น V-ing แทน which : He fixed the broken car, which saved us from being stranded on the road.",
    answers: ["He fixed the broken car, saving us from being stranded on the road."],
    hintTh: "ตัด which ออก แล้วเปลี่ยน saved → saving",
    explanationThai: "which ที่อ้างถึงทั้งประโยคก่อนหน้าย่อเป็น V-ing ได้ ความหมายเหมือนเดิม",
    rule: RULES.participialReduction,
  },
  {
    id: "rel-13",
    prompt: "เปลี่ยนเป็น V-ing แทน which : They won the championship, which brought immense joy to their fans.",
    answers: ["They won the championship, bringing immense joy to their fans."],
    hintTh: "ตัด which ออก แล้วเปลี่ยน brought → bringing",
    explanationThai: "which ที่อ้างถึงทั้งประโยคก่อนหน้าย่อเป็น V-ing ได้ ความหมายเหมือนเดิม",
    rule: RULES.participialReduction,
  },
];


// ---------------------------------------------------------------------------
// The rest of the "Grammar Basics สำหรับอธิบายรูป + คน" handout, page by page.
//
// Everything below is authored from that PDF specifically: its six tenses, its
// present-simple examples, its simple-vs-complex conversions, and its two
// picture-description practice patterns. Sentences are the handout's own
// wherever it supplies one.
// ---------------------------------------------------------------------------

/** Page 1 — "Tense ที่ต้องรู้": the six tenses the handout lists, nothing else. */
export const TENSE_ITEMS: RewriteItem[] = [
  {
    id: "tn-1",
    prompt: "เปลี่ยนเป็น Present Simple : She (visit) her grandmother every Sunday.",
    answers: ["She visits her grandmother every Sunday."],
    hintTh: "Present Simple = S + V.1 (ประธานเอกพจน์เติม -s)",
    explanationThai: "She เป็นเอกพจน์ กริยาจึงเป็น visits",
    rule: RULES.tenses,
  },
  {
    id: "tn-2",
    prompt: "เปลี่ยนเป็น Present Continuous : The woman (paint) her wall right now.",
    answers: ["The woman is painting her wall right now."],
    hintTh: "Present Continuous = S + is/am/are + V-ing",
    explanationThai: "กำลังเกิดขึ้นตอนนี้ ใช้ is + painting — เป็น tense ที่ใช้บรรยายภาพบ่อยที่สุด",
    rule: RULES.tenses,
  },
  {
    id: "tn-3",
    prompt: "เปลี่ยนเป็น Present Perfect : I (finish) my homework already.",
    answers: ["I have finished my homework already."],
    hintTh: "Present Perfect = S + have/has + V.3",
    explanationThai: "I ใช้ have + finished (V.3)",
    rule: RULES.tenses,
  },
  {
    id: "tn-4",
    prompt: "เปลี่ยนเป็น Present Perfect : He (live) in Bangkok for ten years.",
    answers: ["He has lived in Bangkok for ten years."],
    hintTh: "ประธานเอกพจน์ใช้ has + V.3",
    explanationThai: "He เป็นเอกพจน์ จึงใช้ has lived",
    rule: RULES.tenses,
  },
  {
    id: "tn-5",
    prompt: "เปลี่ยนเป็น Past Simple : They (travel) to Japan last winter.",
    answers: ["They travelled to Japan last winter.", "They traveled to Japan last winter."],
    hintTh: "Past Simple = S + V.2",
    explanationThai: "last winter เป็นอดีตจบแล้ว ใช้ V.2 (travelled หรือ traveled ก็ได้)",
    rule: RULES.tenses,
  },
  {
    id: "tn-6",
    prompt: "ใช้ used to : I biked to school every day when I was 7.",
    answers: ["I used to bike to school every day when I was 7."],
    hintTh: "used to + V.1 = เคยทำ แต่ตอนนี้ไม่ทำแล้ว",
    explanationThai: "หลัง used to ต้องเป็นกริยาช่องที่ 1 เสมอ (bike ไม่ใช่ biked)",
    rule: RULES.tenses,
  },
  {
    id: "tn-7",
    prompt: "เปลี่ยนเป็น Future Simple : We (announce) the results tomorrow.",
    answers: ["We will announce the results tomorrow."],
    hintTh: "Future Simple = S + will + V.inf",
    explanationThai: "หลัง will ใช้กริยารูปเดิมเสมอ ไม่เติมอะไร",
    rule: RULES.tenses,
  },
  {
    id: "tn-8",
    prompt: "เปลี่ยนเป็น Present Continuous : An old man and a baby (make) snacks together.",
    answers: ["An old man and a baby are making snacks together."],
    hintTh: "ประธานพหูพจน์ใช้ are + V-ing",
    explanationThai: "ประธานสองคนรวมกันเป็นพหูพจน์ จึงใช้ are making",
    rule: RULES.tenses,
  },
];

/** Page 2 — "PRESENT SIMPLE": the handout's own four sentences, plus the same trap. */
export const PRESENT_SIMPLE_ITEMS: RewriteItem[] = [
  {
    id: "ps-1",
    prompt: "I normally gets up at 10.",
    answers: ["I normally get up at 10."],
    hintTh: "I + V.1 (ไม่เติม -s)",
    explanationThai: "I เป็นประธานที่ไม่เติม -s ที่กริยา จึงใช้ get",
    rule: RULES.presentAgreement,
  },
  {
    id: "ps-2",
    prompt: "He usually visit the doctor twice a year.",
    answers: ["He usually visits the doctor twice a year."],
    hintTh: "He + V.1 เติม -s",
    explanationThai: "He เป็นเอกพจน์ กริยาต้องเติม -s → visits",
    rule: RULES.presentAgreement,
  },
  {
    id: "ps-3",
    prompt: "It barely rain in Canada.",
    answers: ["It barely rains in Canada."],
    hintTh: "It + V.1 เติม -s",
    explanationThai: "It เป็นเอกพจน์ กริยาต้องเติม -s → rains",
    rule: RULES.presentAgreement,
  },
  {
    id: "ps-4",
    prompt: "Thailand welcome millions of tourists annually.",
    answers: ["Thailand welcomes millions of tourists annually."],
    hintTh: "ชื่อประเทศ = เอกพจน์ → เติม -s",
    explanationThai: "Thailand เป็นชื่อเฉพาะเอกพจน์ กริยาจึงเป็น welcomes",
    rule: RULES.presentAgreement,
  },
  {
    id: "ps-5",
    prompt: "They watches a movie every Friday.",
    answers: ["They watch a movie every Friday."],
    hintTh: "They + V.1 (ไม่เติม -s)",
    explanationThai: "They เป็นพหูพจน์ กริยาไม่เติม -s → watch",
    rule: RULES.presentAgreement,
  },
  {
    id: "ps-6",
    prompt: "The woman in pink look very strong.",
    answers: ["The woman in pink looks very strong."],
    hintTh: "ประธานคือ The woman (เอกพจน์) → เติม -s",
    explanationThai: "อย่าให้ in pink หลอกตา ประธานจริงคือ The woman จึงใช้ looks",
    rule: RULES.presentAgreement,
  },
  {
    id: "ps-7",
    prompt: "My friends enjoys cooking together.",
    answers: ["My friends enjoy cooking together."],
    hintTh: "My friends = พหูพจน์ → ไม่เติม -s",
    explanationThai: "friends เป็นพหูพจน์ กริยาจึงเป็น enjoy",
    rule: RULES.presentAgreement,
  },
  {
    id: "ps-8",
    prompt: "She go to the gym after work.",
    answers: ["She goes to the gym after work."],
    hintTh: "She + go → goes (เติม -es)",
    explanationThai: "กริยาที่ลงท้ายด้วย -o เติม -es → goes",
    rule: RULES.presentAgreement,
  },
];

/** Page 3–4 — "วิธีแยก Simple กับ Complex" and FANBOYS, using the handout's sentences. */
export const COMPLEX_ITEMS: RewriteItem[] = [
  {
    id: "cx-1",
    prompt: "รวมเป็นประโยคเดียว : I missed you. So, I called you.",
    answers: ["I missed you, so I called you."],
    hintTh: "S+V, so S+V. — ย้าย so มากลางประโยคแล้วใส่คอมมาข้างหน้า",
    explanationThai: "สองประโยคสั้นรวมเป็น complex ได้ด้วยคอมมา + so",
    rule: RULES.simpleVsComplex,
  },
  {
    id: "cx-2",
    prompt: "รวมเป็นประโยคเดียว : I woke up late. But I still went to school.",
    answers: ["I woke up late, but I still went to school."],
    hintTh: "S+V, but S+V.",
    explanationThai: "but เชื่อมสองประโยคอิสระ ต้องมีคอมมานำหน้า",
    rule: RULES.simpleVsComplex,
  },
  {
    id: "cx-3",
    prompt: "รวมเป็นประโยคเดียว : I bought you a gift. For you have done much for me.",
    answers: ["I bought you a gift, for you have done much for me."],
    hintTh: "for = เพราะว่า — S+V, for S+V.",
    explanationThai: "for ใน FANBOYS แปลว่า “เพราะว่า” และต้องมีคอมมานำหน้า",
    rule: RULES.simpleVsComplex,
  },
  {
    id: "cx-4",
    prompt: "รวมด้วย but : I wanted to go to the beach. It started raining heavily.",
    answers: ["I wanted to go to the beach, but it started raining heavily."],
    hintTh: "ความหมายขัดกัน → but",
    explanationThai: "สองใจความขัดแย้งกัน ใช้ but พร้อมคอมมานำหน้า",
    rule: RULES.simpleVsComplex,
  },
  {
    id: "cx-5",
    prompt: "รวมด้วย yet : She worked hard for the exam. She didn't achieve the desired results.",
    answers: ["She worked hard for the exam, yet she didn't achieve the desired results."],
    hintTh: "yet = but (แต่ทว่า)",
    explanationThai: "yet ทำหน้าที่เหมือน but และต้องมีคอมมานำหน้าเช่นกัน",
    rule: RULES.simpleVsComplex,
  },
  {
    id: "cx-6",
    prompt: "รวมด้วย or : We can go shopping now. We can wait until the weekend.",
    answers: ["We can go shopping now, or we can wait until the weekend."],
    hintTh: "ให้เลือกอย่างใดอย่างหนึ่ง → or",
    explanationThai: "or เสนอทางเลือก และต้องมีคอมมานำหน้าเมื่อเชื่อมสองประโยคอิสระ",
    rule: RULES.simpleVsComplex,
  },
  {
    id: "cx-7",
    prompt: "รวมด้วย for : He loves playing soccer. It allows him to stay active.",
    answers: ["He loves playing soccer, for it allows him to stay active."],
    hintTh: "บอกเหตุผล → for",
    explanationThai: "for บอกเหตุผลของประโยคแรก และต้องมีคอมมานำหน้า",
    rule: RULES.simpleVsComplex,
  },
];

/** Pages 9–19 — the handout's PRACTICE: Pattern 1 (people) and Pattern 2 (places). */
export const PATTERN_ITEMS: RewriteItem[] = [
  {
    id: "pt-1",
    photoId: "8bd7c8ae-a9d5-4c8a-9a4d-3c5cb7636205",
    prompt: "Pattern 1 ประโยคที่ 1 — ในภาพมีผู้หญิงคนหนึ่งกำลังวิ่งจ๊อกกิ้ง (ใช้ depicts + who)",
    answers: [
      "This picture depicts a woman who is jogging.",
      "This picture depicts a woman who is jogging in a park.",
      "This picture depicts a woman who is running.",
    ],
    hintTh: "This picture depicts ___ who ___.",
    explanationThai: "ใช้ who ต่อทันทีเพื่อให้ประโยคแรกเป็น complex sentence",
    rule: RULES.picturePattern,
  },
  {
    id: "pt-2",
    photoId: "8bd7c8ae-a9d5-4c8a-9a4d-3c5cb7636205",
    prompt: "Pattern 1 ประโยคที่ 2 — เดาจากชุดที่ใส่ ว่าน่าจะเป็นนักกีฬาอาชีพ",
    answers: [
      "Judging from what she wears, she is probably a professional athlete.",
      "Judging from what she is wearing, she is probably a professional athlete.",
    ],
    hintTh: "Judging from ___, she is probably ___.",
    explanationThai: "ขึ้นด้วย Judging from เพื่อเดาบริบท แล้วตามด้วยคอมมา",
    rule: RULES.picturePattern,
  },
  {
    id: "pt-3",
    photoId: "8bd7c8ae-a9d5-4c8a-9a4d-3c5cb7636205",
    prompt: "Pattern 1 ประโยคที่ 3 — ถึงแม้ผู้หญิงชุดชมพูจะดูเหนื่อย แต่เธอดูแข็งแรงมาก",
    answers: [
      "Finally, even though the woman in pink looks tired, she looks very strong.",
    ],
    hintTh: "Finally, even though ___, ___.",
    explanationThai: "ปิดท้ายด้วย Finally + even though เพื่อใส่มุมขัดแย้ง — ได้ทั้ง coherence และ complex sentence",
    rule: RULES.picturePattern,
  },
  {
    id: "pt-4",
    photoId: "75ae8075-2a07-4c38-92d7-7fa88b0fed4a",
    prompt: "Pattern 2 ประโยคที่ 1 — ในภาพเป็นทะเลสาบสวยงามที่มีภูเขาล้อมรอบ (ใช้ surrounded by)",
    answers: ["This picture depicts a scenic lake surrounded by mountains."],
    hintTh: "This picture depicts ___ surrounded by ___.",
    explanationThai: "surrounded by เป็นคำหลักของ Pattern 2 ใช้บอกสิ่งที่อยู่ล้อมรอบ",
    rule: RULES.picturePattern,
  },
  {
    id: "pt-5",
    photoId: "75ae8075-2a07-4c38-92d7-7fa88b0fed4a",
    prompt: "Pattern 2 ประโยคที่ 2 — เดาจากฉากหลังว่าน่าจะอยู่ในประเทศแถบยุโรป",
    answers: ["Judging from the background, this lake may be located in a country in Europe."],
    hintTh: "Judging from ___, this ___ may be located in ___.",
    explanationThai: "ใช้ may be located in เพื่อเดาแบบไม่ฟันธง ปลอดภัยกว่าการทายผิด",
    rule: RULES.picturePattern,
  },
  {
    id: "pt-6",
    photoId: "75ae8075-2a07-4c38-92d7-7fa88b0fed4a",
    prompt: "Pattern 2 ประโยคที่ 3 — ถึงแม้อากาศจะดูหนาว แต่เชื่อว่าน่าจะเป็นแหล่งท่องเที่ยวยอดนิยม",
    answers: [
      "Finally, even though the weather looks cold, I believe it must be a popular tourist destination.",
    ],
    hintTh: "Finally, even though ___, I believe it must be ___.",
    explanationThai: "ปิดท้ายเหมือน Pattern 1 — โครงเดียวกันใช้ได้ทั้งคนและสถานที่",
    rule: RULES.picturePattern,
  },
];

/**
 * Loose text match: case, surrounding space and straight/curly quotes are
 * ignored, but commas, semicolons and full stops are NOT — they are the thing
 * being taught.
 */
export function normaliseRewrite(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+([,.;])/g, "$1")
    .toLowerCase();
}

export function rewriteIsCorrect(item: RewriteItem, typed: string): boolean {
  const got = normaliseRewrite(typed);
  return item.answers.some((a) => normaliseRewrite(a) === got);
}

/**
 * Which bank each curriculum exercise runs.
 *
 * The conjunction and relative arrays each cover two different handout pages,
 * so they are split by the rule the item actually drills rather than duplicated
 * — adding an item to either array files it automatically.
 */
export const REWRITE_BANKS: Record<string, RewriteItem[]> = {
  "gr-tenses": TENSE_ITEMS,
  "gr-present": PRESENT_SIMPLE_ITEMS,
  "gr-complex": [
    ...COMPLEX_ITEMS,
    ...CONJUNCTION_ITEMS.filter((i) => i.rule === RULES.fanboys),
  ],
  "gr-sub": CONJUNCTION_ITEMS.filter(
    (i) => i.rule === RULES.subLeading || i.rule === RULES.subTrailing,
  ),
  "gr-relative": RELATIVE_ITEMS.filter((i) => i.rule !== RULES.participialReduction),
  "gr-reduction": RELATIVE_ITEMS.filter((i) => i.rule === RULES.participialReduction),
  "wp-pattern": PATTERN_ITEMS,

  // Not taught in this handout — kept authored for reuse elsewhere, but no
  // longer scheduled by the grammar-foundation block.
  "gr-transition": TRANSITION_ITEMS,
  "gr-runon": RUNON_ITEMS,
};
