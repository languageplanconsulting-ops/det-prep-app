import type { CriterionToPerfect } from "@/types/writing";

/**
 * Shared rubric text for every spoken-production grader (read-then-speak,
 * speak-about-photo, interactive speaking).
 *
 * Coherence and task relevancy used to have no numeric anchors, so the models
 * free-scored them and capped strong answers around 75%. These ladders make the
 * top band an explicitly reachable, countable condition, and forbid deducting
 * for things another criterion already covers.
 */

export const COHERENCE_RUBRIC_PROMPT = `Coherence (ความต่อเนื่อง):
Coherence measures ONLY how the ideas are ordered and connected. Score it by counting two things:
(1) EFFECTIVE TRANSITIONS = a linking word/phrase (first, then, next, after that, also, in addition, however, but, because, so, for example, finally, in conclusion, …) that is used CORRECTLY and actually separates or joins two DISTINCT ideas. Repeating the same connector to start every clause counts as ONE effective transition, not several. A connector used with the wrong logical meaning counts as ZERO and is a flow mistake.
(2) FLOW MISTAKES — this is a CLOSED list; nothing else may lower the coherence score:
   (a) an abrupt jump to a new idea with no link at all;
   (b) a connector whose logic is wrong (e.g. "however" between two agreeing ideas);
   (c) an idea left unfinished / abandoned and never returned to;
   (d) the same idea repeated with no new content;
   (e) contradictory or impossible sequencing (events out of order, "finally" in the middle);
   (f) fillers or restarts so excessive that the listener loses the thread.

Coherence band ladder — apply strictly:
- 100%: THREE OR MORE effective transitions AND zero flow mistakes. This is a normal, reachable score — award 100 whenever both conditions hold, even if the response is short or simple. Do NOT withhold 100 for "could be more sophisticated", "more variety would help", or any grammar/vocabulary/pronunciation reason.
- 90%: 3+ effective transitions with zero flow mistakes but the connectors are all of one type (e.g. only sequencing, or only "and/so"); OR 2 effective transitions with zero flow mistakes.
- 75%: 2+ effective transitions but exactly ONE flow mistake; OR 1 effective transition with zero flow mistakes.
- 60%: 1 effective transition, or ideas in a sensible order with no linking words at all.
- 40%: no effective transitions AND one flow mistake.
- 20% or below: no effective transitions AND two or more flow mistakes (jumbled, repetitive, or unfinished throughout).

Coherence exclusions (mandatory):
- NEVER lower coherence for grammar errors, tense errors, word-choice/vocabulary limits, pronunciation, accent, punctuation, capitalization, spelling, response length, or lack of personal detail. Those belong to the other three criteria — deducting for them here is double-penalizing and is forbidden.
- Spoken self-correction: if the learner hesitates, repeats, or restarts but then repairs to a CORRECT form, do NOT deduct for the hesitation or the repair itself (this is natural spoken repair and should be treated as correct). Only deduct when the FINAL repaired form is still wrong — then apply the normal grammar criteria to that final form.
- In coherenceSummaryEn/Th, STATE the count you used, e.g. "You used 4 effective transitions (first, also, however, finally) and no flow mistakes → 100%".
- If the score is below 100, name at least one concrete transition the learner could have added, tied to their own wording, and say which flow mistake cost the points. If the score IS 100, praise the specific transitions they used instead of inventing a weakness.`;

/**
 * @param extraRequirement task-specific line (e.g. photo keywords, per-question
 * engagement) appended as an additional requirement R5.
 */
export function taskRubricPrompt(extraRequirement?: string): string {
  return `Task relevancy (การตอบโจทย์):
Task relevancy measures ONLY whether the answer does what the prompt asked, with enough concrete, personal content. Judge it against these requirements:
(R1) EVERY part of the prompt is answered (if the prompt asks two things — e.g. describe AND explain why — both must appear);
(R2) at least one CONCRETE detail (a name, place, number, time, object, or specific action) rather than only general statements;
(R3) at least one PERSONAL element — real or hypothetical ("In my experience…", "If I were…", "I would…");
(R4) nothing off-topic, invented beyond the prompt, or padded with filler that adds no content.${
    extraRequirement ? `\n(R5) ${extraRequirement}` : ""
  }

Task relevancy band ladder — apply strictly:
- 100%: all requirements met. Award 100 whenever they are — do NOT withhold it for shortness, simple language, or "could be more developed".
- 90%: R1 and R2 and R4 met, but the personal element (R3) is weak or only implied.
- 75%: the prompt is answered but the response stays general (R2 missing), OR one of several prompt parts is answered only briefly.
- 60%: only part of the prompt is answered, or the answer is entirely generic with no concrete or personal content.
- 40%: mostly drifts from the prompt, or answers a different question than the one asked.
- 20% or below: off-topic, or too little content to judge.
Task exclusions: NEVER lower task relevancy for grammar, vocabulary level, pronunciation, transitions/flow, punctuation, or spelling — those are the other three criteria.
In taskSummaryEn/Th, STATE which requirements were met and which were not, e.g. "You answered both parts and gave a personal reason, but no concrete detail (no place, number, or name) → 75%".`;
}

