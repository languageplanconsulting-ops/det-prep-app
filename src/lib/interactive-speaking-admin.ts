import type { InteractiveSpeakingScenario } from "@/types/interactive-speaking";

function isRound(n: unknown): n is NonNullable<InteractiveSpeakingScenario["round"]> {
  return n === 1 || n === 2 || n === 3 || n === 4 || n === 5;
}

export function parseInteractiveSpeakingScenariosJson(raw: string): InteractiveSpeakingScenario[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON.");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Expected a non-empty JSON array.");
  }
  const out: InteractiveSpeakingScenario[] = [];
  for (const row of parsed) {
    if (!row || typeof row !== "object") throw new Error("Each item must be an object.");
    const o = row as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    const titleEn = typeof o.titleEn === "string" ? o.titleEn.trim() : "";
    const titleTh = typeof o.titleTh === "string" ? o.titleTh.trim() : "";
    const starterQuestionEn =
      typeof o.starterQuestionEn === "string" ? o.starterQuestionEn.trim() : "";
    const starterQuestionTh =
      typeof o.starterQuestionTh === "string" ? o.starterQuestionTh.trim() : "";
    if (!id) throw new Error("Each scenario needs a non-empty id.");
    if (!titleEn) throw new Error(`Scenario ${id}: titleEn required.`);
    if (!starterQuestionEn) throw new Error(`Scenario ${id}: starterQuestionEn required.`);
    if (!starterQuestionTh) throw new Error(`Scenario ${id}: starterQuestionTh required.`);
    const thumbRaw = o.thumbnail;
    const thumbnail =
      typeof thumbRaw === "string" && thumbRaw.trim() ? thumbRaw.trim() : undefined;
    const scenario: InteractiveSpeakingScenario = {
      id,
      titleEn,
      titleTh: titleTh || titleEn,
      starterQuestionEn,
      starterQuestionTh,
      uploadedByAdmin: true,
      ...(thumbnail ? { thumbnail } : {}),
      ...(isRound(o.round) ? { round: o.round } : {}),
    };
    out.push(scenario);
  }
  return out;
}
