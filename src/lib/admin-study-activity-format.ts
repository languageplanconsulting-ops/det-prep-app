export function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function compactText(text: string, limit = 320): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 1)}…`;
}

export function extractSubmissionCard(row: Record<string, unknown>): {
  title: string;
  meta: string[];
  body: string;
} | null {
  const payload = row.submission_payload;
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const kind =
    typeof p.kind === "string" ? p.kind : String(row.exercise_type ?? "submission");

  if (typeof p.essay === "string") {
    return {
      title: "Learner submission",
      meta: [kind, firstNonEmptyString(p.titleEn, p.topicId)],
      body: compactText(p.essay),
    };
  }

  if (typeof p.transcript === "string") {
    return {
      title: "Learner transcript",
      meta: [kind, firstNonEmptyString(p.titleEn, p.itemId, p.topicId)],
      body: compactText(p.transcript),
    };
  }

  if (Array.isArray(p.turns)) {
    const turns = (p.turns as unknown[])
      .map((turn) => {
        if (!turn || typeof turn !== "object") return "";
        const t = turn as Record<string, unknown>;
        const question = firstNonEmptyString(t.questionEn, t.questionTh);
        const answer = firstNonEmptyString(t.transcript, t.answerTranscript);
        if (!question && !answer) return "";
        return `${question ? `Q: ${question}` : ""}${question && answer ? " | " : ""}${answer ? `A: ${answer}` : ""}`;
      })
      .filter(Boolean)
      .join("\n");
    return {
      title: "Learner turns",
      meta: [kind, firstNonEmptyString(p.titleEn, p.scenarioId)],
      body: compactText(turns, 480),
    };
  }

  return null;
}

export function extractReportCard(row: Record<string, unknown>): {
  score: string;
  summary: string;
  bullets: string[];
} | null {
  const payload = row.report_payload;
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const score =
    typeof p.score160 === "number"
      ? `${p.score160}/160`
      : row.score != null
        ? `${String(row.score)}/160`
        : "—";
  const summary = compactText(
    firstNonEmptyString(
      p.summaryEn,
      p.summaryTh,
      p.overallCommentEn,
      p.overallCommentTh,
      p.finalFeedbackEn,
      p.finalFeedbackTh,
    ),
    280,
  );
  const rawBullets = Array.isArray(p.improvementPoints)
    ? (p.improvementPoints as unknown[])
    : Array.isArray(p.keyLearningQuotes)
      ? (p.keyLearningQuotes as unknown[])
      : [];
  const bullets = rawBullets
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (!item || typeof item !== "object") return "";
      const o = item as Record<string, unknown>;
      return firstNonEmptyString(
        o.pointEn,
        o.pointTh,
        o.improvementEn,
        o.improvementTh,
        o.noteEn,
        o.noteTh,
      );
    })
    .filter(Boolean)
    .slice(0, 4);
  if (score === "—" && !summary && bullets.length === 0) return null;
  return { score, summary, bullets };
}
