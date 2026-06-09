import type {
  MiniStudyClozeBlank,
  MiniStudyClozeCategory,
  MiniStudyClozeExercise,
} from "@/lib/mini-study/content";

export type ClozeBlankResult = {
  number: number;
  cue: string;
  studentAnswer: string;
  correct: string;
  isCorrect: boolean;
  category: MiniStudyClozeCategory;
  ruleNoteTh: string;
};

export type ClozeCategoryReport = {
  category: MiniStudyClozeCategory;
  titleTh: string;
  ruleTh: string;
  exampleTh: string;
  mistakes: ClozeBlankResult[];
};

export type ClozeGradeReport = {
  total: number;
  numCorrect: number;
  rows: ClozeBlankResult[];
  categories: ClozeCategoryReport[];
  weaknessSummaryTh: string;
};

const CATEGORY_LABELS: Record<
  MiniStudyClozeCategory,
  { titleTh: string; ruleTh: string; exampleTh: string }
> = {
  "present-simple-singular": {
    titleTh: "หมวดที่ 1 — Present Simple กับประธานเอกพจน์",
    ruleTh:
      "เมื่อประธานเป็นเอกพจน์ (he / she / it / กลุ่มคำที่ถือว่าเป็นเอกพจน์) → กริยา present simple **ต้องเติม -s หรือ -es**",
    exampleTh:
      "✅ ตัวอย่าง: *She **studies** every night.* / *Living alone **helps** me focus.*",
  },
  "plural-noun": {
    titleTh: "หมวดที่ 2 — คำนามพหูพจน์",
    ruleTh:
      "เวลาพูดถึงสิ่งของหรือคนแบบทั่วไป (ไม่เจาะจงตัวใดตัวหนึ่ง) ให้ใช้ **รูปพหูพจน์** ระวังพหูพจน์ผิดปกติด้วย เช่น person → people",
    exampleTh:
      "✅ ตัวอย่าง: *Many **students** prefer studying alone.* / *They are looking for new **opportunities**.*",
  },
  "uncountable-noun": {
    titleTh: "หมวดที่ 3 — คำนามนับไม่ได้",
    ruleTh:
      "คำนามนับไม่ได้ เช่น **information, loneliness, advice, happiness, knowledge** **ห้ามเติม -s เด็ดขาด** และใช้กริยาเอกพจน์",
    exampleTh:
      "✅ ตัวอย่าง: *I need more **information**.* (ห้าม informations) / *His **loneliness** affects his health.*",
  },
  "singular-after-a-an": {
    titleTh: "หมวดที่ 4 — คำนามเอกพจน์หลัง a/an",
    ruleTh:
      "หลังตัวกำหนด **a / an** → คำนามต้องเป็น **เอกพจน์** เสมอ ห้ามเติม -s",
    exampleTh:
      "✅ ตัวอย่าง: *a young **adult*** (ห้าม a young adults) / *an old **friend***",
  },
  "subject-verb-agreement-plural": {
    titleTh: "หมวดที่ 5 — Subject-Verb Agreement กับประธานพหูพจน์",
    ruleTh:
      "เมื่อประธานเป็น **พหูพจน์** (they / students / distractions / family members…) → กริยา present simple **ไม่เติม -s**",
    exampleTh:
      "✅ ตัวอย่าง: *Distractions **make** it hard to focus.* (ห้าม makes) / *Family members **help** each other.*",
  },
  // Session 16 — Word-form identification
  "past-participle": {
    titleTh: "หมวด — Past Participle (-ed)",
    ruleTh:
      "ถ้ามี **is/are/was/were/been** หน้า blank → passive voice ต้องเติม **-ed** · ถ้ามี **have/has/had** หน้า blank → perfect tense ต้องเติม **-ed** · ถ้า blank อยู่หลัง linking verb และอธิบาย **คนที่รู้สึก** → ใช้ **-ed adjective**",
    exampleTh:
      "✅ *The results were **surprised** → surprised* (อธิบายคน) · *She has **finished** her report.* · *He felt **tired** after the surgery.*",
  },
  "gerund": {
    titleTh: "หมวด — Gerund (-ing)",
    ruleTh:
      "ถ้า blank อยู่หลัง **preposition** (by, in, of, for, without, after, before) → ต้องเติม **-ing** · ถ้า blank ทำหน้าที่เป็น **subject** ของประโยค → ต้องเติม **-ing** · ถ้ามี is/are/was/were + blank (continuous) → เติม **-ing**",
    exampleTh:
      "✅ *After **receiving** her degree, she started looking for work.* · *He improved by **practising** every day.* · ***Learning** a new language takes time.*",
  },
  "adjective-form": {
    titleTh: "หมวด — Adjective Form",
    ruleTh:
      "ถ้า blank อยู่ **หน้า noun** → ต้องเป็น **adjective** · ถ้า blank อยู่หลัง linking verb (is, are, seems, feels, looks, becomes) → ต้องเป็น **adjective** · ระวัง **-ed adjective** (อธิบายคน) vs **-ing adjective** (อธิบายสิ่งของ/สถานการณ์)",
    exampleTh:
      "✅ *a **remarkable** achievement* · *The situation seems **complicated**.* · *The decision was **surprising** to experts.*",
  },
  "adverb-form": {
    titleTh: "หมวด — Adverb Form (-ly)",
    ruleTh:
      "ถ้า blank อยู่ **หน้า adjective** หรือ **adverb อื่น** → ต้องเป็น **adverb** · ถ้า blank อยู่ **หลัง verb** และอธิบายวิธีที่ทำ → ต้องเป็น **adverb** · ถ้าอยู่ **ต้นประโยค** ก่อน comma แสดงความถี่/ระดับ → adverb",
    exampleTh:
      "✅ *The exam was **unexpectedly** difficult.* · *She spoke **clearly** during the presentation.* · ***Recently**, scientists discovered a new species.*",
  },
  "noun-form": {
    titleTh: "หมวด — Noun Form",
    ruleTh:
      "ถ้ามี **article** (a/an/the) หน้า blank → ต้องเป็น **noun** · ถ้ามี **adjective** หน้า blank → ต้องเป็น noun · ถ้า blank เป็น **subject หรือ object** ของประโยค → ต้องเป็น noun · จำ suffixes: **-tion / -sion / -ment / -ness / -ity / -ance / -ence**",
    exampleTh:
      "✅ *The **development** of new technology takes years.* · *She showed great **determination**.* · *His **achievement** impressed everyone.*",
  },
  "preposition-form": {
    titleTh: "หมวด — Preposition (Collocation)",
    ruleTh:
      "ภาษาอังกฤษมี **collocation ตายตัว** ที่ต้องจำ เช่น *interested **in**, responsible **for**, depend **on**, known **for**, good **at***  ถ้าเจอ verb/adjective ที่ตามด้วย preposition → ต้องจำเป็นคู่",
    exampleTh:
      "✅ *She is interested **in** science.* · *He is responsible **for** the project.* · *The company is well known **for** its design.*",
  },
  "transition-word": {
    titleTh: "หมวด — Transition Word",
    ruleTh:
      "ถ้า blank อยู่ **ต้นประโยค** ก่อน comma และเชื่อมความคิด 2 ประโยค → ต้องเป็น **transition word** · เลือกตามความสัมพันธ์: **ตรงข้าม** (However) · **ผลลัพธ์** (Therefore, As a result) · **เพิ่มเติม** (Moreover, In addition)",
    exampleTh:
      "✅ *She studied hard. **However**, she failed the exam.* · *He missed the bus. **As a result**, he was late.* · *The food was cheap. **Moreover**, it was delicious.*",
  },
};

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[.,;:!?]+$/, "");
}

