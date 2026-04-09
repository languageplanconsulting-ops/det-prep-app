import { appendCriterion } from "@/lib/production-report-notebook-helpers";
import { withStudyPackDefaults } from "@/lib/writing-report";
import type { WritingAttemptReport } from "@/types/writing";

export function buildWritingReportNotebookFullBodies(report: WritingAttemptReport): {
  fullBodyEn: string;
  fullBodyTh: string;
} {
  const r = withStudyPackDefaults(report);
  const main = (r.punctuatedEssay ?? r.essay).trim();
  const en: string[] = [];
  const th: string[] = [];

  en.push("READ, THEN WRITE — FULL FEEDBACK (English)\n");
  en.push(`Topic: ${r.topicTitleEn}\n`);
  en.push(`Score: ${r.score160} / 160 · ${r.wordCount} words · prep ${r.prepMinutes} min\n`);
  en.push(`Submitted: ${r.submittedAt}\n`);

  th.push("อ่านแล้วเขียน — ฟีดแบ็กฉบับเต็ม (ไทย)\n");
  th.push(`หัวข้อ: ${r.topicTitleTh}\n`);
  th.push(`คะแนน: ${r.score160} / 160 · ${r.wordCount} คำ · เตรียม ${r.prepMinutes} นาที\n`);

  en.push("\n=== Main answer (punctuated for grading) ===\n");
  en.push(main);
  th.push("\n=== คำตอบหลัก ===\n");
  th.push(main);

  if (r.followUpResponses?.length) {
    en.push("\n=== Follow-up responses ===\n");
    th.push("\n=== คำตอบคำถามต่อเนื่อง ===\n");
    r.followUpResponses.forEach((fu, i) => {
      const ans = (fu.answerPunctuated ?? fu.answer).trim();
      en.push(`\n— Follow-up ${i + 1} —\nQ: ${fu.promptEn}\nA:\n${ans}\n`);
      th.push(`\n— คำถามต่อเนื่อง ${i + 1} —\nถาม: ${fu.promptTh}\nตอบ:\n${ans}\n`);
    });
  }

  if (r.studySentences?.length) {
    en.push("\n=== Sentence suggestions ===\n");
    th.push("\n=== ประโยคแนะนำ ===\n");
    for (const s of r.studySentences) {
      en.push(`• ${s.en}\n`);
      th.push(`• ${s.th}\n`);
    }
  }

  if (r.studyVocabulary?.length) {
    en.push("\n=== Vocabulary suggestions ===\n");
    th.push("\n=== คำศัพท์แนะนำ ===\n");
    for (const v of r.studyVocabulary) {
      en.push(`• ${v.termEn} — ${v.noteEn}\n`);
      th.push(`• ${v.termTh || v.termEn} — ${v.noteTh}\n`);
    }
  }

  appendCriterion(en, th, "Grammar", r.grammar);
  appendCriterion(en, th, "Vocabulary", r.vocabulary);
  appendCriterion(en, th, "Coherence", r.coherence);
  appendCriterion(en, th, "Task relevancy", r.taskRelevancy);

  en.push("\n=== Key learning ===\n");
  th.push("\n=== สิ่งที่ได้เรียนรู้ ===\n");
  for (const p of r.improvementPoints) {
    en.push(`• ${p.en}\n`);
    th.push(`• ${p.th}\n`);
  }

  return {
    fullBodyEn: en.join("").trim(),
    fullBodyTh: th.join("").trim(),
  };
}

export function buildWritingReportNotebookPreview(report: WritingAttemptReport): {
  titleEn: string;
  titleTh: string;
  bodyEn: string;
  bodyTh: string;
  excerpt: string;
} {
  const r = withStudyPackDefaults(report);
  const firstTip = r.improvementPoints[0];
  const gSum = r.grammar.summary.en.trim();
  const previewLine =
    firstTip?.en?.trim() ||
    gSum.slice(0, 120) + (gSum.length > 120 ? "…" : "") ||
    `Writing report · ${r.wordCount} words.`;

  const bodyEn = [
    `Score ${r.score160}/160 · ${r.wordCount} words · prep ${r.prepMinutes} min.`,
    previewLine,
  ].join("\n");

  const thLine =
    r.improvementPoints[0]?.th?.trim() ||
    r.grammar.summary.th.trim().slice(0, 160) ||
    `คะแนน ${r.score160}/160`;

  const bodyTh = [`คะแนน ${r.score160}/160 · ${r.wordCount} คำ`, thLine].join("\n");

  return {
    titleEn: `Read, then write — ${r.topicTitleEn}`,
    titleTh: `อ่านแล้วเขียน — ${r.topicTitleTh}`,
    bodyEn,
    bodyTh,
    excerpt: `Report #${r.attemptId.slice(0, 8)}…`,
  };
}
