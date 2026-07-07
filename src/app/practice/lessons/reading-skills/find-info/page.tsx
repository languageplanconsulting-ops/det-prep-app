"use client";

import { LessonPathHub } from "@/components/lessons/LessonPathHub";
import { FIND_INFO_TIERS, FIND_INFO_UNIT_SIZE, findInfoUnits } from "@/lib/find-info-lessons";

export default function FindInfoHubPage() {
  return (
    <LessonPathHub
      topic="findinfo"
      skillTag="findinfo"
      heroKicker="บทเรียน · ทักษะการอ่าน"
      heroTitle="หาข้อมูลเฉพาะ"
      heroSub="70 ข้อ · จับคำพ้องความหมายในเนื้อเรื่อง"
      unitSize={FIND_INFO_UNIT_SIZE}
      tiers={FIND_INFO_TIERS}
      unitsForTier={findInfoUnits}
      idOf={(item) => item.id}
      hrefForUnit={(tier, unit) => `/practice/lessons/reading-skills/find-info/${tier}/${unit}`}
    />
  );
}
