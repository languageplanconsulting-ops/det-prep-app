/**
 * Video production plan for the Duolingo Fast Track course.
 *
 * Single source of truth for "which videos exist, which are dead, which still
 * have to be recorded" — used by the admin production board
 * (/admin/course/production) and by the study-plan calendar to deep-link a
 * weakness straight at the right chapter.
 *
 * Static on purpose: the board works before migration 041 is deployed. Once it
 * is, `course_video_scripts` rows override `script` / `productionStatus` per
 * key (see src/lib/admin-course-production-data.ts).
 *
 * DET format note (researched 2026-07-29): Duolingo removed **Read Aloud** and
 * **Listen, Then Speak** on 1 July 2025, replacing the latter with Interactive
 * Speaking. Anything teaching those two is marked `dead` — it must come out of
 * the course before a student studies a question that is not on the exam.
 */

/** Which of the 13 live DET question types a video teaches. */
export type DetQuestionType =
  | "read_and_select"
  | "fill_in_blanks"
  | "read_and_complete"
  | "interactive_reading"
  | "listen_and_type"
  | "interactive_listening"
  | "write_about_photo"
  | "interactive_writing"
  | "speak_about_photo"
  | "read_then_speak"
  | "interactive_speaking"
  | "writing_sample"
  | "speaking_sample"
  /** Cross-cutting: orientation, vocabulary, pronunciation, full-mock guides. */
  | "general";

export type VideoLevel = "beginner" | "middle" | "advanced" | "all";

/** Where a planned video is in the recording pipeline. */
export type ProductionStatus =
  | "missing"
  | "scripted"
  | "recorded"
  | "uploaded"
  | "live"
  | "draft"
  | "dead";

/** Recording batch. FIX = delete/finish existing, A–D = new recordings. */
export type ProductionGroup = "FIX" | "A" | "B" | "C" | "D";

export type CourseVideoPlan = {
  /** Stable id — the join key for `course_video_scripts`. Never renumber. */
  key: string;
  titleTh: string;
  questionType: DetQuestionType;
  level: VideoLevel;
  group: ProductionGroup;
  status: ProductionStatus;
  /** Existing course location, e.g. "Ch.11 §1". Null for not-yet-recorded. */
  chapterRef: string | null;
  /** Weakness key from WEAKNESS_RESOURCES, so the calendar can route to it. */
  weaknessTaskType: string | null;
  /** 1 = do first. Drives the board's default sort. */
  priority: number;
  noteTh?: string;
  /** Pre-written outline. Editable in the admin panel, saved to DB. */
  script?: string;
};

/** Thai labels for the 13 live question types. */
export const QUESTION_TYPE_TH: Record<DetQuestionType, string> = {
  read_and_select: "Read and Select (เลือกคำจริง)",
  fill_in_blanks: "Fill in the Blanks (ใหม่ 2026)",
  read_and_complete: "Read and Complete (C-Test)",
  interactive_reading: "Interactive Reading",
  listen_and_type: "Listen and Type (ตามคำบอก)",
  interactive_listening: "Interactive Listening",
  write_about_photo: "Write About the Photo",
  interactive_writing: "Interactive Writing (ใหม่ 2026)",
  speak_about_photo: "Speak About the Photo",
  read_then_speak: "Read Then Speak",
  interactive_speaking: "Interactive Speaking (ใหม่ 2026)",
  writing_sample: "Writing Sample (เขียน 50 คำ)",
  speaking_sample: "Speaking Sample",
  general: "ทั่วไป / ปูพื้นฐาน",
};

export const LEVEL_TH: Record<VideoLevel, string> = {
  beginner: "เริ่มต้น",
  middle: "กลาง",
  advanced: "สูง",
  all: "ทุกระดับ",
};

export const STATUS_TH: Record<ProductionStatus, string> = {
  missing: "ยังไม่ได้ถ่าย",
  scripted: "เขียนสคริปต์แล้ว",
  recorded: "ถ่ายแล้ว",
  uploaded: "อัปโหลดแล้ว",
  live: "ใช้งานอยู่",
  draft: "ยังไม่เสร็จ (draft)",
  dead: "ต้องลบ",
};

export const GROUP_TH: Record<ProductionGroup, string> = {
  FIX: "แก้ของเดิม",
  A: "A — ระดับเริ่มต้น",
  B: "B — เติมจุดที่บาง",
  C: "C — ระดับสูง (110→130)",
  D: "D — การออกเสียงคนไทย",
};

/** Ordering used by the board when no explicit sort is chosen. */
export const PRODUCTION_STATUS_ORDER: ProductionStatus[] = [
  "dead",
  "draft",
  "missing",
  "scripted",
  "recorded",
  "uploaded",
  "live",
];

// ---------------------------------------------------------------------------
// Script helper — keeps the 29 outlines consistent without repeating boilerplate
// ---------------------------------------------------------------------------

