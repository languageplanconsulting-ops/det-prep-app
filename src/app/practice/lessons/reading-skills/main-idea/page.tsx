"use client";

import { LessonPathHub } from "@/components/lessons/LessonPathHub";
import { MAIN_IDEA_TIERS, MAIN_IDEA_UNIT_SIZE, mainIdeaUnits } from "@/lib/main-idea-lessons";

export default function MainIdeaHubPage() {
  return (
    <LessonPathHub
      topic="mainidea"
      skillTag="mainidea"
      heroKicker="บทเรียน · ทักษะการอ่าน"
      heroTitle="ใจความสำคัญ + ชื่อเรื่อง"
      heroSub="70 ข้อ · ตามคำใบ้ แล้วจับใจความสำคัญ"
      unitSize={MAIN_IDEA_UNIT_SIZE}
      tiers={MAIN_IDEA_TIERS}
      unitsForTier={mainIdeaUnits}
      idOf={(item) => item.id}
      hrefForUnit={(tier, unit) => `/practice/lessons/reading-skills/main-idea/${tier}/${unit}`}
    />
  );
}
