/**
 * "Write 50 words" guided builder — content straight from the course lectures
 * WRITE_50_WORD / OPINION_ESSAY / Descriptive_essay (chapter "Write 50 words
 * (short essays)").
 *
 * The lectures teach exactly three question types, each with its own fixed
 * sentence skeleton and its own vocabulary group. This file is those lectures as
 * data: the same three skeletons, the same word lists (Thai glosses included,
 * as printed on the handouts), and one ~100-word model answer per type taken
 * from the lecture's own worked example.
 *
 * Used by WriteTopicBuilder (the guided rebuild drill) and by
 * EssayPatternPicker (the dropdown above the typing box on the un-guided real
 * writes), so the drill and the exam help can never drift apart.
 */

export type EssayTypeKey = "reasons" | "opinion" | "descriptive";

export type PatternStep = { en: string; th: string };

export type EssayPattern = {
  key: EssayTypeKey;
  label: string;
  labelTh: string;
  /** How the exam phrases this type, so the learner can recognise it. */
  cueTh: string;
  steps: PatternStep[];
  /** Grammar shapes the lecture calls out for this type. */
  grammarTh: string[];
};

export const ESSAY_PATTERNS: EssayPattern[] = [
  {
    key: "reasons",
    label: "1 · What are…? / Why…?",
    labelTh: "ถามเหตุผล / ข้อดี–ข้อเสีย",
    cueTh: "โจทย์ขึ้นต้นว่า What are the reasons / benefits / advantages…?",
    steps: [
      { en: "[Topic] has become increasingly popular, and there are several reasons why ______.", th: "เกริ่นว่าเรื่องนี้กำลังเป็นที่นิยม แล้วบอกว่ามีหลายเหตุผล" },
      { en: "Firstly, ______, especially ______.", th: "เหตุผลที่ 1 + ขยายด้วย especially" },
      { en: "With ______, they can ______.", th: "ขยายเหตุผลที่ 1 ด้วยโครง With…, they can…" },
      { en: "Secondly, ______, such as ______.", th: "เหตุผลที่ 2 + ยกตัวอย่างด้วย such as" },
      { en: "Lastly, ______, providing ______.", th: "เหตุผลที่ 3 แล้วปิดด้วยผลที่ได้" },
    ],
    grammarTh: [
      "……, especially ……",
      "With ……, they can ……",
      "……, such as ……",
      "providing / resulting in + noun",
    ],
  },
  {
    key: "opinion",
    label: "2 · Opinion",
    labelTh: "ถามความเห็น เห็นด้วย/ไม่เห็นด้วย",
    cueTh: "โจทย์ขึ้นต้นว่า Do you agree or disagree…? / In your opinion…? / Which is better…?",
    steps: [
      { en: "In my opinion, ______.", th: "บอกจุดยืนทันทีในประโยคแรก" },
      { en: "In fact, ______ can be beneficial for ______, from ______ to ______.", th: "ขยายว่าดี/เสียกับใคร ใช้ from…to… ให้เห็นขอบเขต" },
      { en: "For example, ______, such as ______.", th: "ยกตัวอย่างรูปธรรม" },
      { en: "While it might be true that some people may believe that ______, this does not mean that ______.", th: "ยอมรับมุมตรงข้าม แล้วตีกลับ" },
      { en: "Ultimately, it is up to each ______ to ______.", th: "ปิดท้ายด้วยการโยนกลับให้ผู้อ่านตัดสิน" },
    ],
    grammarTh: [
      "does not necessarily + V.1",
      "In fact, …… → ใช้ขยายความ",
      "While ……, this does not mean that ……",
      "it is up to each individual / school / government to ……",
      "in order to / in order that S+V",
    ],
  },
  {
    key: "descriptive",
    label: "3 · Descriptive",
    labelTh: "ให้บรรยาย คน/สถานที่/สิ่งของ/เหตุการณ์",
    cueTh: "โจทย์ขึ้นต้นว่า Describe… / Write a description of…",
    steps: [
      { en: "A [place / person / object / event] that is meaningful to me is ______.", th: "บอกว่าสิ่งนั้นคืออะไร" },
      { en: "It is located / situated ______. / He is ______, ______, and ______.", th: "บรรยายรายละเอียด" },
      { en: "What makes it special is ______.", th: "บอกว่าทำไมถึงพิเศษ" },
      { en: "This place evokes a sense of ______.", th: "บอกความรู้สึกที่มันปลุกขึ้นมา" },
      { en: "Whenever I ______, I feel a sense of ______ and gratitude for ______.", th: "ปิดท้ายด้วยความรู้สึกส่วนตัว" },
    ],
    grammarTh: [
      "used to + V.1 (= เคย)",
      "is located / situated ……",
      "evoke a sense of …… / feel a sense of ……",
      "grateful for (adj.) → gratitude for (n.)",
      "teach the value of + V-ing / noun",
    ],
  },
];

