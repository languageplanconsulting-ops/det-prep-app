export type DetPageSlug =
  | "what-is-det"
  | "score-guide"
  | "cost-thailand"
  | "mock-test"
  | "accepted-universities"
  | "vs-ielts"
  | "vs-toefl"
  | "write-about-photo"
  | "speak-about-photo";

type DetSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

type DetFaq = {
  question: string;
  answer: string;
};

export type DetPageContent = {
  slug: DetPageSlug;
  title: string;
  description: string;
  h1: string;
  heroLabel: string;
  intro: string;
  primaryKeyword: string;
  ctaHref: string;
  ctaLabel: string;
  sections: DetSection[];
  faq: DetFaq[];
  related: DetPageSlug[];
};

export const DET_PAGE_ORDER: DetPageSlug[] = [
  "what-is-det",
  "score-guide",
  "cost-thailand",
  "mock-test",
  "accepted-universities",
  "vs-ielts",
  "vs-toefl",
  "write-about-photo",
  "speak-about-photo",
];

export const DET_PAGES: Record<DetPageSlug, DetPageContent> = {
  "what-is-det": {
    slug: "what-is-det",
    title: "Duolingo English Test คืออะไร? คู่มือ DET สำหรับคนไทย",
    description:
      "อธิบาย DET คืออะไร สอบยังไง วัดอะไรบ้าง และใครควรเลือกสอบ Duolingo English Test ในมุมที่เหมาะกับผู้เรียนไทย",
    h1: "Duolingo English Test คืออะไร?",
    heroLabel: "DET Basics",
    intro:
      "Duolingo English Test หรือ DET คือข้อสอบวัดภาษาอังกฤษออนไลน์ที่หลายมหาวิทยาลัยทั่วโลกยอมรับ เหมาะกับผู้เรียนที่ต้องการสอบจากบ้าน รู้ผลไว และต้องการค่าใช้จ่ายที่เบากว่าการสอบแบบเดิม",
    primaryKeyword: "duolingo english test คืออะไร",
    ctaHref: "/mini-diagnosis/start",
    ctaLabel: "เริ่มเช็กระดับก่อนวางแผนสอบ",
    sections: [
      {
        title: "DET เหมาะกับใคร",
        paragraphs: [
          "ข้อสอบนี้เหมาะกับนักเรียนไทยที่ต้องการยื่นเรียนต่อ ใช้เวลาเตรียมตัวไม่นาน หรืออยากมีตัวเลือกเพิ่มเติมจาก IELTS และ TOEFL",
          "จุดเด่นคือสมัครง่าย สอบได้ที่บ้าน และออกผลค่อนข้างเร็ว จึงเหมาะกับคนที่มี deadline การสมัครใกล้เข้ามา",
        ],
        bullets: [
          "ผู้เรียนที่ต้องการสอบออนไลน์จากบ้าน",
          "ผู้ที่ต้องการคะแนนเพื่อยื่นมหาวิทยาลัยต่างประเทศ",
          "ผู้ที่ต้องการรู้ผลเร็วและคุมงบประมาณได้ดีขึ้น",
        ],
      },
      {
        title: "ข้อสอบวัดทักษะอะไรบ้าง",
        paragraphs: [
          "DET วัดหลายทักษะผสมกัน ทั้งอ่าน ฟัง พูด และเขียน โดยคำถามจำนวนมากจะเป็นแบบ integrated task คือใช้มากกว่า 1 ทักษะในข้อเดียว",
          "นั่นแปลว่าการเตรียมตัวต้องไม่เน้นแค่ grammar หรือ vocabulary อย่างเดียว แต่ต้องฝึก response speed, content quality และความมั่นใจด้วย",
        ],
      },
      {
        title: "สิ่งที่คนไทยมักเข้าใจผิด",
        paragraphs: [
          "หลายคนคิดว่า DET ง่ายกว่า IELTS เสมอ แต่จริง ๆ ความท้าทายอยู่ที่การตอบให้เร็ว สม่ำเสมอ และมีคุณภาพในเวลาจำกัด",
          "อีกเรื่องคือผู้สอบมักประเมิน speaking กับ writing ของตัวเองสูงเกินไป หากไม่มี mock test หรือ feedback จะเห็นจุดอ่อนได้ยาก",
        ],
      },
    ],
    faq: [
      {
        question: "Duolingo English Test ใช้ยื่นมหาวิทยาลัยได้จริงไหม",
        answer:
          "ได้ แต่ต้องเช็กกับมหาวิทยาลัยเป้าหมายโดยตรงเสมอ เพราะแต่ละที่อาจมีคะแนนขั้นต่ำและเงื่อนไขต่างกัน",
      },
      {
        question: "DET ยากไหมสำหรับคนไทย",
        answer:
          "ความยากอยู่ที่เวลาและความสม่ำเสมอของคุณภาพคำตอบ โดยเฉพาะ speaking และ writing มากกว่าความยากของเนื้อหาอย่างเดียว",
      },
    ],
    related: ["score-guide", "mock-test", "vs-ielts"],
  },
  "score-guide": {
    slug: "score-guide",
    title: "Duolingo English Test Score Guide: 95, 105, 115, 125+",
    description:
      "ดูความหมายคะแนน DET แต่ละช่วง พร้อมเป้าหมายคะแนน เทคนิคอัปคะแนน และการวางแผนฝึกสำหรับผู้เรียนไทย",
    h1: "คู่มือคะแนน Duolingo English Test",
    heroLabel: "DET Score",
    intro:
      "การรู้ว่าคะแนน 95, 105, 115 หรือ 125+ หมายถึงอะไร จะช่วยให้คุณวางแผนอ่านหนังสือและเลือก task ที่ต้องเร่งก่อนสอบจริงได้แม่นขึ้น",
    primaryKeyword: "duolingo english test score",
    ctaHref: "/mock-test/start",
    ctaLabel: "ลอง mock test แล้วดู baseline score",
    sections: [
      {
        title: "ช่วงคะแนนที่ควรโฟกัส",
        paragraphs: [
          "ผู้สมัครส่วนมากไม่ได้ต้องการคะแนนสูงที่สุด แต่ต้องการคะแนนที่ผ่านเกณฑ์ของมหาวิทยาลัยเป้าหมาย ดังนั้นการวางแผนควรเริ่มจาก target score ก่อน",
        ],
        bullets: [
          "95-100: เริ่มต้นพอใช้ แต่ยังต้องเร่งความแม่นยำ",
          "105-115: ช่วงที่หลายคนตั้งเป้าเพื่อสมัครเรียนต่อ",
          "120+: ต้องอาศัยความสม่ำเสมอของ speaking และ writing มากขึ้น",
        ],
      },
      {
        title: "คะแนนไม่ขึ้นมักติดตรงไหน",
        paragraphs: [
          "สำหรับผู้เรียนไทย จุดค้างคะแนนมักอยู่ที่ content ใน speaking, sentence control ใน writing และการจัดเวลาเวลาตอบข้อ integrated task",
          "การฝึกเฉพาะข้อที่ถนัดมักทำให้รู้สึกเก่งขึ้น แต่คะแนนรวมไม่ขยับ เพราะ DET วัดภาพรวมหลายทักษะพร้อมกัน",
        ],
      },
      {
        title: "วางแผนอัปคะแนนแบบคุ้มเวลา",
        paragraphs: [
          "เริ่มจาก mini diagnosis หรือ mock test เพื่อหา baseline แล้วจัดลำดับจุดอ่อน 2 อย่างแรกก่อน เช่น write about photo กับ read then speak",
          "เมื่อ feedback เริ่มนิ่งขึ้น ค่อยเพิ่มการทำข้อภายใต้เวลาเพื่อให้ transfer ไปสู่สนามจริง",
        ],
      },
    ],
    faq: [
      {
        question: "คะแนน DET เท่าไรถึงดี",
        answer:
          "ขึ้นอยู่กับมหาวิทยาลัยและโปรแกรมที่สมัคร แต่สำหรับการวางแผน ควรตั้งเป้าให้สูงกว่าขั้นต่ำที่ต้องใช้เล็กน้อย",
      },
      {
        question: "ถ้าคะแนนค้างที่ 105 ควรทำอย่างไร",
        answer:
          "มักต้องลงลึกที่ speaking และ writing quality มากกว่าทำข้อเพิ่มอย่างเดียว โดยเฉพาะการจัดคำตอบให้ชัดและเร็ว",
      },
    ],
    related: ["mock-test", "write-about-photo", "speak-about-photo"],
  },
  "cost-thailand": {
    slug: "cost-thailand",
    title: "Duolingo English Test ราคาเท่าไร? อัปเดตสำหรับไทย",
    description:
      "สรุปราคา DET วิธีวางงบค่าสอบ ค่าฝึก และการเตรียมตัวสำหรับผู้สอบในไทยแบบเข้าใจง่าย",
    h1: "Duolingo English Test ราคาเท่าไร",
    heroLabel: "DET Cost",
    intro:
      "ผู้เรียนจำนวนมากเลือก DET เพราะต้องการทางเลือกที่รวดเร็วและประหยัดกว่าเดิม แต่ต้นทุนจริงไม่ได้มีแค่ค่าสอบ ยังรวมถึงการเตรียมตัวและการลดโอกาสสอบซ้ำด้วย",
    primaryKeyword: "duolingo english test ราคา",
    ctaHref: "/pricing",
    ctaLabel: "ดูแพลนฝึกและค่าใช้จ่ายของ English Plan",
    sections: [
      {
        title: "ต้นทุนที่ควรมองทั้งระบบ",
        paragraphs: [
          "เวลาเทียบค่าใช้จ่าย อย่าดูแค่ราคาค่าสอบ ต้องรวมค่าเตรียมตัว เวลาที่ใช้ และความเสี่ยงที่จะต้องสอบซ้ำด้วย",
          "การมี mock test และ feedback ที่ช่วยเจอจุดอ่อนเร็ว มักประหยัดกว่าการสอบจริงซ้ำเพราะเตรียมไม่ตรงจุด",
        ],
      },
      {
        title: "วางงบอย่างไรให้คุ้ม",
        paragraphs: [
          "ถ้าคุณมีเวลาเตรียมตัวจำกัด ให้เริ่มจากการประเมินระดับก่อน แล้วค่อยเลือกว่าจะใช้แพลนรายเดือนหรือ add-on เพิ่มเติม",
        ],
        bullets: [
          "เริ่มจาก mini diagnosis เพื่อประเมิน baseline",
          "ใช้ mock test ก่อนสอบจริงเพื่อลดความเสี่ยง",
          "ซื้อ add-on เฉพาะเมื่อใกล้เต็มโควตา ไม่ต้องจ่ายเกินจำเป็น",
        ],
      },
      {
        title: "ค่าใช้จ่ายที่หลายคนลืมคิด",
        paragraphs: [
          "คนจำนวนมากมองข้ามต้นทุนด้านเวลา หากฝึกผิดจุด 2-3 สัปดาห์ก็อาจกระทบ deadline การสมัครได้",
          "สำหรับผู้เรียนไทย การใช้คำแนะนำภาษาไทยควบคู่กับ feedback ภาษาอังกฤษมักช่วยลดเวลาแก้จุดอ่อนได้มาก",
        ],
      },
    ],
    faq: [
      {
        question: "ควรซื้อแพลนหรือ add-on ก่อน",
        answer:
          "ถ้าคุณจะฝึกต่อเนื่องหลายสัปดาห์ แพลนมักคุ้มกว่า แต่ถ้าต้องการเติมเฉพาะบางช่วง add-on ก็เหมาะกว่า",
      },
      {
        question: "ทำไม mock test ถึงสำคัญต่อความคุ้มค่า",
        answer:
          "เพราะ mock test ช่วยให้เห็นว่าคุณพร้อมสอบจริงหรือยัง ลดโอกาสเสียค่าสอบจริงโดยไม่จำเป็น",
      },
    ],
    related: ["mock-test", "score-guide", "vs-ielts"],
  },
  "mock-test": {
    slug: "mock-test",
    title: "Mock Test Duolingo English Test พร้อม AI Feedback",
    description:
      "ฝึกทำ mock test แบบ DET พร้อม feedback รายข้อ ช่วยดู pacing, จุดอ่อน และความพร้อมก่อนสอบจริง",
    h1: "Mock Test สำหรับ Duolingo English Test",
    heroLabel: "DET Mock Test",
    intro:
      "ถ้าคุณต้องการรู้ว่าพร้อมสอบจริงหรือยัง Mock test คือหน้าต่างที่ใกล้เคียงสนามสอบที่สุด เพราะมันบอกได้ทั้งคะแนนโดยประมาณ พฤติกรรมการตอบ และ task ที่ทำให้คะแนนตก",
    primaryKeyword: "mock test duolingo english test",
    ctaHref: "/mock-test/start",
    ctaLabel: "เริ่มทำ mock test",
    sections: [
      {
        title: "Mock test ช่วยอะไรจริง",
        paragraphs: [
          "มันไม่ได้มีประโยชน์แค่ดูคะแนน แต่ช่วยเช็ก pacing, ความนิ่งของคุณภาพคำตอบ และความพร้อมด้านเวลา",
          "สำหรับหลายคน ปัญหาไม่ใช่ความรู้ไม่พอ แต่เป็นความเร็วและความสม่ำเสมอในตอนตอบจริง",
        ],
      },
      {
        title: "ควรใช้ mock test เมื่อไร",
        paragraphs: [
          "ใช้ก่อนเริ่มแผนอ่านเพื่อหา baseline ใช้อีกครั้งกลางทางเพื่อดูว่าแผนฝึกเวิร์กไหม และใช้อีกครั้งช่วงท้ายเพื่อเช็ก readiness ก่อนสอบจริง",
        ],
        bullets: [
          "ก่อนเริ่มเตรียมตัว",
          "หลังฝึก 1-2 สัปดาห์",
          "ก่อนวันสอบจริง",
        ],
      },
      {
        title: "สิ่งที่ต้องดูหลังทำ mock",
        paragraphs: [
          "อย่าดูแค่คะแนนรวม ให้ดูว่าข้อไหนทำให้เสียเวลา จุดไหนมี feedback ซ้ำ และทักษะไหนยัง unstable เมื่ออยู่ภายใต้เวลา",
          "ถ้าคุณมี feedback ซ้ำ ๆ ใน write about photo หรือ speak about photo นั่นคือจุดที่ควรแก้ก่อนทำข้อเพิ่ม",
        ],
      },
    ],
    faq: [
      {
        question: "ควรทำ mock test บ่อยแค่ไหน",
        answer:
          "ขึ้นอยู่กับเวลาที่เหลือก่อนสอบ แต่โดยทั่วไป 2-4 ครั้งในช่วงเตรียมตัวจะช่วยวัดความคืบหน้าได้ดี",
      },
      {
        question: "ถ้าคะแนน mock แกว่งมาก แปลว่าอะไร",
        answer:
          "มักแปลว่าคุณภาพคำตอบยังไม่เสถียร โดยเฉพาะใน speaking และ writing หรือยังจัดเวลาไม่ดีพอ",
      },
    ],
    related: ["score-guide", "write-about-photo", "speak-about-photo"],
  },
  "accepted-universities": {
    slug: "accepted-universities",
    title: "Duolingo English Test ใช้ยื่นที่ไหนได้บ้าง",
    description:
      "แนวทางเช็กว่ามหาวิทยาลัยที่สนใจรับคะแนน DET หรือไม่ พร้อมวิธีวางแผนยื่นคะแนนให้ปลอดภัยขึ้น",
    h1: "DET ใช้ยื่นที่ไหนได้บ้าง",
    heroLabel: "University Use",
    intro:
      "คำถามที่สำคัญไม่ใช่แค่ DET ใช้ยื่นได้หรือไม่ แต่คือโปรแกรมและรอบสมัครที่คุณกำลังจะยื่นรับคะแนนแบบไหน และต้องใช้ขั้นต่ำเท่าไร",
    primaryKeyword: "duolingo english test ใช้ยื่นที่ไหน",
    ctaHref: "/duolingo-english-test",
    ctaLabel: "กลับไปดูคู่มือ DET Thailand",
    sections: [
      {
        title: "เช็กการยอมรับคะแนนอย่างไร",
        paragraphs: [
          "เริ่มจากเว็บไซต์ทางการของมหาวิทยาลัยและหน้า admissions ของโปรแกรม เพราะเงื่อนไขอาจต่างกันระหว่างคณะหรือรอบรับ",
          "ถ้าหาไม่เจอ ให้ติดต่อ admissions โดยตรง อย่าอาศัยข้อมูลเก่าจากโพสต์หรือกลุ่มอย่างเดียว",
        ],
      },
      {
        title: "อย่าดูแค่คำว่า accepted",
        paragraphs: [
          "แม้มหาวิทยาลัยจะรับ DET แต่แต่ละโปรแกรมอาจมีคะแนนขั้นต่ำไม่เท่ากัน บางที่ยังมีข้อกำหนดด้าน subscore หรือ writing expectation ด้วย",
          "การตั้งเป้าคะแนนให้สูงกว่าขั้นต่ำเล็กน้อยจะปลอดภัยกว่าการตั้งเป้าชนเส้นพอดี",
        ],
      },
      {
        title: "แผนสำหรับผู้สมัครจากไทย",
        paragraphs: [
          "ถ้าคุณมีเวลาจำกัด ควรทำ baseline ก่อนแล้วประเมินว่าคะแนนปัจจุบันห่างจากเป้ากี่ช่วง เพื่อเลือกว่าจะเร่ง mock test หรือเร่ง task ใดก่อน",
        ],
      },
    ],
    faq: [
      {
        question: "มหาวิทยาลัยทุกแห่งรับ DET ไหม",
        answer:
          "ไม่ทุกแห่ง และบางแห่งรับเฉพาะบางโปรแกรมหรือบางรอบ จึงต้องตรวจสอบข้อมูลล่าสุดของสถาบันเป้าหมายเสมอ",
      },
      {
        question: "ควรตั้งเป้าคะแนนเท่าไรถ้ามหาวิทยาลัยกำหนดขั้นต่ำ",
        answer:
          "โดยทั่วไปควรตั้งเป้าสูงกว่าขั้นต่ำเล็กน้อย เพื่อเผื่อความคลาดเคลื่อนและเพิ่มความมั่นใจตอนยื่น",
      },
    ],
    related: ["score-guide", "what-is-det", "vs-toefl"],
  },
  "vs-ielts": {
    slug: "vs-ielts",
    title: "Duolingo English Test vs IELTS: เลือกอะไรดี",
    description:
      "เปรียบเทียบ DET กับ IELTS เรื่องราคา ความเร็ว ความยาก และความเหมาะกับนักเรียนไทย",
    h1: "DET vs IELTS เลือกอะไรดี",
    heroLabel: "DET Comparison",
    intro:
      "คำตอบไม่ได้มีข้อเดียวสำหรับทุกคน การเลือกสอบระหว่าง DET กับ IELTS ต้องดูทั้ง deadline งบประมาณ มหาวิทยาลัยเป้าหมาย และรูปแบบข้อสอบที่เข้ากับคุณ",
    primaryKeyword: "duolingo english test vs ielts",
    ctaHref: "/pricing",
    ctaLabel: "ดูแผนฝึก DET แบบครบระบบ",
    sections: [
      {
        title: "เมื่อ DET อาจเหมาะกว่า",
        paragraphs: [
          "ถ้าคุณต้องการสอบจากบ้าน รู้ผลเร็ว และมี deadline ใกล้ DET มักตอบโจทย์กว่า",
          "ผู้เรียนไทยหลายคนยังรู้สึกว่า DET accessible กว่าในแง่การเริ่มต้น แต่ต้องยอมรับว่ามันต้องการ response speed สูง",
        ],
      },
      {
        title: "เมื่อ IELTS ยังเหมาะกว่า",
        paragraphs: [
          "ถ้ามหาวิทยาลัยหรือประเทศปลายทางของคุณยังคุ้นกับ IELTS มากกว่า หรือมี requirement ชัดกับ IELTS อยู่แล้ว ก็อาจปลอดภัยกว่า",
        ],
      },
      {
        title: "สิ่งที่ควรใช้ตัดสินใจ",
        paragraphs: [
          "อย่าดูแค่ความง่ายหรือความถูก ควรดู acceptance, timeline, format fit และจุดแข็งของตัวเอง",
        ],
        bullets: [
          "เป้าหมายมหาวิทยาลัย",
          "เวลาเตรียมตัวที่เหลือ",
          "งบประมาณ",
          "ความถนัด speaking และ writing แบบจับเวลา",
        ],
      },
    ],
    faq: [
      {
        question: "DET ง่ายกว่า IELTS ไหม",
        answer:
          "ไม่เสมอไป DET อาจเข้าถึงง่ายกว่า แต่ข้อสอบบังคับให้ตอบเร็วและคงคุณภาพคำตอบให้ดีตลอด ซึ่งท้าทายมาก",
      },
      {
        question: "ถ้าฉันมีเวลาน้อยควรเลือกอะไร",
        answer:
          "ถ้าสถาบันปลายทางรับ DET และ timeline กระชั้น DET มักเป็นตัวเลือกที่ยืดหยุ่นกว่า แต่ควรเช็ก acceptance ก่อนทุกครั้ง",
      },
    ],
    related: ["vs-toefl", "what-is-det", "cost-thailand"],
  },
  "vs-toefl": {
    slug: "vs-toefl",
    title: "Duolingo English Test vs TOEFL: ต่างกันอย่างไร",
    description:
      "เปรียบเทียบ DET กับ TOEFL ทั้ง format, score, cost และวิธีเลือกสอบให้เหมาะกับเป้าหมายของคุณ",
    h1: "DET vs TOEFL ต่างกันอย่างไร",
    heroLabel: "DET Comparison",
    intro:
      "ถ้าคุณกำลังเลือกสอบระหว่าง DET กับ TOEFL สิ่งที่ควรมองคือรูปแบบข้อสอบ ความคุ้นเคยของมหาวิทยาลัยปลายทาง และเวลาที่คุณมีสำหรับการเตรียมตัว",
    primaryKeyword: "duolingo english test vs toefl",
    ctaHref: "/mini-diagnosis/start",
    ctaLabel: "เช็กระดับก่อนเลือกเส้นทางสอบ",
    sections: [
      {
        title: "ความต่างด้านรูปแบบสอบ",
        paragraphs: [
          "TOEFL มีโครงสร้างที่หลายคนคุ้นเคยกว่าและมักยาวกว่า ขณะที่ DET เน้นรูปแบบ adaptive และผสานหลายทักษะเข้าด้วยกัน",
        ],
      },
      {
        title: "ความต่างด้านประสบการณ์ผู้สอบ",
        paragraphs: [
          "ถ้าคุณรับมือกับการตอบภายใต้เวลาและการสลับทักษะได้ดี DET อาจเหมาะกว่า แต่ถ้าคุณชอบโครงสร้างข้อสอบที่คุ้นเคย TOEFL อาจทำให้รู้สึกมั่นคงกว่า",
        ],
      },
      {
        title: "เลือกอย่างไรให้ไม่เสียเวลา",
        paragraphs: [
          "เช็ก requirements ของสถาบันก่อน แล้วค่อยดูว่าทักษะไหนของคุณน่าจะพัฒนาได้เร็วที่สุดภายใต้รูปแบบข้อสอบนั้น",
        ],
      },
    ],
    faq: [
      {
        question: "มหาวิทยาลัยรับ DET แทน TOEFL ไหม",
        answer:
          "หลายแห่งรับ แต่ไม่ใช่ทุกที่ จึงต้องเช็กกับมหาวิทยาลัยและโปรแกรมที่คุณสมัครโดยตรง",
      },
      {
        question: "ถ้าพูดไม่คล่องมากควรเลือก DET หรือ TOEFL",
        answer:
          "ขึ้นอยู่กับรูปแบบที่คุณรับมือได้ดีกว่า แต่สำหรับ DET คุณควรฝึก speaking แบบสั้น กระชับ และภายใต้เวลาจริงมากเป็นพิเศษ",
      },
    ],
    related: ["accepted-universities", "score-guide", "vs-ielts"],
  },
  "write-about-photo": {
    slug: "write-about-photo",
    title: "Write About Photo DET: เทคนิค ตัวอย่าง และคำตอบ",
    description:
      "รวมเทคนิคทำ Write About Photo ของ DET พร้อมตัวอย่างคำตอบ โครงสร้างประโยค และข้อผิดพลาดที่พบบ่อย",
    h1: "เทคนิค Write About Photo สำหรับ DET",
    heroLabel: "DET Writing Task",
    intro:
      "Write About Photo เป็นหนึ่งใน task ที่คนไทยชอบคิดว่าไม่ยาก แต่จริง ๆ แล้วเสียคะแนนง่ายจากประโยคที่กว้างเกินไป คำศัพท์ซ้ำ และการสรุปภาพแบบไม่มี focus",
    primaryKeyword: "write about photo duolingo english test",
    ctaHref: "/practice/production/write-about-photo",
    ctaLabel: "ฝึก Write About Photo",
    sections: [
      {
        title: "โครงสร้างคำตอบที่ปลอดภัย",
        paragraphs: [
          "เริ่มจากบอกภาพรวมของภาพ แล้วค่อยลงรายละเอียดที่เห็นชัดจริง 1-2 จุด ปิดท้ายด้วยผลกระทบหรือการตีความแบบระวังเกินจริง",
        ],
        bullets: [
          "Sentence 1: ภาพรวมของภาพ",
          "Sentence 2: รายละเอียดสำคัญที่เห็นจริง",
          "Sentence 3: การตีความแบบสมเหตุผล",
        ],
      },
      {
        title: "ข้อผิดพลาดที่ทำให้คะแนนตก",
        paragraphs: [
          "หลายคนเดาเกินข้อมูลในภาพ ใช้คำซ้ำเดิม หรือเขียนยาวโดยไม่มีโครงสร้าง ทำให้ grammar และ clarity เสียพร้อมกัน",
          "อีกจุดที่พบบ่อยคือ feedback เรื่อง phrasing เช่นใช้ preposition หรือ collocation ไม่เป็นธรรมชาติ",
        ],
      },
      {
        title: "ฝึกอย่างไรให้เห็นผล",
        paragraphs: [
          "ฝึกด้วยภาพหลายแนวและให้ความสำคัญกับ feedback ที่ซ้ำเดิมมากกว่าจำนวนข้อที่ทำ ยิ่งลด error pattern เดิมได้ คะแนนจะนิ่งขึ้นเร็ว",
        ],
      },
    ],
    faq: [
      {
        question: "ต้องเขียนกี่ประโยคถึงจะดี",
        answer:
          "ไม่จำเป็นต้องเยอะเกินไป จุดสำคัญคือชัดเจน เป็นธรรมชาติ และมีรายละเอียดพอ ไม่เดาเกินภาพ",
      },
      {
        question: "ถ้าไม่แน่ใจว่าคนในภาพกำลังทำอะไรควรเขียนไหม",
        answer:
          "เขียนได้ในเชิง cautious language เช่น seems, appears, may be แต่ไม่ควรยืนยันสิ่งที่มองไม่เห็นชัด",
      },
    ],
    related: ["speak-about-photo", "mock-test", "score-guide"],
  },
  "speak-about-photo": {
    slug: "speak-about-photo",
    title: "Speak About Photo DET: เทคนิค ตัวอย่าง และคำตอบ",
    description:
      "ฝึก Speak About Photo สำหรับ DET ด้วยตัวอย่างคำตอบ โครงสร้างพูดจริง และเทคนิคเพิ่ม fluency กับ content",
    h1: "เทคนิค Speak About Photo สำหรับ DET",
    heroLabel: "DET Speaking Task",
    intro:
      "Speak About Photo ต้องการทั้ง content และ flow ในเวลาสั้น ๆ ผู้เรียนไทยจำนวนมากมีไอเดียแต่พูดไม่ต่อเนื่อง หรือพูดคล่องแต่เนื้อหาบางเกินไป",
    primaryKeyword: "speak about photo duolingo english test",
    ctaHref: "/practice/production/speak-about-photo",
    ctaLabel: "ฝึก Speak About Photo",
    sections: [
      {
        title: "พูดอย่างไรให้ทั้งชัดและต่อเนื่อง",
        paragraphs: [
          "เริ่มจาก main scene แล้วเติม 2 รายละเอียดที่ support กัน ไม่จำเป็นต้องพูดทุกอย่างในภาพ ขอให้ flow ดีและจับประเด็นถูก",
        ],
      },
      {
        title: "ปัญหายอดฮิตของผู้เรียนไทย",
        paragraphs: [
          "พูดช้าเกินไปเพราะคิดคำศัพท์นาน เริ่มประโยคซ้ำ ๆ เดิม หรือพยายามเดามากเกินจากภาพจนเสียความน่าเชื่อถือ",
        ],
        bullets: [
          "hesitation เยอะ",
          "structure ไม่ชัด",
          "รายละเอียดไม่ support กัน",
        ],
      },
      {
        title: "วิธีฝึกให้ transfer ไปวันสอบจริง",
        paragraphs: [
          "ฝึกเป็นรอบสั้น ๆ โดยอัดเสียงตัวเอง แล้วดูทั้ง fluency, grammar และ idea control ไม่ใช่ดูแค่พูดได้ครบเวลา",
        ],
      },
    ],
    faq: [
      {
        question: "ควรพูดเร็วแค่ไหน",
        answer:
          "ควรพูดในจังหวะธรรมชาติที่ฟังชัด ไม่ต้องเร็วเกินไป แต่ต้องไม่หยุดนานจน flow ขาด",
      },
      {
        question: "ถ้าคำศัพท์ไม่มากจะทำคะแนนได้ไหม",
        answer:
          "ได้ หากใช้คำศัพท์พื้นฐานได้แม่น โครงสร้างชัด และให้รายละเอียดสมเหตุผล การสื่อสารที่ชัดสำคัญกว่าคำศัพท์ยากที่ใช้ไม่ตรง",
      },
    ],
    related: ["write-about-photo", "mock-test", "what-is-det"],
  },
};

export function getDetPage(slug: string): DetPageContent | null {
  if (slug in DET_PAGES) {
    return DET_PAGES[slug as DetPageSlug];
  }
  return null;
}
