import type { PhotoSpeakItem } from "@/types/photo-speak";

export type MiniStudyItem = {
  id: string;
  sentence: string;
  explanation: string;
};

export type MiniStudyExplanationBlock = {
  heading: string;
  body: string;
  /** Optional พี่ดอย coach tip shown as a speech bubble after the block body. */
  coachTip?: string;
};

export type MiniStudyCategory =
  | "listening"
  | "speaking"
  | "writing"
  | "reading"
  | "dictation";

export type MiniStudyTier = "premium" | "vip";

export const MINI_STUDY_CATEGORY_LABEL_TH: Record<MiniStudyCategory, string> = {
  listening: "ฟัง",
  speaking: "พูด",
  writing: "เขียน",
  reading: "อ่าน",
  dictation: "Dictation",
};

export const MINI_STUDY_CATEGORY_ICON: Record<MiniStudyCategory, string> = {
  listening: "🎧",
  speaking: "🗣",
  writing: "✍️",
  reading: "📖",
  dictation: "📝",
};

export const MINI_STUDY_CATEGORY_ORDER: MiniStudyCategory[] = [
  "dictation",
  "speaking",
  "listening",
  "writing",
  "reading",
];

export type MiniStudySessionBase = {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  durationLabel: string;
  category: MiniStudyCategory;
  tierRequired: MiniStudyTier;
  /** 1–2 sentence Thai hook shown on the hub card to incentivize the learner. */
  shortHookTh: string;
  explanation: MiniStudyExplanationBlock[];
};

export type MiniStudyDictationSession = MiniStudySessionBase & {
  kind: "dictation";
  items: MiniStudyItem[];
};

export type MiniStudyWritePhotoSession = MiniStudySessionBase & {
  kind: "write-about-photo";
  photo: PhotoSpeakItem;
};

export type MiniStudySpeakPhotoSession = MiniStudySessionBase & {
  kind: "speak-about-photo";
  photo: PhotoSpeakItem;
};

export type MiniStudyMcOption = { letter: "A" | "B" | "C" | "D"; text: string };

export type MiniStudyMcQuestion = {
  id: string;
  prompt: string;
  options: MiniStudyMcOption[];
  correctLetter: "A" | "B" | "C" | "D";
};

export type MiniStudyListeningScenario = {
  id: string;
  title: string;
  scenarioText: string;
  thaiInstruction?: string;
  questions: MiniStudyMcQuestion[];
};

export type MiniStudyListeningMcSession = MiniStudySessionBase & {
  kind: "interactive-listening-mc";
  scenarios: MiniStudyListeningScenario[];
};

export type MiniStudyListenRespondExercise = {
  id: string;
  title: string;
  scenarioRecapTh: string;
  conversationSoFar: { speaker: string; text: string }[];
  turnLabel: string;
  audioText: string;
  question: string;
  options: (MiniStudyMcOption & { explanationTh: string })[];
  correctLetter: "A" | "B" | "C" | "D";
};

export type MiniStudyListenRespondSession = MiniStudySessionBase & {
  kind: "listen-respond";
  exercises: MiniStudyListenRespondExercise[];
};

export type MiniStudyConversationSummarySession = MiniStudySessionBase & {
  kind: "conversation-summary";
  conversation: { speaker: string; text: string }[];
  instructionsTh: string;
};

export type MiniStudyEssayPickRow = { label: string; A: string; B: string; C: string };

export type MiniStudyEssayPickOption = {
  letter: "A" | "B" | "C";
  essayText: string;
};

export type MiniStudyEssayPickExercise = {
  id: string;
  topic: string;
  options: MiniStudyEssayPickOption[];
  correctLetter: "A" | "B" | "C";
  analysisRowsTh: MiniStudyEssayPickRow[];
  rationaleTh: string;
};

export type MiniStudyEssayPickSession = MiniStudySessionBase & {
  kind: "essay-pick";
  exercises: MiniStudyEssayPickExercise[];
};

export type MiniStudyClozeCategory =
  | "present-simple-singular"
  | "plural-noun"
  | "uncountable-noun"
  | "singular-after-a-an"
  | "subject-verb-agreement-plural"
  // Session 16 — Fill in the Blanks (word-form identification)
  | "past-participle"
  | "gerund"
  | "adjective-form"
  | "adverb-form"
  | "noun-form"
  | "preposition-form"
  | "transition-word";

export type MiniStudyClozeBlank = {
  number: number;
  cue: string;
  correct: string;
  acceptedAlts?: string[];
  category: MiniStudyClozeCategory;
  ruleNoteTh: string;
};

export type MiniStudyClozeExercise = {
  id: string;
  patternLabel: string;
  topic: string;
  noteTh?: string;
  essayTemplate: string;
  blanks: MiniStudyClozeBlank[];
};

export type MiniStudyEssayClozeSession = MiniStudySessionBase & {
  kind: "essay-cloze";
  studentInstructionsTh: string;
  exercises: MiniStudyClozeExercise[];
};

export type MiniStudyPassageMcExercise = {
  id: string;
  passage: string;
  question: string;
  options: (MiniStudyMcOption & { explanationTh: string })[];
  correctLetter: "A" | "B" | "C" | "D";
};

export type MiniStudyPassageMcSession = MiniStudySessionBase & {
  kind: "passage-mc";
  exercises: MiniStudyPassageMcExercise[];
};

export type MiniStudySession =
  | MiniStudyDictationSession
  | MiniStudyWritePhotoSession
  | MiniStudySpeakPhotoSession
  | MiniStudyListeningMcSession
  | MiniStudyListenRespondSession
  | MiniStudyConversationSummarySession
  | MiniStudyEssayPickSession
  | MiniStudyEssayClozeSession
  | MiniStudyPassageMcSession;

// Shared scenarios used by Sessions 7 & 8. Declared here (above MINI_STUDY_SESSIONS)
// because the array initializer spreads `buildSessions7Through10()` which reads them.
const SCENARIO_TEXTS = {
  officeHours:
    "You are a psychology student in your second year of university. Last week, your professor gave a lecture on research methods, and one concept — confounding variables — was particularly confusing to you. You weren't sure how it affects the results of an experiment, and you're worried because your exam is coming up in a few days. You decided to visit your professor during office hours to ask for an explanation. When you arrive, you knock on the office door and your professor invites you in. You sit down and get ready to ask your question.",
  groupProject:
    "You are a graduate student in an English literature course. Your professor has assigned a group research paper on post-colonial fiction, and your group needs to submit a completed draft by the end of the month. There are three people in your group, but so far no one has agreed on who should do what. You are meeting your classmate, Jordan, at the university library today to figure out how to divide the work fairly. You arrive first and find a quiet table. Jordan arrives a few minutes later and sits across from you.",
  advisor:
    "You are a first-year international student studying at a university in the United States. Next semester's course registration opens in two weeks, and you need to choose two elective courses. However, you are not sure which courses are allowed under your degree requirements, and you are also worried about whether your course load will be too heavy. You have made an appointment with your academic advisor, Ms. Chen, to get some guidance. You walk into her office, and she greets you warmly and asks how she can help you today.",
  labPartner:
    "You are a second-year chemistry student. Next week, your class will conduct a titration experiment in the laboratory, and you are expected to come fully prepared with the right materials and a clear understanding of the procedure. Unfortunately, you were sick on the day of the pre-lab briefing and missed all the instructions. You decide to call your lab partner, Marcus, to find out what you need to bring and what the experiment involves. You pick up your phone and dial his number.",
  studyGroup:
    "You are a student in an introductory economics course. Your midterm exam is in three days and will cover several topics you have been struggling with, including supply and demand, elasticity, and market equilibrium. You feel that studying alone is not enough, so you organized a study group with two of your classmates, Priya and Daniel. You are all meeting this afternoon at a café near campus to go through the most difficult concepts together. You arrive at the café, order a coffee, and your classmates walk in shortly after.",
} as const;

const TH_LISTEN_INSTRUCTION =
  "ฟัง Scenario ด้านบนให้จบก่อน แล้วตอบคำถามต่อไปนี้โดยไม่ต้องฟังซ้ำ พยายามจำเนื้อหาที่ได้ยินให้ได้มากที่สุด คำตอบไม่จำเป็นต้องยาว ใช้คำสั้นๆ หรือวลีก็พอ";

// Hoisted above MINI_STUDY_SESSIONS because the array initializer spreads
// `buildSessions7Through10()` which transitively calls buildSession13/14/15
// — those reference this const, so it must already be initialised when the
// builder runs.
const READING_LESSON_NOTE_TH =
  "ฟังคำสั่ง: อ่าน passage ให้จบก่อน แล้วเลือก option ที่ดีที่สุด ห้ามรีบเลือกตัวแรกที่ฟังดูดี · กดเฉลยเพื่อดูคำอธิบายภาษาไทยของทุกตัวเลือก";

