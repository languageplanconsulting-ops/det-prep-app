// Thai student-facing explanations. The engine's `notes` are English (internal/debug);
// everything shown to a learner is generated here in Thai from the structured `reason`.

import type { Report, SkillResult, SkillKey } from "./diagnostic.ts";

export const SKILL_TH: Record<SkillKey, string> = {
  reading: "การอ่าน",
  listening: "การฟัง",
  speaking: "การพูด",
  writing: "การเขียน",
};

const pct = (n: number) => Math.round(n * 100);

/** Short band label for a skill bar — avoids implying an exact point score (e.g. "< 80"). */
export function bandShort(band: string): string {
  return band.startsWith("below ") ? `< ${band.slice(6)}` : band;
}

/** One-line Thai reason for why a skill sits at its band (used in the "fix first" card). */
export function thaiReason(s: SkillResult): string {
  const r = s.reason;
  switch (r.kind) {
    case "reading": {
      const { foundationScore: f, comprehensionScore: c, foundationLow } = r;
      if (foundationLow)
        return `เข้าใจเนื้อเรื่องได้ (อ่านจับใจความ ${c}) แต่พื้นฐานไวยากรณ์+คำศัพท์อยู่ที่ ${f} จึงฉุดคะแนนอ่านไว้`;
      if (Math.min(f, c) >= 120) return "การอ่านแข็งแรงดี";
      if (f <= c) return `พื้นฐานไวยากรณ์+คำศัพท์ในการอ่านยังไม่แน่น (อยู่ที่ ${f})`;
      return `ตีความเนื้อเรื่อง/จับใจความยังพลาด (อยู่ที่ ${c})`;
    }
    case "listening": {
      const a = `(ความแม่นยำ ${pct(r.acc[0])}% / ${pct(r.acc[1])}% / ${pct(r.acc[2])}%)`;
      if (r.binding === null) return "การฟังแข็งแรงดี";
      return `ฟังประโยคแล้วจับไวยากรณ์ไม่ทัน ${a} — การฟังคือการจับไวยากรณ์ ไม่ใช่แค่ฟังศัพท์`;
    }
    case "speaking":
      switch (r.code) {
        case "present": return "พูดผิดเรื่อง present tense — พื้นฐานไวยากรณ์ยังไม่แน่น";
        case "past": return "พูดผิดเรื่อง past tense — ไวยากรณ์ยังอ่อนสำหรับเป้าหมายของคุณ";
        case "article": return "พูดผิดเรื่อง article (a / an / the)";
        case "short": return "พูดสั้นกว่า 100 คำ — ต้องฝึกการต่อยอดไอเดีย (idea development)";
        case "basicvocab": return "ใช้คำศัพท์พื้นฐานผิด";
        case "collocations": return "ไวยากรณ์ดี แต่ใช้ collocation น้อย — เพิ่มวลีระดับ B2 ให้การพูดมีสีสัน";
        case "ok": return "การพูดแข็งแรงดี";
      }
      return "";
    case "writing":
      switch (r.brokenTier) {
        case "verb": return "ผิดเรื่องรูปกริยา / ความสอดคล้องของประธาน-กริยา — พื้นฐานยังไม่แน่น";
        case "article": return "ผิดเรื่อง article (a / an / the)";
        case "punctuation": return "เหลือแค่เครื่องหมายวรรคตอน — พื้นฐานดีแล้ว แค่ดันอีกนิด";
        case null: return "การเขียนแข็งแรงดี";
      }
      return "";
  }
}

/** Adaptive headline for the top card: celebrate if at target, soften if nearly there. */
export function thaiFixFirst(report: Report): { title: string; body: string; achieved: boolean } {
  if (report.predicted >= report.target) {
    return { achieved: true, title: "ถึงเป้าหมายแล้ว!", body: "ทุกทักษะถึงระดับที่ตั้งไว้ — ลองตั้งเป้าให้สูงขึ้น หรือทำ Mock test เพื่อยืนยันผล" };
  }
  const s = report.fixFirst;
  const skill = SKILL_TH[s.skill];
  if (s.score >= 120) {
    return { achieved: false, title: `ขัดเกลาเพื่อให้ถึงเป้า — ${skill}`, body: `ทำได้ดีแล้ว เหลืออีกนิดก็ถึงเป้า — ขัดเกลา${skill}ให้แน่นขึ้น` };
  }
  return { achieved: false, title: `แก้ก่อนเป็นอันดับแรก — ${skill}`, body: thaiReason(s) };
}

/** Thai insight for the reading "guess-from-context vs grammar foundation" split, or null. */
export function thaiReadingInsight(report: Report): string | null {
  const reading = report.skills.find((s) => s.skill === "reading");
  if (reading?.reason.kind !== "reading" || !reading.reason.foundationLow) return null;
  const { comprehensionScore, foundationScore } = reading.reason;
  return `เดาจากบริบทได้ดี (เนื้อเรื่อง ${comprehensionScore}+) แต่พื้นฐานไวยากรณ์ + คำศัพท์อยู่ที่ ${foundationScore} จึงฉุดคะแนนอ่านไว้`;
}