function script(parts: {
  goal: string;
  hook: string;
  beats: string[];
  drill: string;
  close?: string;
  minutes?: number;
}): string {
  const mins = parts.minutes ?? 7;
  return [
    `**เป้าหมายของคลิป:** ${parts.goal}`,
    `**ความยาวที่ตั้งไว้:** ~${mins} นาที`,
    "",
    `### 0:00 — เปิด (ตะขอ)`,
    parts.hook,
    "",
    `### เนื้อหา`,
    ...parts.beats.map((b, i) => `${i + 1}. ${b}`),
    "",
    `### ฝึกในคลิป`,
    parts.drill,
    "",
    `### ปิดท้าย`,
    parts.close ??
      "สรุป 3 ข้อที่ต้องจำ แล้วบอกให้ไปทำแบบฝึกในแอปต่อทันที (ปุ่มอยู่ใต้คลิป)",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// THE PLAN
// ---------------------------------------------------------------------------

export const COURSE_VIDEO_PLAN: CourseVideoPlan[] = [
  // ===================== FIX — delete dead content =====================
  {
    key: "fix-dead-readaloud-1",
    titleTh: "สรุปเทคนิคการ Read Aloud",
    questionType: "general",
    level: "all",
    group: "FIX",
    status: "dead",
    chapterRef: "Ch.11 §1",
    weaknessTaskType: null,
    priority: 1,
    noteTh: "Read Aloud ถูกตัดออกจากข้อสอบ 1 ก.ค. 2025 — ต้องลบ",
  },
  {
    key: "fix-dead-readaloud-2",
    titleTh: "ตลุยโจทย์ฝึกเทคนิค (Read Aloud)",
    questionType: "general",
    level: "all",
    group: "FIX",
    status: "dead",
    chapterRef: "Ch.11 §2",
    weaknessTaskType: null,
    priority: 1,
    noteTh: "Read Aloud ถูกตัดออกจากข้อสอบ 1 ก.ค. 2025 — ต้องลบ",
  },
  {
    key: "fix-dead-listenspeak",
    titleTh: "เทคนิคการทำโจทย์ listen and speak",
    questionType: "general",
    level: "all",
    group: "FIX",
    status: "dead",
    chapterRef: "Ch.4 §2",
    weaknessTaskType: null,
    priority: 1,
    noteTh: "Listen, Then Speak ถูกแทนที่ด้วย Interactive Speaking — ต้องลบ",
  },
  {
    key: "fix-empty-ch16",
    titleTh: "ฝึกการพูด listen/read then speak (บทว่าง)",
    questionType: "general",
    level: "all",
    group: "FIX",
    status: "dead",
    chapterRef: "Ch.16",
    weaknessTaskType: null,
    priority: 1,
    noteTh: "บทว่าง 0 วิดีโอ + ชื่อซ้ำกับ Ch.4 §6 — ลบทิ้ง",
  },
  {
    key: "fix-reshoot-ch4-6",
    titleTh: "ฝึกการพูด read then speak (ถ่ายใหม่)",
    questionType: "read_then_speak",
    level: "middle",
    group: "FIX",
    status: "missing",
    chapterRef: "Ch.4 §6",
    weaknessTaskType: "read_then_speak",
    priority: 2,
    noteTh: "ของเดิมพูดถึง listen then speak ที่ถูกตัดออกแล้ว — ถ่ายใหม่เฉพาะ read then speak",
    script: script({
      goal: "ถ่ายใหม่แทนคลิปเดิมที่ยังสอน listen then speak (ข้อสอบตัดออกแล้ว)",
      hook: "บอกตรง ๆ ว่า “ข้อสอบเปลี่ยนเมื่อ 1 ก.ค. 2025 — listen then speak ไม่มีแล้ว เหลือแค่ read then speak” แล้วบอกว่าคลิปนี้อัปเดตให้ตรงข้อสอบปัจจุบัน",
      beats: [
        "อธิบายรูปแบบ read then speak ปัจจุบัน: อ่านโจทย์ → เตรียม 20 วิ → พูด 90 วิ",
        "โครงคำตอบ 4 ท่อน (ตอบตรง → ขยาย → ตัวอย่าง → สรุป)",
        "จังหวะเวลา: ท่อนไหนควรใช้กี่วินาที",
        "3 ข้อผิดที่ทำให้เสียคะแนน (พูดสั้นเกิน / วนซ้ำ / เงียบกลางคัน)",
      ],
      drill: "โจทย์จริง 2 ข้อ พูดให้ดูเต็ม ๆ 1 ข้อ แล้วให้ผู้เรียนพูดเองอีก 1 ข้อ",
    }),
  },
  // ===================== FIX — finish drafts =====================
  {
    key: "fix-draft-guide-1",
    titleTh: "GUIDE ทำข้อสอบจริง (1 ชั่วโมงเต็ม)",
    questionType: "general",
    level: "all",
    group: "FIX",
    status: "draft",
    chapterRef: "Ch.14 §1",
    weaknessTaskType: null,
    priority: 3,
    noteTh: "เป็นเดือนสุดท้ายของแผน 6 เดือน — ถ้าไม่เสร็จ นักเรียนจบแผนไม่ได้",
  },
  {
    key: "fix-draft-guide-2",
    titleTh: "จำลองสอบจริง",
    questionType: "general",
    level: "all",
    group: "FIX",
    status: "draft",
    chapterRef: "Ch.14 §2",
    weaknessTaskType: null,
    priority: 3,
  },
  {
    key: "fix-draft-guide-3",
    titleTh: "ทำโจทย์จริง (PRACTICE)",
    questionType: "general",
    level: "all",
    group: "FIX",
    status: "draft",
    chapterRef: "Ch.14 §3",
    weaknessTaskType: null,
    priority: 3,
  },
  {
    key: "fix-draft-answer-examples",
    titleTh: "Answer Examples (Speak about a photo)",
    questionType: "speak_about_photo",
    level: "middle",
    group: "FIX",
    status: "draft",
    chapterRef: "Ch.3 §3",
    weaknessTaskType: "speak_about_photo",
    priority: 4,
  },

  // ===================== GROUP A — beginner ladder =====================
  {
    key: "a01-read-select-beginner",
    titleTh: "Read and Select ระดับเริ่มต้น — 500 คำที่ออกบ่อยที่สุด",
    questionType: "read_and_select",
    level: "beginner",
    group: "A",
    status: "missing",
    chapterRef: null,
    weaknessTaskType: "real_english_word",
    priority: 10,
    script: script({
      goal: "ให้คนที่คะแนน 50–80 ทำ Read and Select ได้เกิน 70% โดยไม่ต้องรู้ศัพท์เยอะ",
      hook: "“ข้อนี้ไม่ได้วัดว่าคุณรู้ศัพท์กี่คำ — มันวัดว่าคุณดูออกไหมว่าคำไหนเป็นคำจริง” เปิดด้วยคำปลอม 3 คำที่ดูเหมือนจริงมาก",
      beats: [
        "รูปแบบโจทย์: มีคำจริงปนคำปลอม เลือกเฉพาะคำจริง",
        "กฎที่ 1 — คำปลอมมักผิดที่ ‘หาง’ ของคำ (-tion, -ment, -ous ที่ใส่ผิดที่)",
        "กฎที่ 2 — ออกเสียงในใจ ถ้าออกเสียงไม่ได้แบบอังกฤษ มักเป็นคำปลอม",
        "กฎที่ 3 — ถ้าไม่แน่ใจ อย่าเดา (ตอบผิดหักคะแนน)",
        "500 คำที่ออกบ่อยที่สุด: แบ่ง 5 กลุ่ม กลุ่มละ 100 คำ",
      ],
      drill: "20 ข้อ ทำให้ดู 10 ข้อแรก อีก 10 ข้อหยุดให้ผู้เรียนตอบก่อนเฉลย",
    }),
  },
  {
    key: "a02-fitb-beginner",
    titleTh: "Fill in the Blanks ระดับเริ่มต้น (โจทย์ใหม่ 2026)",
    questionType: "fill_in_blanks",
    level: "beginner",
    group: "A",
    status: "missing",
    chapterRef: null,
    weaknessTaskType: "fill_in_blanks",
    priority: 11,
    script: script({
      goal: "ปูพื้นโจทย์ใหม่ปี 2026 ให้คนระดับเริ่มต้นทำได้",
      hook: "“โจทย์นี้เพิ่งเพิ่มเข้ามาปี 2026 — คนส่วนใหญ่ยังไม่เคยเห็น ถ้าคุณฝึกก่อน คุณได้เปรียบ”",
      beats: [
        "รูปแบบโจทย์: ย่อหน้าสั้น มีช่องว่าง เลือกคำเติมให้ถูกทั้งความหมายและไวยากรณ์",
        "ขั้นที่ 1 — อ่านทั้งประโยคก่อน อย่าดูแค่ช่องว่าง",
        "ขั้นที่ 2 — ถามตัวเองว่าช่องนี้ต้องการคำชนิดไหน (นาม/กริยา/คุณศัพท์)",
        "ขั้นที่ 3 — ตัดตัวเลือกที่ชนิดคำผิดออกก่อน แล้วค่อยดูความหมาย",
        "คำเชื่อมที่ออกบ่อย: however, because, although, so",
      ],
      drill: "5 ย่อหน้า ทำช้า ๆ ให้ดูทีละช่อง",
    }),
  },
  {
    key: "a03-ctest-beginner",
    titleTh: "Read and Complete (C-Test) ระดับเริ่มต้น",
    questionType: "read_and_complete",
    level: "beginner",
    group: "A",
    status: "missing",
    chapterRef: null,
    weaknessTaskType: "fill_in_blanks",
    priority: 12,
    script: script({
      goal: "ให้คนเริ่มต้นเติมตัวอักษรที่หายได้ โดยเริ่มจากคำที่เดาง่ายที่สุด",
      hook: "“ครึ่งคำหายไป แต่คุณไม่ต้องเก่งอังกฤษก็เติมได้ — ถ้ารู้ว่าเริ่มเติมจากตรงไหน”",
      beats: [
        "รูปแบบโจทย์: ครึ่งหลังของบางคำถูกลบ ต้องเติมให้ครบ",
        "เริ่มจากคำสั้น (the, and, that, with) — ได้คะแนนฟรี",
        "ดูจำนวนช่องว่าง = จำนวนตัวอักษรที่หาย (นับให้ตรง)",
        "อ่านทั้งประโยคก่อนเติม ไม่เติมทีละคำแบบไม่ดูบริบท",
        "ข้อควรระวัง — สะกดผิดคือผิดหมด ทั้งที่รู้คำ",
      ],
      drill: "2 ย่อหน้า ระดับง่าย ทำให้ดูทีละคำ",
    }),
  },
  {
    key: "a04-interactive-reading-beginner",
    titleTh: "Interactive Reading ระดับเริ่มต้น — จับใจความ",
    questionType: "interactive_reading",
    level: "beginner",
    group: "A",
    status: "missing",
    chapterRef: null,
    weaknessTaskType: "reading_comprehension",
    priority: 13,
    script: script({
      goal: "ให้คนเริ่มต้นหาใจความสำคัญได้ โดยไม่ต้องอ่านทุกคำ",
      hook: "“คุณไม่มีเวลาอ่านทุกคำ และไม่จำเป็นต้องอ่าน” โชว์ย่อหน้ายาว แล้วชี้ 2 ประโยคที่ต้องอ่านจริง ๆ",
      beats: [
        "ประโยคแรกกับประโยคสุดท้ายของย่อหน้า มักมีคำตอบ",
        "คำสัญญาณ: however, therefore, in contrast — จุดเปลี่ยนของเรื่อง",
        "หา keyword จากคำถามก่อน แล้วค่อยไปหาในเนื้อเรื่อง",
        "อย่าเลือกตัวเลือกที่ ‘จริง’ แต่ไม่ตอบคำถาม — กับดักที่เจอบ่อยสุด",
      ],
      drill: "3 ย่อหน้าสั้น ระดับ A2–B1 พร้อมคำถามอย่างละ 2 ข้อ",
    }),
  },
  {
    key: "a05-listen-type-beginner",
    titleTh: "Listen and Type ระดับเริ่มต้น (คะแนน 50–80)",
    questionType: "listen_and_type",
    level: "beginner",
    group: "A",
    status: "missing",
    chapterRef: null,
    weaknessTaskType: "dictation",
    priority: 14,
    noteTh: "ต่ำกว่าคลิป ‘ตลุยโจทย์ระดับง่าย’ เดิมอีกหนึ่งขั้น",
    script: script({
      goal: "ให้คนที่ฟังไม่ทันเลย เริ่มจับคำได้ทีละส่วน",
      hook: "“ถ้าฟังแล้วได้แค่ 2–3 คำ ไม่ต้องตกใจ คลิปนี้เริ่มจากตรงนั้นพอดี”",
      beats: [
        "ฟังรอบแรก — จับ ‘โครง’ ก่อน ใครทำอะไร",
        "ฟังรอบสอง — เติมคำเล็ก (a, the, in, on)",
        "ฟังรอบสาม — ตรวจหางคำ -s / -ed (จุดที่คนไทยเสียคะแนนมากที่สุด)",
        "พิมพ์ไปฟังไป ไม่ต้องรอให้จบ",
        "เครื่องหมายวรรคตอนมีผลกับคะแนน",
      ],
      drill: "6 ประโยคสั้น เปิดช้า → เปิดปกติ → เฉลยทีละคำ",
    }),
  },
  {
    key: "a06-interactive-listening-beginner",
    titleTh: "Interactive Listening ระดับเริ่มต้น",
    questionType: "interactive_listening",
    level: "beginner",
    group: "A",
    status: "missing",
    chapterRef: null,
    weaknessTaskType: "interactive_listening",
    priority: 15,
    noteTh: "ข้อนี้น้ำหนักคะแนนสูงที่สุดข้อหนึ่ง แต่ยังไม่มีบันไดขั้นแรก",
    script: script({
      goal: "เปิดประตูข้อที่หนักที่สุดให้คนเริ่มต้นเข้าได้",
      hook: "“ข้อนี้กินคะแนนเยอะที่สุดข้อหนึ่ง — และคนไทยส่วนใหญ่ข้ามมันไป”",
      beats: [
        "รูปแบบ: ฟังบทสนทนาในมหาวิทยาลัย → เลือกคำตอบให้บทสนทนาเดินต่อ → เติมคำ → เขียนสรุป 75 วินาที",
        "ขั้นเริ่มต้น: โฟกัสเฉพาะ ‘เลือกคำตอบ’ ก่อน ยังไม่ต้องคิดเรื่องสรุป",
        "ฟังหาว่าใครต้องการอะไร (ปัญหาคืออะไร)",
        "ตัวเลือกที่สุภาพและตอบตรงคำถาม มักถูก",
        "แนะนำโครงสรุป 3 ประโยคแบบง่ายสุด",
      ],
      drill: "บทสนทนา 2 ชุด ระดับง่าย ทำให้ดูครบทั้งรอบ",
    }),
  },
  {
    key: "a07-write-photo-beginner",
    titleTh: "Write About the Photo ระดับเริ่มต้น — สูตร 5 ประโยค",
    questionType: "write_about_photo",
    level: "beginner",
    group: "A",
    status: "missing",
    chapterRef: null,
    weaknessTaskType: "write_about_photo",
    priority: 16,
    script: script({
      goal: "ให้คนเริ่มต้นเขียนได้ครบทุกครั้งด้วยสูตรตายตัว",
      hook: "“ไม่ต้องคิดว่าจะเขียนอะไร — ใช้สูตรเดียวกับทุกภาพ”",
      beats: [
        "สูตร 5 ประโยค: (1) ภาพรวม (2) ใคร (3) กำลังทำอะไร (4) ที่ไหน/รายละเอียด (5) ความรู้สึก/สรุป",
        "ประโยคที่ 1 เริ่มด้วย ‘This picture shows…’ ทุกครั้ง",
        "ใช้ present continuous เป็นหลัก (is/are + V-ing)",
        "คำศัพท์กลาง ๆ ที่ใช้ได้กับเกือบทุกภาพ (people, outdoors, holding, wearing)",
        "อย่าเดาสิ่งที่ไม่เห็นในภาพ",
      ],
      drill: "3 ภาพ เขียนให้ดูเต็ม 1 ภาพ อีก 2 ภาพให้ผู้เรียนเขียนตามสูตร",
    }),
  },
  {
    key: "a08-interactive-writing-beginner",
    titleTh: "Interactive Writing ระดับเริ่มต้น (โจทย์ใหม่ 2026)",
    questionType: "interactive_writing",
    level: "beginner",
    group: "A",
    status: "missing",
    chapterRef: null,
    weaknessTaskType: "read_and_write",
    priority: 17,
    script: script({
      goal: "ปูพื้นโจทย์เขียนสองตอนแบบใหม่",
      hook: "“โจทย์นี้ถามคุณสองรอบ — รอบแรกตอบสั้น รอบสองขยาย ถ้ารู้โครงไว้ก่อน ทำได้ทันเวลาแน่นอน”",
      beats: [
        "รูปแบบ: ตอบคำถามแรก → ระบบถามต่อ → ขยายคำตอบ",
        "รอบแรก: ตอบตรง ๆ 2–3 ประโยค อย่าเพิ่งใส่ทุกอย่าง",
        "รอบสอง: เพิ่มเหตุผล + ตัวอย่างส่วนตัว",
        "เก็บ idea ไว้บางส่วนสำหรับรอบสองเสมอ",
        "ประโยคสำเร็จรูปที่ใช้ขยายได้ทุกโจทย์",
      ],
      drill: "2 โจทย์ ทำครบทั้งสองรอบให้ดู",
    }),
  },
  {
    key: "a09-speak-photo-beginner",
    titleTh: "Speak About the Photo ระดับเริ่มต้น — 4 ประโยคใน 1 นาที",
    questionType: "speak_about_photo",
    level: "beginner",
    group: "A",
    status: "missing",
    chapterRef: null,
    weaknessTaskType: "speak_about_photo",
    priority: 18,
    script: script({
      goal: "ให้คนที่พูดไม่ออกเลย พูดได้ครบ 1 นาที",
      hook: "“เป้าหมายไม่ใช่พูดสวย — เป้าหมายคือพูดไม่หยุดจนครบเวลา”",
      beats: [
        "สูตร 4 ประโยค: ภาพรวม → คน → กำลังทำอะไร → ความคิดเห็น",
        "ถ้านึกคำไม่ออก ให้พูดอ้อม (‘a place where people buy food’) ห้ามเงียบ",
        "พูดช้ากว่าที่คิดว่าควร — ชัดสำคัญกว่าเร็ว",
        "หางคำ -s / -ed ต้องออกเสียง (ลิงก์ไปคลิปการออกเสียง)",
        "ฝึกอัดเสียงตัวเองแล้วฟังซ้ำ",
      ],
      drill: "3 ภาพ พูดให้ดู 1 ภาพเต็ม ๆ พร้อมจับเวลา",
    }),
  },
  {
    key: "a10-read-then-speak-beginner",
    titleTh: "Read Then Speak ระดับเริ่มต้น",
    questionType: "read_then_speak",
    level: "beginner",
    group: "A",
    status: "missing",
    chapterRef: null,
    weaknessTaskType: "read_then_speak",
    priority: 19,
    script: script({
      goal: "ให้คนเริ่มต้นพูดได้ 90 วินาทีโดยไม่เงียบ",
      hook: "“90 วินาทีนานกว่าที่คิด — แต่ถ้ามีโครง 4 ท่อน คุณจะพูดไม่พอด้วยซ้ำ”",
      beats: [
        "โครง 4 ท่อน: ตอบตรง → เหตุผล → ตัวอย่างส่วนตัว → สรุป",
        "ใช้ 20 วินาทีเตรียมยังไงให้คุ้ม (จดแค่ 3 คำ)",
        "ประโยคเปิดสำเร็จรูปที่ใช้ได้ทุกโจทย์",
        "วิธีต่อเวลาเมื่อจะหมด idea",
        "ห้ามท่องจำทั้งคำตอบ — กรรมการจับได้",
      ],
      drill: "2 โจทย์ พูดให้ดู 1 ข้อพร้อมจับเวลาแต่ละท่อน",
    }),
  },
  {
    key: "a11-interactive-speaking-beginner",
    titleTh: "Interactive Speaking ระดับเริ่มต้น (โจทย์ใหม่ 2026)",
    questionType: "interactive_speaking",
    level: "beginner",
    group: "A",
    status: "missing",
    chapterRef: null,
    weaknessTaskType: "interactive_speaking",
    priority: 20,
    script: script({
      goal: "ปูพื้นโจทย์ใหม่ที่มาแทน Listen Then Speak",
      hook: "“ข้อนี้เพิ่งมาแทน Read Aloud เมื่อ ก.ค. 2025 — คุยกับตัวละคร ตอบข้อละ 35 วินาที”",
      beats: [
        "รูปแบบ: ตัวละคร (Bea/Oscar) ถาม 6–8 คำถามต่อเนื่อง ตอบข้อละ 35 วินาที",
        "35 วินาที = ประมาณ 3–4 ประโยค ไม่ต้องยาว",
        "ตอบให้เหมือนคุยจริง ไม่ใช่ท่องเรียงความ",
        "ถ้าฟังคำถามไม่ทัน ให้ตอบกว้าง ๆ ดีกว่าเงียบ",
        "คำเปิดที่ใช้ซื้อเวลาได้ (‘That’s a good question, I think…’)",
      ],
      drill: "จำลองบทสนทนา 6 คำถาม ตอบให้ดูทุกข้อ",
    }),
  },
  {
    key: "a12-write50-beginner",
    titleTh: "เขียน 50 คำ ระดับเริ่มต้น (ก่อนถึง B2)",
    questionType: "writing_sample",
    level: "beginner",
    group: "A",
    status: "missing",
    chapterRef: null,
    weaknessTaskType: "read_and_write",
    priority: 21,
    noteTh: "คลิปเดิมใน Ch.7 §1 เริ่มที่ระดับ B2-C1 — คนเริ่มต้นไม่มีอะไรดูเลย",
    script: script({
      goal: "อุดช่องว่างที่ใหญ่ที่สุดของคอร์ส — คนเริ่มต้นไม่มีคลิปเขียนเลย",
      hook: "“คลิปเขียนอันเดิมของเราเริ่มที่ B2 ถ้าคุณยังไม่ถึง เริ่มที่คลิปนี้ก่อน”",
      beats: [
        "โครง 3 ย่อหน้าแบบสั้นที่สุด: เปิด 1 ประโยค / เหตุผล 2–3 ประโยค / ปิด 1 ประโยค",
        "เขียน 50 คำจริง ๆ คือประมาณ 4–5 ประโยค ไม่ต้องยาว",
        "คำเชื่อมที่พอสำหรับระดับนี้: because, also, for example, so",
        "จับเวลา 5 นาที: 1 นาทีคิด 3 นาทีเขียน 1 นาทีตรวจ",
        "ตรวจอะไรบ้างใน 1 นาทีสุดท้าย (s, ed, จุด, ตัวใหญ่)",
      ],
      drill: "2 โจทย์ เขียนให้ดู 1 ข้อแบบเรียลไทม์พร้อมจับเวลา",
    }),
  },

  // ===================== GROUP B — thin spots =====================
  ...([
    ["b13", "Interactive Listening — เลือกคำตอบให้บทสนทนาเดินต่อ", 30],
    ["b14", "Interactive Listening — เติมคำในบทสนทนา", 31],
    ["b15", "Interactive Listening — เขียนสรุปใน 75 วินาที", 32],
  ] as const).map(([key, titleTh, priority]) => ({
    key: `${key}-interactive-listening`,
    titleTh,
    questionType: "interactive_listening" as DetQuestionType,
    level: "middle" as VideoLevel,
    group: "B" as ProductionGroup,
    status: "missing" as ProductionStatus,
    chapterRef: null,
    weaknessTaskType: "interactive_listening",
    priority,
    noteTh: "ข้อน้ำหนักสูงสุด แต่มีแค่ 3 คลิป",
    script: script({
      goal: `สอน ${titleTh} ให้ทำได้จริงในเวลาจำกัด`,
      hook: "“ข้อนี้กินคะแนนสองหมวดพร้อมกัน (Comprehension + Literacy) — ทำข้อนี้ได้ ขึ้นเร็วที่สุด”",
      beats: [
        "อธิบายส่วนนี้ของโจทย์ทีละขั้น",
        "สิ่งที่กรรมการให้คะแนนจริง ๆ",
        "กับดักที่เจอบ่อยที่สุด 3 อย่าง",
        "เทคนิคจัดการเวลา",
      ],
      drill: "บทสนทนาจริง 2 ชุด ทำให้ดูครบ",
    }),
  })),
  ...([
    ["b16", "Fill in the Blanks — ตลุยโจทย์ระดับกลาง", 33],
    ["b17", "Fill in the Blanks — กับดักไวยากรณ์ที่เจอบ่อย", 34],
  ] as const).map(([key, titleTh, priority]) => ({
    key: `${key}-fitb`,
    titleTh,
    questionType: "fill_in_blanks" as DetQuestionType,
    level: "middle" as VideoLevel,
    group: "B" as ProductionGroup,
    status: "missing" as ProductionStatus,
    chapterRef: null,
    weaknessTaskType: "fill_in_blanks",
    priority,
    noteTh: "โจทย์ใหม่ปี 2026 มีแค่ 2 คลิป",
    script: script({
      goal: `เพิ่มความลึกให้โจทย์ใหม่ปี 2026`,
      hook: "“โจทย์นี้ยังใหม่มาก คนส่วนใหญ่ยังไม่มีเทคนิค”",
      beats: [
        "ทบทวนรูปแบบโจทย์แบบเร็ว",
        "แยกช่องว่างเป็น 2 แบบ: แบบวัดความหมาย กับแบบวัดไวยากรณ์",
        "วิธีตัดตัวเลือกเร็ว ๆ",
        "ตัวอย่างข้อที่คนตอบผิดมากที่สุด",
      ],
      drill: "8 ย่อหน้า ทำแบบจับเวลา",
    }),
  })),
  ...([
    ["b18", "Interactive Writing — ขยายคำตอบรอบสองให้ได้คะแนน", 35],
    ["b19", "Interactive Writing — ตลุยโจทย์จริง", 36],
  ] as const).map(([key, titleTh, priority]) => ({
    key: `${key}-interactive-writing`,
    titleTh,
    questionType: "interactive_writing" as DetQuestionType,
    level: "middle" as VideoLevel,
    group: "B" as ProductionGroup,
    status: "missing" as ProductionStatus,
    chapterRef: null,
    weaknessTaskType: "read_and_write",
    priority,
    noteTh: "โจทย์ใหม่ปี 2026 มีแค่ 2 คลิป",
    script: script({
      goal: `ทำให้ผู้เรียนเก็บคะแนนรอบสองของโจทย์เขียนสองตอนได้`,
      hook: "“คนส่วนใหญ่ใส่ทุกอย่างในรอบแรก แล้วรอบสองไม่มีอะไรเหลือจะเขียน”",
      beats: [
        "วางแผน idea ก่อนเขียนรอบแรก",
        "เก็บอะไรไว้รอบสองบ้าง",
        "ประโยคขยายที่ใช้ได้ทุกหัวข้อ",
        "จัดการเวลาสองรอบ",
      ],
      drill: "2 โจทย์ ทำครบทั้งสองรอบ",
    }),
  })),

  // ===================== GROUP C — advanced (110 → 130) =====================
  {
    key: "c20-speak-photo-advanced",
    titleTh: "Speak About the Photo ระดับสูง (C1)",
    questionType: "speak_about_photo",
    level: "advanced",
    group: "C",
    status: "missing",
    chapterRef: null,
    weaknessTaskType: "speak_about_photo",
    priority: 40,
    script: script({
      goal: "พาคน 110–115 ขึ้นไป 125–130 ด้วยการพูดที่ลึกขึ้น ไม่ใช่แค่บรรยาย",
      hook: "“ถ้าคุณยังบรรยายภาพอยู่ คุณติดที่ 110 ตลอดไป — ระดับ C1 ต้องตีความ”",
      beats: [
        "ต่างกันตรงไหน: บรรยาย (B2) vs ตีความ + คาดเดาบริบท (C1)",
        "คำศัพท์ระดับ C1 ที่ใช้ได้กับภาพเกือบทุกแบบ",
        "โครงประโยคซับซ้อน (relative clause, participle phrase)",
        "น้ำเสียงและจังหวะที่ทำให้ฟังดูเป็นธรรมชาติ",
      ],
      drill: "2 ภาพ พูดเวอร์ชัน B2 ให้ฟังก่อน แล้วพูดเวอร์ชัน C1 เทียบให้เห็นชัด",
    }),
  },
  {
    key: "c21-read-then-speak-advanced",
    titleTh: "Read Then Speak ระดับสูง (C1)",
    questionType: "read_then_speak",
    level: "advanced",
    group: "C",
    status: "missing",
    chapterRef: null,
    weaknessTaskType: "read_then_speak",
    priority: 41,
    script: script({
      goal: "ยกคุณภาพคำตอบจากครบถ้วน เป็นน่าเชื่อถือ",
      hook: "“ที่ 110 คำตอบคุณครบแล้ว — ที่ 130 คำตอบต้องมีน้ำหนัก”",
      beats: [
        "ยกระดับเหตุผล: จากความเห็นส่วนตัว เป็นเหตุผลที่มีโครงสร้าง",
        "การยกตัวอย่างแบบเฉพาะเจาะจง (ชื่อ ตัวเลข เวลา)",
        "คำเชื่อมระดับสูงที่ไม่ฟังดูท่องจำ",
        "การเว้นจังหวะให้ฟังดูมั่นใจ",
      ],
      drill: "2 โจทย์ พร้อมเทียบคำตอบระดับ 110 กับ 130",
    }),
  },
  {
    key: "c22-interactive-speaking-advanced",
    titleTh: "Interactive Speaking ระดับสูง (C1)",
    questionType: "interactive_speaking",
    level: "advanced",
    group: "C",
    status: "missing",
    chapterRef: null,
    weaknessTaskType: "interactive_speaking",
    priority: 42,
    script: script({
      goal: "ทำให้การตอบ 35 วินาทีฟังเหมือนบทสนทนาจริง ไม่ใช่คำตอบสอบ",
      hook: "“ข้อนี้ให้คะแนนความเป็นธรรมชาติ — ยิ่งเหมือนสอบ ยิ่งได้น้อย”",
      beats: [
        "ความต่างระหว่างภาษาพูดกับภาษาเขียน",
        "การตอบต่อเนื่องให้สอดคล้องกับคำถามก่อนหน้า",
        "สำนวนพูดที่เจ้าของภาษาใช้จริง",
        "จัดการ 35 วินาทีให้จบพอดี ไม่ค้างกลางประโยค",
      ],
      drill: "บทสนทนาเต็ม 8 คำถาม ตอบระดับ C1 ให้ดูทั้งชุด",
    }),
  },
  {
    key: "c23-interactive-listening-summary-advanced",
    titleTh: "Interactive Listening — เขียนสรุประดับสูง (C1)",
    questionType: "interactive_listening",
    level: "advanced",
    group: "C",
    status: "missing",
    chapterRef: null,
    weaknessTaskType: "conversation_summary",
    priority: 43,
    script: script({
      goal: "ยกคะแนนส่วนสรุป ซึ่งเป็นจุดที่คน 110+ เสียคะแนนมากที่สุด",
      hook: "“สรุป 75 วินาที คือจุดที่แยกคน 115 กับคน 130 ออกจากกัน”",
      beats: [
        "โครงสรุประดับสูง: บริบท → ปัญหา → ทางออก → ผลลัพธ์",
        "การเปลี่ยนคำ (paraphrase) แทนการลอกคำเดิม",
        "ประโยคซับซ้อนที่เขียนทันใน 75 วินาที",
        "สิ่งที่ต้องตัดทิ้ง เพราะไม่ได้คะแนน",
      ],
      drill: "บทสนทนา 2 ชุด เขียนสรุปให้ดูแบบจับเวลาจริง",
    }),
  },
  {
    key: "c24-speaking-sample-advanced",
    titleTh: "Speaking Sample — พูดยังไงให้ฟังดูระดับ C1",
    questionType: "speaking_sample",
    level: "advanced",
    group: "C",
    status: "missing",
    chapterRef: null,
    weaknessTaskType: "interactive_speaking",
    priority: 44,
    noteTh: "ยังไม่มีคลิปเรื่องนี้เลยแม้แต่คลิปเดียว",
    script: script({
      goal: "เตรียมคลิปพูดที่มหาวิทยาลัยจะได้ดู (ไม่คิดคะแนน แต่มีผลต่อความประทับใจ)",
      hook: "“ข้อนี้ไม่คิดคะแนน — แต่มหาวิทยาลัยได้ดู และคนส่วนใหญ่ทิ้งมันไปเฉย ๆ”",
      beats: [
        "ทำไมข้อนี้สำคัญแม้ไม่คิดคะแนน",
        "โครงคำตอบที่ฟังดูมีการศึกษา",
        "หัวข้อที่ออกบ่อยและ idea ที่เตรียมล่วงหน้าได้",
        "ข้อผิดที่ทำให้เสียความน่าเชื่อถือ",
      ],
      drill: "3 หัวข้อ พูดให้ดู 1 หัวข้อเต็ม",
    }),
  },

  // ===================== GROUP D — Thai pronunciation =====================
  {
    key: "d25-endings",
    titleTh: "เสียงท้ายคำ -s / -es / -ed — จุดที่คนไทยเสียคะแนนมากที่สุด",
    questionType: "general",
    level: "all",
    group: "D",
    status: "missing",
    chapterRef: null,
    weaknessTaskType: "interactive_speaking",
    priority: 50,
    noteTh: "แอปตรวจเรื่องนี้อยู่แล้ว แต่ยังไม่มีคลิปสอน",
    script: script({
      goal: "แก้ปัญหาการออกเสียงหางคำ ซึ่งเป็นจุดตายของผู้พูดภาษาไทย",
      hook: "“ภาษาไทยไม่มีเสียงท้ายแบบนี้ — สมองคุณเลยตัดทิ้งอัตโนมัติ และ DET จับได้ทุกครั้ง”",
      beats: [
        "ทำไมคนไทยไม่ออกเสียงหางคำ (โครงสร้างพยางค์ภาษาไทย)",
        "-s ออกได้ 3 แบบ: /s/ /z/ /ɪz/ — ใช้เมื่อไหร่",
        "-ed ออกได้ 3 แบบ: /t/ /d/ /ɪd/ — ใช้เมื่อไหร่",
        "แบบฝึกคู่คำ (walk/walked, need/needed)",
        "วิธีตรวจตัวเองด้วยการอัดเสียง",
      ],
      drill: "40 คำ ออกเสียงตามทีละคำ แล้ววัดผลด้วยแบบฝึกในแอป",
    }),
  },
  {
    key: "d26-th-r-l-v",
    titleTh: "เสียง th / r / l / v ที่คนไทยออกผิดบ่อยที่สุด",
    questionType: "general",
    level: "all",
    group: "D",
    status: "missing",
    chapterRef: null,
    weaknessTaskType: "interactive_speaking",
    priority: 51,
    script: script({
      goal: "แก้ 4 เสียงที่ทำให้คะแนนการพูดตกมากที่สุด",
      hook: "“4 เสียงนี้ ทำให้คำที่คุณพูดกลายเป็นอีกคำหนึ่งไปเลย”",
      beats: [
        "เสียง th (think / this) — ตำแหน่งลิ้น",
        "เสียง r กับ l — คู่คำที่สลับแล้วความหมายเปลี่ยน (rice/lice)",
        "เสียง v กับ w (very/wery)",
        "แบบฝึกคู่คำทีละเสียง",
      ],
      drill: "คู่คำอย่างละ 10 คู่ ออกเสียงตาม",
    }),
  },
  {
    key: "d27-clusters",
    titleTh: "เสียงพยัญชนะควบ (spr- str- -sts)",
    questionType: "general",
    level: "all",
    group: "D",
    status: "missing",
    chapterRef: null,
    weaknessTaskType: "interactive_speaking",
    priority: 52,
    script: script({
      goal: "แก้ปัญหาการเติมสระแทรกในคำที่มีพยัญชนะควบ",
      hook: "“street ไม่ใช่ สะ-ตรีท — และกรรมการได้ยินความต่างนี้ชัดมาก”",
      beats: [
        "ทำไมคนไทยเติมสระแทรก",
        "กลุ่มเสียงต้นคำ (spr-, str-, scr-)",
        "กลุ่มเสียงท้ายคำที่ยากที่สุด (-sts, -sks)",
        "เทคนิคฝึกช้าแล้วค่อยเร่ง",
      ],
      drill: "30 คำ ฝึกช้า → เร็ว",
    }),
  },
  {
    key: "d28-intonation",
    titleTh: "ทำไมคนไทยพูดแบน แล้วเสียคะแนน fluency",
    questionType: "general",
    level: "all",
    group: "D",
    status: "missing",
    chapterRef: null,
    weaknessTaskType: "interactive_speaking",
    priority: 53,
    script: script({
      goal: "แก้ปัญหาน้ำเสียงราบเรียบที่มาจากการเป็นภาษาวรรณยุกต์",
      hook: "“ภาษาไทยใช้เสียงสูงต่ำแยกความหมายของคำ ภาษาอังกฤษใช้แยกความหมายของประโยค — คนละระบบกันเลย”",
      beats: [
        "ความต่างระหว่างภาษาวรรณยุกต์กับภาษาเน้นจังหวะ",
        "เสียงขึ้นท้ายประโยคคำถาม",
        "การเน้นคำสำคัญในประโยค",
        "การหยุดจังหวะให้ฟังดูมั่นใจ",
      ],
      drill: "อ่านย่อหน้าเดียวกัน 2 แบบ (แบน vs มีจังหวะ) ให้ฟังความต่าง",
    }),
  },
  {
    key: "d29-word-stress",
    titleTh: "การเน้นพยางค์ที่เปลี่ยนความหมาย",
    questionType: "general",
    level: "all",
    group: "D",
    status: "missing",
    chapterRef: null,
    weaknessTaskType: "interactive_speaking",
    priority: 54,
    script: script({
      goal: "แก้การเน้นพยางค์ผิด ซึ่งทำให้ฟังไม่รู้เรื่องแม้ออกเสียงถูกทุกตัว",
      hook: "“PREsent กับ preSENT คนละคำกันเลย”",
      beats: [
        "กฎการเน้นพยางค์ของคำนามกับกริยา",
        "คำที่ออกสอบบ่อยและคนไทยเน้นผิด",
        "การเน้นในคำยาว (-tion, -ity, -ical)",
        "วิธีตรวจจากพจนานุกรม",
      ],
      drill: "40 คำ ฟังแล้วทายว่าเน้นพยางค์ไหน",
    }),
  },
];

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

export type CoverageCell = {
  questionType: DetQuestionType;
  labelTh: string;
  beginner: number;
  middle: number;
  advanced: number;
  /** Videos already live in the course for this question type. */
  live: number;
  /** Still to record. */
  missing: number;
};

/**
 * Videos already published in the Thinkific-migrated course, counted per
 * question type. Recorded here because the live `course_lessons` rows do not
 * carry a question-type tag yet — once they do, read it from the DB instead.
 */
export const EXISTING_LIVE_BY_TYPE: Record<DetQuestionType, number> = {
  read_and_select: 3,
  fill_in_blanks: 2,
  read_and_complete: 5,
  interactive_reading: 8,
  listen_and_type: 6,
  interactive_listening: 3,
  write_about_photo: 3,
  interactive_writing: 2,
  speak_about_photo: 2,
  read_then_speak: 5,
  interactive_speaking: 4,
  writing_sample: 10,
  speaking_sample: 0,
  general: 12,
};

const LIVE_QUESTION_TYPES: DetQuestionType[] = [
  "read_and_select",
  "fill_in_blanks",
  "read_and_complete",
  "interactive_reading",
  "listen_and_type",
  "interactive_listening",
  "write_about_photo",
  "interactive_writing",
  "speak_about_photo",
  "read_then_speak",
  "interactive_speaking",
  "writing_sample",
  "speaking_sample",
];

export function buildCoverage(plan: CourseVideoPlan[] = COURSE_VIDEO_PLAN): CoverageCell[] {
  return LIVE_QUESTION_TYPES.map((qt) => {
    const forType = plan.filter((v) => v.questionType === qt && v.status !== "dead");
    const count = (level: VideoLevel) => forType.filter((v) => v.level === level).length;
    return {
      questionType: qt,
      labelTh: QUESTION_TYPE_TH[qt],
      beginner: count("beginner"),
      middle: count("middle"),
      advanced: count("advanced"),
      live: EXISTING_LIVE_BY_TYPE[qt] ?? 0,
      missing: forType.filter((v) => v.status === "missing").length,
    };
  });
}

export function planByKey(key: string): CourseVideoPlan | null {
  return COURSE_VIDEO_PLAN.find((v) => v.key === key) ?? null;
}

/** Videos that teach a given study-plan weakness, best level first. */
export function videosForWeakness(taskType: string): CourseVideoPlan[] {
  return COURSE_VIDEO_PLAN.filter(
    (v) => v.weaknessTaskType === taskType && v.status !== "dead",
  ).sort((a, b) => a.priority - b.priority);
}

export function productionTotals(plan: CourseVideoPlan[] = COURSE_VIDEO_PLAN) {
  return {
    total: plan.length,
    dead: plan.filter((v) => v.status === "dead").length,
    draft: plan.filter((v) => v.status === "draft").length,
    missing: plan.filter((v) => v.status === "missing").length,
    scripted: plan.filter((v) => v.status === "scripted").length,
    recorded: plan.filter((v) => v.status === "recorded").length,
    uploaded: plan.filter((v) => v.status === "uploaded").length,
    live: plan.filter((v) => v.status === "live").length,
  };
}