export function essayPattern(key: EssayTypeKey): EssayPattern {
  return ESSAY_PATTERNS.find((p) => p.key === key) ?? ESSAY_PATTERNS[0]!;
}

/** What the lecture says is being marked. */
export const ESSAY_CRITERIA_TH = ["Vocab", "Grammar", "Relevance", "Length"];

// ---------------------------------------------------------------------------
// Vocabulary groups, exactly as printed on the handouts (Thai glosses included)
// ---------------------------------------------------------------------------

export type Word = { w: string; th: string };
export type VocabBank = { key: string; icon: string; label: string; sub: string; words: Word[] };

export const WRITE_VOCAB_BANKS: VocabBank[] = [
  {
    key: "people",
    icon: "👤",
    label: "บรรยายคน",
    sub: "People",
    words: [
      { w: "ambitious", th: "ทะเยอทะยาน" }, { w: "assertive", th: "มั่นใจในตนเอง" },
      { w: "compassionate", th: "เห็นแก่ผู้อื่น" }, { w: "charismatic", th: "มีเสน่ห์" },
      { w: "creative", th: "สร้างสรรค์" }, { w: "diligent", th: "ขยันหมั่นเพียร" },
      { w: "empathetic", th: "เห็นใจผู้อื่น" }, { w: "enthusiastic", th: "กระตือรือร้น" },
      { w: "humble", th: "ถ่อมตน" }, { w: "intelligent", th: "ฉลาด" },
      { w: "optimistic", th: "มองโลกในแง่ดี" }, { w: "patient", th: "อดทน" },
      { w: "resourceful", th: "แก้ปัญหาเก่ง" }, { w: "supportive", th: "คอยสนับสนุน" },
      { w: "trustworthy", th: "เชื่อถือได้" }, { w: "wise", th: "มีปัญญา" },
    ],
  },
  {
    key: "food",
    icon: "🍜",
    label: "บรรยายอาหาร",
    sub: "Food",
    words: [
      { w: "aromatic", th: "หอมกรุ่น" }, { w: "creamy", th: "เนียนนุ่ม" },
      { w: "crispy", th: "กรอบ" }, { w: "flavorful", th: "รสชาติจัดจ้าน" },
      { w: "fresh", th: "สด" }, { w: "savory", th: "รสเค็มกลมกล่อม" },
      { w: "spicy", th: "เผ็ด" }, { w: "sweet", th: "หวาน" },
      { w: "tender", th: "นุ่ม" }, { w: "unique", th: "ไม่เหมือนใคร" },
      { w: "zesty", th: "สดชื่นซ่า" },
    ],
  },
  {
    key: "objects",
    icon: "📦",
    label: "บรรยายสิ่งของ",
    sub: "Objects",
    words: [
      { w: "antique", th: "โบราณ" }, { w: "compact", th: "ขนาดกะทัดรัด" },
      { w: "durable", th: "ทนทาน" }, { w: "elegant", th: "สง่างาม" },
      { w: "portable", th: "พกพาได้" }, { w: "practical", th: "ใช้งานได้จริง" },
      { w: "spacious", th: "กว้างขวาง" }, { w: "sturdy", th: "แข็งแรง" },
      { w: "stylish", th: "มีสไตล์" }, { w: "versatile", th: "ใช้ได้หลายอย่าง" },
    ],
  },
  {
    key: "techedu",
    icon: "💻",
    label: "เทคโนโลยี / การศึกษา",
    sub: "Technology & Education",
    words: [
      { w: "technological advancement", th: "ความก้าวหน้าทางเทคโนโลยี" },
      { w: "prevalence", th: "ความแพร่หลาย" },
      { w: "tertiary / higher education", th: "การศึกษาระดับอุดมศึกษา" },
      { w: "greater flexibility", th: "ยืดหยุ่นมากขึ้น" },
      { w: "beneficial for", th: "เป็นประโยชน์ต่อ" },
      { w: "cost-effective", th: "คุ้มค่าเงิน" },
      { w: "attend classes", th: "เข้าเรียน" },
      { w: "access information", th: "เข้าถึงข้อมูล" },
      { w: "mental stimulation", th: "การกระตุ้นสมอง" },
      { w: "sense of accomplishment", th: "ความรู้สึกภูมิใจที่ทำสำเร็จ" },
    ],
  },
  {
    key: "society",
    icon: "🏛️",
    label: "สังคม",
    sub: "Society",
    words: [
      { w: "foster social diversity", th: "ส่งเสริมความหลากหลายในสังคม" },
      { w: "social / gender inclusivity", th: "การโอบรับทุกเพศทุกกลุ่ม" },
      { w: "solve inequality", th: "แก้ปัญหาความเหลื่อมล้ำ" },
      { w: "livable community", th: "ชุมชนที่น่าอยู่" },
      { w: "social values", th: "ค่านิยมทางสังคม" },
      { w: "preserve the identity", th: "รักษาอัตลักษณ์" },
      { w: "increase social justice", th: "เพิ่มความยุติธรรมในสังคม" },
      { w: "create social change", th: "สร้างความเปลี่ยนแปลงทางสังคม" },
      { w: "detrimental consequences", th: "ผลเสีย" },
      { w: "in this day and age", th: "ในยุคสมัยนี้" },
    ],
  },
  {
    key: "globalisation",
    icon: "🌍",
    label: "โลกาภิวัตน์",
    sub: "Globalisation",
    words: [
      { w: "interconnectedness", th: "ความเชื่อมโยงถึงกัน" },
      { w: "international trade", th: "การค้าระหว่างประเทศ" },
      { w: "cultural exchange", th: "การแลกเปลี่ยนวัฒนธรรม" },
      { w: "multinational corporations", th: "บรรษัทข้ามชาติ" },
      { w: "immigration", th: "การย้ายถิ่นฐาน" },
      { w: "economic inequality", th: "ความเหลื่อมล้ำทางเศรษฐกิจ" },
      { w: "technological innovation", th: "นวัตกรรมทางเทคโนโลยี" },
      { w: "political cooperation", th: "ความร่วมมือทางการเมือง" },
      { w: "homogenization of cultures", th: "การกลืนกลายทางวัฒนธรรม" },
    ],
  },
];

