/**
 * Thai-language catalogue of the DET exercise types, for the public (crawlable)
 * practice landing page at /duolingo-english-test/practice.
 *
 * Deliberately separate from the live hub in
 * `src/components/practice/PracticePageClient.tsx`: that one is a client component
 * carrying per-user progress labels and English UI strings, and it sits behind the
 * auth gate. This one is static, server-rendered, Thai, and written for search
 * intent. Keep the `href`s in sync — they are the deep links a signed-in learner
 * lands on after signup.
 */

export type PracticeCategory = {
  /** Thai heading shown on the landing page */
  title: string;
  /** English label kept for the eyebrow/kicker, matching in-app naming */
  kicker: string;
  blurb: string;
  items: { label: string; description: string; href: string }[];
};

export const PRACTICE_CATALOG: PracticeCategory[] = [
  {
    title: "ทักษะการพูดและการเขียน",
    kicker: "Production",
    blurb:
      "ส่วนที่ตัดสินคะแนน Production ของคุณโดยตรง และเป็นจุดที่ผู้สอบไทยเสียคะแนนมากที่สุด",
    items: [
      {
        label: "Write About the Photo",
        description: "บรรยายภาพภายในเวลาจำกัด ฝึกโครงประโยคที่ตรวจให้คะแนนได้จริง",
        href: "/practice/production/write-about-photo",
      },
      {
        label: "Read, Then Write",
        description: "อ่านโจทย์แล้วเขียนตอบยาว ฝึกวางโครงย่อหน้าและการยกตัวอย่าง",
        href: "/practice/production/read-and-write",
      },
      {
        label: "Speak About the Photo",
        description: "พูดบรรยายภาพ พร้อมตรวจการออกเสียงและความต่อเนื่องด้วย AI",
        href: "/practice/production/speak-about-photo",
      },
      {
        label: "Read, Then Speak",
        description: "อ่านคำถามแล้วพูดตอบ ฝึกจดโน้ตและเรียงเหตุผลก่อนพูด",
        href: "/practice/production/read-and-speak",
      },
      {
        label: "Interactive Speaking",
        description: "บทสนทนาโต้ตอบ 6 เทิร์นต่อสถานการณ์ เหมือนพาร์ททดสอบจริง",
        href: "/practice/production/interactive-speaking",
      },
    ],
  },
  {
    title: "ทักษะการอ่าน",
    kicker: "Comprehension",
    blurb: "คำศัพท์และการจับใจความ ซึ่งเป็นฐานคะแนน Literacy และ Comprehension",
    items: [
      {
        label: "Vocabulary",
        description: "คลังคำศัพท์ที่ออกสอบบ่อย พร้อมความหมายภาษาไทยและสมุดจดคำศัพท์",
        href: "/practice/comprehension/vocabulary",
      },
      {
        label: "Reading",
        description: "ฝึกอ่านจับใจความ หาข้อมูล และเติมย่อหน้าที่หายไป",
        href: "/practice/comprehension/reading",
      },
    ],
  },
  {
    title: "ทักษะการฟัง",
    kicker: "Conversation",
    blurb: "พาร์ทฟังที่ต้องตอบโต้และสรุปความ ไม่ใช่แค่ฟังผ่าน ๆ",
    items: [
      {
        label: "Interactive Listening",
        description: "ฟังบทสนทนาแล้วเลือกตอบโต้ให้ถูกจังหวะ",
        href: "/practice/listening/interactive",
      },
      {
        label: "Dialogue → Summary",
        description: "ฟังบทสนทนาแล้วเขียนสรุป 5 รอบ ฝึกจับประเด็นสำคัญ",
        href: "/practice/listening/dialogue-summary",
      },
    ],
  },
  {
    title: "พื้นฐานภาษา",
    kicker: "Literacy",
    blurb: "พาร์ทที่ทำคะแนนขึ้นเร็วที่สุดถ้าฝึกสม่ำเสมอ",
    items: [
      {
        label: "Dictation",
        description: "ฟังแล้วพิมพ์ตาม ฝึกการฟังเสียงท้ายคำและการสะกด",
        href: "/practice/literacy/dictation",
      },
      {
        label: "Fill in the Blank",
        description: "เติมคำในช่องว่าง ครอบคลุมไวยากรณ์ที่ออกสอบจริง",
        href: "/practice/literacy/fill-in-blank",
      },
      {
        label: "Real or Fake Word",
        description: "แยกคำจริงกับคำปลอมภายในเวลาจำกัด ฝึกความเร็วในการอ่าน",
        href: "/practice/literacy/real-word",
      },
    ],
  },
];

export const PRACTICE_FAQ: { question: string; answer: string }[] = [
  {
    question: "ฝึกทำข้อสอบ Duolingo English Test ฟรีได้จริงไหม?",
    answer:
      "ได้ครับ สมัครสมาชิกฟรีแล้วเริ่มฝึกได้ทันทีทุกพาร์ท โดยไม่ต้องกรอกบัตรเครดิต ส่วนฟีเจอร์อย่าง mock test เต็มรูปแบบและการตรวจ speaking/writing ด้วย AI แบบไม่จำกัด จะอยู่ในแพ็กเกจแบบเสียเงิน",
  },
  {
    question: "ข้อสอบ Duolingo English Test มีกี่ประเภท?",
    answer:
      "ในแอป English Plan แบ่งการฝึกออกเป็น 12 ประเภท ครอบคลุม 4 กลุ่มทักษะ ได้แก่ การพูดและการเขียน (Production), การอ่าน (Comprehension), การฟัง (Conversation) และพื้นฐานภาษา (Literacy) ซึ่งตรงกับพาร์ทที่พบในข้อสอบจริง",
  },
  {
    question: "ควรเริ่มฝึกจากพาร์ทไหนก่อน?",
    answer:
      "แนะนำให้ทำแบบเช็กระดับสั้น ๆ ก่อน เพื่อดูว่าคะแนนคุณน่าจะอยู่ช่วงไหนและทักษะใดอ่อนที่สุด ระบบจะจัดลำดับพาร์ทที่ควรฝึกก่อนให้อัตโนมัติ",
  },
  {
    question: "ระบบตรวจการพูดและการเขียนอย่างไร?",
    answer:
      "ระบบใช้ AI ตรวจทั้งเนื้อหา ความถูกต้องทางไวยากรณ์ และการออกเสียง โดยเฉพาะเสียงท้ายคำอย่าง -s, -es และ -ed ที่ผู้เรียนไทยมักตกหล่น พร้อมคำอธิบายเป็นภาษาไทย",
  },
];
