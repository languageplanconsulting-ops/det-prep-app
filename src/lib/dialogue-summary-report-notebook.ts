import { appendCriterion } from "@/lib/production-report-notebook-helpers";
import type { DialogueSummaryAttemptReport } from "@/types/dialogue-summary";

export function buildDialogueSummaryReportNotebookFullBodies(
  report: DialogueSummaryAttemptReport,
): { fullBodyEn: string; fullBodyTh: string } {
  const en: string[] = [];
  const th: string[] = [];

  en.push("DIALOGUE SUMMARY — FULL FEEDBACK (English)\n");
  en.push(`Task: ${report.titleEn}\n`);
  en.push(
    `Round ${report.round} · ${report.difficulty} · set ${report.setNumber} · score ${report.score160}/160 · ${report.wordCount} words\n`,
  );
  en.push(`Submitted: ${report.submittedAt}\n`);

  th.push("สรุปบทสนทนา — ฟีดแบ็กฉบับเต็ม (ไทย)\n");
  th.push(`โจทย์: ${report.titleTh}\n`);
  th.push(`รอบ ${report.round} · ${report.difficulty} · ชุด ${report.setNumber} · คะแนน ${report.score160}/160 · ${report.wordCount} คำ\n`);

  en.push("\n=== Your summary ===\n");
  en.push(`${report.summary}\n`);
  th.push("\n=== สรุปของคุณ ===\n");
  th.push(`${report.summary}\n`);

  if (report.highlights.length > 0) {
    en.push("\n=== Annotated highlights ===\n");
    th.push("\n=== จุดที่ไฮไลต์ ===\n");
    for (const h of report.highlights) {
      const tag = `${h.type}${h.isPositive ? " +" : " −"}`;
      en.push(`[${tag}] ${h.noteEn}\n`);
      if (h.fixEn?.trim()) en.push(`  Fix: ${h.fixEn}\n`);
      th.push(`[${tag}] ${h.noteTh}\n`);
      if (h.fixTh?.trim()) th.push(`  แก้: ${h.fixTh}\n`);
    }
  }

  appendCriterion(en, th, "Relevancy to the scenario", report.relevancy);
  appendCriterion(en, th, "Grammar", report.grammar);
  appendCriterion(en, th, "Flow", report.flow);
  appendCriterion(en, th, "Vocabulary", report.vocabulary);

  en.push("\n=== Key learning ===\n");
  th.push("\n=== สิ่งที่ได้เรียนรู้ ===\n");
  for (const p of report.improvementPoints) {
    en.push(`• ${p.en} (${p.category})\n`);
    th.push(`• ${p.th} (${p.category})\n`);
  }

  return {
    fullBodyEn: en.join("").trim(),
    fullBodyTh: th.join("").trim(),
  };
}

export function buildDialogueSummaryReportNotebookPreview(report: DialogueSummaryAttemptReport): {
  titleEn: string;
  titleTh: string;
  bodyEn: string;
  bodyTh: string;
  excerpt: string;
} {
  const firstTip = report.improvementPoints[0];
  const gSum = report.relevancy.summary.en.trim();
  const previewLine =
    firstTip?.en?.trim() ||
    gSum.slice(0, 120) + (gSum.length > 120 ? "…" : "") ||
    `Dialogue summary · ${report.wordCount} words.`;

  const bodyEn = [
    `Score ${report.score160}/160 · ${report.wordCount} words.`,
    `Summary preview: ${report.summary.slice(0, 140)}${report.summary.length > 140 ? "…" : ""}`,
    previewLine,
  ].join("\n");

  const thLine =
    report.improvementPoints[0]?.th?.trim() ||
    report.relevancy.summary.th.trim().slice(0, 160) ||
    `คะแนน ${report.score160}/160`;

  const bodyTh = [`คะแนน ${report.score160}/160 · ${report.wordCount} คำ`, thLine].join("\n");

  return {
    titleEn: `Dialogue summary — ${report.titleEn}`,
    titleTh: `สรุปบทสนทนา — ${report.titleTh}`,
    bodyEn,
    bodyTh,
    excerpt: `Report #${report.attemptId.slice(0, 8)}…`,
  };
}