export const MINI_STUDY_SESSIONS: MiniStudySession[] = [
  {
    id: "session-1",
    index: 1,
    title: "Commas: FANBOYS & Subordinating Conjunctions",
    subtitle: "15 นาที · พื้นฐาน Dictation",
    durationLabel: "≈ 15 min",
    kind: "dictation",
    category: "dictation",
    tierRequired: "premium",
    shortHookTh: "เรียน comma ที่ออกบ่อยที่สุดใน Dictation — บทเดียวจบ ใช้ได้ตลอดชีวิต",
    explanation: [
      {
        heading: "ทำไมต้องเรียน comma?",
        body: [
          "ในข้อสอบ **Dictation** ของ DET คุณจะได้ฟังประโยคแล้วต้องพิมพ์ตามให้ตรงทุกตัวอักษร **รวม comma ด้วย**",
          "นักเรียนไทยส่วนใหญ่พิมพ์คำได้ครบ แต่เสีย point เพราะ **ลืม comma** เพราะภาษาไทยไม่มี comma แบบอังกฤษ",
          "บทเรียนนี้สอน 2 กฎที่ออกบ่อยที่สุด — รู้แค่นี้ช่วยให้คุณเขียน comma ถูกเกือบ 100%",
        ].join("\n"),
        coachTip: "บทเรียนนี้สอน **2 กฎ** ที่ออกบ่อยที่สุดครับ — รู้แค่นี้ช่วยให้นักเรียนเขียน comma ถูกเกือบ **100%** ตามพี่มาเลย 💪",
      },
      {
        heading: "กฎข้อ 1 — FANBOYS",
        body: [
          "**FANBOYS** คือคำเชื่อม 7 คำที่ใช้บ่อยในภาษาอังกฤษ ได้แก่:",
          "**F**or · **A**nd · **N**or · **B**ut · **O**r · **Y**et · **S**o",
          "",
          "**กฎ:** เมื่อ FANBOYS เชื่อมประโยคสมบูรณ์ 2 ประโยค (มี ประธาน+กริยา ทั้ง 2 ฝั่ง) → ใส่ **comma ก่อน** คำเชื่อมเสมอ",
          "",
          "**โครงสร้าง:** *Clause 1, **and/but/so/…** Clause 2.*",
          "",
          "**ตัวอย่าง:**",
          "• I wanted to study**, but** I was too tired.",
          "• She finished early**, so** she left.",
          "• It started raining**, and** the picnic ended.",
          "",
          "⚠ **ระวัง!** ถ้าไม่มีประธานข้างหลัง → ไม่ต้องใส่ comma",
          "• *I was tired and went home.* (ไม่มี \"I\" อันที่ 2 → ไม่ใส่ comma)",
        ].join("\n"),
        coachTip: "**เคล็ดลับพี่ดอยครับ:** ก่อนใส่ comma ให้ถามตัวเองว่า \"ข้างหลัง but/and/so มีประธานใหม่มั้ย?\" ถ้าไม่มี → **ตัด comma ทิ้ง** นักเรียนพลาดตรงนี้บ่อยที่สุด",
      },
      {
        heading: "กฎข้อ 2 — Subordinating conjunctions",
        body: [
          "Subordinating conjunctions = คำเชื่อมที่ทำให้ประโยคเป็น \"ประโยครอง\" (อยู่เดี่ยวๆ ไม่ได้)",
          "คำที่ใช้บ่อย: **although** (ถึงแม้ว่า), **because** (เพราะว่า), **when** (เมื่อ), **if** (ถ้า), **since** (ตั้งแต่/เพราะ), **while** (ในขณะที่), **after** (หลังจาก), **before** (ก่อน), **unless** (ถ้าไม่), **though** (ถึงแม้)",
          "",
          "**กฎที่ 1 — ประโยครองอยู่หน้า → ใส่ comma หลังประโยครอง**",
          "• **Although** it was raining, we went outside.",
          "• **Because** he was late, the meeting started without him.",
          "",
          "**กฎที่ 2 — ประโยครองอยู่หลัง → ไม่ใส่ comma**",
          "• We went outside although it was raining.",
          "• The meeting started without him because he was late.",
          "",
          "🧠 **วิธีจำง่ายๆ:** Subordinator อยู่ **หน้า** → ใส่ comma หลังประโยครอง",
        ].join("\n"),
        coachTip: "ลองท่องในใจว่า *\"หน้า-ใส่, หลัง-ไม่ใส่\"* ครับ — กฎสั้นๆ แค่นี้พอแล้ว ไม่ต้องจำกฎยาว ✌️ นักเรียนคนไหนท่องได้ขึ้นใจ comma ใน DET จะไม่มีพลาดเลย",
      },
      {
        heading: "วิธีทำแบบฝึกหัด",
        body: "ฟังประโยค 10 ประโยค พิมพ์ตามให้ตรงทุกตัวอักษร **รวม comma** กดปุ่ม **ตรวจคำตอบ** — ถ้าไม่ได้ 100% สามารถกด **ดูเฉลย** เพื่อดูประโยคที่ถูกพร้อมเหตุผลเป็นภาษาไทย",
      },
    ],
    items: [
      // 5 FANBOYS
      {
        id: "s1-1",
        sentence: "I wanted to call her, but I forgot my phone at home.",
        explanation: "FANBOYS 'but' เชื่อม 2 ประโยคสมบูรณ์ (I wanted… / I forgot…) → ใส่ comma ก่อน 'but'",
      },
      {
        id: "s1-2",
        sentence: "He studied all night, yet he failed the exam.",
        explanation: "2 ประโยคสมบูรณ์เชื่อมด้วย 'yet' → ใส่ comma ก่อน 'yet'",
      },
      {
        id: "s1-3",
        sentence: "She loves coffee, and her brother prefers tea.",
        explanation: "2 ประโยคที่มีประธานต่างกัน (She / her brother) → ใส่ comma ก่อน 'and'",
      },
      {
        id: "s1-4",
        sentence: "We can take the bus, or we can walk to the station.",
        explanation: "2 ประโยคสมบูรณ์เชื่อมด้วย 'or' → ใส่ comma ก่อน 'or'",
      },
      {
        id: "s1-5",
        sentence: "The rain stopped, so the children went outside to play.",
        explanation: "2 ประโยคเชื่อมด้วย 'so' (บอกผลลัพธ์) → ใส่ comma ก่อน 'so'",
      },
      // 5 SUBORDINATING — front position
      {
        id: "s1-6",
        sentence: "Although it was cold, we decided to go for a walk.",
        explanation: "Subordinating 'although' อยู่ตำแหน่ง \"หน้า\" → ใส่ comma หลังประโยครอง",
      },
      {
        id: "s1-7",
        sentence: "Because he missed the bus, he arrived late to school.",
        explanation: "ประโยค 'because' อยู่หน้า → ใส่ comma หลังประโยครอง",
      },
      {
        id: "s1-8",
        sentence: "When the alarm rang, everyone left the building quickly.",
        explanation: "ประโยค 'when' อยู่หน้า → ใส่ comma หลังประโยครอง",
      },
      // Subordinating — middle position
      {
        id: "s1-9",
        sentence: "I will call you when I arrive at the airport.",
        explanation: "ประโยค 'when' อยู่ตำแหน่ง \"ท้าย\" → ไม่ใส่ comma (Subordinator อยู่กลาง/ท้าย ปกติไม่ใส่ comma)",
      },
      {
        id: "s1-10",
        sentence: "She stayed home because she was feeling sick.",
        explanation: "ประโยค 'because' อยู่ตำแหน่ง \"ท้าย\" → ไม่ใส่ comma",
      },
    ],
  },
  {
    id: "session-2",
    index: 2,
    title: "Adding -ed, -s/-es: past tense, present simple, passive voice",
    subtitle: "15 นาที · ลงท้าย -ed / -s ที่ต้องเติมเอง",
    durationLabel: "≈ 15 min",
    kind: "dictation",
    category: "dictation",
    tierRequired: "premium",
    shortHookTh: "เคยพิมพ์ Dictation แล้วลืมเติม -s ไหม? บทนี้สอนทำเป็นนิสัยใน 15 นาที",
    explanation: [
      {
        heading: "ทำไมต้องเรียนเรื่องนี้?",
        body: [
          "ในข้อสอบ **Dictation** ของ DET เสียงที่ฟังมักจะ \"กลืน\" **-ed** และ **-s** ท้ายคำ — คุณอาจจะไม่ได้ยินชัดด้วยซ้ำ",
          "แต่คุณ **ต้องเติมเอง** โดยใช้หลักไวยากรณ์ ไม่ใช่ใช้หูฟัง",
          "บทเรียนนี้สอน 3 กฎที่ทำให้คุณรู้ว่า **ต้องเติม -ed หรือ -s เมื่อไหร่**",
        ].join("\n"),
      },
      {
        heading: "กฎข้อ 1 — เติม -ed (Past tense)",
        body: [
          "ถ้าประโยคบอก **อดีต** → คำกริยาทุกตัวต้องเป็น **past tense** เติม **-ed** ที่คำกริยา regular",
          "",
          "**ตัวอย่าง:**",
          "• Yesterday I **walked** to school and **talked** to my friend.",
          "• Last night she **cooked** dinner and **watched** a movie.",
          "",
          "🧠 **สัญญาณบอกอดีต** ที่ต้องระวัง:",
          "**yesterday** (เมื่อวาน) · **last week / last night / last month** (เดือน/สัปดาห์ที่แล้ว) · **ago** (ที่แล้ว) · **in 2010** (ในปี 2010) · **when I was a child** (ตอนเด็ก)",
          "",
          "ได้ยินคำเหล่านี้ + คำกริยา regular → **เติม -ed เสมอ**",
        ].join("\n"),
        coachTip: "**เคล็ดลับสำคัญที่ช่วยนักเรียนได้เยอะมากครับ:** ถ้านักเรียนได้ยิน verb ตัวใดตัวหนึ่งในประโยคเป็น past tense (เช่น *went, was, had, saw, took*) → อีก **99% verb ตัวอื่นในประโยคเดียวกันก็จะเป็น past tense ตามไปด้วย** เพราะภาษาอังกฤษมีกฎเรียกว่า **tense consistency** (ความสอดคล้องของเวลา) เช่นถ้าได้ยิน *\"I went to the store and...\"* → verb ถัดไปต้องเป็น past แน่นอน เช่น *bought, saw, met* ใช้เทคนิคนี้ช่วยเดาเวลานักเรียนฟังไม่ชัดได้เลยครับ",
      },
      {
        heading: "กฎข้อ 2 — Passive voice (be + V-ed)",
        body: [
          "ถ้าเจอ **verb to be** (is / am / are / was / were / been / being) อยู่ข้างหน้าคำกริยา → ส่วนใหญ่ต้องเติม **-ed** ที่คำกริยานั้น",
          "",
          "เพราะนี่คือ **Passive voice** (ประธานถูกกระทำ ไม่ใช่กระทำเอง)",
          "",
          "**ตัวอย่าง:**",
          "• The letter **was written** by my mother. (จดหมายถูกเขียนโดยแม่)",
          "• The book **is read** by thousands of students. (หนังสือถูกอ่านโดยนักเรียนหลายพันคน)",
          "• The cake **has been eaten** already. (เค้กถูกกินไปแล้ว)",
          "",
          "🧠 **จำง่ายๆ:** เห็น **is/am/are/was/were/been/being** + คำกริยา → **น่าจะต้องเติม -ed**",
        ].join("\n"),
        coachTip: "**ระวังให้ดีนะครับ** — passive voice เป็นจุดที่นักเรียนไทยเสีย point บ่อยที่สุด เพราะหูคนไทยไม่ค่อยได้ยินเสียง **-ed** ตอนท้ายเมื่อ verb ลงท้ายด้วยพยัญชนะ เช่น *delivered, finished, accepted, asked* พี่แนะนำให้นักเรียนสังเกต **was/were/is/are/been** ก่อนเลยครับ — ถ้าเจอคำพวกนี้ ให้สแกนหา verb ที่ต้องเติม **-ed** ตอนท้ายเสมอ อย่าลืม!",
      },
      {
        heading: "กฎข้อ 3 — เติม -s / -es (Present simple + ประธานเอกพจน์)",
        body: [
          "ถ้าประธานเป็น **เอกพจน์บุคคลที่ 3** (he, she, it, the boy, my mom, my sister…) **และ** ใช้ **present simple** → เติม **-s** หรือ **-es** ที่คำกริยา",
          "",
          "**ตัวอย่าง:**",
          "• He **walks** to school every day. (เติม -s)",
          "• She **watches** TV after dinner. (ลงท้าย ch → เติม -es)",
          "• My brother **goes** to the gym on Mondays. (ลงท้าย o → เติม -es)",
          "",
          "🧠 **สัญญาณบอก present simple:**",
          "**every day** (ทุกวัน) · **always** (เสมอ) · **usually** (โดยปกติ) · **often** (บ่อย) · **sometimes** (บางครั้ง) · **on Mondays** (ทุกวันจันทร์)",
          "",
          "ได้ยินคำเหล่านี้ + ประธานเอกพจน์ → **เติม -s หรือ -es เสมอ**",
        ].join("\n"),
        coachTip: "จำสูตรนี้ให้ขึ้นใจครับ: **ประธานเอกพจน์** (*he, she, it, the boy, my friend, the cat*) + verb ใน **present simple** → **ต้องเติม -s/-es เสมอ** DET วัดเรื่องนี้แทบทุกข้อใน Dictation เพราะเสียงสุดท้ายเบามาก หูเราเลยพลาดได้ง่าย เคล็ดลับ: ถ้าเห็นประธานเป็นคนคนเดียว/สิ่งเดียว — ใส่ s ไว้ก่อนเลย ปลอดภัยที่สุดครับ",
      },
      {
        heading: "วิธีทำแบบฝึกหัด",
        body: "ฟัง 10 ประโยคที่ผสมทั้ง 3 กฎ + comma จากบทที่ 1 พิมพ์ตามให้ตรงทุกตัวอักษร **อย่าลืมเติม -ed และ -s** ตามกฎ",
      },
    ],
    items: [
      {
        id: "s2-1",
        sentence: "Yesterday she walked to the library and borrowed three books.",
        explanation: "'Yesterday' บอกอดีต → walked, borrowed (เติม -ed ทั้งคู่)",
      },
      {
        id: "s2-2",
        sentence: "The window was broken by the strong wind last night.",
        explanation: "Passive: 'was broken' (be + V-ed) · 'Last night' ยืนยันว่าเป็นอดีต",
      },
      {
        id: "s2-3",
        sentence: "He watches movies every weekend with his family.",
        explanation: "Present simple + ประธานเอกพจน์ 'he' → watches (เติม -es เพราะลงท้าย ch)",
      },
      {
        id: "s2-4",
        sentence: "Although it rained heavily, the match was not cancelled.",
        explanation: "Subordinator อยู่หน้า → ใส่ comma หลังประโยครอง · 'rained' (เติม -ed), 'was cancelled' (passive เติม -ed)",
      },
      {
        id: "s2-5",
        sentence: "My sister always finishes her homework before dinner.",
        explanation: "Present simple + ประธานเอกพจน์ 'My sister' → finishes (เติม -es)",
      },
      {
        id: "s2-6",
        sentence: "The package was delivered yesterday, but no one was home.",
        explanation: "Passive 'was delivered' (เติม -ed) + FANBOYS 'but' เชื่อม 2 ประโยค → ใส่ comma ก่อน 'but'",
      },
      {
        id: "s2-7",
        sentence: "When the teacher entered the room, all the students stood up.",
        explanation: "ประโยค 'when' อยู่หน้า → ใส่ comma หลังประโยครอง · 'entered' (เติม -ed), 'stood' (irregular past)",
      },
      {
        id: "s2-8",
        sentence: "The new policy is supported by most of the employees.",
        explanation: "Passive present: 'is supported' (be + V-ed)",
      },
      {
        id: "s2-9",
        sentence: "He studies hard every night, so he usually passes his tests.",
        explanation: "Present + ประธานเอกพจน์ → studies, passes · FANBOYS 'so' เชื่อม 2 ประโยค → ใส่ comma ก่อน 'so'",
      },
      {
        id: "s2-10",
        sentence: "The cake was eaten before the guests arrived at the party.",
        explanation: "Passive past 'was eaten' + past 'arrived' (เติม -ed)",
      },
    ],
  },
  {
    id: "session-3",
    index: 3,
    title: "Four comma structures for Write/Speak about Photo",
    subtitle: "15 นาที · ตำแหน่ง comma ในการบรรยาย",
    durationLabel: "≈ 15 min",
    kind: "dictation",
    category: "dictation",
    tierRequired: "premium",
    shortHookTh: "รู้ 4 รูปแบบนี้แล้วบรรยายภาพไม่พลาด comma อีก ใช้กับ Write/Speak Photo",
    explanation: [
      {
        heading: "โครงสร้างที่ 1 — S + V, which is …",
        body: [
          "ใช้เมื่อต้องการ **เพิ่มข้อมูล** เกี่ยวกับคำนามที่อยู่ข้างหน้า (สี ลักษณะ ตำแหน่ง ความหมาย)",
          "ใส่ **comma ก่อน 'which' เสมอ**",
          "",
          "**ตัวอย่าง:**",
          "• A man is standing near the door**, which** is painted red.",
          "  (มีผู้ชายยืนใกล้ประตู ซึ่งทาสีแดง)",
          "• She is wearing a coat**, which** looks very warm.",
          "  (เธอใส่เสื้อโค้ท ซึ่งดูอบอุ่นมาก)",
          "",
          "✗ **ผิดบ่อย:** ลืม comma ก่อน which",
          "*'She is wearing a coat which looks warm.'* → ความหมายเปลี่ยน! (กลายเป็นเลือกเฉพาะเสื้อที่ดูอบอุ่น)",
        ].join("\n"),
        coachTip: "โครงสร้างนี้ใช้ **เพิ่มข้อมูลเสริมหลังคำนาม** ครับ — แต่ระวังนิดนึง! ใช้ **who is** สำหรับคน, **which is** สำหรับสิ่งของหรือสัตว์ พี่เห็นนักเรียนสลับกันบ่อยมาก เช่น *\"A woman, **which is** a doctor\"* (ผิด!) ที่ถูกคือ *\"A woman, **who is** a doctor\"* จำง่ายๆ ครับ: **who = ใคร, which = อะไร**",
      },
      {
        heading: "โครงสร้างที่ 2 — S + V, V-ing …",
        body: [
          "ใช้เมื่อ **ประธานทำ 2 อย่างพร้อมกัน**",
          "ใส่ **comma ก่อนคำกริยา -ing เสมอ**",
          "",
          "**ตัวอย่าง:**",
          "• A woman is sitting on a bench**, reading** a book.",
          "  (ผู้หญิงนั่งบนม้านั่ง พร้อมกับอ่านหนังสือ)",
          "• Two children are playing outside**, laughing** loudly.",
          "  (เด็ก 2 คนเล่นนอกบ้าน พร้อมกับหัวเราะดังๆ)",
          "",
          "✗ **ผิดบ่อย:** *'A woman is sitting on a bench reading a book.'* (ลืม comma)",
        ].join("\n"),
        coachTip: "โครงสร้างนี้ทรงพลังมากครับ — ใช้แสดงว่าประธาน \"ทำ 2 อย่างพร้อมกัน\" ในรูปแบบที่ฟังเป็นธรรมชาติ เคล็ดลับพี่: ถ้านักเรียนเห็นคนใน photo กำลังทำอะไรหลายอย่าง → ใช้ V-ing เชื่อมเลย เช่น *\"A man is sitting at a table, **typing** on his laptop\"* ฟังดูสวยกว่า *\"A man is sitting and typing\"* ครับ DET ให้คะแนน sentence variety สูงขึ้นด้วย",
      },
      {
        heading: "โครงสร้างที่ 3 — In/On/At … , S + V.",
        body: [
          "ถ้า phrase ขึ้นต้นด้วย **in / on / at / under …** มาอยู่ \"**หน้าประโยค**\" → ใส่ **comma หลัง phrase นั้น**",
          "",
          "**ตัวอย่าง:**",
          "• **In the background,** there are several tall buildings.",
          "  (ในพื้นหลัง มีตึกสูงหลายตึก)",
          "• **In the foreground,** a man is riding a bicycle.",
          "  (ในพื้นหน้า ผู้ชายขี่จักรยาน)",
          "",
          "✗ **ผิดบ่อย:** *'In the background there are tall buildings.'* (ลืม comma หลัง background)",
        ].join("\n"),
        coachTip: "โครงสร้างนี้คือ **prepositional phrase** อยู่หน้าประโยคครับ — กฎจำง่าย: **อะไรอยู่หน้า → ต้องมี comma หลัง** เพราะภาษาอังกฤษต้อง \"หยุดพัก\" หลัง phrase นำก่อนเข้าประโยคหลัก เคล็ดลับพี่: เริ่มประโยคแรกของนักเรียนด้วย *\"In the foreground,\"* หรือ *\"In the background,\"* ทุกครั้งเลยครับ — เป็นวิธีเปิดที่ DET ชอบมาก ดูเป็นมืออาชีพและตรงรูปแบบ academic writing",
      },
      {
        heading: "โครงสร้างที่ 4 — S + V + in/on/at …",
        body: [
          "ถ้า phrase อยู่ \"**ท้ายประโยค**\" → **ไม่ใส่ comma**",
          "",
          "**ตัวอย่าง:**",
          "• A man is riding a bicycle in the foreground.",
          "• Two people are talking in the center of the photo.",
          "",
          "**เหตุผล:** phrase ต่อจาก verb ได้เลย ไม่ต้องหยุดพัก",
        ].join("\n"),
        coachTip: "โครงสร้างนี้คือกลับด้านของข้อ 3 ครับ — **phrase อยู่ท้าย → ไม่ใส่ comma** เพราะ phrase ต่อจาก verb ได้เลย ไม่ต้องหยุดพัก จำคู่กับข้อ 3 ไว้: *\"In the park, children are playing.\"* (หน้า = ใส่ comma) vs *\"Children are playing in the park.\"* (ท้าย = ไม่ใส่) เป็นกฎเดียวกันแต่ตำแหน่งต่างกัน — ห้ามใส่ comma ผิดเด็ดขาดนะครับ DET ตัดคะแนนทันที",
      },
      {
        heading: "🧠 จำง่ายๆ",
        body: [
          "• Phrase อยู่ **หน้า** → comma **หลัง** phrase (โครงสร้าง 3)",
          "• เพิ่มข้อมูล **หลัง** S+V → comma **ก่อน** ข้อมูลนั้น (โครงสร้าง 1 และ 2)",
          "• Phrase อยู่ **ท้าย** → **ไม่ใส่** comma (โครงสร้าง 4)",
        ].join("\n"),
        coachTip: "**4 โครงสร้างนี้ครอบคลุม 90% ของประโยคที่ใช้ใน Write/Speak about Photo ครับ** — นักเรียนไม่ต้องเลือกอันใดอันหนึ่ง! เคล็ดลับพี่: **ลองสลับใช้ทั้ง 4 แบบในคำตอบ 3-4 ประโยคของนักเรียน** เพราะ DET ให้คะแนนพิเศษกับ **sentence variety** (ความหลากหลายของโครงสร้างประโยค) ถ้านักเรียนใช้ S+V ซ้ำๆ ทุกประโยค → คะแนน grammar จะตันที่ระดับหนึ่ง แต่ถ้าสลับทั้ง 4 โครงสร้างเป็น → คะแนนพุ่งขึ้นทันทีครับ",
      },
    ],
    items: [
      {
        id: "s3-1",
        sentence: "A woman is sitting on a bench, which is located near a fountain.",
        explanation: "โครงสร้าง 1: เพิ่มข้อมูลเกี่ยวกับม้านั่ง → ใส่ comma ก่อน 'which'",
      },
      {
        id: "s3-2",
        sentence: "The man is wearing a red jacket, which makes him stand out in the crowd.",
        explanation: "โครงสร้าง 1: เพิ่มข้อมูลเกี่ยวกับเสื้อแจ็กเก็ต → ใส่ comma ก่อน 'which'",
      },
      {
        id: "s3-3",
        sentence: "The street is very busy, which suggests it is rush hour.",
        explanation: "โครงสร้าง 1: เพิ่มการตีความ → ใส่ comma ก่อน 'which'",
      },
      {
        id: "s3-4",
        sentence: "A man is standing at the counter, ordering a cup of coffee.",
        explanation: "โครงสร้าง 2: ทำ 2 อย่างพร้อมกัน (standing + ordering) → ใส่ comma ก่อน V-ing",
      },
      {
        id: "s3-5",
        sentence: "Two children are running in the park, laughing and chasing each other.",
        explanation: "โครงสร้าง 2: ทำ 2 อย่างพร้อมกัน → ใส่ comma ก่อน V-ing",
      },
      {
        id: "s3-6",
        sentence: "She is sitting alone at a table, looking at her phone.",
        explanation: "โครงสร้าง 2: ใส่ comma ก่อน V-ing 'looking'",
      },
      {
        id: "s3-7",
        sentence: "In the background, there are tall trees and a clear blue sky.",
        explanation: "โครงสร้าง 3: phrase อยู่หน้า → ใส่ comma หลัง 'background'",
      },
      {
        id: "s3-8",
        sentence: "In the foreground, a young woman is holding a large umbrella.",
        explanation: "โครงสร้าง 3: phrase อยู่หน้า → ใส่ comma หลัง 'foreground'",
      },
      {
        id: "s3-9",
        sentence: "A group of people are having a picnic in the park.",
        explanation: "โครงสร้าง 4: phrase 'in the park' อยู่ท้าย → ไม่ใส่ comma",
      },
      {
        id: "s3-10",
        sentence: "An elderly man is reading a newspaper in the corner of the cafe.",
        explanation: "โครงสร้าง 4: phrase 'in the corner…' อยู่ท้าย → ไม่ใส่ comma",
      },
    ],
  },
  {
    id: "session-4",
    index: 4,
    title: "Write about a photo",
    subtitle: "15 นาที · 3 patterns บรรยายภาพ + AI ตรวจ",
    durationLabel: "≈ 15 min",
    kind: "write-about-photo",
    category: "writing",
    tierRequired: "premium",
    shortHookTh: "3 pattern + คำคุณศัพท์ที่ใช้ได้จริง — AI ตรวจ + ให้คะแนนทันที",
    explanation: [
      {
        heading: "วิธีเรียนบทนี้",
        body: "อ่าน 3 patterns และคำคุณศัพท์ที่ให้ ก่อนเขียนบรรยายภาพด้านล่างโดยเลือก pattern ใด pattern หนึ่ง เมื่อส่งแล้ว AI จะตรวจให้และคุณบันทึกลง notebook ได้",
      },
      {
        heading: "⚠ ข้อผิดพลาดที่ต้องเลี่ยง",
        body: [
          "• **ห้ามใช้ past tense** — ภาพคือ \"ช่วงเวลาที่หยุดนิ่ง\" ต้องใช้ **present continuous** (is/are + V-ing) หรือ **present simple** เท่านั้น",
          "• **อย่าสับสน comma กับ full stop** — comma เชื่อมประโยค · full stop จบประโยค",
          "• **ประธานเอกพจน์ → เติม -s / -es** (He walk**s**, She watch**es**)",
        ].join("\n"),
        coachTip: "**อย่าเริ่มประโยคด้วย \"I see…\" ตลอดนะครับ** — เป็นนิสัยที่นักเรียนไทยติดกันเยอะมาก DET จะลดคะแนนเรื่อง **vocabulary range** ทันที ลองสลับเป็นวลีพวกนี้แทนครับ: *\"In this picture…\"*, *\"The photo shows…\"*, *\"This image captures…\"*, *\"There is/are…\"* แค่เปลี่ยนคำเปิดประโยค คะแนน vocabulary ขยับขึ้นแน่นอน",
      },
      {
        heading: "Pattern 1 — ภาพรวม → รายละเอียด → ความรู้สึก",
        body: [
          "**ประโยค 1 (ตั้งฉาก):** *The photo shows a bustling street market at sunset.*",
          "  (ภาพแสดงตลาดถนนที่คึกคักในช่วงพระอาทิตย์ตก)",
          "",
          "**ประโยค 2 (ซูมไปที่รายละเอียด):** *In the foreground, a well-dressed vendor is arranging colorful fruit on a worn wooden cart.*",
          "  (ในพื้นหน้า พ่อค้าแต่งตัวดีกำลังจัดผลไม้สีสันบนรถเข็นไม้เก่าๆ)",
          "",
          "**ประโยค 3 (บอกอารมณ์ภาพ):** *Overall, the vibrant scene evokes a warm and lively atmosphere.*",
          "  (โดยรวม ฉากที่สดใสนี้ให้บรรยากาศที่อบอุ่นและมีชีวิตชีวา)",
        ].join("\n"),
        coachTip: "จำสูตร **3 ชั้น** นี้ไว้ให้ขึ้นใจครับ — ขึ้นต้นกว้าง (บอกว่าภาพคืออะไร) → แคบลงเป็นรายละเอียด (คน/สิ่งของ/กิจกรรม) → ปิดท้ายด้วยความรู้สึกหรือบรรยากาศ พี่ใช้สูตรนี้สอนนักเรียนทุกคนเลยครับ เพราะมันตรงกับสิ่งที่ DET ต้องการเห็นเป๊ะๆ ลองคิดเป็น **กรวยกลับหัว** จากกว้างไปแคบ จำง่ายและใช้ได้กับทุกภาพ",
      },
      {
        heading: "Pattern 2 — คน → กิจกรรม → ฉาก",
        body: [
          "**ประโยค 1 (แนะนำคน):** *The main subject is a young and focused woman sitting alone on a bench.*",
          "  (ตัวเอกของภาพคือผู้หญิงสาวที่มีสมาธิ นั่งคนเดียวบนม้านั่ง)",
          "",
          "**ประโยค 2 (เธอกำลังทำอะไร):** *She appears to be reading a book, focusing on the content of the book.*",
          "  (เธอดูเหมือนกำลังอ่านหนังสือ มุ่งความสนใจที่เนื้อหา)",
          "",
          "**ประโยค 3 (อธิบายฉาก):** *The surrounding paths suggest it is a peaceful early morning setting.*",
          "  (ทางเดินรอบๆ บอกว่าเป็นบรรยากาศตอนเช้าที่เงียบสงบ)",
        ].join("\n"),
      },
      {
        heading: "Pattern 3 — สถานที่ → สิ่งที่เกิดขึ้น → ความประทับใจ",
        body: [
          "**ประโยค 1 (บรรยายสถานที่):** *The setting appears to be a modern and spacious café with large windows and minimalist décor.*",
          "  (ฉากดูเหมือนเป็นคาเฟ่ที่ทันสมัยและกว้างขวาง มีหน้าต่างใหญ่และของตกแต่งแบบ minimal)",
          "",
          "**ประโยค 2 (กำลังเกิดอะไรขึ้น):** *In addition, several well-dressed people are seated, working on laptops or chatting in relaxed groups.*",
          "  (นอกจากนี้ ผู้คนแต่งตัวดีหลายคนนั่งอยู่ ทำงานบนแล็ปท็อปหรือคุยกันเป็นกลุ่ม)",
          "",
          "**ประโยค 3 (สรุปความประทับใจ):** *Overall, the image conveys a lively yet comfortable urban lifestyle.*",
          "  (โดยรวม ภาพสื่อถึงไลฟ์สไตล์เมืองที่คึกคักแต่ก็สบาย)",
        ].join("\n"),
      },
      {
        heading: "Transitional words (ใช้สัก 2-3 คำในคำตอบ)",
        body:
          "**In the foreground,** (ในพื้นหน้า) · **In the background,** (ในพื้นหลัง) · **In addition,** (นอกจากนี้) · **Furthermore,** (ยิ่งกว่านั้น) · **She/He appears to be** (ดูเหมือน…) · **The surrounding** (สิ่งรอบๆ) · **Overall,** (โดยรวม) · **notably,** (ที่น่าสังเกต) · **what stands out is** (ที่โดดเด่นคือ) · **on the other hand,** (ในทางกลับกัน)",
      },
      {
        heading: "คำคุณศัพท์ — บรรยายคน",
        body: "**young** (อายุน้อย) · **elderly** (สูงอายุ) · **well-dressed** (แต่งตัวดี) · **casually dressed** (แต่งตัวสบายๆ) · **focused** (มีสมาธิ) · **relaxed** (ผ่อนคลาย) · **cheerful** (ร่าเริง) · **tired** (เหนื่อย) · **confident** (มั่นใจ) · **busy** (ยุ่ง)",
      },
      {
        heading: "คำคุณศัพท์ — บรรยายสิ่งของ",
        body: "**large** (ใหญ่) · **tiny** (เล็กมาก) · **colorful** (มีสีสัน) · **worn** (เก่า/สึก) · **modern** (ทันสมัย) · **traditional** (แบบดั้งเดิม) · **minimalist** (เรียบง่าย) · **crowded** (แออัด) · **decorative** (ตกแต่งสวย) · **rustic** (แบบบ้านนา)",
      },
      {
        heading: "คำคุณศัพท์ — บรรยายสถานที่",
        body: "**vibrant** (สดใส) · **peaceful** (เงียบสงบ) · **spacious** (กว้างขวาง) · **narrow** (แคบ) · **open** (โล่ง) · **tree-lined** (มีต้นไม้เรียงราย) · **lively** (มีชีวิตชีวา) · **quiet** (เงียบ) · **warm** (อบอุ่น) · **dimly lit** (แสงสลัว)",
      },
      {
        heading: "เริ่มเขียนกันเลย",
        body: "เขียน **3-5 ประโยค** โดยใช้ pattern ใด pattern หนึ่งข้างบน ใส่ transition word อย่างน้อย 1 คำ และคำคุณศัพท์จากแต่ละหมวดให้ได้ พอเสร็จกด **Submit** เพื่อรับ AI feedback",
      },
    ],
    photo: {
      id: "mini-study-write-photo",
      titleEn: "Describe this scene",
      titleTh: "บรรยายภาพนี้",
      imageUrl: "https://picsum.photos/seed/mini-study-write-cafe/960/640",
      promptEn:
        "Write about what you see in the photo using one of the three description patterns. Use present tense only, include transitional words, and use adjectives for people, objects, and places where appropriate.",
      promptTh:
        "บรรยายภาพโดยใช้หนึ่งในสามแพตเทิร์น ใช้ tense ปัจจุบันเท่านั้น ใส่ transitional words และคำคุณศัพท์สำหรับคน สิ่งของ และสถานที่",
      keywords: ["photo description", "present tense", "transitions", "adjectives", "scene", "people"],
    },
  },
  {
    id: "session-5",
    index: 5,
    title: "Speak about a photo",
    subtitle: "15 นาที · ไวยากรณ์ง่ายๆ ไม่ใช้ -ed",
    durationLabel: "≈ 15 min",
    kind: "speak-about-photo",
    category: "speaking",
    tierRequired: "premium",
    shortHookTh: "6 ประโยคจบ ใช้แต่ is/are + V-ing ไม่ต้องกลัวผิด -ed",
    explanation: [
      {
        heading: "กฎเหล็ก 4 ข้อ — ห้ามลืม",
        body: [
          "• ใช้ **is / are + V-ing** เป็นโครงสร้างหลัก (กำลังเกิดขึ้น)",
          "• **หลีกเลี่ยงรูป -ed** เพื่อกันผิด: crowded → **busy** · tired → **sleepy** · excited → **happy**",
          "• พูดให้ครบ **6 ประโยคพอดี** — ไม่มาก ไม่น้อย",
          "• ประธานเอกพจน์ → คำกริยาเติม **-s / -es**",
        ].join("\n"),
        coachTip: "**พูดช้ากว่าปกตินิดนึงนะครับ** — ชัดดีกว่าเร็วเสมอ DET ฟัง **pronunciation** และ **clarity** มากกว่าความเร็วในการพูด ถ้านักเรียนรีบจนเสียงไม่ชัด AI จับคำไม่ได้ → ได้คะแนนน้อยกว่าคนพูดช้าและชัด เคล็ดลับ: ลองนึกว่ากำลังพูดคุยกับเพื่อนต่างชาติที่เพิ่งเรียนภาษาอังกฤษ — นักเรียนจะออกเสียงชัดเองโดยอัตโนมัติครับ",
      },
      {
        heading: "Pattern 1 — ภาพรวม → หน้า → หลัง → คน → สิ่งของ → บรรยากาศ",
        body: [
          "**โครงสร้าง:**",
          "**ประโยค 1:** The photo shows [สถานที่/ฉาก].",
          "**ประโยค 2:** In the foreground, [ประธาน] is/are V-ing.",
          "**ประโยค 3:** In the background, there is/are [รายละเอียด].",
          "**ประโยค 4:** [ประธาน] is/are V-ing, which [เพิ่มรายละเอียด].",
          "**ประโยค 5:** [ประธาน] is/are V-ing, V-ing [กิจกรรมที่ 2].",
          "**ประโยค 6:** Overall, the scene looks [คำคุณศัพท์].",
          "",
          "**ตัวอย่าง:**",
          "1. The photo shows a busy outdoor market.",
          "2. In the foreground, a woman is selling vegetables.",
          "3. In the background, there are many colorful stalls.",
          "4. She is wearing a hat, which looks very practical.",
          "5. Some people are walking around, looking at the products.",
          "6. Overall, the scene looks lively and warm.",
          "",
          "**ใช้กับ:** ภาพฉากกว้าง · ตลาด · ถนน · สถานที่สาธารณะ",
        ].join("\n"),
      },
      {
        heading: "Pattern 2 — คนหลัก → กิจกรรม → รายละเอียด → คนอื่น → สถานที่ → ความรู้สึก",
        body: [
          "**โครงสร้าง:**",
          "**ประโยค 1:** The main subject is a [คำคุณศัพท์] [บุคคล].",
          "**ประโยค 2:** [ประธาน] is/are V-ing, V-ing [กิจกรรมที่ 2].",
          "**ประโยค 3:** [ประธาน] is/are wearing [เสื้อผ้า], which looks [คำคุณศัพท์].",
          "**ประโยค 4:** In the background, there are [คน/สิ่งของอื่นๆ].",
          "**ประโยค 5:** The setting appears to be [สถานที่].",
          "**ประโยค 6:** The photo gives a [คำคุณศัพท์] feeling.",
          "",
          "**ตัวอย่าง:**",
          "1. The main subject is a young woman.",
          "2. She is sitting at a table, reading a book.",
          "3. She is wearing a white shirt, which looks clean and simple.",
          "4. In the background, there are shelves full of books.",
          "5. The setting appears to be a quiet library.",
          "6. The photo gives a calm and peaceful feeling.",
          "",
          "**ใช้กับ:** ภาพที่มีคนหลัก 1 คน เห็นหน้าและฉากชัด",
        ].join("\n"),
      },
      {
        heading: "Pattern 3 — สถานที่ → คน → กิจกรรม 1 → กิจกรรม 2 → รายละเอียด → สรุป",
        body: [
          "**โครงสร้าง:**",
          "**ประโยค 1:** In the photo, there is/are [ประธาน] in [สถานที่].",
          "**ประโยค 2:** [ประธาน] is/are V-ing, which [เพิ่มรายละเอียด].",
          "**ประโยค 3:** In the foreground, [ประธาน] is/are V-ing.",
          "**ประโยค 4:** [ประธาน] is/are also V-ing, V-ing [รายละเอียด].",
          "**ประโยค 5:** The [สถานที่/วัตถุ] looks [คำคุณศัพท์].",
          "**ประโยค 6:** Overall, the photo looks [คำคุณศัพท์].",
          "",
          "**ตัวอย่าง:**",
          "1. In the photo, there are two people in a park.",
          "2. They are sitting on the grass, which looks very green.",
          "3. In the foreground, a man is holding a drink.",
          "4. A woman is also sitting nearby, smiling at him.",
          "5. The park looks open and full of natural light.",
          "6. Overall, the photo looks happy and relaxing.",
          "",
          "**ใช้กับ:** ภาพกลางแจ้ง · ธรรมชาติ · มีคนตั้งแต่ 2 คนขึ้นไป",
        ].join("\n"),
      },
      {
        heading: "คำศัพท์ — บรรยายคน (ลักษณะภายนอก)",
        body: [
          "**slim** /slɪm/ ผอมเพรียว — *a slim woman*",
          "**elderly** /ˈeldərli/ สูงอายุ — *an elderly man*",
          "**well-dressed** /wel drest/ แต่งตัวดี — *a well-dressed lady*",
          "**casual** /ˈkæʒuəl/ สบายๆ — *casual clothes*",
          "**cheerful** /ˈtʃɪrfəl/ ร่าเริง — *a cheerful girl*",
          "**focused** /ˈfoʊkəst/ มีสมาธิ — *looks focused*",
        ].join("\n"),
      },
      {
        heading: "คำศัพท์ — บรรยายคน (อารมณ์ / ท่าทาง)",
        body: [
          "**relaxed** /rɪˈlækst/ ผ่อนคลาย — *looks relaxed*",
          "**serious** /ˈsɪriəs/ จริงจัง — *looks serious*",
          "**confident** /ˈkɒnfɪdənt/ มั่นใจ — *looks confident*",
          "**busy** /ˈbɪzi/ ยุ่ง — *looks busy*",
          "**active** /ˈæktɪv/ กระฉับกระเฉง — *an active person*",
          "**friendly** /ˈfrendli/ เป็นมิตร — *looks friendly*",
        ].join("\n"),
        coachTip: "ไม่ต้องจำคำพวกนี้ทั้งหมดนะครับ — **เลือกแค่ 5-6 คำที่นักเรียนชอบ** แล้วใช้สลับกันให้คล่อง ดีกว่ารู้ 20 คำแต่ใช้ไม่ถูก พี่แนะนำให้เลือก: *smiling, looking, holding, wearing, sitting, standing* — แค่ 6 คำนี้ใช้กับ 80% ของภาพในข้อสอบได้แล้วครับ!",
      },
      {
        heading: "คำศัพท์ — บรรยายสิ่งของ",
        body: [
          "**large** ใหญ่ · **tiny** เล็กมาก · **colorful** มีสีสัน · **modern** ทันสมัย · **simple** เรียบง่าย · **heavy** หนัก",
        ].join("\n"),
      },
      {
        heading: "คำศัพท์ — บรรยายสถานที่",
        body: [
          "**spacious** กว้างขวาง · **narrow** แคบ · **quiet** เงียบสงบ · **lively** คึกคัก · **open** โล่ง · **crowded** แออัด",
        ].join("\n"),
      },
      {
        heading: "คำศัพท์ — บรรยากาศ / แสง",
        body: [
          "**bright** สว่าง · **natural** ธรรมชาติ · **peaceful** สงบ · **warm** อบอุ่น · **fresh** สดชื่น",
        ].join("\n"),
      },
      {
        heading: "เริ่มพูด (หรือพิมพ์)",
        body: "กดปุ่ม mic แล้วพูดให้ครบ 6 ประโยคโดยใช้ pattern ใด pattern หนึ่ง ถ้าใช้ mic ไม่ได้ พิมพ์ในกล่องก็ได้ พอเสร็จกด Submit เพื่อรับ AI feedback (บันทึก notebook ได้จากหน้า report)",
      },
    ],
    photo: {
      id: "mini-study-speak-photo",
      titleEn: "Speak about this scene",
      titleTh: "พูดบรรยายภาพนี้",
      imageUrl: "https://picsum.photos/seed/mini-study-speak-park/960/640",
      promptEn:
        "Speak about the photo for about 30–60 seconds using one of the three patterns. Use is/are + V-ing as your main structure and avoid -ed forms. Aim for exactly 6 sentences.",
      promptTh:
        "พูดบรรยายภาพประมาณ 30–60 วินาที โดยใช้หนึ่งในสามแพตเทิร์น ใช้ is/are + V-ing เป็นหลัก เลี่ยงรูป -ed ให้ได้ครบ 6 ประโยค",
      keywords: ["photo description", "present continuous", "6 sentences", "no past tense", "scene", "people"],
    },
  },
  ...buildSessions7Through10(),
];

