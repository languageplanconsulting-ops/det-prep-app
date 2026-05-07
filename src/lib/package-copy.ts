import { AI_MONTHLY_LIMIT, MOCK_TEST_MONTHLY_LIMIT, SET_LIMITS, TIER_DISPLAY, type Tier } from "@/lib/access-control";

export type PackageSummary = {
  tier: Tier;
  labelTh: string;
  labelEn: string;
  durationTh: string;
  durationEn: string;
  aiTh: string;
  aiEn: string;
  mockTh: string;
  mockEn: string;
  practiceTh: string;
  bulletsTh: string[];
};

export function getPackageSummary(tier: Tier): PackageSummary {
  if (tier === "free") {
    return {
      tier,
      labelTh: "แพ็กเกจฟรี",
      labelEn: "Free",
      durationTh: "สิทธิ์เริ่มต้นแบบไม่มีวันหมดอายุ",
      durationEn: "Starter access with no expiry",
      aiTh: "AI Feedback ฟรี 1 ครั้งตลอดอายุบัญชี",
      aiEn: "1 lifetime AI feedback credit",
      mockTh: "Mock Test 0 ครั้ง",
      mockEn: "0 mock tests",
      practiceTh:
        "ใช้ฟรีได้อย่างละ 1 ครั้งสำหรับ Reading, Vocabulary, Dictation, Fill in the Blank, Real Word และ Interactive Conversation",
      bulletsTh: [
        "เหมาะสำหรับลองระบบและดูรูปแบบข้อสอบจริงก่อนอัปเกรด",
        "ใช้ฟรีได้อย่างละ 1 ครั้งในข้อสอบ non-mock ที่รองรับทุกประเภท",
        "ใช้ Personalized Feedback ได้ 1 ครั้งในงานพูด/เขียนที่กำหนด",
        "ไม่มี Full Mock Test ในแพ็กเกจฟรี",
      ],
    };
  }

  if (tier === "vip") {
    return {
      tier,
      labelTh: `แพ็กเกจ${TIER_DISPLAY[tier].nameTh}`,
      labelEn: TIER_DISPLAY[tier].nameEn,
      durationTh: "สิทธิ์ใช้งาน 30 วันต่อการชำระ 1 ครั้ง",
      durationEn: "30-day access per purchase",
      aiTh: `AI Feedback ${AI_MONTHLY_LIMIT[tier]} เครดิต / รอบแพ็กเกจ`,
      aiEn: `${AI_MONTHLY_LIMIT[tier]} AI feedback credits per cycle`,
      mockTh: `Mock Test ${MOCK_TEST_MONTHLY_LIMIT[tier]} ครั้ง / รอบแพ็กเกจ`,
      mockEn: `${MOCK_TEST_MONTHLY_LIMIT[tier]} mock tests per cycle`,
      practiceTh: "Practice sets ไม่จำกัดทุกทักษะ",
      bulletsTh: [
        "เหมาะกับคนที่ฝึกหนักและต้องการความยืดหยุ่นสูงสุด",
        "ปลดล็อกชุดฝึกทุก lane แบบไม่จำกัด",
        "ใช้สิทธิ์เสริมจาก add-on ได้ต่อเนื่องหากซื้อเพิ่ม",
      ],
    };
  }

  return {
    tier,
    labelTh: `แพ็กเกจ${TIER_DISPLAY[tier].nameTh}`,
    labelEn: TIER_DISPLAY[tier].nameEn,
    durationTh: "สิทธิ์ใช้งาน 30 วันต่อการชำระ 1 ครั้ง",
    durationEn: "30-day access per purchase",
    aiTh: `AI Feedback ${AI_MONTHLY_LIMIT[tier]} เครดิต / รอบแพ็กเกจ`,
    aiEn: `${AI_MONTHLY_LIMIT[tier]} AI feedback credits per cycle`,
    mockTh: `Mock Test ${MOCK_TEST_MONTHLY_LIMIT[tier]} ครั้ง / รอบแพ็กเกจ`,
    mockEn: `${MOCK_TEST_MONTHLY_LIMIT[tier]} mock tests per cycle`,
    practiceTh: `Reading ${SET_LIMITS[tier].comprehension} · Vocab ${SET_LIMITS[tier].vocabulary} · Literacy ${SET_LIMITS[tier].literacy} · Conversation ${SET_LIMITS[tier].conversation}`,
    bulletsTh: [
      "เหมาะกับผู้เรียนที่ต้องการฝึกต่อเนื่องและวัดพัฒนาการเป็นรอบ",
      "AI, Mock Test และชุดฝึกจะนับตามสิทธิ์ของแพ็กเกจนี้ก่อน",
      "ถ้าซื้อ add-on เพิ่ม ระบบจะบวกสิทธิ์ให้ต่อจากแพ็กเกจทันที",
    ],
  };
}
