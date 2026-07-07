"use client";

import { LessonPathHub } from "@/components/lessons/LessonPathHub";
import { MISSING_PARAGRAPH_TIERS, MISSING_PARAGRAPH_UNIT_SIZE, missingParagraphUnits } from "@/lib/missing-paragraph-lessons";

export default function MissingParagraphHubPage() {
  return (
    <LessonPathHub
      topic="missingparagraph"
      skillTag="missingparagraph"
      heroKicker="บทเรียน · ทักษะการอ่าน"
      heroTitle="หาย่อหน้าที่หายไป"
      heroSub="70 เรื่อง · เลือกประโยคเชื่อม แล้วจับคู่คำศัพท์"
      unitSize={MISSING_PARAGRAPH_UNIT_SIZE}
      tiers={MISSING_PARAGRAPH_TIERS}
      unitsForTier={missingParagraphUnits}
      idOf={(item) => item.id}
      hrefForUnit={(tier, unit) => `/practice/lessons/reading-skills/missing-paragraph/${tier}/${unit}`}
    />
  );
}