export function getMiniStudySession(id: string): MiniStudySession | null {
  return MINI_STUDY_SESSIONS.find((s) => s.id === id) ?? null;
}

// ============================================================================
// Sessions 7-12: session builders (shared consts hoisted above MINI_STUDY_SESSIONS)
// ============================================================================

function buildSessions7Through10(): MiniStudySession[] {
  const session7: MiniStudyListeningMcSession = {
    id: "session-7",
    index: 7,
    title: "Interactive listening — find the essentials in the scenario",
    subtitle: "15 นาที · ใคร · ทำไม · เรื่องอะไร",
    durationLabel: "≈ 15 min",
    kind: "interactive-listening-mc",
    category: "listening",
    tierRequired: "premium",
    shortHookTh: "เข้าใจ Scenario = ทำได้ครึ่งแล้ว — เรียนวิธีจับ who · why · topic",
    explanation: [
      {
        heading: "ทำไมต้องเรียนเรื่องนี้?",
        body: "ใน Interactive Listening ของ DET การ **เข้าใจ scenario คือทำได้ครึ่งหนึ่งแล้ว** เพราะคำถามทั้งหมดอิงจาก scenario ถ้าจำได้ว่า \"ฉันเป็นใคร · คุยกับใคร · ทำไม\" ก็จะตอบคำถามได้เกือบทั้งหมด",
      },
      {
        heading: "5 สิ่งที่ต้องจับให้ได้ทุก scenario",
        body: [
          "• **ฉันเป็นใคร?** (บทบาท: นักศึกษา · ปี · สาขา)",
          "• **คุยกับใคร?** (อาจารย์ · เพื่อน · ที่ปรึกษา · เพื่อน lab)",
          "• **มาทำไม?** (เป้าหมายของบทสนทนา)",
          "• **เรื่องอะไร?** (หัวข้อ/แนวคิดที่กำลังคุย)",
          "• **กังวลอะไร?** (ความกังวลที่ถูกระบุใน scenario)",
        ].join("\n"),
        coachTip: "**ฟังครั้งแรกอย่ารีบจดทุกอย่างครับ** — สมองจะล้นทันที! เคล็ดลับพี่: จับ **WHO + WHERE** ให้ได้ก่อน (ใคร กับ ที่ไหน) อย่างอื่นจะตามมาเอง ถ้านักเรียนรู้ว่า *\"พนักงานต้อนรับกับลูกค้าที่โรงแรม\"* — นักเรียนเดาได้แล้วว่าจะคุยเรื่อง check-in/check-out ทำให้ฟังรายละเอียดอื่นเข้าใจง่ายขึ้นเยอะครับ",
      },
      {
        heading: "วิธีทำบทนี้",
        body: "กด ▶ ฟัง scenario แล้วตอบ 3 คำถามจากความจำ · เสียงจะไม่เล่นซ้ำอัตโนมัติ — ตั้งใจฟังครั้งแรกให้ดี เหมือนข้อสอบจริง",
        coachTip: "ถ้าฟังพลาด 1 รอบ **ไม่เป็นไรนะครับ** — กดเล่นซ้ำในแบบฝึกได้ แต่อย่าเล่นเกิน **3 รอบ** เพราะในข้อสอบจริง **เล่นได้แค่ครั้งเดียวเท่านั้น!** การฝึกแบบจำกัดรอบจะทำให้สมองชินกับการจับใจความครั้งเดียว ซึ่งเป็นทักษะที่ DET ต้องการครับ",
      },
    ],
    scenarios: [
      {
        id: "s7-1",
        title: "Scenario 1 — Office hours: Research methods",
        scenarioText: SCENARIO_TEXTS.officeHours,
        questions: [
          {
            id: "s7-1-q1",
            prompt: "Who are you speaking with?",
            options: [
              { letter: "A", text: "A classmate" },
              { letter: "B", text: "Your professor" },
              { letter: "C", text: "An academic advisor" },
              { letter: "D", text: "A lab partner" },
            ],
            correctLetter: "B",
          },
          {
            id: "s7-1-q2",
            prompt: "Why are you speaking with this person?",
            options: [
              { letter: "A", text: "To submit a late assignment" },
              { letter: "B", text: "To clarify a concept before an exam" },
              { letter: "C", text: "To complain about a grade" },
              { letter: "D", text: "To ask for an extension" },
            ],
            correctLetter: "B",
          },
          {
            id: "s7-1-q3",
            prompt: "What subject is the discussion about?",
            options: [
              { letter: "A", text: "Chemistry" },
              { letter: "B", text: "English literature" },
              { letter: "C", text: "Psychology / research methods" },
              { letter: "D", text: "Economics" },
            ],
            correctLetter: "C",
          },
        ],
      },
      {
        id: "s7-2",
        title: "Scenario 2 — Group project: Literature review",
        scenarioText: SCENARIO_TEXTS.groupProject,
        questions: [
          {
            id: "s7-2-q1",
            prompt: "Who are you speaking with?",
            options: [
              { letter: "A", text: "Your professor" },
              { letter: "B", text: "A classmate named Jordan" },
              { letter: "C", text: "A librarian" },
              { letter: "D", text: "Your roommate" },
            ],
            correctLetter: "B",
          },
          {
            id: "s7-2-q2",
            prompt: "Why are you speaking with this person?",
            options: [
              { letter: "A", text: "To borrow notes from a missed class" },
              { letter: "B", text: "To discuss which books to read" },
              { letter: "C", text: "To divide tasks for a group paper" },
              { letter: "D", text: "To find a new group member" },
            ],
            correctLetter: "C",
          },
          {
            id: "s7-2-q3",
            prompt: "What subject is the discussion about?",
            options: [
              { letter: "A", text: "Psychology" },
              { letter: "B", text: "English literature (post-colonial fiction)" },
              { letter: "C", text: "Chemistry" },
              { letter: "D", text: "Economics" },
            ],
            correctLetter: "B",
          },
        ],
      },
      {
        id: "s7-3",
        title: "Scenario 3 — Academic advisor: Course selection",
        scenarioText: SCENARIO_TEXTS.advisor,
        questions: [
          {
            id: "s7-3-q1",
            prompt: "Who are you speaking with?",
            options: [
              { letter: "A", text: "A classmate" },
              { letter: "B", text: "Your professor" },
              { letter: "C", text: "Your academic advisor, Ms. Chen" },
              { letter: "D", text: "The dean of the university" },
            ],
            correctLetter: "C",
          },
          {
            id: "s7-3-q2",
            prompt: "Why are you speaking with this person?",
            options: [
              { letter: "A", text: "To change your major" },
              { letter: "B", text: "To appeal a failed course" },
              { letter: "C", text: "To get help choosing elective courses" },
              { letter: "D", text: "To apply for a scholarship" },
            ],
            correctLetter: "C",
          },
          {
            id: "s7-3-q3",
            prompt: "What is your main concern going into this conversation?",
            options: [
              { letter: "A", text: "Whether the courses count toward your degree (and your workload)" },
              { letter: "B", text: "Whether you can graduate early" },
              { letter: "C", text: "Whether your tuition will increase" },
              { letter: "D", text: "Whether you can switch universities" },
            ],
            correctLetter: "A",
          },
        ],
      },
      {
        id: "s7-4",
        title: "Scenario 4 — Lab partner: Experiment preparation",
        scenarioText: SCENARIO_TEXTS.labPartner,
        questions: [
          {
            id: "s7-4-q1",
            prompt: "Who are you speaking with?",
            options: [
              { letter: "A", text: "Your professor" },
              { letter: "B", text: "Your lab partner, Marcus" },
              { letter: "C", text: "The lab technician" },
              { letter: "D", text: "A study group classmate" },
            ],
            correctLetter: "B",
          },
          {
            id: "s7-4-q2",
            prompt: "Why are you contacting this person?",
            options: [
              { letter: "A", text: "To cancel the lab session" },
              { letter: "B", text: "To get information you missed due to illness" },
              { letter: "C", text: "To ask them to do your part of the experiment" },
              { letter: "D", text: "To confirm the lab room location" },
            ],
            correctLetter: "B",
          },
          {
            id: "s7-4-q3",
            prompt: "What two things do you need to find out?",
            options: [
              { letter: "A", text: "The grade weighting and the room number" },
              { letter: "B", text: "What materials to bring and the steps of the experiment" },
              { letter: "C", text: "Who else is in the group and when the deadline is" },
              { letter: "D", text: "The teacher's office hours and exam dates" },
            ],
            correctLetter: "B",
          },
        ],
      },
      {
        id: "s7-5",
        title: "Scenario 5 — Study group: Exam preparation",
        scenarioText: SCENARIO_TEXTS.studyGroup,
        questions: [
          {
            id: "s7-5-q1",
            prompt: "Who are you meeting with?",
            options: [
              { letter: "A", text: "Your professor" },
              { letter: "B", text: "Two classmates (Priya and Daniel)" },
              { letter: "C", text: "An academic advisor" },
              { letter: "D", text: "Your tutor" },
            ],
            correctLetter: "B",
          },
          {
            id: "s7-5-q2",
            prompt: "Why are you meeting with them?",
            options: [
              { letter: "A", text: "To work on a take-home assignment together" },
              { letter: "B", text: "To teach them concepts they don't understand" },
              { letter: "C", text: "To prepare for an upcoming midterm exam" },
              { letter: "D", text: "To complain about the course difficulty" },
            ],
            correctLetter: "C",
          },
          {
            id: "s7-5-q3",
            prompt: "What subject is the discussion about?",
            options: [
              { letter: "A", text: "Psychology" },
              { letter: "B", text: "English literature" },
              { letter: "C", text: "Chemistry" },
              { letter: "D", text: "Economics" },
            ],
            correctLetter: "D",
          },
        ],
      },
    ],
  };

  // Session 8 — same scenarios, but the 3rd question is the conversation OPENER (MC).
  const session8: MiniStudyListeningMcSession = {
    id: "session-8",
    index: 8,
    title: "Interactive listening — first 2 turns of the conversation",
    subtitle: "15 นาที · เลือก opener ที่ตรงกับ scenario",
    durationLabel: "≈ 15 min",
    kind: "interactive-listening-mc",
    category: "listening",
    tierRequired: "premium",
    shortHookTh: "คำตอบ 2 turn แรกต้องตรง Scenario ไม่ใช่แค่ฟังดูดีในชีวิตประจำวัน",
    explanation: [
      {
        heading: "บทเรียน (Thai)",
        body: [
          "ในเซสชันนี้เราจะฝึก **ตอบ 2 คำถามแรกของ interactive conversation**",
          "สิ่งสำคัญที่สุด: ข้อสอบ **ไม่ได้แค่วัดว่าเข้าใจคำถาม** — มันวัดว่า **เข้าใจ scenario** ด้วย",
          "ต้องเริ่มบทสนทนาให้ถูกต้องตาม **บริบทของ scenario** ไม่ใช่ตามว่าฟังดู \"พอใช้ได้\" ในชีวิตประจำวัน",
          "วิธีคิด: ก่อนเลือกคำตอบทุกครั้ง ถามตัวเองว่า — ฉันเป็นใคร · ฉันคุยกับใคร · ฉันมาที่นี่เพื่ออะไร",
        ].join("\n"),
        coachTip: "เคล็ดลับฝึกสมองให้เร็วขึ้นครับ: **ฟัง turn แรกเสร็จ → หยุดสักครู่ → ลองทาย turn ถัดไปในใจก่อนกดดูเฉลย** ฝึกแบบนี้บ่อยๆ นักเรียนจะเริ่มคาดเดา pattern ของบทสนทนาได้เอง เพราะภาษาอังกฤษมี **conversational pattern** ที่ค่อนข้างตายตัว เช่น *\"How are you?\" → \"I'm fine, thanks. And you?\"* รู้ pattern = ฟังเข้าใจไวขึ้น 2 เท่าครับ",
      },
      {
        heading: "วิธีทำบทนี้",
        body: "ฟัง scenario ของแต่ละข้อ แล้วตอบคำถาม who · why · opener · **opener คือประโยคแรกที่จะใช้เริ่มบทสนทนา** อย่าเลือกแค่ \"ฟังดูเป็นธรรมชาติ\" — ให้เลือกตัวที่ **ตรงกับ scenario** เท่านั้น",
        coachTip: "ฟัง **intonation** (น้ำเสียงขึ้น/ลง) ด้วยนะครับ — บางครั้งคำตอบอยู่ที่ tone ไม่ใช่ที่คำพูด ถ้าเสียงปลายประโยคขึ้น → เป็นคำถาม รอคำตอบ ถ้าเสียงลง → เป็นคำบอกเล่า รอคำตอบรับ การฟัง intonation ช่วยให้นักเรียนเลือกคำตอบที่เป็นธรรมชาติได้แม่นขึ้นมากครับ",
      },
    ],
    scenarios: [
      {
        id: "s8-1",
        title: "Scenario 1 — Office hours: Research methods",
        scenarioText: SCENARIO_TEXTS.officeHours,
        thaiInstruction: TH_LISTEN_INSTRUCTION,
        questions: [
          {
            id: "s8-1-q1",
            prompt: "Who are you speaking with?",
            options: [
              { letter: "A", text: "A classmate" },
              { letter: "B", text: "Your professor" },
              { letter: "C", text: "Your academic advisor" },
              { letter: "D", text: "A lab partner" },
            ],
            correctLetter: "B",
          },
          {
            id: "s8-1-q2",
            prompt: "Why are you speaking with this person?",
            options: [
              { letter: "A", text: "To submit a late assignment" },
              { letter: "B", text: "To clarify a concept before an exam" },
              { letter: "C", text: "To complain about a grade" },
              { letter: "D", text: "To ask for an extension" },
            ],
            correctLetter: "B",
          },
          {
            id: "s8-1-q3",
            prompt: "What do you say to start the conversation?",
            options: [
              { letter: "A", text: "\"I wanted to ask about the homework you gave us.\"" },
              { letter: "B", text: "\"Hi, I was hoping you could help me understand confounding variables.\"" },
              { letter: "C", text: "\"I think there might be a mistake in my grade.\"" },
              { letter: "D", text: "\"Can I get more time to finish my assignment?\"" },
            ],
            correctLetter: "B",
          },
        ],
      },
      {
        id: "s8-2",
        title: "Scenario 2 — Group project: Literature review",
        scenarioText: SCENARIO_TEXTS.groupProject,
        thaiInstruction: TH_LISTEN_INSTRUCTION,
        questions: [
          {
            id: "s8-2-q1",
            prompt: "Who are you meeting with?",
            options: [
              { letter: "A", text: "Your professor" },
              { letter: "B", text: "A classmate named Jordan" },
              { letter: "C", text: "A librarian" },
              { letter: "D", text: "Your tutor" },
            ],
            correctLetter: "B",
          },
          {
            id: "s8-2-q2",
            prompt: "Why are you meeting with this person?",
            options: [
              { letter: "A", text: "To borrow notes from a missed class" },
              { letter: "B", text: "To discuss which books to read for the course" },
              { letter: "C", text: "To divide the tasks for a group paper" },
              { letter: "D", text: "To find a replacement group member" },
            ],
            correctLetter: "C",
          },
          {
            id: "s8-2-q3",
            prompt: "What do you say to start the conversation?",
            options: [
              { letter: "A", text: "\"Hey Jordan, should we just split the paper into three equal parts?\"" },
              { letter: "B", text: "\"Hi, did you finish reading all the books already?\"" },
              { letter: "C", text: "\"Jordan, I think we need a new group member.\"" },
              { letter: "D", text: "\"Can you share your notes from last week's class?\"" },
            ],
            correctLetter: "A",
          },
        ],
      },
      {
        id: "s8-3",
        title: "Scenario 3 — Academic advisor: Course selection",
        scenarioText: SCENARIO_TEXTS.advisor,
        thaiInstruction: TH_LISTEN_INSTRUCTION,
        questions: [
          {
            id: "s8-3-q1",
            prompt: "Who are you speaking with?",
            options: [
              { letter: "A", text: "A classmate" },
              { letter: "B", text: "Your professor" },
              { letter: "C", text: "Your academic advisor, Ms. Chen" },
              { letter: "D", text: "The dean of the university" },
            ],
            correctLetter: "C",
          },
          {
            id: "s8-3-q2",
            prompt: "Why are you speaking with this person?",
            options: [
              { letter: "A", text: "To appeal a failed course from last semester" },
              { letter: "B", text: "To get advice on choosing elective courses" },
              { letter: "C", text: "To apply for a scholarship for next year" },
              { letter: "D", text: "To request a change of major" },
            ],
            correctLetter: "B",
          },
          {
            id: "s8-3-q3",
            prompt: "What do you say to start the conversation?",
            options: [
              { letter: "A", text: "\"I'd like to appeal my grade from last semester.\"" },
              { letter: "B", text: "\"I'm thinking of changing my major, can you help?\"" },
              { letter: "C", text: "\"Hi Ms. Chen, I need some help figuring out which electives to take next semester.\"" },
              { letter: "D", text: "\"I wanted to ask about scholarship opportunities.\"" },
            ],
            correctLetter: "C",
          },
        ],
      },
      {
        id: "s8-4",
        title: "Scenario 4 — Lab partner: Experiment preparation",
        scenarioText: SCENARIO_TEXTS.labPartner,
        thaiInstruction: TH_LISTEN_INSTRUCTION,
        questions: [
          {
            id: "s8-4-q1",
            prompt: "Who are you calling?",
            options: [
              { letter: "A", text: "Your professor" },
              { letter: "B", text: "Your lab partner, Marcus" },
              { letter: "C", text: "The lab technician" },
              { letter: "D", text: "Your roommate" },
            ],
            correctLetter: "B",
          },
          {
            id: "s8-4-q2",
            prompt: "Why are you calling this person?",
            options: [
              { letter: "A", text: "To cancel your part of the lab experiment" },
              { letter: "B", text: "To get the lab instructions you missed while sick" },
              { letter: "C", text: "To confirm the time and location of the lab" },
              { letter: "D", text: "To ask him to bring extra materials for you" },
            ],
            correctLetter: "B",
          },
          {
            id: "s8-4-q3",
            prompt: "What do you say to start the conversation?",
            options: [
              { letter: "A", text: "\"Hey Marcus, are you going to the lab next week?\"" },
              { letter: "B", text: "\"Hi Marcus, I was sick during the briefing — can you fill me in on what we need to do?\"" },
              { letter: "C", text: "\"Marcus, I don't think I can make it to the lab next week.\"" },
              { letter: "D", text: "\"Hey, can you bring my materials to the lab for me?\"" },
            ],
            correctLetter: "B",
          },
        ],
      },
      {
        id: "s8-5",
        title: "Scenario 5 — Study group: Exam preparation",
        scenarioText: SCENARIO_TEXTS.studyGroup,
        thaiInstruction: TH_LISTEN_INSTRUCTION,
        questions: [
          {
            id: "s8-5-q1",
            prompt: "Who are you meeting with?",
            options: [
              { letter: "A", text: "Your professor" },
              { letter: "B", text: "Two classmates, Priya and Daniel" },
              { letter: "C", text: "Your tutor" },
              { letter: "D", text: "Your academic advisor" },
            ],
            correctLetter: "B",
          },
          {
            id: "s8-5-q2",
            prompt: "Why are you meeting with them?",
            options: [
              { letter: "A", text: "To work on a group assignment due this week" },
              { letter: "B", text: "To study together for an upcoming midterm exam" },
              { letter: "C", text: "To teach them the concepts they are struggling with" },
              { letter: "D", text: "To discuss which topics will appear on the exam" },
            ],
            correctLetter: "B",
          },
          {
            id: "s8-5-q3",
            prompt: "What do you say to start the conversation?",
            options: [
              { letter: "A", text: "\"Hey guys, did either of you finish the assignment?\"" },
              { letter: "B", text: "\"I think we should start with market equilibrium since that's the hardest part.\"" },
              { letter: "C", text: "\"Do you guys know what topics are going to be on the exam?\"" },
              { letter: "D", text: "\"Should we ask the professor for more time to study?\"" },
            ],
            correctLetter: "B",
          },
        ],
      },
    ],
  };

  const session9: MiniStudyListenRespondSession = {
    id: "session-9",
    index: 9,
    title: "Listen & Respond — choose the best reply",
    subtitle: "15 นาที · กลยุทธ์ + 5 ข้อฝึก turn-by-turn",
    durationLabel: "≈ 15 min",
    kind: "listen-respond",
    category: "listening",
    tierRequired: "premium",
    shortHookTh: "เทคนิค Opener Elimination — ตัดตัวเลือกผิดได้ใน 5 วินาที",
    explanation: [
      {
        heading: "ส่วนที่ 1 — DET วัดอะไรจริงๆ",
        body: [
          "ข้อสอบ **Listen & Respond** ไม่ได้วัดว่าคุณรู้ภาษาอังกฤษเยอะแค่ไหน",
          "แต่วัดว่าคุณ **ฟังแล้วเข้าใจสถานการณ์** และ **เลือกสิ่งที่พูดได้เหมาะสมที่สุด**",
          "",
          "คำตอบที่ถูกต้องต้องผ่าน 3 ข้อพร้อมกัน:",
          "✅ **ตรงกับสิ่งที่อีกฝ่ายพึ่งพูด**",
          "✅ **สอดคล้องกับ scenario** (บริบทตั้งต้น)",
          "✅ **เหมาะกับความสัมพันธ์** (อาจารย์ vs. เพื่อน)",
          "",
          "ถ้าผ่านแค่ 1 หรือ 2 ข้อ — ยังผิดอยู่",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 2 — ตัวเลือกที่ผิดมักผิดใน 3 แบบเสมอ",
        body: [
          "**❌ ผิดหัวข้อ (Wrong Topic)** — ฟังดูสมเหตุสมผล แต่พูดเรื่องอื่น",
          "  *เช่น อาจารย์อธิบาย confounding variables แต่คุณตอบว่า \"So when will the exam results be posted?\"*",
          "  วิธีจับ: \"คำตอบนี้ตอบสนองต่อประโยคล่าสุดของอีกฝ่ายไหม?\"",
          "",
          "**❌ ผิดทิศทาง (Wrong Direction)** — หัวข้อเดียวกัน แต่ขัดกับ scenario",
          "  *เช่น scenario บอกว่าคุณกังวลภาระงาน แต่คุณตอบว่า \"I want to take both courses to finish faster\"*",
          "  วิธีจับ: \"คำตอบนี้ขัดกับสิ่งที่ scenario บอกเกี่ยวกับตัวเราไหม?\"",
          "",
          "**❌ ผิด register (Wrong Register)** — ถูกเรื่อง แต่ tone ไม่เหมาะ",
          "  *เช่น พูดกับอาจารย์แบบสบายๆ เกินไป*",
          "  วิธีจับ: \"ถ้าเกิดเรื่องนี้จริงในชีวิต เราจะพูดแบบนี้ได้ไหม?\"",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 3 — กลยุทธ์หลัก: อ่านจากปลายก่อน",
        body: [
          "**🎯 Opener Elimination** — อ่านแค่ประโยคแรกของแต่ละตัวเลือก ถ้าเริ่มต้นไม่สมเหตุสมผล ตัดทิ้งได้เลย",
          "**🎯 อ่านทุกตัวเลือกให้จบ** — ห้ามเลือกตัวเลือกแรกที่ \"ฟังดูโอเค\" คำตอบที่ถูกคือ \"ดีที่สุด\" ไม่ใช่ \"พอใช้ได้\"",
          "**🎯 จำ scenario ไว้ตลอด** — ก่อนเลือกทุกครั้ง ถามตัวเอง: \"ฉันเป็นใคร? · ฉันมาทำไม? · ฉันคุยกับใคร?\"",
          "ถ้าคำตอบขัดกับข้อใดข้อหนึ่ง — ผิดแน่นอน",
        ].join("\n"),
        coachTip: "**เทคนิคนี้ช่วยพี่ผ่าน DET ครั้งแรกครับ** — อ่าน choice **ปลายประโยคก่อนเสมอ** เพราะปลายประโยคบอกว่าคำตอบเกี่ยวกับอะไร (action, place, time, person) เมื่อนักเรียนรู้ \"หมวด\" ของแต่ละ choice แล้ว → ตอนฟังบทสนทนา นักเรียนจะจับ keyword ได้แม่นขึ้น พี่ลองสอนนักเรียนเทคนิคนี้ — ทุกคนคะแนน Listening ขยับขึ้นในรอบเดียวครับ",
      },
      {
        heading: "ส่วนที่ 4 — กลยุทธ์สำหรับคำถามท้ายบทสนทนา",
        body: [
          "• **เลื่อนขึ้นไปอ่าน scenario ซ้ำ** ก่อนตอบทุกครั้ง — DET จริงเลื่อนขึ้นได้เสมอ",
          "• **ติดตาม flow** — ถ้ากำลังจะสรุป คำตอบที่ดีต้องช่วย **ปิด** บทสนทนา ไม่ใช่เปิดหัวข้อใหม่",
          "• **ระวังตัวเลือกที่วกกลับ** — ถ้าผ่านหัวข้อหนึ่งไปแล้ว ตัวเลือกที่ดึงกลับมักจะผิด",
          "• **ถ้าเลือกผิด อย่าตกใจ** — อ่านคำอธิบายให้เข้าใจก่อนไปข้อต่อไป",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 5 — Checklist ก่อนกดเลือก (ทุกครั้ง)",
        body: [
          "☐ คำตอบนี้ตอบสนองต่อสิ่งที่อีกฝ่ายพึ่งพูดไหม?",
          "☐ คำตอบนี้สอดคล้องกับ scenario ไหม?",
          "☐ tone เหมาะกับความสัมพันธ์ไหม? (อาจารย์ / เพื่อน / ที่ปรึกษา)",
          "☐ คำตอบนี้ช่วยให้บทสนทนาเดินหน้าไปในทิศทางที่ถูกไหม?",
          "",
          "ผ่าน 4 ข้อ → เลือกได้เลย",
        ].join("\n"),
        coachTip: "ถ้าเหลือ 2 ตัวเลือกแล้วลังเลมาก — **เลือกตัวที่สั้นกว่า** และ **เป็นธรรมชาติกว่า** มักจะถูกครับ! เพราะ DET ออกแบบ choice ที่ผิดให้ดู \"ฟุ่มเฟือย\" หรือใส่ข้อมูลเกินจำเป็น คำตอบที่ถูกมักจะกระชับและตรงประเด็น เคล็ดลับเสริม: ถ้า choice ไหนใช้คำศัพท์ \"หรู\" เกินไปสำหรับบทสนทนาธรรมดา → ตัดทิ้งได้เลยครับ",
      },
    ],
    exercises: [
      {
        id: "s9-1",
        title: "Exercise 1 — Office hours (Turn 5 of 6)",
        scenarioRecapTh:
          "คุณเป็นนักศึกษาปี 2 วิชาจิตวิทยา กำลังพบอาจารย์ในเวลา office hours เพื่อถามเรื่อง confounding variables ก่อนสอบ",
        conversationSoFar: [
          { speaker: "You", text: "Hi, I was hoping you could help me understand confounding variables." },
          { speaker: "Professor", text: "Of course! A confounding variable is a third variable that affects both the independent and dependent variable, which can distort your results." },
          { speaker: "You", text: "So it's like something that influences both variables without you realizing it?" },
          { speaker: "Professor", text: "Exactly. For example, if you're studying whether coffee improves focus, stress could be a confounding variable because stressed people drink more coffee and also focus less." },
        ],
        turnLabel: "Turn 5 — Professor speaks",
        audioText:
          "Does that example help clarify things? I want to make sure you're feeling confident before your exam.",
        question: "What do you say?",
        options: [
          {
            letter: "A",
            text: "\"Yes, that's really helpful. So should I just avoid coffee before the exam?\"",
            explanationTh: "เข้าใจผิดเรื่อง confounding variables และพูดเรื่องกาแฟก่อนสอบซึ่งไม่เกี่ยวกับ scenario",
          },
          {
            letter: "B",
            text: "\"Thank you, that makes much more sense. Could you give me one more example so I can practice identifying them myself?\"",
            explanationTh: "ตอบรับคำอธิบายอย่างสุภาพและขอต่อยอดความเข้าใจ ตรงกับวัตถุประสงค์ของการมาพบอาจารย์ (เตรียมสอบ)",
          },
          {
            letter: "C",
            text: "\"I think I understand. By the way, do you know when the exam results will be posted?\"",
            explanationTh: "เปลี่ยนหัวข้อไปถามเรื่องผลสอบ ไม่สอดคล้องกับบทสนทนาที่กำลังดำเนินอยู่",
          },
          {
            letter: "D",
            text: "\"Yes! So does that mean confounding variables always involve food or drinks?\"",
            explanationTh: "ตีความตัวอย่างผิดและแสดงว่าไม่เข้าใจคำอธิบาย",
          },
        ],
        correctLetter: "B",
      },
      {
        id: "s9-2",
        title: "Exercise 2 — Group project (Turn 4 of 6)",
        scenarioRecapTh:
          "คุณเป็นนักศึกษาปริญญาโทวิชา English Literature กำลังประชุมกับเพื่อนชื่อ Jordan ที่ห้องสมุด เพื่อแบ่งงาน group paper เรื่อง post-colonial fiction",
        conversationSoFar: [
          { speaker: "You", text: "Hey Jordan, should we just split the paper into three equal parts?" },
          { speaker: "Jordan", text: "I was thinking the same. Maybe one person does the introduction and literature review, one does the analysis, and one does the conclusion?" },
          { speaker: "You", text: "That sounds fair. I'm pretty good at analysis so I'd be happy to take that section." },
        ],
        turnLabel: "Turn 4 — Jordan speaks",
        audioText:
          "Great, that works for me. I'll take the introduction and literature review then. But we still need to decide on a deadline for each section so we can review each other's work before submitting.",
        question: "What do you say?",
        options: [
          {
            letter: "A",
            text: "\"Good idea. How about we each finish our sections by next Friday and then meet again to review?\"",
            explanationTh: "เสนอวันส่งงานที่ชัดเจน สอดคล้องกับที่ Jordan พึ่งพูดเรื่องนัด review",
          },
          {
            letter: "B",
            text: "\"Sure, but I think we should just submit whatever we have by the end of the month.\"",
            explanationTh: "ไม่ตอบรับเรื่อง internal deadline และแสดงทัศนคติที่ไม่ใส่ใจคุณภาพงาน",
          },
          {
            letter: "C",
            text: "\"Actually, can we change the topic? I don't think post-colonial fiction is interesting enough.\"",
            explanationTh: "เปลี่ยนหัวข้อโดยสิ้นเชิง ขัดแย้งกับ scenario ที่กำหนดหัวข้องานไว้แล้ว",
          },
          {
            letter: "D",
            text: "\"I agree. Should we ask the professor to extend the deadline for us?\"",
            explanationTh: "เบี่ยงประเด็นออกจากการจัดการภายในกลุ่ม ไม่ตอบสนองต่อสิ่งที่ Jordan พูด",
          },
        ],
        correctLetter: "A",
      },
      {
        id: "s9-3",
        title: "Exercise 3 — Academic advisor (Turn 5 of 6)",
        scenarioRecapTh:
          "คุณเป็นนักศึกษาปี 1 ต่างชาติ กำลังพบ Ms. Chen ที่ปรึกษา เพื่อขอคำแนะนำเรื่อง elective courses ภาคหน้า และกังวลว่าภาระงานจะหนักเกินไป",
        conversationSoFar: [
          { speaker: "You", text: "Hi Ms. Chen, I need some help figuring out which electives to take next semester." },
          { speaker: "Ms. Chen", text: "Of course! Can you tell me which electives you're considering?" },
          { speaker: "You", text: "I was thinking about Introduction to Sociology and Creative Writing. But I'm not sure if both of them count toward my degree." },
          { speaker: "Ms. Chen", text: "Both of those count as general education credits, so they'll definitely apply to your degree requirements. They're also fairly manageable courses." },
        ],
        turnLabel: "Turn 5 — Ms. Chen speaks",
        audioText:
          "Given that you mentioned being worried about your workload, I'd suggest taking just one of them next semester and saving the other for later. What do you think?",
        question: "What do you say?",
        options: [
          {
            letter: "A",
            text: "\"That makes sense. I'll probably go with Introduction to Sociology since I've always been interested in that subject.\"",
            explanationTh: "ตอบรับคำแนะนำของ Ms. Chen และให้เหตุผลที่สมเหตุสมผล สอดคล้องกับ scenario",
          },
          {
            letter: "B",
            text: "\"Actually, I want to take both because I need to finish my degree faster.\"",
            explanationTh: "ขัดแย้งกับ scenario ที่ระบุชัดว่าคุณกังวลเรื่องภาระงาน",
          },
          {
            letter: "C",
            text: "\"Okay. Can you also tell me how to apply for a scholarship?\"",
            explanationTh: "เปลี่ยนหัวข้อไปถามเรื่องทุน ไม่เกี่ยวกับการสนทนาที่กำลังดำเนินอยู่",
          },
          {
            letter: "D",
            text: "\"I think I'll just take whichever one my friends are taking.\"",
            explanationTh: "ตอบโดยไม่ใช้ดุลยพินิจ ไม่เหมาะกับบริบทการพบที่ปรึกษาอย่างเป็นทางการ",
          },
        ],
        correctLetter: "A",
      },
      {
        id: "s9-4",
        title: "Exercise 4 — Lab partner (Turn 4 of 5)",
        scenarioRecapTh:
          "คุณเป็นนักศึกษาเคมีปี 2 โทรหา Marcus เพราะคุณป่วยและพลาด pre-lab briefing ต้องการรู้ว่าต้องเตรียมอะไรและทำอะไรบ้าง",
        conversationSoFar: [
          { speaker: "You", text: "Hi Marcus, I was sick during the briefing — can you fill me in on what we need to do?" },
          { speaker: "Marcus", text: "Sure! So it's a titration experiment. You'll need to bring your lab coat, safety goggles, and a calculator." },
          { speaker: "You", text: "Got it. And what about the actual procedure — what are the main steps?" },
        ],
        turnLabel: "Turn 4 — Marcus speaks",
        audioText:
          "Basically, you'll be adding a sodium hydroxide solution drop by drop into an acid until you hit the equivalence point. The indicator will change color when you get there. It sounds harder than it is, honestly.",
        question: "What do you say?",
        options: [
          {
            letter: "A",
            text: "\"That actually sounds manageable. Should I review the titration formula before we start, just to be safe?\"",
            explanationTh: "แสดงว่าเข้าใจขั้นตอนและคิดเชิงรุกในการเตรียมตัว ตรงกับเหตุผลที่โทรหา Marcus",
          },
          {
            letter: "B",
            text: "\"Wait, so we're doing this experiment alone or in pairs?\"",
            explanationTh: "ถามเรื่องที่ไม่เกี่ยวกับขั้นตอนที่ Marcus พึ่งอธิบาย",
          },
          {
            letter: "C",
            text: "\"Okay, but I don't think I can come to the lab next week after all.\"",
            explanationTh: "ขัดแย้งกับ scenario ที่ระบุว่าคุณกำลังเตรียมตัวไปทำ lab",
          },
          {
            letter: "D",
            text: "\"I'm not sure I understand. What is sodium hydroxide?\"",
            explanationTh: "แสดงระดับความรู้ที่ต่ำเกินไปสำหรับนักศึกษาเคมีปี 2",
          },
        ],
        correctLetter: "A",
      },
      {
        id: "s9-5",
        title: "Exercise 5 — Study group (Turn 6 of 6)",
        scenarioRecapTh:
          "คุณเป็นนักศึกษาวิชา Economics กำลังนั่ง study กับ Priya และ Daniel ที่ร้านกาแฟ เพื่อเตรียมสอบ midterm ใน 3 วัน",
        conversationSoFar: [
          { speaker: "You", text: "I think we should start with market equilibrium since that's the hardest part." },
          { speaker: "Priya", text: "Agreed. Daniel, do you want to explain it first since you said you understood it well?" },
          { speaker: "Daniel", text: "Sure. So market equilibrium is the point where the quantity supplied equals the quantity demanded, and the price stabilizes." },
          { speaker: "You", text: "Right, and when something shifts — like a new tax — the equilibrium point moves, which changes both the price and the quantity." },
          { speaker: "Priya", text: "Exactly. Okay, I think I've got equilibrium now. Should we move on to elasticity?" },
        ],
        turnLabel: "Turn 6 — Daniel speaks",
        audioText:
          "Yeah let's do elasticity. Actually, before we do — does anyone have good notes on it? Mine are kind of messy from the lecture.",
        question: "What do you say?",
        options: [
          {
            letter: "A",
            text: "\"I have pretty clear notes on elasticity. It's basically about how sensitive demand or supply is to a price change — I can walk us through it.\"",
            explanationTh: "ตอบรับ Daniel โดยตรง มีส่วนร่วมในกลุ่มอย่างเป็นประโยชน์ ต่อเนื่องจาก flow",
          },
          {
            letter: "B",
            text: "\"I don't have my notes either, so maybe we should just skip elasticity.\"",
            explanationTh: "ละทิ้งหัวข้อใน scenario ขัดกับเป้าหมายของ study group",
          },
          {
            letter: "C",
            text: "\"Sure, but can we also review supply and demand again? I'm still confused about that.\"",
            explanationTh: "เบี่ยงออกจากสิ่งที่ Daniel พึ่งถาม",
          },
          {
            letter: "D",
            text: "\"I don't think elasticity will be on the exam, so let's not worry about it.\"",
            explanationTh: "ตัดสินใจแทนกลุ่มและขัดกับ scenario ที่ระบุว่า elasticity เป็นหัวข้อสอบ",
          },
        ],
        correctLetter: "A",
      },
    ],
  };

  const session10: MiniStudyConversationSummarySession = {
    id: "session-10",
    index: 10,
    title: "Summarize the Conversation — 75 seconds",
    subtitle: "Pattern + Gemini ตรวจให้ + บันทึก notebook",
    durationLabel: "≈ 15 min",
    kind: "conversation-summary",
    category: "writing",
    tierRequired: "premium",
    shortHookTh: "Pattern 3 ประโยค + Gemini ตรวจ บอกจุดอ่อนเป็นไทย บันทึก notebook",
    explanation: [
      {
        heading: "ส่วนที่ 1 — ทำไมต้องมี pattern?",
        body: [
          "• เวลาแค่ **75 วินาที** ไม่มีเวลาคิดว่าจะเริ่มเขียนยังไง",
          "• นักศึกษาส่วนใหญ่เสียเวลาไปกับการนึกประโยคแรก เหลือเวลาน้อยสำหรับประโยคที่เหลือ",
          "• ถ้ามี pattern จำขึ้นใจ สมองไม่ต้องคิดโครงสร้าง คิดแค่ว่าจะใส่ข้อมูลอะไรลงไป",
          "• Pattern ที่ดี **ไม่ใช่ท่องประโยคสำเร็จรูป** แต่รู้ว่า ประโยคที่ 1/2/3 พูดเรื่องอะไร",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 2 — ข้อผิดพลาดที่นักศึกษาไทยทำบ่อยที่สุด",
        body: [
          "**❌ ใช้ past tense** — ใช้ **present simple** เสมอ (เหมือนสรุปหนังหรือหนังสือ)",
          "  ผิด: *The student talked to her professor about her assignment.*",
          "  ถูก: *The student talks to her professor about her assignment.*",
          "",
          "**❌ เขียนเป็น bullet points** — ต้องเป็น **ประโยคสมบูรณ์** เสมอ",
          "",
          "**❌ ใช้คำศัพท์ยากเกินจำเป็น** — ใช้คำง่ายๆ ที่มั่นใจ ดีกว่าคำยากที่ไม่แน่ใจ",
          "  คำปลอดภัย: *discuss, explain, ask, suggest, decide, agree, want, need, help, understand, plan, finish, review, choose, meet, talk, tell, think, share, find out*",
          "",
          "**❌ ลืมบอก outcome** — summary ที่ดีต้องบอกว่าบทสนทนา **จบยังไง / ตัดสินใจอะไร**",
          "",
          "**❌ เขียนยาวเกินไป** — 3 ประโยคครบถ้วน > 6 ประโยคไวยากรณ์ผิด",
        ].join("\n"),
        coachTip: "**อย่าพูดทุกอย่างที่ได้ยินครับ!** DET ให้คะแนนการ \"สรุป\" ไม่ใช่ \"ทวน\" — พูด **3-4 ประโยคหลัก** พอ ครอบคลุม: **ใคร + ทำอะไร + ผลลัพธ์/สิ่งที่ตกลงกัน** ถ้านักเรียนพูดยาวเกินไป → จะรีบ → ภาษาผิด → เสียคะแนนทั้ง grammar และ pronunciation พี่เห็นนักเรียนเก่ง grammar แต่คะแนน Summary ต่ำเพราะอันนี้บ่อยมากครับ",
      },
      {
        heading: "ส่วนที่ 3 — Transitional words ที่ควรใช้",
        body: [
          "**เริ่มต้น:** In this conversation, … / In the conversation, …",
          "**เพิ่มข้อมูล:** Also, … / In addition, … / Additionally, …",
          "**สรุป/ผลลัพธ์:** In the end, … / Finally, … / As a result, … / They decide to … / They agree to …",
          "**ลำดับ:** After that, … / Then, … / Next, …",
          "**เหตุผล:** because … / so … / since …",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 4 — Pattern ที่ต้องจำ",
        body: [
          "**ประโยคที่ 1 — WHO + WHY**",
          "**ประโยคที่ 2 — WHAT is discussed**",
          "**ประโยคที่ 3 — OUTCOME / decision / next step**",
          "",
          "**Template:**",
          "*In this conversation, [คุณเป็นใคร] [กำลังคุยกับใคร] [เพื่ออะไร]. [Transitional word], [หัวข้อหลักที่คุยกัน]. [Transitional word], [ผลลัพธ์หรือสิ่งที่ตัดสินใจ].*",
          "",
          "**ตัวอย่าง:**",
          "*In this conversation, a student talks to her professor during office hours because she does not understand something from the lecture. The professor explains the concept clearly and gives two simple examples to help her understand. In the end, the student feels much more confident and thanks the professor before leaving.*",
          "",
          "สังเกต: ใช้ present simple ตลอด · ใช้ transitional words · ใช้คำง่ายๆ · 3 ประโยคครบ who/why + what + outcome",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 5 — บริหารเวลา 75 วินาที",
        body: [
          "• **0–10s** — อ่าน scenario/บทสนทนาเร็วๆ จับ 3 สิ่ง: ใคร · เรื่องอะไร · จบยังไง",
          "• **10–60s** — เขียน 3 ประโยคตาม pattern",
          "• **60–75s** — อ่านทวนและแก้ tense ที่ผิด",
        ].join("\n"),
        coachTip: "**ใช้ 10 วินาทีแรกในการคิด อย่าเพิ่งพูดทันทีครับ** — คุณภาพประโยคสำคัญกว่าจำนวน! แบ่งเวลาคร่าวๆ: 10 วินาทีคิด → 50 วินาทีพูด → 15 วินาทีสำรอง ถ้านักเรียนเริ่มพูดทันทีโดยไม่คิด สมองจะวนคำซ้ำ ใช้เวลาแรกตั้งสติ เลือก pattern ที่จะใช้ แล้วค่อยเริ่มครับ",
      },
    ],
    conversation: [
      { speaker: "You", text: "I think we should start with market equilibrium since that feels like the hardest topic." },
      { speaker: "Priya", text: "Agreed. Daniel, do you want to explain it first since you said you understood it well?" },
      { speaker: "Daniel", text: "Sure! So basically, it is the point where the amount people want to buy matches the amount available to buy. The price stops moving at that point." },
      { speaker: "You", text: "Right, and if something changes — like a price increase — then the balance shifts and everything adjusts." },
      { speaker: "Priya", text: "Okay, I think I get it now. Should we move on to the next topic?" },
      { speaker: "Daniel", text: "Yeah. Actually, does anyone have good notes on the next part? Mine are a bit messy." },
      { speaker: "You", text: "I have pretty clear notes. I can walk us through it." },
      { speaker: "Priya", text: "Perfect. Let's keep going — we still have one more topic after this before the exam." },
    ],
    instructionsTh:
      "อ่านบทสนทนาด้านบนให้จบ แล้วเขียน summary ภาษาอังกฤษ **3 ประโยค** โดยใช้ pattern ที่เรียนมา ใช้เวลาไม่เกิน 75 วินาที **ห้ามดู template ระหว่างเขียน**",
  };

  const session11: MiniStudyEssayPickSession = buildSession11();
  const session12: MiniStudyEssayClozeSession = buildSession12();
  const session13: MiniStudyPassageMcSession = buildSession13();
  const session14: MiniStudyPassageMcSession = buildSession14();
  const session15: MiniStudyPassageMcSession = buildSession15();
  const session16: MiniStudyEssayClozeSession = buildSession16();
  return [
    session7,
    session8,
    session9,
    session10,
    session11,
    session12,
    session13,
    session14,
    session15,
    session16,
  ];
}

function buildSession11(): MiniStudyEssayPickSession {
  return {
    id: "session-11",
    index: 11,
    title: "Writing essay — pick the best 70–90 word essay",
    subtitle: "บทเรียน essay patterns + 5 ข้อ multi-choice",
    durationLabel: "≈ 15 min",
    kind: "essay-pick",
    category: "writing",
    tierRequired: "vip",
    shortHookTh: "เห็นทันทีว่า Essay ระดับสูงเขียนยังไง — 5 ตัวอย่างเปรียบเทียบ",
    explanation: [
      {
        heading: "ส่วนที่ 1 — 50-word essay ในข้อสอบ DET คืออะไร?",
        body: [
          "• DET มีข้อสอบให้ **เขียน essay สั้นๆ** จากหัวข้อ + เวลาจำกัด",
          "• หัวข้อมักถาม **ความคิดเห็น** เช่น",
          "  *\"Do you prefer studying alone or with others?\"*",
          "  *\"Is it better to live in a city or in the countryside?\"*",
          "• เป้าหมาย: **สื่อสารชัด + ไวยากรณ์ถูก**",
          "• เขียน **70–90 คำ** — ไม่ต้องนับทุกคำ แค่รู้สึกว่าเต็มและครบโครงสร้าง",
          "• **ห้ามอิมโพรไวส์** — ต้องใช้ pattern ที่ฝึกมาเสมอ",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 2 — DET ประเมินอะไร",
        body: [
          "✅ **ความชัดเจน** — อ่านแล้วเข้าใจทันทีว่าคุณคิดอะไร",
          "✅ **ไวยากรณ์ถูก** — ประโยคสมบูรณ์ tense ถูก",
          "✅ **มี stance ชัดเจน** — เลือกข้าง ห้ามกลาง",
          "✅ **โครงสร้างครบ** — มีเปิด เนื้อหา และปิด",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 3 — ข้อผิดพลาดที่ต้องหลีกเลี่ยง",
        body: [
          "**❌ ไม่มี stance** — เขียนกลางๆ",
          "  ผิด: *Both options have advantages and disadvantages.*",
          "  ถูก: *I think living in a city is better because there are more opportunities.*",
          "",
          "**❌ สลับลำดับ Explain ↔ Example** (ร้ายแรงที่สุด)",
          "  ลำดับที่ถูก: **Explain ก่อนเสมอ** แล้วค่อย Example",
          "  ผิด: *For example, I study better at home. I prefer studying alone because I can focus.*",
          "  ถูก: *I prefer studying alone because I can focus better. For example, when I study at home I finish my work much faster.*",
          "",
          "**❌ ใช้คำซับซ้อนโดยไม่จำเป็น** — ไวยากรณ์ถูกสำคัญกว่าคำหรู",
          "**❌ ลืม conclusion** — แค่ 1 ประโยคก็พอ แต่ต้องมี",
          "**❌ copy ประโยคแรกมาเป็น conclusion** — ต้องย้ำ stance ด้วยคำที่ต่างไป",
        ].join("\n"),
        coachTip: "**นับคำให้ครบ 70-90 คำครับ** อย่าน้อยไป อย่าเยอะไป — DET ตัดคะแนนทันทีถ้าหลุดช่วงนี้! เคล็ดลับนับเร็ว: 1 ประโยคทั่วไป ~ 10-15 คำ → 5-7 ประโยค คือ sweet spot ถ้านักเรียนเขียนใน practice แล้วได้ 60 คำ → เพิ่มอีก 1 ประโยค ถ้าได้ 100 คำ → ลบ 1 ประโยคออก ฝึกประเมินสายตาให้เร็วครับ",
      },
      {
        heading: "Pattern 1 — Opinion Essay (5 ส่วน)",
        body: [
          "**1. Introduction** — บอก stance ทันที (**ไม่ต้องใช้** transitional word)",
          "   *I think … because …* / *I prefer … because …* / *In my opinion, … because …*",
          "",
          "**2. Explain** — ขยายเหตุผล (**ต้องเริ่มด้วย** transitional word)",
          "   *This is because …* / *The reason is that …* / *Specifically, …*",
          "",
          "**3. Example** — ยกตัวอย่าง (**มาหลัง Explain เสมอ**)",
          "   *For example, …* / *For instance, …* / *To illustrate, …*",
          "",
          "**4. Mini-conclusion** — ย้ำว่าเหตุผลนี้สำคัญ",
          "   *This shows that …* / *Because of this, …* / *As a result, …*",
          "",
          "**5. Conclusion** — ปิด essay",
          "   *Overall, I think …* / *Therefore, I believe …* / *In conclusion, …*",
        ].join("\n"),
        coachTip: "**ถ้า prompt ถามว่า \"agree/disagree\" หรือ \"do you think…?\"** → ใช้ pattern Opinion นี้ได้เลยครับ ไม่ต้องคิดมาก! Pattern Opinion เหมาะกับคำถามที่ต้องการ \"จุดยืน\" ส่วน Pattern Listing (อันถัดไป) เหมาะกับคำถามที่ถามเหตุผลหลายข้อ เช่น *\"What are the benefits of…?\"* รู้ว่า prompt แบบไหนใช้ pattern ไหน = ตอบเร็วขึ้น 2 เท่าครับ",
      },
      {
        heading: "Pattern 2 — Listing Essay (4 ส่วน)",
        body: [
          "**1. Introduction** — บอก stance + จำนวนเหตุผล",
          "   *There are two main reasons why …* / *I think there are two main benefits of …*",
          "",
          "**2. First reason** — *First, …* / *Firstly, …* / *To begin with, …*",
          "",
          "**3. Second reason** — *Second, …* / *In addition, …* / *Furthermore, …*",
          "",
          "**4. Conclusion** — *Overall, I think …* / *For these reasons, …* / *In conclusion, …*",
        ].join("\n"),
      },
      {
        heading: "ตัวอย่าง — Pattern 1 (Opinion)",
        body:
          "**หัวข้อ:** *Do you prefer studying alone or with others?*\n\n*I prefer studying alone because I can focus much better without distractions. **This is because** when other people are around, it is easy to lose concentration and start talking about unrelated things. **For example**, a one-hour study session with friends sometimes becomes only thirty minutes of actual studying. **This shows that** studying alone helps me use my time more effectively. **Overall, I believe** that studying alone is the better choice for me.*",
      },
      {
        heading: "ตัวอย่าง — Pattern 2 (Listing)",
        body:
          "**หัวข้อ:** *What are the benefits of learning a second language?*\n\n*I think there are two main benefits of learning a second language. **First**, it helps people communicate with more people around the world, which opens up better opportunities in work and travel. **In addition**, learning a new language trains the brain to think in different ways, which can improve memory and problem-solving skills. **For these reasons**, I believe that learning a second language is very valuable for everyone.*",
      },
      {
        heading: "Checklist ก่อนเลือกตัวเลือกในแบบฝึกหัด",
        body: [
          "☐ มี **stance** ชัดเจนตั้งแต่ต้น (ไม่กลาง)",
          "☐ **Explain มาก่อน Example** เสมอ",
          "☐ ทุกส่วนมี **transitional word**",
          "☐ มี **conclusion** ที่ปิด essay (ไม่มีข้อมูลใหม่หลัง Overall/In conclusion)",
        ].join("\n"),
      },
    ],
    exercises: [
      {
        id: "s11-1",
        topic: "Do you prefer living in a city or in the countryside?",
        correctLetter: "B",
        options: [
          {
            letter: "A",
            essayText:
              "Living in a city and living in the countryside both have good points. Cities have more jobs but the countryside is more peaceful. For example, the countryside has fresh air and nature. But cities have better hospitals. I think both are good depending on the person.",
          },
          {
            letter: "B",
            essayText:
              "I prefer living in a city because there are more opportunities for work and education. This is because cities have more companies and public services than rural areas. For example, in a big city there are thousands of job options compared to a small town. This shows that living in a city gives people more choices in life. Overall, I believe that living in a city is the better option.",
          },
          {
            letter: "C",
            essayText:
              "I prefer living in a city. For example, big cities have many job opportunities and universities. This is because cities are more developed. Overall I think cities are better because there are more things to do.",
          },
        ],
        analysisRowsTh: [
          { label: "Stance ชัดเจน", A: "❌ กลางๆ", B: "✅", C: "✅" },
          { label: "Explain ก่อน Example", A: "—", B: "✅", C: "❌ Example ก่อน Explain" },
          { label: "Transitional words ครบ", A: "❌ ขาดหลายส่วน", B: "✅", C: "❌ ขาด mini-conclusion" },
          { label: "มี conclusion", A: "❌", B: "✅", C: "✅" },
        ],
        rationaleTh:
          "A ผิดเพราะไม่มี stance ชัดเจน เขียนกลางๆ ตลอด · C ผิดเพราะสลับลำดับ — ยก Example ก่อน Explain",
      },
      {
        id: "s11-2",
        topic: "What are the benefits of doing exercise regularly?",
        correctLetter: "A",
        options: [
          {
            letter: "A",
            essayText:
              "I think there are two main benefits of exercising regularly. First, it improves physical health by making the heart and muscles stronger. In addition, it also reduces stress and helps people feel happier every day. For these reasons, I believe that exercising regularly is one of the best habits a person can have.",
          },
          {
            letter: "B",
            essayText:
              "Exercising is very good for you. For example, running every day makes you feel better. This is because exercise helps your body stay strong. Also walking is a good exercise too. I think everyone should exercise because it is healthy.",
          },
          {
            letter: "C",
            essayText:
              "I believe exercising regularly has many benefits for both the body and the mind. This is because it strengthens muscles and improves heart health over time. For example, people who walk every day tend to feel more energetic and get sick less often. This shows that even simple exercise can make a big difference. For these reasons, I think everyone should try to exercise regularly, even for just thirty minutes a day.",
          },
        ],
        analysisRowsTh: [
          { label: "Stance ชัดเจน", A: "✅", B: "❌ ไม่บอก pattern", C: "✅" },
          { label: "โครงสร้างถูก", A: "✅", B: "❌ Example ก่อน Explain", C: "✅" },
          { label: "Transitional words ครบ", A: "✅", B: "❌ ขาดหลายส่วน", C: "✅" },
          { label: "มี conclusion ที่ดี", A: "✅", B: "❌", C: "❌ ใส่ข้อมูลใหม่หลัง conclusion" },
        ],
        rationaleTh:
          "B ผิดเพราะ Example มาก่อน Explain และไม่มี conclusion จริงๆ · C ผิดเพราะยาวเกินไป + ใส่ข้อมูลใหม่ใน conclusion — conclusion ที่ดีต้องย้ำ stance เท่านั้น",
      },
      {
        id: "s11-3",
        topic: "Do you think it is better to study online or in a classroom?",
        correctLetter: "A",
        options: [
          {
            letter: "A",
            essayText:
              "I think studying in a classroom is better because students can interact with their teacher directly. This is because face-to-face communication helps students understand lessons more quickly. For example, if a student does not understand something, they can raise their hand and get help right away. This shows that direct interaction makes learning more effective. Overall, I believe classroom studying leads to better results.",
          },
          {
            letter: "B",
            essayText:
              "I think studying online is more convenient because you can study anywhere at any time. For example, many students in Thailand study from home using their phones. This is because online platforms are easy to access. Overall, I think online studying is the future of education and everyone should try it.",
          },
          {
            letter: "C",
            essayText:
              "Studying online has many benefits and so does studying in a classroom. For example, online studying is flexible. But classroom studying is more social. This is because you can meet friends. I think both are good in different situations and it depends on the student.",
          },
        ],
        analysisRowsTh: [
          { label: "Stance ชัดเจน", A: "✅", B: "✅", C: "❌ กลางๆ" },
          { label: "Explain ก่อน Example", A: "✅", B: "❌ Example ก่อน Explain", C: "❌ Example ก่อน Explain" },
          { label: "Transitional words ครบ", A: "✅", B: "❌ ขาด mini-conclusion", C: "❌ ขาดหลายส่วน" },
          { label: "มี conclusion", A: "✅", B: "✅", C: "❌" },
        ],
        rationaleTh:
          "B ผิดเพราะสลับลำดับ — Example มาก่อน Explain · C ผิดเพราะไม่มี stance และโครงสร้างสับสน",
      },
      {
        id: "s11-4",
        topic: "Should university students be required to do an internship before graduating?",
        correctLetter: "A",
        options: [
          {
            letter: "A",
            essayText:
              "I think there are two reasons why university students should do an internship. First, it gives them real work experience that they cannot get in a classroom. In addition, it also helps them build a professional network which is useful when looking for a job after graduation. For these reasons, I believe internships should be required for all university students.",
          },
          {
            letter: "B",
            essayText:
              "University students should do an internship before graduating because it is very helpful. For example, many students who did internships found jobs faster after graduation. This is because they already had experience. Also internships teach you things school cannot. Overall, doing an internship is a great idea for every student.",
          },
          {
            letter: "C",
            essayText:
              "I think internships are very important for students. This is because working in a real company teaches you many things. For example, you learn how to communicate professionally and manage your time. This shows that internships are useful. Overall, I believe all students should do an internship. Also it is good experience and helps with finding a job later.",
          },
        ],
        analysisRowsTh: [
          { label: "Stance ชัดเจน", A: "✅", B: "✅", C: "✅" },
          { label: "โครงสร้างถูก", A: "✅", B: "❌ Example ก่อน Explain", C: "✅" },
          { label: "Transitional words ครบ", A: "✅", B: "❌ ขาด mini-conclusion", C: "✅" },
          { label: "มี conclusion (ไม่ใส่ข้อมูลใหม่)", A: "✅", B: "✅", C: "❌ มีข้อมูลใหม่หลัง conclusion" },
        ],
        rationaleTh:
          "B ผิดเพราะ Example มาก่อน Explain ในเหตุผลแรก · C ผิดเพราะเขียน Overall แล้วยังเพิ่มข้อมูลอีก — เมื่อปิดต้องจบเลย",
      },
      {
        id: "s11-5",
        topic: "Do you prefer reading books or watching videos to learn new things?",
        correctLetter: "B",
        options: [
          {
            letter: "A",
            essayText:
              "I prefer watching videos to learn new things because it is easier to understand visual information. For example, science channels on YouTube explain difficult topics using animation and graphics. This is because videos can show things that words alone cannot describe easily. This shows that visual learning is more effective for complex topics. Overall, I think watching videos is a better way to learn for most people.",
          },
          {
            letter: "B",
            essayText:
              "I prefer reading books because I can learn at my own pace. This is because books allow me to stop, re-read, and think carefully about the information. For example, when I read about history I can go back and recheck important dates and facts as many times as I need. This shows that reading gives more control over the learning process. Overall, I believe reading is a more effective way to learn.",
          },
          {
            letter: "C",
            essayText:
              "Reading books and watching videos are both good ways to learn. This is because some people learn better by reading and some by watching. For example, students who prefer videos can find many good channels online. Also, books are good because they have more detailed information. I think the best way depends on the person and the subject.",
          },
        ],
        analysisRowsTh: [
          { label: "Stance ชัดเจน", A: "✅", B: "✅", C: "❌ กลางๆ" },
          { label: "Explain ก่อน Example", A: "❌ Example ก่อน Explain", B: "✅", C: "✅" },
          { label: "Transitional words ครบ", A: "❌ Explain มาหลัง Example", B: "✅", C: "❌ ขาด conclusion" },
          { label: "มี conclusion", A: "✅", B: "✅", C: "❌" },
        ],
        rationaleTh:
          "A ผิดเพราะสลับลำดับ — Example มาก่อน Explain · C ผิดเพราะไม่มี stance และไม่มี conclusion จริงๆ",
      },
    ],
  };
}

function buildSession12(): MiniStudyEssayClozeSession {
  return {
    id: "session-12",
    index: 12,
    title: "Writing essay — find your grammar mistakes",
    subtitle: "3 essay เติมคำ · ระบบบอกจุดอ่อนเป็นภาษาไทย",
    durationLabel: "≈ 15 min",
    kind: "essay-cloze",
    category: "writing",
    tierRequired: "vip",
    shortHookTh: "เติมคำใน Essay 3 ระดับ — ระบบบอกจุดอ่อนเป็นไทย + บันทึก notebook",
    explanation: [
      {
        heading: "ทำไมต้องฝึกเรื่องนี้ (Thai)",
        body: [
          "DET essay **ใช้ไวยากรณ์เป็นเกณฑ์หลักในการให้คะแนน**",
          "ถ้าอยากได้คะแนนสูง คุณต้อง **เติม -s/-es** ในคำกริยา present simple ให้ถูก และ **ใช้คำนามเอกพจน์/พหูพจน์/นับไม่ได้** ให้ถูก",
          "แบบฝึกหัดนี้จะทดสอบ 5 จุดอ่อนยอดฮิตของนักเรียนไทย:",
          "",
          "1. **Present Simple** — ประธานเอกพจน์ ต้องเติม -s/-es",
          "2. **คำนามพหูพจน์** — แนวคิดทั่วไปต้องเป็นพหูพจน์",
          "3. **คำนามนับไม่ได้** — ห้ามเติม -s (loneliness, information, advice…)",
          "4. **คำนามเอกพจน์หลัง a/an** — ห้ามเติม -s",
          "5. **Subject-verb agreement** — ประธานพหูพจน์ + กริยาไม่เติม -s",
        ].join("\n"),
        coachTip: "**อ่านช้าๆ ทีละคำนะครับ** ไม่ใช่กวาดสายตาผ่าน — error เล็กๆ ซ่อนอยู่ในรายละเอียดเสมอ เช่น *\"He don't\"* (ผิด ต้อง *doesn't*), *\"There is many\"* (ผิด ต้อง *are*) ถ้านักเรียนอ่านเร็วเกินไป สมองจะ \"เติมเต็ม\" สิ่งที่ควรเห็นแทนสิ่งที่เห็นจริงๆ → พลาดทันที เทคนิค: อ่านในใจเสียงปกติ ไม่ใช่เสียงเร็วครับ",
      },
      {
        heading: "วิธีทำ",
        body: [
          "• แต่ละช่องจะมี **cue ในวงเล็บ** เช่น [VERB: help] หรือ [NOUN: friend]",
          "• เติม **รูปที่ถูกต้องตามไวยากรณ์** — ไม่ใช่คำในวงเล็บตรงๆ",
          "• ใช้ **คำเดียว** (ห้ามเขียนคำสั้น)",
          "• กด **Check answers** แล้วระบบจะตรวจทุกข้อทันทีและแสดงรายงานจุดอ่อนเป็นภาษาไทย",
          "• กด **Save to notebook** เพื่อเก็บรายงานไว้ทบทวน",
        ].join("\n"),
        coachTip: "**ตรวจ verb ก่อนเสมอครับ** — 80% ของ error ในข้อสอบนี้อยู่ที่ verb! เช็คตามลำดับนี้: (1) **Tense** ถูกไหม? (past/present/future) (2) **s/es** สำหรับประธานเอกพจน์? (3) **-ed** สำหรับ past tense / passive? (4) **be + V-ing** สำหรับ continuous? ถ้านักเรียน scan verb หมดแล้วไม่เจอ error → ค่อยไปดู noun (a/an/the) กับ preposition",
      },
      {
        heading: "ระดับความยาก",
        body: [
          "• **ข้อ 1** — present simple + พหูพจน์พื้นฐาน",
          "• **ข้อ 2** — เพิ่มพหูพจน์ผิดปกติ + subject-verb agreement ซับซ้อนขึ้น",
          "• **ข้อ 3** — เพิ่ม **คำนามนับไม่ได้** + กับดักเรื่อง **which** ที่เป็นประธานเอกพจน์",
        ].join("\n"),
      },
    ],
    studentInstructionsTh:
      "อ่าน essay ให้จบก่อน แล้วเติมคำในรูปที่ถูกต้องตามไวยากรณ์ ห้ามเปลี่ยนคำอื่นในประโยค",
    exercises: [
      {
        id: "s12-1",
        patternLabel: "Pattern 1 — Opinion Essay",
        topic: "Do you prefer studying alone or with others?",
        essayTemplate:
          "I prefer studying alone because it ___ me focus much better. This is because ___ from other people ___ it harder to concentrate on my work. For example, a study session with ___ often ___ into a social event instead of actual studying. This shows that ___ who study alone ___ to use their time more effectively. Overall, I believe that studying alone ___ the better choice for most ___.",
        blanks: [
          { number: 1, cue: "VERB: help", correct: "helps", category: "present-simple-singular", ruleNoteTh: "Present simple — ประธานเอกพจน์ (it) ต้องเติม -s" },
          { number: 2, cue: "NOUN: distraction", correct: "distractions", acceptedAlts: ["Distractions"], category: "plural-noun", ruleNoteTh: "คำนามแนวคิดทั่วไป — ต้องเป็นพหูพจน์" },
          { number: 3, cue: "VERB: make", correct: "make", category: "subject-verb-agreement-plural", ruleNoteTh: "ประธานพหูพจน์ (distractions) — กริยาไม่เติม -s" },
          { number: 4, cue: "NOUN: friend", correct: "friends", category: "plural-noun", ruleNoteTh: "คำนามทั่วไปในรูปพหูพจน์" },
          { number: 5, cue: "VERB: turn", correct: "turns", category: "present-simple-singular", ruleNoteTh: "Present simple — ประธานเอกพจน์ (a study session) ต้องเติม -s" },
          { number: 6, cue: "NOUN: student", correct: "students", acceptedAlts: ["Students"], category: "plural-noun", ruleNoteTh: "กลุ่มทั่วไป — ต้องเป็นพหูพจน์" },
          { number: 7, cue: "VERB: tend", correct: "tend", category: "subject-verb-agreement-plural", ruleNoteTh: "ประธานพหูพจน์ (students) — กริยาไม่เติม -s" },
          { number: 8, cue: "VERB: be", correct: "is", category: "present-simple-singular", ruleNoteTh: "Present simple — ประธานเอกพจน์ (studying alone) ใช้ 'is'" },
          { number: 9, cue: "NOUN: person", correct: "people", category: "plural-noun", ruleNoteTh: "คำนามพหูพจน์ผิดปกติ: person → people" },
        ],
      },
      {
        id: "s12-2",
        patternLabel: "Pattern 2 — Listing Essay",
        topic: "What are the benefits of learning a second language?",
        noteTh:
          "ระวัง: คำที่อยู่หลัง 'two main ___' ต้องเป็นพหูพจน์เสมอ · ประธานพหูพจน์ → กริยาไม่เติม -s",
        essayTemplate:
          "I think there are two main ___ of learning a second language. First, it ___ people to communicate with a much wider range of ___ around the world. This is because many international ___ in work and travel ___ more than one language. In addition, learning a new language also ___ the brain to think in different ___, which ___ both memory and problem-solving ___. For these reasons, I believe that learning a second language ___ people a significant advantage in life.",
        blanks: [
          { number: 1, cue: "NOUN: benefit", correct: "benefits", category: "plural-noun", ruleNoteTh: "หลัง 'two main' ต้องเป็นพหูพจน์" },
          { number: 2, cue: "VERB: allow", correct: "allows", category: "present-simple-singular", ruleNoteTh: "Present simple — ประธานเอกพจน์ (it)" },
          { number: 3, cue: "NOUN: person", correct: "people", category: "plural-noun", ruleNoteTh: "พหูพจน์ผิดปกติ: person → people" },
          { number: 4, cue: "NOUN: opportunity", correct: "opportunities", category: "plural-noun", ruleNoteTh: "พหูพจน์ที่ y → ies" },
          { number: 5, cue: "VERB: require", correct: "require", category: "subject-verb-agreement-plural", ruleNoteTh: "ประธานพหูพจน์ (opportunities) — กริยาไม่เติม -s" },
          { number: 6, cue: "VERB: train", correct: "trains", category: "present-simple-singular", ruleNoteTh: "Present simple — ประธานเอกพจน์ (learning…)" },
          { number: 7, cue: "NOUN: way", correct: "ways", category: "plural-noun", ruleNoteTh: "หลัง 'different' โดยทั่วไปเป็นพหูพจน์" },
          { number: 8, cue: "VERB: improve", correct: "improves", category: "present-simple-singular", ruleNoteTh: "Present simple — ประธานเอกพจน์ (which → the act of training)" },
          { number: 9, cue: "NOUN: skill", correct: "skills", category: "plural-noun", ruleNoteTh: "แนวคิดทั่วไป — ต้องเป็นพหูพจน์" },
          { number: 10, cue: "VERB: give", correct: "gives", category: "present-simple-singular", ruleNoteTh: "Present simple — ประธานเอกพจน์ (learning a second language)" },
        ],
      },
      {
        id: "s12-3",
        patternLabel: "Pattern 1 — Opinion Essay (advanced)",
        topic: "Do you think it is better to live with family or alone?",
        noteTh:
          "ระวัง: คำนามนับไม่ได้ (loneliness) ห้ามเติม -s · คำหลัง 'a young' ต้องเป็นเอกพจน์ · which เป็นประธานเอกพจน์",
        essayTemplate:
          "I believe that living with family ___ better because it ___ both emotional and financial support. This is because ___ ___ each other during difficult ___, which ___ stress and ___. For example, when a young ___ ___ a problem at work, having family at home ___ them a sense of comfort and security. This shows that family ___ a support system that ___ alone cannot always replace. Overall, I think living with family ___ the better choice for most ___.",
        blanks: [
          { number: 1, cue: "VERB: be", correct: "is", category: "present-simple-singular", ruleNoteTh: "Present simple — ประธานเอกพจน์ (living with family)" },
          { number: 2, cue: "VERB: provide", correct: "provides", category: "present-simple-singular", ruleNoteTh: "Present simple — ประธานเอกพจน์ (it)" },
          { number: 3, cue: "NOUN: family member", correct: "family members", category: "plural-noun", ruleNoteTh: "กลุ่มทั่วไป — ต้องเป็นพหูพจน์" },
          { number: 4, cue: "VERB: help", correct: "help", category: "subject-verb-agreement-plural", ruleNoteTh: "ประธานพหูพจน์ (family members) — กริยาไม่เติม -s" },
          { number: 5, cue: "NOUN: time", correct: "times", category: "plural-noun", ruleNoteTh: "หลัง 'difficult' โดยทั่วไปเป็นพหูพจน์" },
          { number: 6, cue: "VERB: reduce", correct: "reduces", category: "present-simple-singular", ruleNoteTh: "Present simple — which เป็นประธานเอกพจน์ (อ้างถึงประโยคก่อน)" },
          { number: 7, cue: "NOUN: loneliness", correct: "loneliness", category: "uncountable-noun", ruleNoteTh: "คำนามนับไม่ได้ — ห้ามเติม -s" },
          { number: 8, cue: "NOUN: adult", correct: "adult", category: "singular-after-a-an", ruleNoteTh: "หลัง 'a young' — ต้องเป็นเอกพจน์" },
          { number: 9, cue: "VERB: face", correct: "faces", category: "present-simple-singular", ruleNoteTh: "Present simple — ประธานเอกพจน์ (a young adult)" },
          { number: 10, cue: "VERB: give", correct: "gives", category: "present-simple-singular", ruleNoteTh: "Present simple — ประธานเอกพจน์ (having family at home)" },
          { number: 11, cue: "VERB: provide", correct: "provides", category: "present-simple-singular", ruleNoteTh: "Present simple — ประธานเอกพจน์ (family)" },
          { number: 12, cue: "NOUN: friend", correct: "friends", category: "plural-noun", ruleNoteTh: "กลุ่มทั่วไป — ต้องเป็นพหูพจน์" },
          { number: 13, cue: "VERB: be", correct: "is", category: "present-simple-singular", ruleNoteTh: "Present simple — ประธานเอกพจน์ (living with family)" },
          { number: 14, cue: "NOUN: person", correct: "people", category: "plural-noun", ruleNoteTh: "พหูพจน์ผิดปกติ: person → people" },
        ],
      },
    ],
  };
}

// ============================================================================
// Reading sessions 13-15: shared passage-mc lessons
// ============================================================================

function buildSession13(): MiniStudyPassageMcSession {
  return {
    id: "session-13",
    index: 13,
    title: "Reading — find the best title",
    subtitle: "บทเรียน + 10 ข้อฝึก passage-pick",
    durationLabel: "≈ 15 min",
    kind: "passage-mc",
    category: "reading",
    tierRequired: "premium",
    shortHookTh: "Title ที่ดีต้องครอบคลุมทุกย่อหน้า ไม่ใช่แค่บางส่วน — รู้กับดักที่ DET ใช้",
    explanation: [
      {
        heading: "ส่วนที่ 1 — Title the Passage ใน DET คืออะไร?",
        body: [
          "ใน **Interactive Reading** ของ DET มีคำถามประเภท \"Title the Passage\" ที่วัดความเข้าใจ passage **โดยรวม**",
          "• ให้ passage สั้นๆ + ตัวเลือก 4 ตัว — เลือกชื่อเรื่องที่เหมาะที่สุด",
          "• Title ที่ดีต้อง **ครอบคลุม passage ทั้งหมด** ไม่ใช่แค่บางส่วน",
          "• **ไม่ใช่** คำถามที่ถามรายละเอียด — ถามภาพรวม",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 2 — Title ≠ Main Idea",
        body: [
          "• **Title** = ชื่อเรื่อง สั้น กระชับ ครอบคลุมทุกอย่าง (เช่น *\"The Rise of Urban Farming\"*)",
          "• **Main Idea** = ประเด็นหลักที่ผู้เขียนต้องการสื่อ — มักเป็นประโยคสมบูรณ์",
          "• ทั้งสองสะท้อนภาพรวมเหมือนกัน แต่ Title เป็นวลีสั้น Main Idea เป็นประโยค",
        ].join("\n"),
        coachTip: "**กฎเหล็กครับ:** title ต้องครอบคลุม **ทั้ง passage** ไม่ใช่แค่ย่อหน้าเดียว ถ้า choice พูดถึงแค่ครึ่งเดียวของเนื้อหา → **ตัดทิ้งได้เลย** เทคนิคพี่: หลังอ่าน passage จบ → ลองอธิบายในใจสั้นๆ ว่า \"บทความนี้พูดเรื่องอะไรโดยรวม?\" คำตอบที่ตรงกับสิ่งนั้นที่สุด = title ที่ถูกครับ",
      },
      {
        heading: "ส่วนที่ 3 — Title ต้องเป็น \"ภาพรวม\" ไม่ใช่ \"รายละเอียด\"",
        body: [
          "✅ Title ที่ดี **ครอบคลุมทุกย่อหน้า**",
          "❌ Title ที่ผิดมักพูดถึงแค่ **ตัวอย่างหนึ่ง** หรือ **รายละเอียดเดียว**",
          "• ถ้า title พูดถึงแค่ 1 ย่อหน้า → ผิดแน่นอน",
          "• ถ้า title ครอบคลุมทุกย่อหน้าพอดี → นั่นคือคำตอบ",
        ].join("\n"),
        coachTip: "**เคล็ดลับเร็วสุดครับ:** ตัวเลือกที่ **specific เกินไป** (มีตัวเลข ชื่อคน ชื่อสถานที่ วันที่ ปี ค.ศ.) → มักไม่ใช่คำตอบ เพราะ title ที่ดีต้องสรุปภาพใหญ่ ไม่ใช่จุดเดียว ลองดู choice ทุกตัว → ตัดที่ specific ออกก่อนเลย ที่เหลือมักเป็นคำตอบที่ถูก พี่ใช้เทคนิคนี้ตัด choice ออกได้ 1-2 ตัวเสมอครับ",
      },
      {
        heading: "ส่วนที่ 4 — กับดักที่ DET ชอบออก",
        body: [
          "**❌ กับดัก 1 — ใช้คำใน passage แต่ผิดความหมาย** — อย่าเลือกเพราะเห็นคำคุ้นเคย",
          "**❌ กับดัก 2 — Specific เกินไป** — passage พูดเรื่องการเรียนออนไลน์โดยรวม แต่ title พูดแค่ *\"How Zoom Changed University Classes in 2020\"*",
          "**❌ กับดัก 3 — กว้างเกินไป** — passage พูดเรื่องการเรียนออนไลน์ในมหาวิทยาลัย แต่ title พูดว่า *\"The Future of Education\"*",
          "**❌ กับดัก 4 — ถูกแค่ครึ่งเดียว** — ครอบคลุมแค่ส่วนหนึ่งของ passage",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 5 — ขั้นตอนการหา Title",
        body: [
          "1. อ่าน passage ทั้งหมดอย่างรวดเร็ว จับว่าแต่ละย่อหน้าพูดเรื่องอะไร",
          "2. ถามตัวเอง: *\"passage นี้พูดเรื่องอะไรโดยรวม?\"* — สรุปในหัว 1 ประโยค",
          "3. อ่านตัวเลือก **ทุกตัว** ห้ามเลือกตัวแรกที่ฟังดูดี",
          "4. ตัดตัวเลือกที่ specific เกินไป กว้างเกินไป หรือพูดถึงแค่บางส่วนออก",
          "5. เลือกตัวที่เหลือและตรวจสอบว่าครอบคลุมทุกย่อหน้าจริงๆ",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 6 — Tips สรุป",
        body: [
          "✅ ต้องครอบคลุม **ทุกย่อหน้า** ไม่ใช่แค่บางส่วน",
          "✅ อ่านตัวเลือก **ทุกตัว** ก่อนเลือก",
          "✅ ตัด title ที่ specific เกินไปออกก่อนเสมอ — มักเป็นกับดัก",
          "✅ ตัด title ที่ **กว้างเกินไป** ออก",
          "✅ ตอนเจอ Title the Passage คุณคุ้นเคยกับ passage มากแล้ว มักไม่ต้องอ่านใหม่ทั้งหมด",
          "❌ ห้ามเลือกเพราะเห็นคำคุ้นเคย",
          "❌ ห้ามเลือกที่พูดถึงแค่ตัวอย่างหนึ่งหรือรายละเอียดเดียว",
        ].join("\n"),
      },
      {
        heading: "วิธีทำแบบฝึกหัด",
        body: READING_LESSON_NOTE_TH,
      },
    ],
    exercises: [
      passageMc(
        "s13-1",
        "Many cities around the world are dealing with a growing problem: too much plastic waste. Plastic bags, bottles, and packaging are filling up landfills and polluting rivers and oceans. Some governments have responded by banning single-use plastics entirely. Others have introduced taxes on plastic bags to discourage people from using them. Meanwhile, companies are investing in biodegradable alternatives made from plants or recycled materials. Despite these efforts, experts say that consumer behaviour must also change for real progress to happen.",
        "Best title?",
        "B",
        [
          ["A", "Why Plastic Bags Are Harmful to Marine Life", "Specific เกินไป — พูดแค่เรื่องทะเล"],
          ["B", "The Global Effort to Reduce Plastic Waste", "ครอบคลุมทุกย่อหน้า (รัฐบาล / บริษัท / พฤติกรรมผู้บริโภค)"],
          ["C", "How Governments Are Taxing Plastic Products", "พูดถึงแค่มาตรการหนึ่งใน passage"],
          ["D", "The History of Plastic Manufacturing", "Passage ไม่ได้พูดถึงประวัติศาสตร์เลย"],
        ],
      ),
      passageMc(
        "s13-2",
        "Sleep is essential for good health, yet many people in modern society are not getting enough of it. Research shows that adults need between seven and nine hours of sleep per night, but surveys suggest that large numbers of people regularly sleep fewer than six hours. The consequences of sleep deprivation include reduced concentration, weakened immune systems, and a higher risk of serious conditions such as heart disease and diabetes. Experts recommend reducing screen time before bed, keeping a consistent sleep schedule, and avoiding caffeine in the evenings as ways to improve sleep quality.",
        "Best title?",
        "C",
        [
          ["A", "The Dangers of Drinking Too Much Coffee", "กาแฟเป็นแค่รายละเอียดเล็กน้อย"],
          ["B", "Why Modern Life Makes It Hard to Sleep Well", "Passage ไม่ได้โฟกัสแค่สาเหตุจากชีวิตสมัยใหม่"],
          ["C", "The Importance of Sleep and How to Improve It", "ครอบคลุมทั้งความสำคัญ ผลกระทบ และวิธีแก้ไข"],
          ["D", "How Sleep Affects Athletic Performance", "Passage ไม่ได้พูดเรื่องนักกีฬาเลย"],
        ],
      ),
      passageMc(
        "s13-3",
        "The concept of working from home has changed dramatically in recent years. Before 2020, remote work was seen as unusual or a privilege for a small number of workers. The global pandemic forced millions of companies to allow their employees to work remotely almost overnight. Since then, many workers have reported higher job satisfaction and better work-life balance. However, some employers have expressed concerns about productivity and team communication. As a result, many companies are now adopting hybrid models that combine office days with remote working.",
        "Best title?",
        "A",
        [
          ["A", "How the Pandemic Changed the Way People Work", "ครอบคลุมทั้งประวัติ การเปลี่ยนแปลง ผลดีผลเสีย และแนวโน้มปัจจุบัน"],
          ["B", "The Problems with Working from Home", "Passage พูดทั้งข้อดีและข้อเสีย ไม่ใช่แค่ปัญหา"],
          ["C", "Why Companies Prefer Office Work", "Passage ไม่ได้บอกว่าบริษัทชอบ office work"],
          ["D", "Video Conferencing Tools for Remote Workers", "Passage ไม่ได้พูดเรื่อง video tools เลย"],
        ],
      ),
      passageMc(
        "s13-4",
        "Volunteering has long been associated with personal fulfilment and community service, but recent studies suggest it may also have significant health benefits. Research indicates that people who volunteer regularly report lower levels of stress and depression compared to those who do not. Scientists believe this is partly because volunteering creates a sense of purpose and social connection. Additionally, older adults who volunteer tend to remain physically active longer and show slower rates of cognitive decline. These findings suggest that volunteering may be as beneficial to the volunteer as it is to the people being helped.",
        "Best title?",
        "B",
        [
          ["A", "How to Find Volunteering Opportunities in Your Community", "Passage ไม่ได้แนะนำวิธีหาโอกาส"],
          ["B", "The Health Benefits of Regular Volunteering", "Passage ทั้งหมดพูดเรื่องประโยชน์ต่อสุขภาพ"],
          ["C", "Why Young People Should Volunteer More Often", "Passage พูดถึงคนทั่วไปและผู้สูงอายุ ไม่ใช่แค่คนหนุ่มสาว"],
          ["D", "The Economic Value of Volunteer Work", "Passage ไม่ได้พูดถึงมูลค่าทางเศรษฐกิจ"],
        ],
      ),
      passageMc(
        "s13-5",
        "Bees play a vital role in maintaining healthy ecosystems. As they move from flower to flower collecting nectar, they transfer pollen, enabling plants to reproduce. This process, known as pollination, is essential for the growth of many fruits, vegetables, and nuts that humans rely on for food. Without bees, large portions of the global food supply would be at risk. Unfortunately, bee populations worldwide have been declining due to habitat loss, pesticide use, and climate change. Scientists and governments are now working to create protected areas and reduce harmful chemical use to preserve bee populations.",
        "Best title?",
        "B",
        [
          ["A", "How Honey Is Produced by Bees", "Passage ไม่ได้พูดถึงการผลิตน้ำผึ้งเลย"],
          ["B", "The Role of Bees in Food Production and Ecosystem Health", "ครอบคลุมทั้งบทบาทผึ้ง ความสำคัญต่ออาหาร และการอนุรักษ์"],
          ["C", "Why Pesticides Are Dangerous to Insects", "สารเคมีเป็นแค่รายละเอียดในย่อหน้าสุดท้าย"],
          ["D", "The Life Cycle of a Honeybee", "Passage ไม่ได้พูดถึงวงจรชีวิตของผึ้ง"],
        ],
      ),
      passageMc(
        "s13-6",
        "Public libraries have always been an important part of communities, but their role has evolved significantly in the digital age. While books remain central to what libraries offer, many now provide free internet access, digital lending services, and computer training programs. Some libraries have become community hubs, hosting events, workshops, and even maker spaces equipped with 3D printers. Despite predictions that digital technology would make libraries obsolete, usage statistics in many cities show that visits have actually increased in recent years as libraries adapt to meet new community needs.",
        "Best title?",
        "B",
        [
          ["A", "Why People Still Prefer Printed Books to E-books", "Passage ไม่ได้เปรียบเทียบหนังสือกับ e-books"],
          ["B", "How Public Libraries Are Adapting to the Digital Age", "ครอบคลุมการเปลี่ยนแปลงบทบาท บริการใหม่ และสถิติการใช้งาน"],
          ["C", "The History of Public Libraries Around the World", "Passage ไม่ได้พูดถึงประวัติศาสตร์"],
          ["D", "How 3D Printing Is Changing Education", "3D printing เป็นแค่ตัวอย่างเล็กๆ"],
        ],
      ),
      passageMc(
        "s13-7",
        "Artificial intelligence is increasingly being used in the field of medicine. Algorithms can now analyse medical images such as X-rays and MRI scans with a level of accuracy that rivals experienced doctors. AI tools are also being used to predict which patients are at risk of developing certain diseases, allowing for earlier intervention. In drug development, AI has significantly reduced the time needed to identify potential treatments. Despite these advancements, many medical professionals emphasise that AI should support rather than replace human judgement, particularly when making complex decisions about patient care.",
        "Best title?",
        "B",
        [
          ["A", "The Dangers of Using AI in Hospitals", "Passage ไม่ได้พูดเรื่องอันตราย แค่พูดถึงข้อควรระวัง"],
          ["B", "How AI is Transforming Medical Diagnosis and Treatment", "ครอบคลุมการวินิจฉัย พยากรณ์โรค พัฒนายา และมุมมองแพทย์"],
          ["C", "Why Doctors Are Afraid of Artificial Intelligence", "Passage ไม่ได้บอกว่าแพทย์กลัว AI"],
          ["D", "The Use of MRI Scans in Modern Medicine", "MRI เป็นแค่ตัวอย่างหนึ่ง"],
        ],
      ),
      passageMc(
        "s13-8",
        "The way children learn has changed considerably over the past two decades. Traditional classroom teaching, which focused on memorisation and standardised tests, is gradually being replaced or supplemented by more interactive approaches. Project-based learning encourages students to solve real-world problems, while collaborative activities develop communication and teamwork skills. Technology has also entered the classroom, with tablets and educational software providing personalised learning experiences. Research suggests that students who learn through these varied methods tend to be more engaged and retain information more effectively than those taught through traditional methods alone.",
        "Best title?",
        "B",
        [
          ["A", "Why Standardised Tests Should Be Abolished", "Passage ไม่ได้เรียกร้องให้ยกเลิกการสอบ"],
          ["B", "The Shift Toward Modern and Interactive Learning Methods", "ครอบคลุมการเปลี่ยนแปลง project-based เทคโนโลยี และผลวิจัย"],
          ["C", "How Technology Is Replacing Teachers in Schools", "Passage บอกว่าเทคโนโลยีเสริม ไม่ใช่แทนที่ครู"],
          ["D", "The Benefits of Learning Mathematics Through Projects", "คณิตศาสตร์ไม่ได้ถูกกล่าวถึงเลย"],
        ],
      ),
      passageMc(
        "s13-9",
        "Water scarcity is one of the most pressing challenges facing the world today. While water covers most of the Earth's surface, only a small fraction is fresh water, and even less is accessible for human use. Growing populations, increased agricultural demands, and climate change are putting enormous pressure on freshwater supplies. In response, many regions are investing in water recycling technologies, desalination plants, and more efficient irrigation systems. Experts warn that without significant changes in how we manage and consume water, shortages could affect billions of people within the next few decades.",
        "Best title?",
        "B",
        [
          ["A", "How Desalination Plants Work", "Desalination เป็นแค่ตัวอย่างหนึ่งของวิธีแก้ไข"],
          ["B", "The Causes and Solutions of Global Water Scarcity", "ครอบคลุมสาเหตุ ปัญหา และวิธีแก้ไข"],
          ["C", "Why Farmers Use Too Much Water", "เกษตรกรรมเป็นแค่หนึ่งในหลายสาเหตุ"],
          ["D", "The Effects of Climate Change on Ocean Levels", "Passage ไม่ได้พูดเรื่องระดับน้ำทะเล"],
        ],
      ),
      passageMc(
        "s13-10",
        "Street food culture is an integral part of life in many cities across Asia, Latin America, and the Middle East. For millions of people, street food provides affordable, convenient, and often highly flavourful meals that reflect local culinary traditions. Vendors frequently pass down recipes through generations, preserving cultural heritage one dish at a time. In recent years, street food has also gained international recognition, with food tourism becoming a major draw for travellers seeking authentic local experiences. However, concerns about hygiene and food safety have led some governments to regulate or restrict street food vendors in urban areas.",
        "Best title?",
        "B",
        [
          ["A", "The Best Street Foods to Try When Travelling Asia", "Passage ไม่ได้แนะนำอาหารเฉพาะเจาะจง"],
          ["B", "Street Food: Culture, Tradition, and Modern Challenges", "ครอบคลุมวัฒนธรรม ประเพณี การท่องเที่ยว และกฎระเบียบ"],
          ["C", "Why Street Food Is Cheaper Than Restaurant Food", "ราคาเป็นแค่รายละเอียดเล็กน้อย"],
          ["D", "How Food Safety Laws Affect Small Businesses", "กฎหมายอาหารปลอดภัยเป็นแค่ย่อหน้าสุดท้าย"],
        ],
      ),
    ],
  };
}

function buildSession14(): MiniStudyPassageMcSession {
  return {
    id: "session-14",
    index: 14,
    title: "Reading — find the main idea",
    subtitle: "บทเรียน + 10 ข้อฝึก หา main idea",
    durationLabel: "≈ 15 min",
    kind: "passage-mc",
    category: "reading",
    tierRequired: "premium",
    shortHookTh: "แยก main idea กับ detail ออกจากกัน — เลิกหลงตัวเลือกที่ดูถูกแต่ผิด",
    explanation: [
      {
        heading: "ส่วนที่ 1 — Identify the Idea ใน DET คืออะไร?",
        body: [
          "ใน **Interactive Reading** ของ DET มีคำถามประเภท \"Identify the Idea\" ที่ถามให้หา main idea ของ passage",
          "• แตกต่างจาก Title ตรงที่ Main Idea มักเป็น **ประโยคที่สมบูรณ์**",
          "• Main Idea = **ประเด็นหลัก** ที่ผู้เขียนพยายามบอก ไม่ใช่รายละเอียด",
          "• ทุกย่อหน้าใน passage ต้องสนับสนุน main idea นี้",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 2 — Main Idea อยู่ที่ไหน?",
        body: [
          "• **บ่อยที่สุด** — อยู่ในประโยคแรกหรือสองประโยคแรก (topic sentence)",
          "• **บางครั้ง** — อยู่ในประโยคสุดท้ายเป็นการสรุป",
          "• **นานๆ ครั้ง** — ต้องสรุปเองจากทั้ง passage",
          "• ห้ามหยุดอ่านแค่ประโยคแรก — ต้องอ่านจนจบเพื่อยืนยัน",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 3 — Main Idea ≠ Detail",
        body: [
          "• **Main Idea** = สิ่งที่ passage พูดถึงโดยรวม",
          "  *เช่น \"Exercise has many benefits for both physical and mental health.\"*",
          "• **Detail** = ข้อมูลเฉพาะที่ใช้สนับสนุน",
          "  *เช่น \"Running for 30 minutes a day reduces the risk of heart disease by 35%.\"*",
          "• **กฎง่ายๆ**: ถ้าตัวเลือกพูดถึง **ตัวเลข ชื่อเฉพาะ วันที่ สถานที่เฉพาะ** — มักเป็น detail",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 4 — กับดักที่ DET ชอบออก",
        body: [
          "**❌ กับดัก 1 — Detail ที่ถูกต้องแต่ไม่ใช่ main idea** — ครอบคลุมแค่บางส่วน",
          "**❌ กับดัก 2 — ถูกบางส่วนแต่เพิ่มข้อมูลที่ passage ไม่ได้พูดถึง**",
          "**❌ กับดัก 3 — ใช้คำจาก passage แต่บิดความหมาย** — อย่าเลือกเพราะคำคุ้นเคย",
          "**❌ กับดัก 4 — กว้างเกินไปจนครอบคลุมสิ่งที่ passage ไม่ได้พูดถึง**",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 5 — ขั้นตอนการหา Main Idea",
        body: [
          "1. อ่าน **ประโยคแรกของแต่ละย่อหน้า** (topic sentences) อย่างรวดเร็ว",
          "2. ถามตัวเอง: *\"ทุกย่อหน้าพูดเรื่องอะไรร่วมกัน?\"*",
          "3. **สร้าง main idea ในหัวก่อนดูตัวเลือก** — เป็นประโยคสั้นๆ",
          "4. อ่านตัวเลือก **ทุกตัว** หาตัวที่ใกล้เคียงกับที่คิดไว้",
          "5. ตัดตัวเลือกที่เป็น detail หรือกว้าง/แคบเกินไป",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 6 — Tips สรุป",
        body: [
          "✅ Main idea ต้อง **ครอบคลุมทั้ง passage** ไม่ใช่แค่ย่อหน้าเดียว",
          "✅ **สร้าง main idea ในหัวก่อนดูตัวเลือก** — กันถูกหลอกด้วยตัวเลือกที่ฟังดูดี",
          "✅ อ่านทุกตัวเลือกก่อนเลือก — DET ออกแบบให้มีตัวที่ดูถูกแต่ไม่ใช่",
          "✅ มี **ตัวเลข / ชื่อเฉพาะ / รายละเอียดเฉพาะ** → มักเป็น detail",
          "❌ ห้ามเลือกตัวเลือกที่มีข้อมูลที่ passage ไม่ได้พูดถึง",
          "❌ ห้ามสับสน main idea (ประโยคสมบูรณ์) กับ title (วลีสั้น)",
        ].join("\n"),
      },
      {
        heading: "วิธีทำแบบฝึกหัด",
        body: READING_LESSON_NOTE_TH,
      },
    ],
    exercises: [
      passageMc(
        "s14-1",
        "Cycling has become an increasingly popular form of transport in many cities worldwide. Local governments have responded by building dedicated cycle lanes and offering bike-sharing schemes. Studies show that cities with strong cycling infrastructure see fewer traffic accidents and lower levels of air pollution. On an individual level, regular cycling improves cardiovascular health and reduces stress. Economic research also indicates that cycling infrastructure costs far less to build and maintain than roads designed for cars.",
        "Main idea?",
        "C",
        [
          ["A", "Cycling is popular because it saves money on petrol.", "Passage ไม่ได้พูดเรื่องน้ำมัน"],
          ["B", "Building cycle lanes is expensive for local governments.", "Passage บอกตรงข้ามว่า cycle lanes ถูกกว่า"],
          ["C", "Cycling offers significant benefits for cities, individuals, and the economy.", "ครอบคลุมทุกย่อหน้า (เมือง / บุคคล / เศรษฐกิจ)"],
          ["D", "Air pollution in cities has decreased due to cycling programmes.", "เป็นแค่ detail หนึ่ง"],
        ],
      ),
      passageMc(
        "s14-2",
        "Many scientists now believe that spending time in nature has measurable positive effects on mental health. Studies conducted in Japan, where the practice of \"forest bathing\" originated, found that spending time among trees lowers cortisol levels and reduces blood pressure. Similar research in Europe and North America has confirmed that even short walks in parks or green spaces can reduce symptoms of anxiety and depression. Healthcare providers in some countries are now formally prescribing time outdoors as part of treatment plans for patients with mild mental health conditions.",
        "Main idea?",
        "B",
        [
          ["A", "Forest bathing is a Japanese tradition that involves walking in forests.", "เป็นแค่รายละเอียดเรื่องญี่ปุ่น"],
          ["B", "Spending time in nature can significantly improve mental health.", "ครอบคลุมทุกย่อหน้าที่พูดเรื่องธรรมชาติกับสุขภาพจิต"],
          ["C", "Doctors in Japan prescribe forest walks to patients with heart disease.", "บิดข้อมูล — passage ไม่ได้พูดเรื่องโรคหัวใจ"],
          ["D", "Anxiety and depression are among the most common mental health conditions.", "Passage ไม่ได้พูดเรื่องความชุกของโรค"],
        ],
      ),
      passageMc(
        "s14-3",
        "The fashion industry is one of the largest contributors to environmental pollution globally. The production of clothing requires enormous amounts of water, and synthetic fabrics shed microplastics that end up in waterways. The industry also generates significant carbon emissions through manufacturing and shipping. In response, a growing number of brands are adopting sustainable practices, such as using organic materials, reducing waste in production, and offering repair and recycling programmes. Consumers are also becoming more conscious, with surveys showing increased interest in second-hand clothing and sustainable brands.",
        "Main idea?",
        "C",
        [
          ["A", "Synthetic fabrics release microplastics that pollute rivers and oceans.", "เป็นแค่ detail หนึ่งในย่อหน้าแรก"],
          ["B", "Second-hand clothing is becoming more fashionable among young people.", "เป็นแค่ detail เล็กน้อย"],
          ["C", "The fashion industry causes serious environmental damage, but change is happening.", "ครอบคลุมทั้งปัญหาและการเปลี่ยนแปลง"],
          ["D", "Carbon emissions from clothing manufacturing are higher than from aviation.", "Passage ไม่ได้เปรียบเทียบกับอุตสาหกรรมการบิน"],
        ],
      ),
      passageMc(
        "s14-4",
        "The ability to read maps was once considered an essential life skill. Today, GPS navigation systems and smartphone apps have made it possible for people to travel anywhere without ever consulting a traditional map. While this technology is undeniably convenient, some researchers worry that heavy reliance on GPS may be weakening people's spatial awareness and sense of direction. Studies suggest that people who regularly use GPS show less activity in the parts of the brain associated with navigation compared to those who navigate independently.",
        "Main idea?",
        "C",
        [
          ["A", "Smartphones have made traditional map-reading unnecessary in modern life.", "Passage ไม่ได้บอกว่าแผนที่กระดาษไม่จำเป็น เพียงแต่ใช้น้อยลง"],
          ["B", "GPS technology improves travel safety by reducing navigation errors.", "Passage ไม่ได้พูดเรื่องความปลอดภัย"],
          ["C", "While GPS is convenient, it may be reducing people's natural navigation abilities.", "ครอบคลุมทั้งความสะดวกและความกังวล"],
          ["D", "People who use GPS regularly have better travel experiences.", "Passage ไม่ได้บอกว่าประสบการณ์การเดินทางดีขึ้น"],
        ],
      ),
      passageMc(
        "s14-5",
        "Community gardens are shared spaces where local residents grow fruit, vegetables, and flowers together. Originally established in areas with little access to green space, they have spread to suburbs and even wealthy urban neighbourhoods. Beyond providing fresh produce, community gardens offer important social benefits: they bring together people from different backgrounds, reduce loneliness, and give residents a sense of ownership over their neighbourhood. Some research also indicates that areas with active community gardens experience reduced rates of vandalism and crime.",
        "Main idea?",
        "B",
        [
          ["A", "Community gardens produce large amounts of fresh food for local families.", "Passage ไม่ได้เน้นปริมาณอาหาร"],
          ["B", "Community gardens bring social and environmental benefits to neighbourhoods.", "ครอบคลุมทั้งผลทางสังคม สิ่งแวดล้อม และชุมชน"],
          ["C", "Vandalism decreases in areas where residents grow their own vegetables.", "เป็นแค่รายละเอียดในย่อหน้าสุดท้าย"],
          ["D", "Wealthy neighbourhoods have more community gardens than poorer areas.", "Passage บอกตรงข้าม เริ่มจากพื้นที่ยากจนก่อน"],
        ],
      ),
      passageMc(
        "s14-6",
        "Digital literacy, defined as the ability to use digital tools and evaluate online information critically, has become an essential skill in the modern world. Schools in many countries have begun incorporating digital literacy into their curricula, teaching students to identify fake news, protect their personal data, and use technology responsibly. However, progress has been uneven, with students in wealthier schools often receiving better instruction than those in underfunded schools. Experts argue that closing this digital skills gap is crucial to ensuring equal opportunities for young people in an increasingly technology-driven society.",
        "Main idea?",
        "C",
        [
          ["A", "Fake news is a growing problem on social media platforms worldwide.", "Passage ไม่ได้โฟกัสที่ปัญหา fake news"],
          ["B", "Digital literacy is now a required subject in all secondary schools.", "Passage บอกว่าหลายประเทศเริ่มทำ ไม่ใช่ทุกโรงเรียน"],
          ["C", "Digital literacy is an essential modern skill, though access to quality education in it remains unequal.", "ครอบคลุมทั้งความสำคัญ การสอน และความไม่เท่าเทียม"],
          ["D", "Wealthier students perform better academically because they have access to better technology.", "Passage พูดเรื่องทักษะดิจิทัล ไม่ใช่ผลการเรียนโดยรวม"],
        ],
      ),
      passageMc(
        "s14-7",
        "Meditation, once considered a niche spiritual practice, has entered the mainstream in many Western countries. Corporations now offer meditation programmes to employees to reduce workplace stress and increase productivity. Schools are introducing mindfulness sessions to help students manage exam anxiety. Hospitals and clinics use meditation-based therapies to help patients dealing with chronic pain and mental health disorders. Despite its growing acceptance, some scientists caution that while research results are promising, more rigorous studies are needed before strong clinical conclusions can be drawn.",
        "Main idea?",
        "B",
        [
          ["A", "Meditation is an ancient spiritual practice that originated in Asia.", "Passage ไม่ได้พูดเรื่องต้นกำเนิด"],
          ["B", "Meditation is now widely used across many sectors of society, though its clinical benefits still require further research.", "ครอบคลุมการแพร่หลายและข้อสงวน"],
          ["C", "Companies that offer meditation programmes to employees see significant increases in productivity.", "เป็นแค่รายละเอียดเรื่องบริษัท"],
          ["D", "Scientists have proven that meditation cures chronic pain and mental health disorders.", "Passage บอกตรงข้ามว่ายังต้องการงานวิจัยเพิ่ม"],
        ],
      ),
      passageMc(
        "s14-8",
        "Microfinance programmes provide small loans to individuals in developing countries who do not have access to traditional banking services. The idea, pioneered by economist Muhammad Yunus in Bangladesh in the 1970s, was that small amounts of credit could help poor people start businesses and escape poverty. Since then, microfinance has expanded globally and helped millions of people, particularly women, gain economic independence. However, critics point out that high interest rates charged by some microfinance institutions have left borrowers in debt, suggesting that the model needs careful regulation to be truly effective.",
        "Main idea?",
        "B",
        [
          ["A", "Muhammad Yunus invented microfinance to help poor women in Bangladesh start businesses.", "เป็นแค่ background detail"],
          ["B", "Microfinance has helped millions of people but also faces criticism for its high interest rates.", "ครอบคลุมทั้งประโยชน์และคำวิจารณ์"],
          ["C", "High interest rates are the main reason why microfinance programmes fail in developing countries.", "Passage ไม่ได้บอกว่าโปรแกรมล้มเหลว"],
          ["D", "Traditional banks refuse to lend money to people in developing countries.", "เป็นแค่ context ในประโยคแรก"],
        ],
      ),
      passageMc(
        "s14-9",
        "The popularity of podcasts has grown enormously over the past decade. What began as a niche hobby for tech enthusiasts has become a major media format consumed by hundreds of millions of people worldwide. Podcasts now cover virtually every topic imaginable, from true crime and history to business and personal development. Major media companies and individual creators alike have found success in the format. Advertisers have followed, with podcast advertising becoming a multi-billion dollar industry. Analysts suggest that podcasts are popular because they fit naturally into busy modern lifestyles, offering entertainment and information that can be consumed while commuting, exercising, or doing household tasks.",
        "Main idea?",
        "C",
        [
          ["A", "True crime podcasts are the most popular genre among podcast listeners.", "Passage ไม่ได้บอกว่า true crime ยอดนิยมที่สุด"],
          ["B", "Podcast advertising has become more profitable than traditional radio advertising.", "Passage ไม่ได้เปรียบเทียบกับ radio"],
          ["C", "Podcasts have grown from a niche hobby into a major global media industry.", "ครอบคลุมการเติบโต ความหลากหลาย และอุตสาหกรรม"],
          ["D", "People listen to podcasts mainly while commuting to and from work.", "เป็นแค่หนึ่งในตัวอย่าง"],
        ],
      ),
      passageMc(
        "s14-10",
        "Animal-assisted therapy, which involves trained animals visiting patients in hospitals, care homes, and rehabilitation centres, has shown promising results in a variety of healthcare settings. Interacting with animals has been found to reduce anxiety, lower blood pressure, and improve mood in patients recovering from surgery or dealing with long-term illness. Children with autism have shown improved communication skills through programmes involving horses. Elderly residents in care homes who receive regular animal visits report lower levels of loneliness and depression. Despite the growing evidence, full integration into standard healthcare practices remains limited due to concerns about hygiene and logistics.",
        "Main idea?",
        "B",
        [
          ["A", "Horses are particularly effective in helping children with communication difficulties.", "เป็นแค่ detail เรื่องเด็กออทิสติกและม้า"],
          ["B", "Animal-assisted therapy shows clear health benefits across multiple groups but faces integration challenges.", "ครอบคลุมประโยชน์ กลุ่มต่างๆ และอุปสรรค"],
          ["C", "Hospitals should allow pets to visit patients because it makes them feel happier.", "บิดข้อมูล passage ไม่ได้เรียกร้องให้ทำสิ่งนี้"],
          ["D", "Animal-assisted therapy has been proven to cure depression in elderly patients.", "Passage บอกว่าช่วยลด ไม่ใช่รักษาให้หาย"],
        ],
      ),
    ],
  };
}

function buildSession15(): MiniStudyPassageMcSession {
  return {
    id: "session-15",
    index: 15,
    title: "Reading — find the missing paragraph",
    subtitle: "บทเรียน + 10 ข้อฝึก เติมประโยคที่หาย",
    durationLabel: "≈ 15 min",
    kind: "passage-mc",
    category: "reading",
    tierRequired: "premium",
    shortHookTh: "เรียนสัญญาณ pronoun + transition word ที่บอกประโยคถูกในช่องว่าง",
    explanation: [
      {
        heading: "ส่วนที่ 1 — Complete the Passage ใน DET คืออะไร?",
        body: [
          "ใน **Interactive Reading** ของ DET มีคำถามประเภท \"Complete the Passage\" ให้เลือกประโยคที่หายไปเพื่อเติม passage",
          "• ทดสอบว่าคุณเข้าใจว่าแต่ละ idea เชื่อมต่อกันยังไงภายใน passage",
          "• จะมี **ช่องว่าง** ใน passage + ตัวเลือก 4 ประโยค",
          "• ไม่ใช่แค่หาประโยคที่ \"ฟังดูดี\" — ต้องเชื่อมกับ **ทั้งประโยคก่อนและหลัง**",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 2 — ประโยคที่หายไปต้องทำ 3 สิ่งพร้อมกัน",
        body: [
          "✅ **เชื่อมกับประโยคก่อนหน้า** — รับ idea จากประโยคก่อนมาอย่างสมเหตุสมผล",
          "✅ **เชื่อมกับประโยคหลัง** — นำไปสู่ประโยคถัดไปอย่างเป็นธรรมชาติ",
          "✅ **สอดคล้องกับ idea หลัก** — ไม่นำเรื่องใหม่ที่ไม่เกี่ยวข้องเข้ามา",
          "ผ่านแค่ 1-2 ข้อ — ยังผิดอยู่",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 3 — สัญญาณที่ต้องหาในประโยคก่อนและหลัง",
        body: [
          "**Pronoun signals** — ถ้าประโยคหลังขึ้นต้นด้วย *This / These / It / They / Such* → ประโยคที่หายไปต้อง **แนะนำสิ่งที่ pronoun นั้นอ้างถึง**",
          "  *เช่น \"This approach has been widely adopted.\" → ประโยคที่หายไปต้องพูดถึง \"approach\" บางอย่าง*",
          "",
          "**Transition signals** — ถ้าประโยคหลังขึ้นต้นด้วย *However / As a result / Therefore / In contrast* → ประโยคที่หายไปต้องสร้าง **ความสัมพันธ์ที่ transition นั้นจะใช้**",
          "  *เช่น \"However, not everyone agrees.\" → ประโยคที่หายไปต้องพูดมุมมองฝ่ายที่เห็นด้วยก่อน*",
          "",
          "**Topic continuation** — ห้ามเปลี่ยน topic กลางคัน",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 4 — กับดักที่ DET ชอบออก",
        body: [
          "**❌ กับดัก 1 — เชื่อมกับประโยคก่อนได้แต่ไม่เชื่อมกับประโยคหลัง** — ตรวจสอบ **ทั้งสองทิศทาง** เสมอ",
          "**❌ กับดัก 2 — นำข้อมูลใหม่ที่ไม่เกี่ยวข้องเข้ามา** — \"ประโยคนี้เกี่ยวกับ topic เดิมไหม?\"",
          "**❌ กับดัก 3 — ซ้ำ idea ที่พูดไปแล้ว**",
          "**❌ กับดัก 4 — ขัดแย้งกับข้อมูลใน passage**",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 5 — ขั้นตอนการหาประโยคที่หายไป",
        body: [
          "1. อ่าน passage ทั้งหมด **รวมถึงส่วนที่อยู่หลังช่องว่าง** — สำคัญที่สุด",
          "2. อ่านประโยคก่อนช่องว่าง — จับ idea หลักและ keyword",
          "3. อ่านประโยคหลังช่องว่าง — จับ **pronoun** และ **transition words**",
          "4. อ่านตัวเลือกทุกตัว ทดสอบกับ **ทั้งสองทิศทาง**",
          "5. เลือกตัวที่เชื่อมได้ทั้งสองทิศทางและสอดคล้องกับ passage โดยรวม",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 6 — Tips สรุป",
        body: [
          "✅ อ่าน **ทั้งประโยคก่อนและหลัง** ช่องว่าง — ไม่ใช่แค่ด้านเดียว",
          "✅ หา **pronoun** ในประโยคหลัง → บอกว่าประโยคที่หายไปต้องพูดถึงอะไร",
          "✅ หา **transition words** ในประโยคหลัง → บอกทิศทางของความสัมพันธ์",
          "✅ อ่านตัวเลือกทั้งหมดก่อนเลือก",
          "❌ ห้ามเลือกประโยคที่นำ topic ใหม่เข้ามา",
          "❌ ห้ามเลือกแค่เพราะ \"เชื่อมกับประโยคก่อน\" โดยไม่ตรวจสอบประโยคหลัง",
        ].join("\n"),
      },
      {
        heading: "วิธีทำแบบฝึกหัด",
        body: "ใน passage จะมี **[___]** บอกตำแหน่งของประโยคที่หายไป · เลือกตัวเลือกที่เหมาะที่สุด · กดเฉลยเพื่อดูเหตุผลทุกตัวเลือก",
      },
    ],
    exercises: [
      passageMc(
        "s15-1",
        "Urban noise pollution has become a serious public health concern in many cities. Constant exposure to traffic, construction, and industrial sounds can lead to sleep disturbances, increased stress levels, and even hearing loss over time. [___] In response, some city planners are designing quieter urban environments by increasing green spaces, which absorb sound, and introducing regulations that limit construction noise during night hours.",
        "Best sentence for [___]?",
        "B",
        [
          ["A", "Music festivals in cities attract large numbers of tourists every year.", "เรื่องเทศกาลดนตรีไม่เกี่ยวกับ passage"],
          ["B", "These health consequences have prompted governments and planners to take action.", "เชื่อมทั้งสองทิศทาง — รับเรื่องผลกระทบต่อสุขภาพแล้วนำไปสู่การตอบสนอง"],
          ["C", "Noise pollution is less damaging than air pollution in most urban areas.", "เปรียบเทียบกับมลพิษทางอากาศซึ่ง passage ไม่ได้พูดถึง"],
          ["D", "Many people choose to wear headphones to block out street noise.", "พฤติกรรมส่วนบุคคล ไม่นำไปสู่เรื่องนักวางแผนเมือง"],
        ],
      ),
      passageMc(
        "s15-2",
        "The concept of a four-day working week has gained significant attention in recent years. Supporters argue that reducing working hours can improve employee wellbeing and increase productivity. Several large-scale trials conducted in Iceland, Japan, and the United Kingdom produced largely positive results. [___] However, critics argue that the model may not be suitable for all industries, particularly those that require continuous operations such as healthcare and emergency services.",
        "Best sentence for [___]?",
        "A",
        [
          ["A", "Employees in these trials reported higher job satisfaction and lower stress levels, while productivity either remained the same or improved.", "ให้รายละเอียดผลบวกของการทดลอง นำไปสู่การค้านด้วย However"],
          ["B", "Iceland is known for having some of the happiest workers in the world.", "ไม่นำไปสู่ However"],
          ["C", "Working fewer hours means that employees earn less money each month.", "ขัดแย้งกับ idea ของ passage"],
          ["D", "Japan has one of the longest average working weeks of any developed country.", "ข้อมูลเรื่องญี่ปุ่นไม่เชื่อมกับประโยคก่อนหรือหลัง"],
        ],
      ),
      passageMc(
        "s15-3",
        "In many parts of the world, traditional crafts are in danger of disappearing. Skills such as pottery, weaving, and woodcarving that were once passed down through generations are now practised by only a small number of elderly artisans. [___] Digital platforms have also opened new markets, allowing craftspeople to sell their work internationally and attract younger buyers interested in handmade, authentic products.",
        "Best sentence for [___]?",
        "B",
        [
          ["A", "Mass-produced goods from factories are cheaper and easier to find than handmade items.", "ไม่นำไปสู่ประโยคเรื่อง digital platforms"],
          ["B", "Several organisations and governments are working to preserve these crafts through training programmes and cultural funding.", "เชื่อมทั้งสองทิศทาง — รับปัญหาและนำไปสู่วิธีแก้เพิ่มเติม"],
          ["C", "Young people today prefer to pursue careers in technology rather than traditional trades.", "ไม่เกี่ยวกับการอนุรักษ์"],
          ["D", "Pottery is one of the oldest crafts in human history, dating back thousands of years.", "ไม่เชื่อมกับ passage"],
        ],
      ),
      passageMc(
        "s15-4",
        "Online misinformation spreads far more quickly than accurate information, according to a major study published by researchers at MIT. The study, which analysed millions of tweets over a twelve-year period, found that false stories were 70% more likely to be shared than true ones. [___] The researchers suggest this is because false news tends to be more novel and emotionally engaging, making people more likely to share it without first verifying the information.",
        "Best sentence for [___]?",
        "B",
        [
          ["A", "Twitter is the most popular social media platform among adults under 30.", "ไม่เกี่ยวกับการวิจัย"],
          ["B", "This pattern was consistent across different topics, including politics, science, and entertainment.", "ขยาย finding และเชื่อมกับ \"this\" ในประโยคถัดไป"],
          ["C", "Social media companies have introduced fact-checking tools to combat the spread of fake news.", "Passage ยังไม่ได้พูดถึงตรงนั้น"],
          ["D", "Reading news from reliable sources is the best way to stay informed.", "คำแนะนำส่วนบุคคล ไม่ใช่ส่วนของงานวิจัย"],
        ],
      ),
      passageMc(
        "s15-5",
        "The ocean plays a crucial role in regulating the Earth's climate. It absorbs roughly a quarter of the carbon dioxide released by human activity each year and stores vast amounts of heat. [___] Scientists warn that if ocean temperatures continue to rise, these critical functions could be disrupted, with potentially catastrophic consequences for weather patterns and biodiversity.",
        "Best sentence for [___]?",
        "C",
        [
          ["A", "Many species of fish are currently endangered due to overfishing in international waters.", "ไม่เกี่ยวกับ climate regulation"],
          ["B", "The ocean is also home to millions of species of marine plants and animals.", "ไม่นำไปสู่ประโยคเรื่องอุณหภูมิ"],
          ["C", "However, rising ocean temperatures caused by climate change are threatening the ocean's ability to carry out these functions.", "เชื่อมทั้งสองทิศทาง — รับ idea เรื่องบทบาทและนำสู่ภัยคุกคาม"],
          ["D", "Carbon dioxide is one of the main gases responsible for the greenhouse effect.", "อธิบาย CO2 แบบทั่วไป ไม่เชื่อมกับ passage"],
        ],
      ),
      passageMc(
        "s15-6",
        "The concept of emotional intelligence, or EQ, refers to the ability to recognise, understand, and manage one's own emotions as well as those of other people. Psychologists began formalising this concept in the 1990s, and it has since gained significant attention in education and the workplace. Research suggests that individuals with high EQ tend to be more effective leaders, communicate better under pressure, and build stronger professional relationships. [___] This has led many organisations to incorporate EQ assessment into their hiring processes alongside traditional measures of cognitive ability.",
        "Best sentence for [___]?",
        "B",
        [
          ["A", "Intelligence quotient, or IQ, was developed in the early twentieth century to measure cognitive ability.", "ไม่ใช่ focus ของ passage"],
          ["B", "High EQ has also been linked to better mental health outcomes and greater overall life satisfaction.", "เพิ่มประโยชน์เพิ่มเติมของ EQ ทำให้ \"This has led many organisations...\" สมบูรณ์"],
          ["C", "Some psychologists believe that emotional intelligence cannot be taught and is mostly determined by genetics.", "ขัดแย้งกับ tone ของ passage"],
          ["D", "Leadership training programmes are offered by most large companies to senior managers.", "ไม่เกี่ยวกับ EQ assessment"],
        ],
      ),
      passageMc(
        "s15-7",
        "Food waste is a major global problem. Approximately one third of all food produced for human consumption is lost or wasted each year, according to the United Nations. This waste occurs at every stage of the food supply chain, from farms where surplus crops are left unpicked to supermarkets that discard food approaching its sell-by date. [___] Tackling food waste has therefore become a priority for governments, businesses, and consumers alike, with initiatives ranging from food donation programmes to legislation that restricts supermarkets from throwing away edible food.",
        "Best sentence for [___]?",
        "B",
        [
          ["A", "Composting is an effective way to recycle food waste at home.", "วิธีแก้ส่วนบุคคล ไม่ใช่เหตุผลสำคัญ"],
          ["B", "The environmental consequences of food waste are significant, as decomposing food in landfills produces methane, a potent greenhouse gas.", "ให้ผลกระทบที่นำไปสู่ \"therefore\" ในประโยคถัดไป"],
          ["C", "Vegetarian diets produce less food waste than diets that include meat.", "Passage ไม่ได้พูดถึง"],
          ["D", "Many restaurants now offer smaller portion sizes to reduce the amount of food left on plates.", "ไม่นำไปสู่ \"therefore\""],
        ],
      ),
      passageMc(
        "s15-8",
        "Remote areas of the world have long struggled with limited access to quality healthcare. Patients in rural regions often have to travel long distances to reach the nearest hospital, and specialist care may be entirely unavailable locally. Telemedicine, which allows patients to consult with doctors via video call, has offered a promising solution. [___] This has made it possible for patients to receive specialist advice without leaving their communities, significantly improving health outcomes in underserved areas.",
        "Best sentence for [___]?",
        "B",
        [
          ["A", "However, many patients in rural areas do not have access to reliable internet connections.", "พูดเรื่องอุปสรรค แต่ประโยคถัดไปพูดผลสำเร็จ ขัดกัน"],
          ["B", "By connecting patients with doctors located in cities or even other countries, telemedicine removes the barrier of physical distance.", "อธิบายกลไกที่นำไปสู่ \"This\" ในประโยคถัดไป"],
          ["C", "Video calling technology was originally developed for business communication, not healthcare.", "ไม่เกี่ยวกับ passage"],
          ["D", "Some doctors are concerned that telemedicine reduces the quality of patient care.", "ขัดแย้งกับ tone ที่สนับสนุน telemedicine"],
        ],
      ),
      passageMc(
        "s15-9",
        "The sharing economy, characterised by platforms that allow people to share resources such as cars, homes, and tools, has transformed several traditional industries. Ride-sharing services have disrupted the taxi industry, while home-sharing platforms have changed the hotel sector. [___] Critics, however, point to concerns about worker rights, safety regulations, and the impact on local housing markets, particularly in popular tourist destinations where short-term rentals have driven up property prices.",
        "Best sentence for [___]?",
        "B",
        [
          ["A", "Taxi drivers in many cities have protested against ride-sharing services.", "มุมมองเชิงลบ ไม่เหมาะก่อน \"Critics, however\""],
          ["B", "Proponents of the sharing economy argue that it creates economic opportunity, reduces waste by making better use of existing resources, and offers consumers more affordable options.", "มุมมองเชิงบวก นำไปสู่ \"however\" ของ critics"],
          ["C", "The sharing economy relies heavily on smartphone apps and digital payment systems.", "เรื่องเทคโนโลยี ไม่นำไปสู่คำวิจารณ์"],
          ["D", "Home-sharing platforms now operate in over one hundred countries worldwide.", "สถิติ ไม่นำไปสู่ \"Critics, however\""],
        ],
      ),
      passageMc(
        "s15-10",
        "The migration of people from rural areas to cities, known as urbanisation, is one of the defining trends of the modern era. By 2050, it is estimated that nearly 70% of the world's population will live in urban areas. This rapid growth presents enormous challenges for infrastructure, housing, and public services. [___] At the same time, cities that are well-managed can offer significant advantages, including better access to education, healthcare, and economic opportunities, making them powerful drivers of national development.",
        "Best sentence for [___]?",
        "C",
        [
          ["A", "Some governments are trying to encourage people to move back to rural areas by offering financial incentives.", "ไม่เกี่ยวกับ challenges ที่กล่าวถึง"],
          ["B", "Traffic congestion is one of the most visible and frustrating problems in rapidly growing cities.", "เป็นแค่ตัวอย่างเดียว ไม่ครอบคลุม challenges ทั้งหมด"],
          ["C", "Without adequate planning and investment, cities risk becoming overcrowded and unable to meet the basic needs of their residents.", "ขยาย challenges นำสู่ \"At the same time\" ในประโยคถัดไป"],
          ["D", "Urbanisation began during the Industrial Revolution in the eighteenth century in Europe.", "ประวัติศาสตร์ ไม่นำไปสู่ \"At the same time\""],
        ],
      ),
    ],
  };
}

function buildSession16(): MiniStudyEssayClozeSession {
  return {
    id: "session-16",
    index: 16,
    title: "Fill in the Blanks — How to Spot What the Blank Needs",
    subtitle: "20 นาที · Grammar, not just vocabulary",
    durationLabel: "≈ 20 min",
    kind: "essay-cloze",
    category: "writing",
    tierRequired: "vip",
    shortHookTh: "40% ของ blanks ทดสอบ grammar ไม่ใช่ vocabulary — เรียนวิธีอ่าน blank ใน 20 วินาที",
    explanation: [
      {
        heading: "ส่วนที่ 1 — Fill in the Blanks ใน DET คืออะไร?",
        body: [
          "ใน **Fill in the Blanks** คุณจะได้รับประโยคที่มีคำที่หายไปบางส่วน หน้าที่ของคุณคือเติมตัวอักษรที่หายไปให้สมบูรณ์",
          "คำถามนี้ออกแบบมาเพื่อทดสอบ **vocabulary** แต่ไม่ใช่แค่การรู้จักคำ — ต้องรู้ว่าใช้คำนั้น **ในบริบท** อย่างไรด้วย",
          "มีเวลาประมาณ **20 วินาที** ต่อคำถามหนึ่งข้อ และมีทั้งหมด **6–9 ประโยค**",
          "",
          "**สิ่งที่นักเรียนส่วนใหญ่ไม่รู้:** ประมาณ **40%** ของ blanks ไม่ได้ทดสอบ vocabulary แต่ทดสอบ **grammar** — ถ้าคุณรู้จักคำแล้ว ยังต้องรู้ว่าจะใช้รูปแบบไหน",
        ].join("\n"),
        coachTip: "**ฟังพี่นะครับ** — นักเรียนส่วนใหญ่เสีย point ในส่วนนี้เพราะคิดว่ามันเป็น vocab test แต่จริงๆ มัน **grammar test ซ่อนรูป** ครับ! ถ้านักเรียนรู้กฎ word form ที่จะสอนต่อไปนี้ คะแนน Fill in the Blanks จะพุ่งขึ้นทันที เพราะนักเรียนจะไม่เดาแบบสุ่มอีกต่อไป ตามพี่มาเรียนกัน 7 ตัวชี้บอกที่ช่วยให้รู้ว่า blank ต้องการอะไรครับ",
      },
      {
        heading: "ส่วนที่ 2 — 3 ประเภทของ blank",
        body: [
          "blank ใน Fill in the Blanks แบ่งออกเป็น **3 ประเภทหลัก**:",
          "",
          "**ประเภทที่ 1 — Grammar-based blanks:** ต้องการ **preposition, conjunction, หรือ article** ซึ่งต้องใช้ความรู้ด้านไวยากรณ์มากกว่า vocabulary",
          "",
          "**ประเภทที่ 2 — Vocabulary-based blanks:** ต้องเลือก **noun, verb, หรือ adjective** ที่ถูกต้องตามความหมายในประโยค",
          "",
          "**ประเภทที่ 3 — Contextual / transitional blanks:** ต้องการ **transition words** เช่น \"however,\" \"therefore,\" \"meanwhile\" ที่แสดงความสัมพันธ์ระหว่างสองประโยค",
        ].join("\n"),
      },
      {
        heading: "ส่วนที่ 3 — 7 ตัวชี้บอกที่ต้องจำ",
        body: [
          "ก่อนเติมคำใดๆ ให้ถามตัวเองว่า \"blank นี้ต้องการ **word form** ไหน?\" โดยใช้ตัวชี้บอกในประโยค",
          "",
          "**🔍 1. blank ต้องการ verb + -ed (past participle / passive)**",
          "• มี **is / are / was / were / been** อยู่หน้า blank → passive voice",
          "• มี **have / has / had** อยู่หน้า blank → perfect tense",
          "• blank อยู่หลัง linking verb และอธิบาย subject → past participle as adjective",
          "ตัวอย่าง: *The results were **surprised*** · *She has **finished** her report.* · *The window was **broken** during the storm.*",
          "",
          "**🔍 2. blank ต้องการ verb + -ing (gerund / present participle)**",
          "• มี **is / are / was / were** อยู่หน้า blank และไม่มีคำอื่นต่อ → present continuous",
          "• blank อยู่หลัง preposition เช่น **by, in, of, for, without, after, before** → gerund",
          "• blank ทำหน้าที่เป็น **subject** ของประโยค → gerund",
          "ตัวอย่าง: *She is **studying** for the exam.* · *He improved by **practising** every day.* · ***Learning** a new language takes time.*",
          "",
          "**🔍 3. blank ต้องการ adjective**",
          "• blank อยู่ **หน้า noun** → adjective modifier",
          "• blank อยู่หลัง linking verb (**is, are, seems, feels, looks, becomes**) → predicate adjective",
          "ตัวอย่าง: *It was a **remarkable** achievement.* · *The situation seems **complicated**.* · *She felt **exhausted** after the exam.*",
          "",
          "**🔍 4. blank ต้องการ adverb**",
          "• blank อยู่ **หน้า adjective** หรือ adverb อื่น → adverb modifier",
          "• blank อยู่ **หลัง verb** และอธิบายวิธีที่ทำ → adverb of manner",
          "• blank อยู่ **ต้นประโยค** ก่อน comma และแสดงความถี่หรือระดับ",
          "ตัวอย่าง: *The exam was **unexpectedly** difficult.* · *She spoke **clearly** during the presentation.* · ***Recently**, scientists discovered a new species.*",
          "",
          "**🔍 5. blank ต้องการ noun form**",
          "• มี **article** (a, an, the) อยู่หน้า blank → ต้องการ noun",
          "• มี **adjective** อยู่หน้า blank → ต้องการ noun",
          "• blank เป็น subject หรือ object ของประโยค",
          "ตัวอย่าง: *The **development** of new technology takes years.* · *She showed great **determination**.* · *His **achievement** impressed everyone.*",
          "",
          "**🔍 6. blank ต้องการ preposition**",
          "• blank อยู่ระหว่าง noun/verb กับ noun/pronoun และแสดงความสัมพันธ์",
          "• มี collocation ที่ตายตัว เช่น **interested ___, responsible ___, depend ___**",
          "• blank อยู่หน้า time expression หรือ place",
          "ตัวอย่าง: *She is interested **in** science.* · *He is responsible **for** the project.* · *They arrived **on** Monday.*",
          "",
          "**🔍 7. blank ต้องการ transition word**",
          "• blank อยู่ **ต้นประโยค** ก่อน comma และเชื่อมความคิด 2 ข้อ",
          "• ประโยคก่อนและหลัง blank มีความสัมพันธ์ที่ชัดเจน (ตรงข้าม / ผลลัพธ์ / เพิ่มเติม)",
          "ตัวอย่าง: *She studied hard. **However**, she failed the exam.* (ตรงข้าม) · *He missed the bus. **As a result**, he was late.* (ผลลัพธ์) · *The food was cheap. **Moreover**, it was delicious.* (เพิ่มเติม)",
        ].join("\n"),
        coachTip: "**เคล็ดลับพี่ดอยครับ:** ตัวชี้บอก 7 ข้อนี้ไม่ต้องท่อง — ใช้บ่อยๆ แล้วจะจำได้เองครับ พี่แนะนำให้นักเรียน **focus ที่ตัวชี้บอก 1, 2, และ 5 ก่อน** เพราะ -ed / -ing / noun-form เป็น 60% ของ blanks ทั้งหมดในข้อสอบจริง ส่วน adverb (-ly) กับ preposition collocation นั้นค่อยฝึกหลังๆ ก็ได้ เริ่มจากที่ง่ายและออกบ่อยก่อนครับ",
      },
      {
        heading: "ส่วนที่ 4 — ⚠ ข้อผิดพลาดที่นักเรียนไทยทำบ่อย",
        body: [
          "**❌ เดาคำศัพท์โดยไม่ดู word form**",
          "• รู้จักคำว่า *\"surprise\"* แต่ไม่คิดว่าต้องเป็น *\"surprised\"* หรือ *\"surprising\"*",
          "• **แก้:** ดู **สิ่งที่อยู่รอบๆ blank** ก่อนเสมอ อย่าเพิ่งเติมคำ",
          "",
          "**❌ สับสนระหว่าง -ed และ -ing adjectives**",
          "• *surprised* (รู้สึกประหลาดใจ — อธิบายคน) vs *surprising* (น่าประหลาดใจ — อธิบายสิ่งของ)",
          "• กฎ: ถ้า blank อธิบาย **คน** หรือสิ่งที่รู้สึก → มักเป็น **-ed**",
          "• กฎ: ถ้า blank อธิบาย **สิ่งของ สถานการณ์ หรือข่าว** → มักเป็น **-ing**",
          "",
          "**❌ ใช้ adjective แทน adverb**",
          "• *\"She spoke clear\"* → ผิด ต้องเป็น *\"She spoke clearly\"*",
          "• กฎ: ถ้า blank อธิบาย **verb** → ต้องการ **adverb (-ly)**",
          "• กฎ: ถ้า blank อธิบาย **noun** → ต้องการ **adjective**",
          "",
          "**❌ ใช้ verb form แทน noun form**",
          "• *\"The develop of technology...\"* → ผิด ต้องเป็น *\"The development of technology...\"*",
          "• กฎ: ถ้ามี **article** หรือ **adjective** อยู่หน้า blank → ต้องการ **noun เสมอ**",
          "",
          "**❌ ลืม suffix ของ noun forms**",
          "• **-tion / -sion:** education, decision, information",
          "• **-ment:** development, achievement, improvement",
          "• **-ness:** happiness, awareness, weakness",
          "• **-ity:** ability, creativity, possibility",
          "• **-ance / -ence:** performance, difference, importance",
        ].join("\n"),
        coachTip: "**ระวังจุดสับสน -ed กับ -ing ให้ดีครับ** — เป็นข้อผิดพลาดอันดับ 1 ของนักเรียนไทย! จำสูตรง่ายๆ: ***คน → -ed (รู้สึก) · ของ → -ing (ทำให้รู้สึก)*** เช่น *\"I am bored\"* (ฉันรู้สึกเบื่อ) vs *\"The movie is boring\"* (หนังน่าเบื่อ) ถ้านักเรียนจำสูตรนี้ได้ จะไม่พลาดเลยครับ",
      },
      {
        heading: "ส่วนที่ 5 — 🎯 วิธีอ่าน blank ใน 20 วินาที",
        body: [
          "เวลาเพียง 20 วินาที ต้องทำตามลำดับนี้:",
          "",
          "**วินาทีที่ 0–5** — อ่านประโยคทั้งหมดก่อน อย่าเพิ่งดู blank",
          "**วินาทีที่ 5–10** — ดูสิ่งที่อยู่ **รอบๆ blank ซ้ายและขวา** ถามว่า \"ต้องการ word form ไหน?\"",
          "**วินาทีที่ 10–15** — เติมคำที่คิดว่าถูก",
          "**วินาทีที่ 15–20** — อ่านประโยคซ้ำ ตรวจว่า make sense ไหม",
        ].join("\n"),
        coachTip: "**อย่ารีบเติมก่อนอ่านประโยคจบนะครับ!** — นี่คือข้อผิดพลาดที่ทำให้นักเรียนเสียคะแนนเยอะที่สุดในส่วนนี้ บางคนเห็น blank ปุ๊บ พิมพ์ปั๊บโดยไม่ดูบริบท → ผิดทันที พี่แนะนำให้ฝึกท่อง *\"อ่าน → ดูรอบๆ → เติม → ตรวจ\"* ทุกครั้ง 5 วินาทีแรกสำคัญที่สุดครับ",
      },
      {
        heading: "ส่วนที่ 6 — 🧠 Checklist ก่อนเติมคำ",
        body: [
          "☐ มี **article (a/an/the)** หรือ **adjective** หน้า blank → ต้องการ **noun**",
          "☐ มี **is/are/was/were** + blank → ตรวจว่าเป็น passive (**-ed**) หรือ continuous (**-ing**)",
          "☐ มี **have/has/had** หน้า blank → ต้องการ **past participle (-ed/irregular)**",
          "☐ blank อธิบาย **verb** → ต้องการ **adverb (-ly)**",
          "☐ blank อธิบาย **noun** หรืออยู่หลัง **linking verb** → ต้องการ **adjective**",
          "☐ blank อยู่หลัง **preposition** → ต้องการ **gerund (-ing)**",
          "☐ blank อยู่ **ต้นประโยค** และเชื่อมสองประโยค → ต้องการ **transition word**",
        ].join("\n"),
        coachTip: "**checklist นี้คือสรุปทั้งบทเรียนครับ** — ถ้านักเรียนจำได้แค่ตารางนี้ตารางเดียว ก็สอบ Fill in the Blanks ได้คะแนนสูงแล้ว! พี่แนะนำให้บันทึก checklist นี้ลง Notebook → เปิดดูทุกครั้งก่อนทำ practice → 1-2 อาทิตย์ จะจำได้ขึ้นใจ ไม่ต้องเปิดดูอีก ขอให้นักเรียนตั้งใจฝึกนะครับ — สู้ๆ! 💪",
      },
    ],
    studentInstructionsTh:
      "อ่านประโยคให้จบก่อน แล้วเติมคำในรูปที่ถูกต้องตามไวยากรณ์ ใช้ base word ในวงเล็บเป็นตัวตั้ง เปลี่ยน word form ให้เหมาะกับบริบท",
    exercises: [
      {
        id: "s16-1",
        patternLabel: "ข้อ 1 — Past participle adjective",
        topic: "Many scientists are concerned about climate change",
        essayTemplate:
          "Many scientists are ___ about the effects of climate change on biodiversity.",
        blanks: [
          {
            number: 1,
            cue: "BASE: concern",
            correct: "concerned",
            category: "past-participle",
            ruleNoteTh:
              "Past participle as adjective — อยู่หลัง linking verb 'are' + อธิบายความรู้สึกของคน (scientists) → ใช้ -ed · กฎ: คน + รู้สึก → -ed / สิ่งของ + ทำให้รู้สึก → -ing",
          },
        ],
      },
      {
        id: "s16-2",
        patternLabel: "ข้อ 2 — -ing adjective",
        topic: "Government's surprising decision on renewable energy",
        essayTemplate:
          "The government's decision to invest in renewable energy was ___ to many industry experts.",
        blanks: [
          {
            number: 1,
            cue: "BASE: surprise",
            correct: "surprising",
            category: "adjective-form",
            ruleNoteTh:
              "-ing adjective — อยู่หลัง linking verb 'was' + อธิบาย 'decision' (สิ่งของ ไม่ใช่คน) → ใช้ -ing · กฎ: สิ่งของ/สถานการณ์ที่ทำให้รู้สึก → -ing",
          },
        ],
      },
      {
        id: "s16-3",
        patternLabel: "ข้อ 3 — Gerund after preposition",
        topic: "Starting work after graduation",
        essayTemplate:
          "After ___ her degree, she immediately started looking for work in her field.",
        blanks: [
          {
            number: 1,
            cue: "BASE: receive",
            correct: "receiving",
            category: "gerund",
            ruleNoteTh:
              "Gerund (-ing) — blank อยู่หลัง preposition 'After' → ต้องเติม -ing เสมอ · กฎ: หลัง preposition ทุกตัว (by, in, of, for, without, after, before) → ต้องการ -ing",
          },
        ],
      },
      {
        id: "s16-4",
        patternLabel: "ข้อ 4 — Noun form after article",
        topic: "Development of electric vehicles",
        essayTemplate:
          "The ___ of affordable electric vehicles has changed the automotive industry significantly.",
        blanks: [
          {
            number: 1,
            cue: "BASE: develop",
            correct: "development",
            category: "noun-form",
            ruleNoteTh:
              "Noun form — มี article 'The' อยู่หน้า blank → ต้องการ noun เสมอ · กฎ: a/an/the + blank → noun ต้องลงท้ายด้วย -ment, -tion, -ness, -ity",
          },
        ],
      },
      {
        id: "s16-5",
        patternLabel: "ข้อ 5 — Adverb describing verb",
        topic: "Confidently answering interview questions",
        essayTemplate:
          "She answered all the interview questions ___ and impressed the hiring committee.",
        blanks: [
          {
            number: 1,
            cue: "BASE: confident",
            correct: "confidently",
            category: "adverb-form",
            ruleNoteTh:
              "Adverb (-ly) — blank อยู่หลัง verb 'answered' และอธิบายวิธีที่เธอตอบ → ต้องการ adverb · กฎ: blank อธิบาย verb → adverb ที่ลงท้าย -ly",
          },
        ],
      },
      {
        id: "s16-6",
        patternLabel: "ข้อ 6 — Past participle (present perfect passive)",
        topic: "Research paper review process",
        essayTemplate:
          "The research paper has been ___ by three independent experts before publication.",
        blanks: [
          {
            number: 1,
            cue: "BASE: review",
            correct: "reviewed",
            category: "past-participle",
            ruleNoteTh:
              "Past participle — มี 'has been' หน้า blank → present perfect passive → ต้องเติม -ed · กฎ: have/has/had + been + blank → past participle (-ed) เสมอ",
          },
        ],
      },
      {
        id: "s16-7",
        patternLabel: "ข้อ 7 — Transition word (result)",
        topic: "Studying hard leads to success",
        essayTemplate:
          "He studied very hard for months. ___, he passed the exam with the highest score in the class.",
        blanks: [
          {
            number: 1,
            cue: "BASE: (transition)",
            correct: "Therefore",
            acceptedAlts: ["therefore", "As a result", "as a result", "Consequently", "consequently"],
            category: "transition-word",
            ruleNoteTh:
              "Transition word แสดงผลลัพธ์ — ประโยคก่อน: เหตุ (เรียนหนัก) / ประโยคหลัง: ผล (สอบผ่าน) → Therefore / As a result / Consequently · ไม่ใช่ However (ขัดแย้ง) หรือ In addition (เพิ่ม)",
          },
        ],
      },
      {
        id: "s16-8",
        patternLabel: "ข้อ 8 — Past participle adjective (feelings)",
        topic: "Tired patient after surgery",
        essayTemplate:
          "The patient felt ___ after the surgery and needed several days to recover.",
        blanks: [
          {
            number: 1,
            cue: "BASE: tire",
            correct: "tired",
            category: "past-participle",
            ruleNoteTh:
              "Past participle as adjective — อยู่หลัง linking verb 'felt' + อธิบายความรู้สึกของคน (patient) → ใช้ -ed · กฎ: felt/seemed/looked/appeared + blank อธิบายคน → -ed adjective",
          },
        ],
      },
      {
        id: "s16-9",
        patternLabel: "ข้อ 9 — Preposition collocation",
        topic: "Company known for innovation",
        essayTemplate:
          "The company is well known ___ its innovative approach to product design.",
        blanks: [
          {
            number: 1,
            cue: "BASE: (preposition)",
            correct: "for",
            category: "preposition-form",
            ruleNoteTh:
              "Preposition collocation — 'well known ___' เป็น collocation ตายตัว → for · จำเป็นคู่: known for = มีชื่อเสียงในเรื่อง / known as = เป็นที่รู้จักในชื่อ",
          },
        ],
      },
      {
        id: "s16-10",
        patternLabel: "ข้อ 10 — Adverb modifying adjective",
        topic: "Rapidly rising sea levels",
        essayTemplate:
          "___ rising sea levels pose a serious threat to coastal communities around the world.",
        blanks: [
          {
            number: 1,
            cue: "BASE: rapid",
            correct: "Rapidly",
            acceptedAlts: ["rapidly"],
            category: "adverb-form",
            ruleNoteTh:
              "Adverb (-ly) — blank อยู่หน้า adjective 'rising' เพื่อขยาย adjective นั้น → ต้องการ adverb · กฎ: blank + adjective หรือ blank + adverb อื่น → adverb (-ly)",
          },
        ],
      },
    ],
  };
}

function passageMc(
  id: string,
  passage: string,
  question: string,
  correctLetter: "A" | "B" | "C" | "D",
  rows: [letter: "A" | "B" | "C" | "D", text: string, explanationTh: string][],
): MiniStudyPassageMcExercise {
  return {
    id,
    passage,
    question,
    correctLetter,
    options: rows.map(([letter, text, explanationTh]) => ({ letter, text, explanationTh })),
  };
}
