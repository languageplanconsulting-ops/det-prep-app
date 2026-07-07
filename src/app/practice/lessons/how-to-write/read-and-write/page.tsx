"use client";

import { LessonPathHub } from "@/components/lessons/LessonPathHub";
import { READWRITE_TIERS, READWRITE_UNIT_SIZE, readWriteUnits } from "@/lib/readwrite-lessons";

export default function ReadWriteHubPage() {
  return (
    <LessonPathHub
      topic="readwrite"
      skillTag="readwrite"
      heroKicker="บทเรียน · อ่านแล้วเขียน"
      heroTitle="สร้างเรียงความทีละช่อง"
      heroSub="200 เรียงความ · เลือกหรือพิมพ์คำให้ถูกไวยากรณ์"
      unitSize={READWRITE_UNIT_SIZE}
      tiers={READWRITE_TIERS}
      unitsForTier={readWriteUnits}
      idOf={(item) => item.id}
      hrefForUnit={(tier, unit) => `/practice/lessons/how-to-write/read-and-write/${tier}/${unit}`}
    />
  );
}
