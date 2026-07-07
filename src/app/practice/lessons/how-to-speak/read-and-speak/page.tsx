"use client";

import { LessonPathHub } from "@/components/lessons/LessonPathHub";
import { READSPEAK_TIERS, READSPEAK_UNIT_SIZE, readSpeakUnits } from "@/lib/readspeak-lessons";

export default function ReadSpeakHubPage() {
  return (
    <LessonPathHub
      topic="readspeak"
      skillTag="readspeak"
      heroKicker="บทเรียน · อ่านแล้วพูด"
      heroTitle="ฝึกพูดทีละหัวข้อ"
      heroSub="100 หัวข้อ · สร้างคำตอบ แล้วฝึกออกเสียงให้ได้ 90%+"
      unitSize={READSPEAK_UNIT_SIZE}
      tiers={READSPEAK_TIERS}
      unitsForTier={readSpeakUnits}
      idOf={(item) => item.id}
      hrefForUnit={(tier, unit) => `/practice/lessons/how-to-speak/read-and-speak/${tier}/${unit}`}
    />
  );
}
