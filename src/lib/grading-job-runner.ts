import "server-only";

import { generatePhotoSpeakReportWithGemini } from "@/lib/gemini-photo-speak";
import { generateSpeakingReportWithGemini } from "@/lib/gemini-speaking";
import { generateWritingReportWithGemini } from "@/lib/gemini-writing";
import { resolveGeminiTextModel } from "@/lib/gemini-model-resolve";
import { buildModelLadder, gradeWithEscalation } from "@/lib/grading-escalation";
import type { GradingJob } from "@/lib/grading-jobs";
import type { GradingLlmUsage } from "@/types/grading-llm-usage";
import type { WritingTopic } from "@/types/writing";

/**
 * Re-grade a stored job from its payload alone — no original request needed.
 *
 * This is what makes the "never lose an answer" promise real: the learner's
 * polling and the cron sweep both come through here, so a submission keeps
 * being retried until a genuine AI report exists. It never invents a score.
 */

/** Background runs have no request headers, so keys come from env only. */
function envKeys() {
  return {
    geminiApiKey: process.env.GEMINI_API_KEY?.trim() ?? "",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY?.trim() || undefined,
    openAiApiKey: process.env.OPENAI_API_KEY?.trim() || undefined,
  };
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x ?? "")) : [];
}

export type RunGradingJobResult = {
  report: Record<string, unknown>;
  usage: GradingLlmUsage | null;
  model: string;
};

/**
 * Run one full escalation pass for a job. Throws when every model failed —
 * the caller records the failure and leaves the job pending for the next pass.
 */
export async function runGradingJob(
  job: GradingJob,
  opts: { deadlineAt: number },
): Promise<RunGradingJobResult> {
  const model = await resolveGeminiTextModel();
  const keys = envKeys();
  const p = job.payload;

  const graded = await gradeWithEscalation<Record<string, unknown>>({
    operation: `grading_job:${job.surface}`,
    models: buildModelLadder(model, keys),
    deadlineAt: opts.deadlineAt,
    runAi: async (m, deadlineAt) => {
      if (job.surface === "read_then_write") {
        const { report, usage } = await generateWritingReportWithGemini({
          apiKey: keys.geminiApiKey,
          anthropicApiKey: keys.anthropicApiKey,
          model: m,
          attemptId: job.attemptId,
          topic: p.topic as WritingTopic,
          essay: str(p.essay),
          followUpAnswers: Array.isArray(p.followUpAnswers)
            ? strArray(p.followUpAnswers)
            : undefined,
          prepMinutes: num(p.prepMinutes),
          deadlineAt,
        });
        return { report: report as unknown as Record<string, unknown>, usage };
      }
      if (job.surface === "read_then_speak") {
        const { report, usage } = await generateSpeakingReportWithGemini({
          apiKey: keys.geminiApiKey,
          anthropicApiKey: keys.anthropicApiKey,
          model: m,
          attemptId: job.attemptId,
          topicId: str(p.topicId),
          topicTitleEn: str(p.topicTitleEn),
          topicTitleTh: str(p.topicTitleTh),
          questionId: str(p.questionId),
          questionPromptEn: str(p.questionPromptEn),
          questionPromptTh: str(p.questionPromptTh),
          prepMinutes: num(p.prepMinutes),
          transcript: str(p.transcript),
          speakingRound: p.speakingRound as 1 | 2 | 3 | 4 | 5 | undefined,
          deadlineAt,
        });
        return { report: report as unknown as Record<string, unknown>, usage };
      }
      // write_about_photo | speak_about_photo
      const { report, usage } = await generatePhotoSpeakReportWithGemini({
        apiKey: keys.geminiApiKey,
        anthropicApiKey: keys.anthropicApiKey,
        model: m,
        attemptId: job.attemptId,
        itemId: str(p.itemId),
        titleEn: str(p.titleEn),
        titleTh: str(p.titleTh),
        promptEn: str(p.promptEn),
        promptTh: str(p.promptTh),
        imageUrl: str(p.imageUrl),
        taskKeywords: strArray(p.taskKeywords),
        targetVocabulary: Array.isArray(p.targetVocabulary)
          ? strArray(p.targetVocabulary)
          : undefined,
        prepMinutes: num(p.prepMinutes),
        transcript: str(p.transcript),
        originHub:
          job.surface === "write_about_photo" ? "write-about-photo" : "speak-about-photo",
        deadlineAt,
      });
      return { report: report as unknown as Record<string, unknown>, usage };
    },
  });

  return { report: graded.report, usage: graded.usage, model: graded.model };
}
