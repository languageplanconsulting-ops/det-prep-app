"use client";

import { LessonPathHub } from "@/components/lessons/LessonPathHub";
import { DICTATION_TIERS, DICTATION_UNIT_SIZE, dictationUnits } from "@/lib/dictation-lessons";

export default function DictationLessonsHubPage() {
  return (
    <LessonPathHub
      topic="dictation"
      skillTag="dictation"
      heroKicker="บทเรียน · ตามคำบอก"
      heroTitle="เรียงประโยคให้เป๊ะ ทีละด่าน"
      heroSub="300 ประโยค · ฟังเสียง เลือกกริยาและคอมมาให้ถูก"
      unitSize={DICTATION_UNIT_SIZE}
      tiers={DICTATION_TIERS}
      unitsForTier={dictationUnits}
      idOf={(item) => item.id}
      hrefForUnit={(tier, unit) => `/practice/lessons/dictation/${tier}/${unit}`}
    />
  );
}
