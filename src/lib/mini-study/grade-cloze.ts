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