/**
 * @param scoreText name of the transcript field quotes must come from.
 * @param hasPersonalBoost true when the grader also applies the +10
 * personal-experience bonus to the task score (read-then-speak, photo speak).
 */
export function toPerfectRulePrompt(scoreText: string, hasPersonalBoost: boolean): string {
  return `GAP TO 100% (toPerfect) — mandatory for every criterion scored below 100:
- For EACH of grammar, vocabulary, coherence, task: if the percentage you gave is BELOW 100, fill toPerfect.<criterion> with (a) missingEn/missingTh — one or two sentences naming exactly what is still missing to reach 100% under that criterion's band ladder, in plain language (e.g. "You used 2 effective transitions; 100% needs 3 or more, and the jump from your job to your hobby had no link at all."), and (b) examples — 2 or 3 model sentences the learner COULD have said.
- Example sentences MUST be rewrites of the learner's OWN content from the ${scoreText} (same topic, same facts), not generic textbook lines, and each must clearly demonstrate the missing element (the added transition, the upgraded word, the corrected structure, the on-task personal detail).
- Each example has en (the model sentence in English) and th (a short Thai gloss explaining what it fixes, e.g. "เพิ่มคำเชื่อม 'however' เพื่อแยกสองความคิด").
- If a criterion scored exactly 100, OMIT that key entirely — do not invent a weakness.
- toPerfect.task specifically: name which requirement (R1, R2, R3, …) is missing, then give 2 or 3 COMPLETE sentences the learner could have added to satisfy it — a sentence that answers the unanswered part of the prompt, a sentence carrying a concrete detail (place / number / name / time), or a sentence adding the personal or hypothetical element. Build them from the learner's own situation as described in the ${scoreText}; if they gave too little to build on, invent a plausible detail that fits what they DID say and keep it simple enough for them to reuse.${
    hasPersonalBoost
      ? `\n- Judge the task gap against the FINAL task percentage after the +10 personal-experience bonus. If that bonus already takes task to 100, omit toPerfect.task, and never list "add personal experience" as missing when you set taskPersonalExperienceBoost to true.`
      : ""
  }`;
}

/** Shape appended to each grader's requiredJsonShape. */
export const TO_PERFECT_JSON_SHAPE = {
  grammar: {
    missingEn: "string — what is still missing to reach 100% for this criterion",
    missingTh: "string",
    examples: [
      {
        en: "string — model sentence rebuilt from the learner's own content",
        th: "string — short Thai gloss of what it fixes",
      },
    ],
  },
  vocabulary: "same shape as grammar",
  coherence: "same shape as grammar",
  task: "same shape as grammar",
} as const;

/** Parse one `toPerfect.<criterion>` object from a grader response. */
export function mapCriterionToPerfect(key: string, value: unknown): CriterionToPerfect | undefined {
  const o = (value ?? {}) as Record<string, unknown>;
  const missingEn = String(o.missingEn ?? "").trim();
  const missingTh = String(o.missingTh ?? "").trim();
  const examples = (Array.isArray(o.examples) ? o.examples : [])
    .slice(0, 3)
    .map((e, idx) => {
      const x = (e ?? {}) as Record<string, unknown>;
      return {
        id: `${key}-perfect-${idx + 1}`,
        en: String(x.en ?? "").trim(),
        th: String(x.th ?? "").trim(),
      };
    })
    .filter((e) => e.en.length > 0);
  if (!missingEn && !missingTh && examples.length === 0) return undefined;
  return { missingEn, missingTh, examples };
}
