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

export const REWRITE_BANKS: Record<string, RewriteItem[]> = {
  "gr-conj": CONJUNCTION_ITEMS,
  "gr-transition": TRANSITION_ITEMS,
  "gr-runon": RUNON_ITEMS,
  "gr-relative": RELATIVE_ITEMS,
};