/**
 * Which word groups the lecture pairs with each question type — the handouts
 * print the vocabulary next to the pattern it belongs with, so the dropdown
 * above the typing box shows the same pairing rather than all six banks at once.
 */
const BANKS_FOR_TYPE: Record<EssayTypeKey, string[]> = {
  reasons: ["techedu", "society"],
  opinion: ["society", "globalisation", "techedu"],
  descriptive: ["people", "objects", "food"],
};

export function vocabBanksForType(key: EssayTypeKey): VocabBank[] {
  const want = BANKS_FOR_TYPE[key];
  return want
    .map((k) => WRITE_VOCAB_BANKS.find((b) => b.key === k))
    .filter((b): b is VocabBank => Boolean(b));
}

// ---------------------------------------------------------------------------
// The three guided rebuild items — one per essay type
// ---------------------------------------------------------------------------

export type WriteTopicItem = {
  id: string;
  type: EssayTypeKey;
  /** The prompt, as the lecture words it. */
  topic: string;
  topicTh: string;
  /** ~100-word model answer from the lecture's own worked example. */
  essay: string;
  /** Full Thai translation — shown once the rebuild hits 100%. */
  essayTh: string;
  /** Sentence-by-sentence mapping onto this type's skeleton. */
  moves: { label: string; en: string }[];
  /** Pick-the-right-form gaps: phrase in the essay → correct form + wrong forms. */
  choices?: { phrase: string; options: string[] }[];
};

