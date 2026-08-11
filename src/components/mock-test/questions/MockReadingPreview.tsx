"use client";

/** Sample content in the documented vocabulary_reading upload shape, for /preview/mock-reading. */
import { useState } from "react";
import { VocabularyReadingMockExam } from "@/components/mock-test/questions/VocabularyReadingMockExam";

const SAMPLE = {
  titleEn: "Coastal towns",
  passage: {
    p1: "The harbour was rebuilt in [BLANK 1] after the storm, and the council [BLANK 2] to widen the sea wall. Local fishermen were [BLANK 3] about the cost, because a wider wall meant fewer moorings.",
    p2: "That decision changed the town more than anyone expected.",
    p3: "Today the same wall [BLANK 4] the promenade dry in winter, and the shops behind it stay [BLANK 5] all year. Visitors rarely [BLANK 6] it is there.",
  },
  highlightedVocab: [
    { word: "promenade", meaningEn: "a seafront walkway", meaningTh: "ทางเดินริมทะเล", example: "We walked along the promenade." },
    { word: "moorings", meaningEn: "places to tie up a boat", meaningTh: "ที่จอดเรือ", example: "The harbour lost half its moorings." },
  ],
  vocabularyQuestions: [
    { question: "1", correctAnswer: "stages", options: ["stages", "stops", "signs", "sides"], explanationThai: "in stages = ทำเป็นระยะ ๆ ไม่ใช่ทีเดียวจบ" },
    { question: "2", correctAnswer: "voted", options: ["voted", "vetoed", "valued", "viewed"], explanationThai: "สภาท้องถิ่น “ลงมติ” ให้ขยายกำแพง" },
    { question: "3", correctAnswer: "uneasy", options: ["uneasy", "eager", "certain", "proud"], explanationThai: "ประโยคหลัง because บอกเหตุผลที่ชาวประมงไม่สบายใจ" },
    { question: "4", correctAnswer: "keeps", options: ["keeps", "kept", "keeping", "keep"], explanationThai: "ประธาน the same wall เอกพจน์ และเล่าเหตุการณ์ปัจจุบัน" },
    { question: "5", correctAnswer: "open", options: ["open", "shut", "empty", "dark"], explanationThai: "ร้านค้าหลังกำแพง “เปิด” ได้ทั้งปีเพราะไม่โดนคลื่น" },
    { question: "6", correctAnswer: "notice", options: ["notice", "notify", "noting", "noticed"], explanationThai: "หลัง rarely ใช้กริยารูป base — rarely notice" },
  ],
  missingParagraph: {
    question: "Which paragraph best fills the gap?",
    correctAnswer: "That decision changed the town more than anyone expected.",
    options: [
      "That decision changed the town more than anyone expected.",
      "Fishing has never recovered anywhere in the region.",
      "The council later sold the harbour to a developer.",
    ],
    explanationThai: "ย่อหน้าถัดไปเล่าผลที่เกิดตามมา จึงต้องมีประโยคที่บอกว่า “การตัดสินใจนั้นเปลี่ยนเมือง” มาก่อน",
  },
  informationLocation: {
    question: "What is the reason why the fishermen were uneasy?",
    correctAnswer: "a wider wall meant fewer moorings",
    options: ["a wider wall meant fewer moorings", "the sea wall", "the promenade"],
    explanationThai: "คำถามถามเหตุผล จึงไฮไลต์อนุประโยคหลัง because ไม่ใช่คำว่า cost",
  },
  bestTitle: {
    question: "What is the best title for this passage?",
    correctAnswer: "The Wall That Stayed",
    options: ["The Wall That Stayed", "How To Build A Harbour", "Fishing In Winter"],
    explanationThai: "ครอบคลุมทั้งการสร้างกำแพงและผลระยะยาวที่ตามมา",
  },
  mainIdea: {
    question: "Which idea is expressed in the passage?",
    correctAnswer: "A rebuilt sea wall reshaped the town in ways residents did not foresee.",
    options: [
      "A rebuilt sea wall reshaped the town in ways residents did not foresee.",
      "Storms are becoming more frequent every decade.",
      "Most coastal towns depend entirely on tourism.",
    ],
    explanationThai: "พูดซ้ำประโยคที่เติมลงช่องว่าง คือการตัดสินใจนั้นเปลี่ยนเมืองเกินคาด",
  },
};

export function MockReadingPreview() {
  const [payload, setPayload] = useState<unknown>(null);
  return (
    <>
      <VocabularyReadingMockExam
        content={SAMPLE as unknown as Record<string, unknown>}
        completedSteps={0}
        aggregateMode
        onSubmit={(p) => setPayload(p)}
      />
      {payload ? (
        <pre className="mt-6 overflow-x-auto rounded-xl bg-slate-900 p-4 text-[11px] leading-5 text-emerald-300">
          {JSON.stringify(payload, null, 2)}
        </pre>
      ) : null}
    </>
  );
}
