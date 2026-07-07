"use client";

import { LessonPathHub } from "@/components/lessons/LessonPathHub";
import { PHOTOWRITE_TIERS, PHOTOWRITE_UNIT_SIZE, photoWriteUnits } from "@/lib/photo-write-lessons";

export default function PhotoWriteHubPage() {
  return (
    <LessonPathHub
      topic="photowrite"
      skillTag="photowrite"
      heroKicker="บทเรียน · เขียนบรรยายภาพ"
      heroTitle="บรรยายภาพทีละช่อง"
      heroSub="45 ภาพ · ดูภาพจริง เลือกคำบรรยายให้ถูก"
      unitSize={PHOTOWRITE_UNIT_SIZE}
      tiers={PHOTOWRITE_TIERS}
      unitsForTier={photoWriteUnits}
      idOf={(item) => item.id}
      hrefForUnit={(tier, unit) => `/practice/lessons/how-to-write/write-about-photo/${tier}/${unit}`}
    />
  );
}
