export type MiniDiagnosisScoredRow = {
  step_index: number;
  task_type: string;
  score: number;
  answer?: unknown;
};

export type MiniDiagnosisSkillBuckets = {
  total: number;
  listening: number;
  speaking: number;
  reading: number;
  writing: number;
};

function normalize160(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(160, Math.round(v)));
}

function avg(list: number[]): number {
  if (!list.length) return 0;
  return list.reduce((sum, item) => sum + item, 0) / list.length;
}

export function scoreMiniDiagnosisBuckets(rows: MiniDiagnosisScoredRow[]): MiniDiagnosisSkillBuckets {
  const dictation = avg(rows.filter((r) => r.task_type === "dictation").map((r) => r.score));
  const fitb = avg(rows.filter((r) => r.task_type === "fill_in_blanks").map((r) => r.score));
  const vocab = avg(rows.filter((r) => r.task_type === "vocabulary_reading").map((r) => r.score));
  const miniListening = avg(rows.filter((r) => r.task_type === "interactive_listening").map((r) => r.score));
  const writing = avg(rows.filter((r) => r.task_type === "write_about_photo").map((r) => r.score));
  const speaking = avg(rows.filter((r) => r.task_type === "read_then_speak").map((r) => r.score));

  const reading = (vocab * 0.5) + (fitb * 0.5);
  const listening = (dictation * 0.5) + (miniListening * 0.5);
  const total = (reading + listening + writing + speaking) / 4;

  return {
    total: normalize160(total),
    listening: normalize160(listening),
    speaking: normalize160(speaking),
    reading: normalize160(reading),
    writing: normalize160(writing),
  };
}

export function miniDiagnosisLevelLabel(total: number): string {
  if (total >= 130) return "Strong / แข็งแรงมาก";
  if (total >= 110) return "Developing well / กำลังไปได้ดี";
  if (total >= 85) return "Emerging / เริ่มเห็นฐาน";
  if (total >= 60) return "Foundation / ต้องเสริมพื้นฐาน";
  return "Early stage / เริ่มต้นมาก";
}
