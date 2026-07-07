"use client";

import { LessonPathHub } from "@/components/lessons/LessonPathHub";
import { REALWORD_TIERS, REALWORD_UNIT_SIZE, realWordUnits } from "@/lib/realword-lesson";

export default function RealWordLessonsHubPage() {
  return (
    <LessonPathHub
      topic="realword"
      skillTag="realword_lesson"
      heroKicker="บทเรียน · คำจริง"
      heroTitle="จับผิดการสะกด ทีละด่าน"
      heroSub="600 คำ · ตัดสินถูก/ผิด แก้คำที่ผิด แล้วเรียนความหมาย"
      unitSize={REALWORD_UNIT_SIZE}
      tiers={REALWORD_TIERS}
      unitsForTier={realWordUnits}
      idOf={(item) => item.id}
      hrefForUnit={(tier, unit) => `/practice/lessons/real-word/${tier}/${unit}`}
    />
  );
}
