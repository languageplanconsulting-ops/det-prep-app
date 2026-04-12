import { appendCriterion } from "@/lib/production-report-notebook-helpers";
import type { InteractiveSpeakingAttemptReport } from "@/types/interactive-speaking";

export function buildInteractiveSpeakingReportNotebookFullBodies(
  report: InteractiveSpeakingAttemptReport,
): { fullBodyEn: string; fullBodyTh: string } {
  const en: string[] = [];
  const th: string[] = [];

  en.push("INTERACTIVE SPEAKING — FULL FEEDBACK (English)\n");
  th.push("การพูดโต้ตอบ — ฟีดแบ็กฉบับเต็ม (ไทย)\n");

  en.push(`Scenario: ${report.scenarioTitleEn}\n`);
  th.push(`สถานการณ์: ${report.scenarioTitleTh}\n`);
  en.push(`Score: ${report.score160} / 160 · ${report.wordCount} words\n`);
  th.push(`คะแนน: ${report.score160} / 160 · ${report.wordCount} คำ\n`);
  en.push(`Submitted: ${report.submittedAt}\n\n`);
  th.push(`ส่งเมื่อ: ${report.submittedAt}\n\n`);

  en.push("=== Conversation recap ===\n");
  th.push("=== สรุปบทสนทนา ===\n");
  for (const row of report.conversationRecap) {
    en.push(`\n--- Turn ${row.turnIndex} ---\nQ: ${row.questionEn}\nA: ${row.answerPunctuated}\n`);
    th.push(`\n--- เทิร์น ${row.turnIndex} ---\nถาม: ${row.questionTh}\nตอบ: ${row.answerPunctuated}\n`);
  }

  appendCriterion(en, th, "Grammar", report.grammar);
  appendCriterion(en, th, "Vocabulary", report.vocabulary);
  appendCriterion(en, th, "Coherence", report.coherence);
  appendCriterion(en, th, "Task relevancy", report.taskRelevancy);

  en.push("\n=== Key learning (from your speech) ===\n");
  th.push("\n=== สิ่งที่ได้เรียนรู้ (จากคำพูดของคุณ) ===\n");
  const kl = report.keyLearningQuotes?.length ? report.keyLearningQuotes : null;
  if (kl) {
    for (const k of kl) {
      en.push(
        `\n[Turn ${k.turnIndex}] “${k.exactQuoteFromSpeech}”\n  → ${k.improvementEn}\n`,
      );
      th.push(`\n[เทิร์น ${k.turnIndex}] “${k.exactQuoteFromSpeech}”\n  → ${k.improvementTh}\n`);
      if (k.suggestedIdiomEn?.trim() && k.suggestedIdiomMeaningTh?.trim()) {
        en.push(
          `  Idiom: ${k.suggestedIdiomEn}${k.suggestedIdiomExampleEn ? ` (e.g. ${k.suggestedIdiomExampleEn})` : ""}\n`,
        );
        th.push(`  สำนวน: ${k.suggestedIdiomMeaningTh}\n`);
      }
    }
  } else {
    for (const p of report.improvementPoints) {
      en.push(`• ${p.en}\n`);
      th.push(`• ${p.th}\n`);
    }
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

export function buildInteractiveSpeakingReportNotebookPreview(
  report: InteractiveSpeakingAttemptReport,
): {
  titleEn: string;
  titleTh: string;
  bodyEn: string;
  bodyTh: string;
  excerpt: string;
} {
  const recap = report.conversationRecap
    .map((r) => `T${r.turnIndex}: ${r.answerPunctuated.slice(0, 80)}${r.answerPunctuated.length > 80 ? "…" : ""}`)
    .join(" | ");
  return {
    titleEn: `Interactive speaking — ${report.scenarioTitleEn}`,
    titleTh: `การพูดโต้ตอบ — ${report.scenarioTitleTh}`,
    bodyEn: `Score ${report.score160}/160. ${recap.slice(0, 400)}`,
    bodyTh: `คะแนน ${report.score160}/160 — ดูสรุปบทสนทนาในรายงานเต็ม`,
    excerpt: recap.slice(0, 120),
  };
}
