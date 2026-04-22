import { appendCriterion } from "@/lib/production-report-notebook-helpers";
import type { SpeakingAttemptReport } from "@/types/speaking";

/** Long bilingual dump for “see in full” in the notebook. */
export function buildSpeakingReportNotebookFullBodies(report: SpeakingAttemptReport): {
  fullBodyEn: string;
  fullBodyTh: string;
} {
  const sub = (report.punctuatedTranscript ?? report.transcript).trim();
  const en: string[] = [];
  const th: string[] = [];

  en.push("READ, THEN SPEAK — FULL FEEDBACK (English)\n");
  en.push(`Topic: ${report.topicTitleEn}\n`);
  en.push(`Question: ${report.questionPromptEn}\n`);
  en.push(`Score: ${report.score160} / 160 · ${report.wordCount} words · prep ${report.prepMinutes} min\n`);
  en.push(`Submitted: ${report.submittedAt}\n`);

  th.push("อ่านแล้วพูด — ฟีดแบ็กฉบับเต็ม (ไทย)\n");
  th.push(`หัวข้อ: ${report.topicTitleTh}\n`);
  th.push(`คำถาม: ${report.questionPromptTh}\n`);
  th.push(`คะแนน: ${report.score160} / 160 · ${report.wordCount} คำ · เตรียม ${report.prepMinutes} นาที\n`);

  en.push("\n=== Your submission (punctuated for grading) ===\n");
  en.push(sub);
  th.push("\n=== บทพูดของคุณ ===\n");
  th.push(sub);

  appendCriterion(en, th, "Grammar", report.grammar);
  appendCriterion(en, th, "Vocabulary", report.vocabulary);
  appendCriterion(en, th, "Coherence", report.coherence);
  appendCriterion(en, th, "Task relevancy", report.taskRelevancy);

  en.push("\n=== Key learning ===\n");
  th.push("\n=== สิ่งที่ได้เรียนรู้ ===\n");
  for (const p of report.improvementPoints) {
    en.push(`• ${p.en}\n`);
    th.push(`• ${p.th}\n`);
  }

  if (report.vocabularyUpgradeSuggestions?.length) {
    en.push("\n=== Vocabulary upgrades ===\n");
    th.push("\n=== คำแนะนำคำศัพท์ ===\n");
    for (const u of report.vocabularyUpgradeSuggestions) {
      en.push(`• ${u.originalWord} → ${u.upgradedWord}: ${u.meaningTh} | e.g. ${u.exampleEn}\n`);
      th.push(`• ${u.originalWord} → ${u.upgradedWord}: ${u.meaningTh}\n`);
    }
  }

  return {
    fullBodyEn: en.join("").trim(),
    fullBodyTh: th.join("").trim(),
  };
}

/** Short card text for Production feedback list. */
export function buildSpeakingReportNotebookPreview(report: SpeakingAttemptReport): {
  titleEn: string;
  titleTh: string;
  bodyEn: string;
  bodyTh: string;
  excerpt: string;
} {
  const grammarEn = report.grammar.summary.en.trim() || "Review spoken grammar control.";
  const vocabularyEn = report.vocabulary.summary.en.trim() || "Review speaking vocabulary range.";
  const grammarTh = report.grammar.summary.th.trim() || "ดูไวยากรณ์ตอนพูดให้ชัดขึ้น";
  const vocabularyTh = report.vocabulary.summary.th.trim() || "ดูการเลือกคำตอนพูดให้กว้างขึ้น";

  const bodyEn = [
    `Score ${report.score160}/160 · ${report.wordCount} words · prep ${report.prepMinutes} min.`,
    `Grammar: ${grammarEn}`,
    `Vocabulary: ${vocabularyEn}`,
  ].join("\n");

  const bodyTh = [
    `คะแนน ${report.score160}/160 · ${report.wordCount} คำ`,
    `Grammar: ${grammarTh}`,
    `Vocabulary: ${vocabularyTh}`,
  ].join("\n");

  return {
    titleEn: `Read, then speak — ${report.topicTitleEn}`,
    titleTh: `อ่านแล้วพูด — ${report.topicTitleTh}`,
    bodyEn,
    bodyTh,
    excerpt: `Report #${report.attemptId.slice(0, 8)}…`,
  };
}