export const WRITE_TOPIC_ITEMS: WriteTopicItem[] = [
  {
    id: "wt-1",
    choices: [
      { phrase: "should learn", options: ["should learn", "should learns", "should learned"] },
      { phrase: "can help", options: ["can help", "can helps", "can helped"] },
      { phrase: "resources", options: ["resource", "resources"] },
      { phrase: "providing", options: ["provide", "provides", "providing"] },
    ],
    type: "reasons",
    topic: "What are the reasons why old people should learn how to use technology?",
    topicTh: "ทำไมผู้สูงอายุถึงควรเรียนรู้การใช้เทคโนโลยี",
    essay:
      "Older people should learn how to use technology for several reasons. Firstly, it can help them stay connected with loved ones, especially during times of isolation. With video calling and messaging apps, they can communicate with family and friends from the comfort of their own homes. Secondly, technology can help older people access important information and resources, such as online banking, health services, and news. This can help them to be more independent and informed. Lastly, learning to use technology can be a fun and engaging activity, providing mental stimulation and a sense of accomplishment.",
    essayTh:
      "ผู้สูงอายุควรเรียนรู้การใช้เทคโนโลยีด้วยเหตุผลหลายประการ ประการแรก มันช่วยให้พวกเขาติดต่อกับคนที่รักได้ โดยเฉพาะในช่วงที่ต้องอยู่ห่างกัน ด้วยแอปวิดีโอคอลและแชท พวกเขาสามารถคุยกับครอบครัวและเพื่อนได้จากที่บ้านอย่างสบายใจ ประการที่สอง เทคโนโลยีช่วยให้ผู้สูงอายุเข้าถึงข้อมูลและบริการสำคัญ เช่น ธนาคารออนไลน์ บริการสุขภาพ และข่าวสาร ซึ่งช่วยให้พวกเขาพึ่งพาตัวเองได้มากขึ้นและรู้ทันข่าว ประการสุดท้าย การเรียนรู้เทคโนโลยียังเป็นกิจกรรมที่สนุกและน่าสนใจ ช่วยกระตุ้นสมองและให้ความรู้สึกภูมิใจที่ทำสำเร็จ",
    moves: [
      { label: "เกริ่น + บอกว่ามีหลายเหตุผล", en: "Older people should learn how to use technology for several reasons." },
      { label: "เหตุผลที่ 1 + especially", en: "Firstly, it can help them stay connected with loved ones, especially during times of isolation." },
      { label: "ขยายด้วย With…, they can…", en: "With video calling and messaging apps, they can communicate with family and friends from the comfort of their own homes." },
      { label: "เหตุผลที่ 2 + such as", en: "Secondly, technology can help older people access important information and resources, such as online banking, health services, and news." },
      { label: "เหตุผลที่ 3 + ผลที่ได้", en: "Lastly, learning to use technology can be a fun and engaging activity, providing mental stimulation and a sense of accomplishment." },
    ],
  },
  {
    id: "wt-2",
    choices: [
      { phrase: "does not necessarily lead", options: ["does not necessarily lead", "do not necessarily lead", "does not necessarily leads"] },
      { phrase: "platforms", options: ["platform", "platforms"] },
      { phrase: "can use", options: ["can use", "can uses", "can used"] },
      { phrase: "may believe", options: ["may believe", "may believes", "may believed"] },
    ],
    type: "opinion",
    topic:
      "Some people think that social media has a negative impact on our relationships with others. Do you agree or disagree?",
    topicTh: "บางคนคิดว่าโซเชียลมีเดียส่งผลเสียต่อความสัมพันธ์ คุณเห็นด้วยหรือไม่",
    essay:
      "In my opinion, social media does not necessarily lead to detrimental consequences for people in this day and age. In fact, social media platforms can be beneficial for everyone, from students to professional workers. For example, students can use platforms, such as Facebook, to attend online classes, and marketers can use these tools to study market trends. While it might be true that some people may believe that social media can bring about negative effects, especially on mental health, this does not mean that individuals should not use these tools for their own benefit.",
    essayTh:
      "ในความเห็นของฉัน โซเชียลมีเดียไม่ได้นำไปสู่ผลเสียเสมอไปสำหรับผู้คนในยุคสมัยนี้ อันที่จริง แพลตฟอร์มโซเชียลมีเดียเป็นประโยชน์กับทุกคน ตั้งแต่นักเรียนไปจนถึงคนทำงานมืออาชีพ ตัวอย่างเช่น นักเรียนสามารถใช้แพลตฟอร์มอย่าง Facebook เพื่อเข้าเรียนออนไลน์ และนักการตลาดก็ใช้เครื่องมือเหล่านี้ศึกษาแนวโน้มตลาดได้ แม้อาจจะจริงที่บางคนเชื่อว่าโซเชียลมีเดียก่อผลเสีย โดยเฉพาะต่อสุขภาพจิต แต่นั่นก็ไม่ได้แปลว่าเราไม่ควรใช้เครื่องมือเหล่านี้ให้เป็นประโยชน์กับตัวเอง",
    moves: [
      { label: "บอกจุดยืนทันที", en: "In my opinion, social media does not necessarily lead to detrimental consequences for people in this day and age." },
      { label: "ขยายว่าดีกับใคร (from…to…)", en: "In fact, social media platforms can be beneficial for everyone, from students to professional workers." },
      { label: "ยกตัวอย่างรูปธรรม", en: "For example, students can use platforms, such as Facebook, to attend online classes, and marketers can use these tools to study market trends." },
      { label: "ยอมรับมุมตรงข้าม แล้วตีกลับ", en: "While it might be true that some people may believe that social media can bring about negative effects, especially on mental health, this does not mean that individuals should not use these tools for their own benefit." },
    ],
  },
  {
    id: "wt-3",
    choices: [
      { phrase: "is", options: ["is", "are", "be"] },
      { phrase: "used to spend", options: ["used to spend", "used to spent", "use to spend"] },
      { phrase: "is located", options: ["is located", "are located", "is locate"] },
      { phrase: "evokes", options: ["evoke", "evokes", "evoked"] },
    ],
    type: "descriptive",
    topic: "Describe a place that is meaningful to you. What makes it special and what emotions does it evoke?",
    topicTh: "บรรยายสถานที่ที่มีความหมายกับคุณ อะไรทำให้พิเศษ และมันทำให้รู้สึกอย่างไร",
    essay:
      "A place that is meaningful to me is a small beach town where I used to spend summers with my family. The town is located between tall trees and rocky cliffs, and the ocean water is crystal clear and serene. What makes this place special is the memories I have of spending time with my loved ones, laughing, and enjoying each other's company. This place evokes a sense of nostalgia, contentment, and happiness. Whenever I think of it, I feel a sense of warmth and gratitude for the moments I shared with my family.",
    essayTh:
      "สถานที่ที่มีความหมายกับฉันคือเมืองชายทะเลเล็ก ๆ ที่ฉันเคยไปพักช่วงหน้าร้อนกับครอบครัว เมืองนี้ตั้งอยู่ระหว่างต้นไม้สูงและหน้าผาหิน น้ำทะเลใสแจ๋วและสงบเงียบ สิ่งที่ทำให้ที่นี่พิเศษคือความทรงจำที่ได้ใช้เวลากับคนที่ฉันรัก ได้หัวเราะ และมีความสุขไปด้วยกัน ที่แห่งนี้ปลุกความรู้สึกคิดถึงอดีต ความอิ่มใจ และความสุข ทุกครั้งที่นึกถึง ฉันรู้สึกอบอุ่นและขอบคุณสำหรับช่วงเวลาที่ได้ใช้ร่วมกับครอบครัว",
    moves: [
      { label: "บอกว่าสิ่งนั้นคืออะไร", en: "A place that is meaningful to me is a small beach town where I used to spend summers with my family." },
      { label: "บรรยายรายละเอียด (is located…)", en: "The town is located between tall trees and rocky cliffs, and the ocean water is crystal clear and serene." },
      { label: "ทำไมถึงพิเศษ", en: "What makes this place special is the memories I have of spending time with my loved ones, laughing, and enjoying each other's company." },
      { label: "ความรู้สึกที่ถูกปลุกขึ้นมา", en: "This place evokes a sense of nostalgia, contentment, and happiness." },
      { label: "ปิดท้ายด้วยความรู้สึกส่วนตัว", en: "Whenever I think of it, I feel a sense of warmth and gratitude for the moments I shared with my family." },
    ],
  },
];

export function writeTopicItemById(id: string): WriteTopicItem | null {
  return WRITE_TOPIC_ITEMS.find((i) => i.id === id) ?? null;
}
