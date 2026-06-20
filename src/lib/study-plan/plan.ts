// Study-plan generation: turns a diagnostic Report into an ordered list of
// locked study modules, mapped to real mini-lessons + exam banks.
// Resource ids mirror docs/study-plan/resource-gate-tags.csv.

import type { Report, SkillResult } from "./diagnostic.ts";

export type Module = {
  id: string;
  type: "mini-lesson" | "exam-bank" | "mock";
  titleTh: string;
};

export type PlanItem = {
  skill: SkillResult["skill"];
  fromScore: number;
  whyTh: string;          // student-facing reason, drawn from their own result
  modules: Module[];      // lesson(s) → bank(s), in study order
  estMinutes: number;
  locked: boolean;
};

export type Plan = {
  predicted: number;
  target: number;
  items: PlanItem[];      // ordered, weakest skill first
  finishLine: Module;     // re-test
};

// ── Resource catalog (subset used by the planner) ──
const M = {
  dictVerbs: { id: "session-2", type: "mini-lesson", titleTh: "เติม -ed / -s / -es ตอนฟัง" },
  dictCommas: { id: "session-1", type: "mini-lesson", titleTh: "Commas: FANBOYS & อนุประโยค" },
  fitbStrategy: { id: "session-16", type: "mini-lesson", titleTh: "Fill in the Blanks — จับว่าช่องต้องการอะไร" },
  grammarMistakes: { id: "session-12", type: "mini-lesson", titleTh: "หาจุดผิดไวยากรณ์ในเรียงความ" },
  readingSkill: { id: "session-14", type: "mini-lesson", titleTh: "การอ่าน — จับใจความหลัก" },
  speakPhoto: { id: "session-5", type: "mini-lesson", titleTh: "Speak about a photo — แพตเทิร์น" },
  interactiveSpeak: { id: "session-6", type: "mini-lesson", titleTh: "Interactive Speaking — 4 แพตเทิร์น" },
  bankDictation: { id: "bank-dictation", type: "exam-bank", titleTh: "คลังฝึก Dictation" },
  bankFitb: { id: "bank-fitb", type: "exam-bank", titleTh: "คลังฝึก Fill-in-blank" },
  bankVocab: { id: "bank-vocab", type: "exam-bank", titleTh: "คลังฝึก Vocabulary Reading" },
  bankReading: { id: "bank-reading", type: "exam-bank", titleTh: "คลังฝึกอ่านจับใจความ" },
  bankSpeaking: { id: "bank-speaking", type: "exam-bank", titleTh: "คลังฝึกพูด" },
  mock: { id: "mock-fixed", type: "mock", titleTh: "Mock test เต็มรูปแบบ — วัดผลก่อน/หลัง" },
} as const satisfies Record<string, Module>;

function modulesFor(skill: SkillResult): { modules: Module[]; whyTh: string } {
  const r = skill.reason;
  switch (r.kind) {
    case "listening":
      return {
        modules: [M.dictVerbs, M.bankDictation],
        whyTh: "ประโยคยาวยังจับไวยากรณ์ตอนฟังไม่ทัน — การฟังคือการจับไวยากรณ์ ไม่ใช่แค่ฟังศัพท์",
      };
    case "writing":
      if (r.brokenTier === "verb")
        return { modules: [M.grammarMistakes, M.bankFitb], whyTh: "พื้นฐานไวยากรณ์ (รูปกริยา/คำเชื่อม) ยังไม่แน่นพอสำหรับเป้าหมาย" };
      if (r.brokenTier === "article")
        return { modules: [M.fitbStrategy, M.bankFitb], whyTh: "เรื่อง article (a / an / the) ยังพลาด" };
      return { modules: [M.dictCommas, M.bankDictation], whyTh: "พื้นฐานดีแล้ว เหลือแค่เครื่องหมายวรรคตอน — ดันให้ถึงคะแนนสูง" };
    case "reading":
      if (r.foundationLow)
        return { modules: [M.fitbStrategy, M.bankFitb, M.bankVocab], whyTh: "เดาจากบริบทเก่ง แต่พื้นฐานไวยากรณ์+คำศัพท์ฉุดคะแนนอ่านไว้" };
      return { modules: [M.readingSkill, M.bankReading], whyTh: "ฝึกทักษะการอ่าน — จับใจความ ไม่ใช่ท่องศัพท์" };
    case "speaking":
      if (r.code === "present" || r.code === "past")
        return { modules: [M.grammarMistakes, M.speakPhoto, M.bankSpeaking], whyTh: "ไวยากรณ์ (tense) ยังอ่อนสำหรับเป้าหมายที่ตั้งไว้" };
      if (r.code === "short")
        return { modules: [M.interactiveSpeak, M.bankSpeaking], whyTh: "พูดสั้นเกินไป — ต้องพัฒนาการต่อยอดไอเดีย (idea development)" };
      return { modules: [M.speakPhoto, M.bankSpeaking], whyTh: "เพิ่ม collocation ระดับ B2 ให้การพูดมีสีสันขึ้น" };
  }
}

const EST: Record<Module["type"], number> = { "mini-lesson": 15, "exam-bank": 30, mock: 60 };

export function generatePlan(report: Report, opts: { freeUser: boolean }): Plan {
  const items: PlanItem[] = report.planSkills.map((skill, i) => {
    const { modules, whyTh } = modulesFor(skill);
    return {
      skill: skill.skill,
      fromScore: skill.score,
      whyTh,
      modules,
      estMinutes: modules.reduce((m, mod) => m + EST[mod.type], 0),
      // Free users: only the first (weakest) item is unlocked; the rest + the mock are locked.
      locked: opts.freeUser ? i !== 0 : false,
    };
  });
  return { predicted: report.predicted, target: report.target, items, finishLine: M.mock };
}
