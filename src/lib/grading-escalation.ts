import "server-only";

import {
  hasTimeForAnotherAttempt,
  isAnthropicGradingModel,
} from "@/lib/grading-llm-generate";
import { DEFAULT_GEMINI_TEXT_MODEL } from "@/lib/gemini-text-models";
import type { GradingLlmUsage } from "@/types/grading-llm-usage";

/**
 * A learner has already written or recorded their answer by the time grading
 * runs. Losing it to a provider hiccup is the worst thing this product can do
 * to someone who found it hard to start in the first place.
 *
 * So a failed grade escalates to ANOTHER MODEL rather than giving up:
 *   1. the admin-selected model, already retried internally on transient
 *      errors and unparseable JSON (see generateGradingJsonObject)
 *   2. a different provider entirely, then a different Gemini tier
 *
 * Every rung is a real AI grade. There is deliberately no heuristic fallback:
 * an offline score would be inaccurate, and a wrong score is worse for a
 * learner than a slow one.
 */

export type GradeSource = "ai" | "ai-fallback-model";

export type EscalatedGrade<T> = {
  report: T;
  usage: GradingLlmUsage | null;
  source: GradeSource;
  /** Model that actually produced the report. */
  model: string;
  /** One line per failed attempt — logged, and surfaced in usage meta. */
  failures: string[];
};

/**
 * Thrown only when every model in the ladder failed. Carries `retryable` so the
 * route can tell the client "ask again" rather than "you did something wrong".
 */
export class AllGradingAttemptsFailedError extends Error {
  readonly retryable = true;
  readonly failures: string[];
  constructor(failures: string[]) {
    super("Grading service is busy right now.");
    this.name = "AllGradingAttemptsFailedError";
    this.failures = failures;
  }
}

/**
 * Models to try, in order. A second model is a genuinely independent attempt:
 * Gemini being overloaded says nothing about Claude, and a model that just
 * emitted unclosed JSON on this input tends to do it again.
 */
export function buildModelLadder(
  primary: string,
  keys: { geminiApiKey?: string; anthropicApiKey?: string },
): string[] {
  const ladder = [primary];
  const push = (m: string, usable: boolean) => {
    if (usable && !ladder.includes(m)) ladder.push(m);
  };
  const hasGemini = Boolean(keys.geminiApiKey?.trim());
  const hasClaude = Boolean(keys.anthropicApiKey?.trim());

  // Cross-provider first — the most independent second opinion available.
  if (isAnthropicGradingModel(primary)) {
    push(DEFAULT_GEMINI_TEXT_MODEL, hasGemini);
    push("gemini-2.5-pro", hasGemini);
  } else {
    push("claude-haiku-4-5", hasClaude);
    push(DEFAULT_GEMINI_TEXT_MODEL, hasGemini);
    push("gemini-2.5-pro", hasGemini);
  }
  return ladder;
}

/**
 * Run the ladder. Returns a real AI report, or throws
 * `AllGradingAttemptsFailedError` when every model failed.
 */
export async function gradeWithEscalation<T>(opts: {
  /** Label for logs, e.g. "writing_report". */
  operation: string;
  models: string[];
  /** Absolute wall-clock deadline (Date.now() ms). */
  deadlineAt: number;
  /** One attempt with the given model. May throw. */
  runAi: (
    model: string,
    deadlineAt: number,
  ) => Promise<{ report: T; usage: GradingLlmUsage | null }>;
}): Promise<EscalatedGrade<T>> {
  const failures: string[] = [];
  let lastAttemptMs = 0;

  for (let i = 0; i < opts.models.length; i++) {
    const model = opts.models[i]!;
    // Never start a rung we can't finish — being killed mid-attempt by the
    // platform is exactly the failure we're removing.
    if (i > 0 && !hasTimeForAnotherAttempt(opts.deadlineAt, lastAttemptMs)) {
      failures.push(`skipped ${model}: out of time budget`);
      break;
    }
    const startedAt = Date.now();
    try {
      const { report, usage } = await opts.runAi(model, opts.deadlineAt);
      if (failures.length > 0) {
        console.warn(
          `[${opts.operation}] recovered on ${model} after ${failures.length} failure(s):`,
          failures.join(" | "),
        );
      }
      return {
        report,
        usage,
        source: i === 0 ? "ai" : "ai-fallback-model",
        model,
        failures,
      };
    } catch (err) {
      lastAttemptMs = Date.now() - startedAt;
      failures.push(`${model}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.error(
    `[${opts.operation}] ALL MODELS FAILED:`,
    failures.join(" | "),
  );
  throw new AllGradingAttemptsFailedError(failures);
}

/**
 * Wall-clock budget for AI attempts, leaving headroom for credit charging,
 * data-collection writes and serialization before the platform's hard timeout.
 */
export function gradingDeadlineFrom(startedAt: number, maxDurationSeconds: number): number {
  return startedAt + Math.max(20_000, maxDurationSeconds * 1000 - 15_000);
}
