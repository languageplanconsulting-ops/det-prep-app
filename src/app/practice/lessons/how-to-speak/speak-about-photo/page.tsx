"use client";

import { LessonPathHub } from "@/components/lessons/LessonPathHub";
import { SPEAKPHOTO_TIERS, SPEAKPHOTO_UNIT_SIZE, speakPhotoUnits } from "@/lib/speakphoto-lessons";

export default function SpeakPhotoHubPage() {
  return (
    <LessonPathHub
      topic="speakphoto"
      skillTag="speakphoto"
      heroKicker="บทเรียน · พูดบรรยายภาพ"
      heroTitle="พูดบรรยายภาพทีละภาพ"
      heroSub="45 ภาพ · ดูภาพจริง สร้างคำบรรยาย แล้วฝึกพูด"
      unitSize={SPEAKPHOTO_UNIT_SIZE}
      tiers={SPEAKPHOTO_TIERS}
      unitsForTier={speakPhotoUnits}
      idOf={(item) => item.id}
      hrefForUnit={(tier, unit) => `/practice/lessons/how-to-speak/speak-about-photo/${tier}/${unit}`}
    />
  );
}
