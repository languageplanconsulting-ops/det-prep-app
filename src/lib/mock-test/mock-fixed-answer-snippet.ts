/** Short plain-text preview of a learner answer for mock step detail UI. */
export function formatMockAnswerSnippet(answer: unknown, maxLen = 360): string {
  if (answer == null) return "—";
  if (typeof answer === "string") {
    const t = answer.trim();
    return t.length <= maxLen ? t || "—" : `${t.slice(0, maxLen)}…`;
  }
  if (typeof answer !== "object" || Array.isArray(answer)) {
    const raw = JSON.stringify(answer);
    return raw.length <= maxLen ? raw : `${raw.slice(0, maxLen)}…`;
  }
  const o = answer as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const direct = str(o.answer) || str(o.text) || str(o.essay) || str(o.transcript);
  if (direct) return direct.length <= maxLen ? direct : `${direct.slice(0, maxLen)}…`;

  if (Array.isArray(o.user_turn_answers)) {
    const joined = o.user_turn_answers.map((x) => String(x ?? "").trim()).filter(Boolean).join("\n");
    if (joined) return joined.length <= maxLen ? joined : `${joined.slice(0, maxLen)}…`;
  }
  if (Array.isArray(o.turns)) {
    const bits = (o.turns as unknown[])
      .map((row) => {
        if (!row || typeof row !== "object") return "";
        const r = row as Record<string, unknown>;
        return String(r.transcript ?? r.answerTranscript ?? "").trim();
      })
      .filter(Boolean);
    const joined = bits.join("\n");
    if (joined) return joined.length <= maxLen ? joined : `${joined.slice(0, maxLen)}…`;
  }

  const raw = JSON.stringify(o);
  return raw.length <= maxLen ? raw : `${raw.slice(0, maxLen)}…`;
}
