import { appendCriterion } from "@/lib/production-report-notebook-helpers";
import type { PhotoSpeakAttemptReport } from "@/types/photo-speak";

function headers(report: PhotoSpeakAttemptReport): {
  titleEn: string;
  titleTh: string;
  enBanner: string;
  thBanner: string;
} {
  const isWrite = report.originHub === "write-about-photo";
  if (isWrite) {
    return {
      titleEn: `Write about photo — ${report.topicTitleEn}`,
      titleTh: `เขียนเกี่ยวกับภาพ — ${report.topicTitleTh}`,
      enBanner: "WRITE ABOUT PHOTO — FULL FEEDBACK (English)\n",
      thBanner: "เขียนเกี่ยวกับภาพ — ฟีดแบ็กฉบับเต็ม (ไทย)\n",
    };
  }
  return {
    titleEn: `Speak about photo — ${report.topicTitleEn}`,
    titleTh: `พูดเกี่ยวกับภาพ — ${report.topicTitleTh}`,
    enBanner: "SPEAK ABOUT PHOTO — FULL FEEDBACK (English)\n",
    thBanner: "พูดเกี่ยวกับภาพ — ฟีดแบ็กฉบับเต็ม (ไทย)\n",
  };
}

export function buildPhotoSpeakReportNotebookFullBodies(report: PhotoSpeakAttemptReport): {
  fullBodyEn: string;
  fullBodyTh: string;
} {
  const sub = (report.punctuatedTranscript ?? report.transcript).trim();
  const { enBanner, thBanner } = headers(report);
  const en: string[] = [];
  const th: string[] = [];

  en.push(enBanner);
  en.push(`Topic: ${report.topicTitleEn}\n`);
  en.push(`Image: ${report.imageUrl}\n`);
  if (report.taskKeywords.length) {
    en.push(`Keywords: ${report.taskKeywords.join(", ")}\n`);
  }
  en.push(`Prompt: ${report.questionPromptEn}\n`);
  en.push(`Score: ${report.score160} / 160 · ${report.wordCount} words · prep ${report.prepMinutes} min\n`);
  en.push(`Submitted: ${report.submittedAt}\n`);

  th.push(thBanner);
  th.push(`หัวข้อ: ${report.topicTitleTh}\n`);
  th.push(`คำถาม: ${report.questionPromptTh}\n`);
  th.push(`คะแนน: ${report.score160} / 160 · ${report.wordCount} คำ · เตรียม ${report.prepMinutes} นาที\n`);

  en.push("\n=== Your submission (punctuated for grading) ===\n");
  en.push(sub);
  th.push("\n=== ข้อความของคุณ ===\n");
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

export function buildPhotoSpeakReportNotebookPreview(report: PhotoSpeakAttemptReport): {
  titleEn: string;
  titleTh: string;
  bodyEn: string;
  bodyTh: string;
  excerpt: string;
} {
  const h = headers(report);
  const firstTip = report.improvementPoints[0];
  const gSum = report.grammar.summary.en.trim();
  const previewLine =
    firstTip?.en?.trim() ||
    gSum.slice(0, 120) + (gSum.length > 120 ? "…" : "") ||
    `Photo task · ${report.wordCount} words.`;

  const bodyEn = [
    `Score ${report.score160}/160 · ${report.wordCount} words · prep ${report.prepMinutes} min.`,
    `Prompt: ${report.questionPromptEn.slice(0, 100)}${report.questionPromptEn.length > 100 ? "…" : ""}`,
    previewLine,
  ].join("\n");

  const thLine =
    report.improvementPoints[0]?.th?.trim() ||
    report.grammar.summary.th.trim().slice(0, 160) ||
    `คะแนน ${report.score160}/160`;

  const bodyTh = [`คะแนน ${report.score160}/160 · ${report.wordCount} คำ`, thLine].join("\n");

  return {
    titleEn: h.titleEn,
    titleTh: h.titleTh,
    bodyEn,
    bodyTh,
    excerpt: `Report #${report.attemptId.slice(0, 8)}…`,
  };
}