export function gradeClozeExercise(
  exercise: MiniStudyClozeExercise,
  answers: Record<number, string>,
): ClozeGradeReport {
  const rows: ClozeBlankResult[] = exercise.blanks.map((b: MiniStudyClozeBlank) => {
    const studentRaw = (answers[b.number] ?? "").trim();
    const normStudent = normalize(studentRaw);
    const normCorrect = normalize(b.correct);
    const altMatch = (b.acceptedAlts ?? []).some((a) => normalize(a) === normStudent);
    const isCorrect = normStudent.length > 0 && (normStudent === normCorrect || altMatch);
    return {
      number: b.number,
      cue: b.cue,
      studentAnswer: studentRaw,
      correct: b.correct,
      isCorrect,
      category: b.category,
      ruleNoteTh: b.ruleNoteTh,
    };
  });

  const categoriesMap = new Map<MiniStudyClozeCategory, ClozeBlankResult[]>();
  for (const r of rows) {
    if (r.isCorrect) continue;
    if (!categoriesMap.has(r.category)) categoriesMap.set(r.category, []);
    categoriesMap.get(r.category)!.push(r);
  }

  const categories: ClozeCategoryReport[] = [];
  for (const cat of Object.keys(CATEGORY_LABELS) as MiniStudyClozeCategory[]) {
    const mistakes = categoriesMap.get(cat) ?? [];
    if (mistakes.length === 0) continue;
    const label = CATEGORY_LABELS[cat];
    categories.push({
      category: cat,
      titleTh: label.titleTh,
      ruleTh: label.ruleTh,
      exampleTh: label.exampleTh,
      mistakes,
    });
  }

  const numCorrect = rows.filter((r) => r.isCorrect).length;
  const total = rows.length;
  let weaknessSummaryTh: string;
  if (categories.length === 0) {
    weaknessSummaryTh = `เก่งมาก! ทำได้ครบ ${total} ข้อโดยไม่มีจุดอ่อนเลย ✨`;
  } else {
    const top = categories
      .slice()
      .sort((a, b) => b.mistakes.length - a.mistakes.length)
      .map((c) => `**${c.titleTh.replace(/^หมวดที่ \d+ — /, "")}** (${c.mistakes.length} ข้อ)`)
      .join(" · ");
    weaknessSummaryTh = `จุดอ่อนหลักของคุณคือ: ${top}\nแนะนำให้กลับไปทบทวนกฎแต่ละหมวดด้านล่าง แล้วลองเขียน essay ของตัวเองโดยจดจำว่ากริยา present simple ต้องสอดคล้องกับประธานเสมอ`;
  }

  return {
    total,
    numCorrect,
    rows,
    categories,
    weaknessSummaryTh,
  };
}
