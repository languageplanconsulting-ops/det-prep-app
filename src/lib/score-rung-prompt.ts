import { findTextSpan } from "@/lib/find-text-span";
import type {
  ScoreRungChange,
  ScoreRungChangeCategory,
  ScoreRungLadder,
  ScoreRungSample,
} from "@/types/writing";

/**
 * "How to get +20 from here" — the learner's OWN answer rewritten at the next
 * two rungs of the score ladder: same length, same ideas, only grammar /
 * vocabulary / linking fixed.
 *
 * Why length is frozen: task relevancy is content-bound (10% of the read-and-write
 * weight, 20% on photo) so it barely moves without new ideas, while grammar +
 * vocabulary + coherence are 90% / 80% of the weight and are all fixable in place.
 * That is exactly where the 80–90 band loses its points — real reports there score
 * grammar 0–50% while task sits at 75–100%.
 */

/** Rungs we show. 150 is the top: above ~140 a same-length rewrite can't get there. */
const SCORE_LADDER = [110, 130, 150] as const;

export const SCORE_RUNG_BANDS: Record<number, string> = {
  110: "B1–B2",
  130: "B2–C1",
  150: "C1",
};

/** Max words a rung may use, as a share of the learner's own answer. */
const LENGTH_TOLERANCE = 1.15;

/**
 * Min words a rung may use. Without a floor the grader "improves" by deleting:
 * a real run turned a 73-word essay into 56 words (0.77x) by cutting the
 * learner's last point instead of repairing it. 0.8 is calibrated against real
 * submissions — it rejects that case while still allowing the legitimate
 * squeeze when a short answer is mostly redundancy ("In this picture it is
 * shows us in the swimming pool" → "This picture shows a swimming pool", 0.81x).
 */
const LENGTH_FLOOR = 0.8;

const MAX_CHANGES_PER_RUNG = 6;

/** Don't offer rungs at all below this — nothing meaningful to rewrite. */
const MIN_WORDS_FOR_RUNGS = 25;

export function countRungWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * The next two rungs strictly above the learner's score. Someone on 87 sees
 * 110 + 130; someone on 118 sees 130 + 150. Never a rung at or below their own
 * score — a "110 sample" for a learner who scored 125 reads as a demotion.
 */
export function nextScoreRungs(score160: number): number[] {
  return SCORE_LADDER.filter((r) => r > score160).slice(0, 2);
}

export function bandLabel(target: number): string {
  return SCORE_RUNG_BANDS[target] ?? "B2–C1";
}

/**
 * Prompt block appended to the writing / photo-write grader.
 *
 * The grader picks its own rungs, because the total isn't known until it has
 * scored. `parseScoreRungLadder` then re-checks every rung against the FINAL
 * (post-penalty) score, so a rung the model mis-targeted is dropped rather than
 * shown under a wrong label.
 *
 * `weights` differ per surface (read-and-write 40/30/20/10, photo 30/25/25/20),
 * so the model is told which levers actually move this learner's total.
 */
export function scoreRungRulePrompt(params: {
  learnerWordCount: number;
  weights: { grammar: number; vocabulary: number; coherence: number; taskRelevancy: number };
  /** What the learner's text is called in the payload ("essay" / "answer"). */
  textLabel: string;
}): string {
  const { learnerWordCount, weights, textLabel } = params;
  if (learnerWordCount < MIN_WORDS_FOR_RUNGS) return "";
  const maxWords = Math.round(learnerWordCount * LENGTH_TOLERANCE);
  const minWords = Math.round(learnerWordCount * LENGTH_FLOOR);
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const movable = weights.grammar + weights.vocabulary + weights.coherence;

  return `

SCORE RUNGS — "how to get +20 from here" (scoreRungs), mandatory:
Output EXACTLY TWO entries, rewriting the learner's OWN ${textLabel} twice. Do not compute or output any target score — the system assigns the score labels.
- Entry 1, level "repair": their answer with the mistakes fixed and nothing else. B1–B2.
- Entry 2, level "upgrade": your "repair" text, plus 2–3 deliberate upgrades on top. B2–C1.

THE EDIT BUDGET — this is the rule that matters most:
You are NOT writing a better answer. You are handing back THEIR answer with a small number of repairs, so a tired learner can see exactly what to do differently next time.
- Make AT MOST ${MAX_CHANGES_PER_RUNG} edits per rung, and EVERY single difference between their text and your rewrite must appear in that rung's \`changes\` list. If you cannot list an edit, do not make it.
- Any word, phrase or sentence that was already correct stays EXACTLY as they wrote it. Do not "improve" correct English. Do not swap a correct everyday word for a fancier synonym just to look advanced.
- Keep their sentence order, their sentence count and their voice. The learner must read it and think "that is my answer, fixed" — not "that is someone else's essay".

ABSOLUTE RULES — breaking any of these makes the rung useless:
- SAME LENGTH. Each rewrite must be between ${minWords} and ${maxWords} words (their answer is ${learnerWordCount} words). Never pad to reach the level, and never delete one of their points to tidy the answer up — repair it in place.
- SAME IDEAS. Use only what they actually wrote. Add no new fact, example, opinion, detail, descriptive noun, adjective of judgement or sentence. If they described two girls in a pool, do not invent why they are there and do not call the scene "heartwarming". If they wrote "the picture shows preparing food", do NOT expand it to "shows a family preparing food for the upcoming Christmas" — "a family" and "upcoming" are details they did not give. Fix HOW they said it, never WHAT they said.
- Change only grammar, word choice / collocation, punctuation and linking words. Those carry ${pct(movable)} of the score here; task relevancy (${pct(weights.taskRelevancy)}) is content-bound and cannot move without new ideas, so do not try.
- Realistic for a human under exam time pressure. No literary, formal-register or rare vocabulary — "purchase new attire", "beautifully adorned", "promises to be a truly memorable occasion" are all WRONG for this learner. Every upgrade must be a word or structure they could plausibly reuse next week under time pressure.

The two levels:
- "repair" (B1–B2): fix only what is WRONG — agreement, tense, articles, plurals, prepositions, spelling, punctuation, and any word that is simply the wrong word. Do NOT reach for advanced structures and do NOT upgrade vocabulary that is already correct. This level must feel achievable to a tired learner.
- "upgrade" (B2–C1): take your own "repair" text and add just 2–3 deliberate upgrades on top — ONE passive or relative/complex clause, ONE more precise collocation, ONE stronger linker. Three, not ten. Every other word stays identical to the "repair" text.

Per rung, list every edit you made (max ${MAX_CHANGES_PER_RUNG}):
- exactQuote: the changed wording, copied VERBATIM from THAT rung's rewritten text, contiguous, 1–8 words.
- original: the learner's own wording it replaced (empty string when a word was simply added).
- category: "grammar" | "vocabulary" | "coherence".
- noteTh: ONE short Thai line — what changed and why it scores. Plain language, no grammar jargon unless you name the rule simply. Example: "effort → afford: afford แปลว่ามีเงินพอจ่าย ส่วน effort คือความพยายาม คนละความหมายกัน".
- noteEn: the same in one short English line.
- headlineTh / headlineEn: ONE line per entry naming what that level demands of THIS learner, tied to what they actually did. Not generic advice, and never mention a score number.`;
}

/** JSON shape fragment to merge into the grader's requiredJsonShape. */
export function scoreRungJsonShape(): Record<string, unknown> {
  return {
    scoreRungs: [
      {
        level: '"repair" then "upgrade" — exactly these two entries, in this order',
        text: "string — their own answer rewritten at this level, same length, same ideas",
        headlineEn: "string",
        headlineTh: "string",
        changes: [
          {
            exactQuote: "string — verbatim contiguous substring of THIS entry's text",
            original: "string — the learner's original wording",
            category: "grammar | vocabulary | coherence",
            noteEn: "string — one short line",
            noteTh: "string — one short line",
          },
        ],
      },
    ],
  };
}

function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function normalizeCategory(v: unknown): ScoreRungChangeCategory {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "vocabulary" || s === "vocab") return "vocabulary";
  if (s === "coherence" || s === "linking" || s === "cohesion") return "coherence";
  return "grammar";
}

/**
 * Parse + hard-validate the grader's rungs against the FINAL score.
 *
 * The grader returns two entries keyed by LEVEL ("repair" / "upgrade"), not by
 * score — asking it to work out which rungs sit above its own total produced the
 * wrong pair often enough to leave learners with one rung or none. The server
 * owns that arithmetic instead, so the labels are always right by construction.
 *
 * Two further guards the prompt alone can't enforce:
 *  - Length: outside 0.8x–1.15x of the learner's answer, the rewrite has padded
 *    or deleted rather than repaired, so it teaches the wrong lesson.
 *  - Spans: a change whose quote isn't literally in the rung text is dropped, so
 *    a green highlight can never land on the wrong words.
 */
export function parseScoreRungLadder(
  raw: unknown,
  ctx: {
    attemptId: string;
    currentScore160: number;
    learnerWordCount: number;
  },
): ScoreRungLadder | null {
  if (ctx.learnerWordCount < MIN_WORDS_FOR_RUNGS) return null;
  const targets = nextScoreRungs(ctx.currentScore160);
  if (targets.length === 0) return null;

  const maxWords = Math.max(12, Math.round(ctx.learnerWordCount * LENGTH_TOLERANCE));
  const minWords = Math.round(ctx.learnerWordCount * LENGTH_FLOOR);
  const idPrefix = ctx.attemptId.slice(0, 6);
  const rungs: ScoreRungSample[] = [];
  const drop = (label: unknown, reason: string) =>
    console.warn(`[score-rungs] dropped ${String(label)}: ${reason}`);

  // Entries arrive in level order (repair, then upgrade). When only one rung is
  // available — a learner already above 130 — keep the "upgrade" one.
  const entries = asArr(raw).slice(0, 2);
  const offset = entries.length > targets.length ? entries.length - targets.length : 0;

  entries.forEach((item, entryIdx) => {
    const targetIdx = entryIdx - offset;
    if (targetIdx < 0) return; // no rung left to label this entry with
    const target = targets[targetIdx];
    if (target == null) return;
    const o = item as Record<string, unknown>;
    const rungIdx = entryIdx;

    const text = String(o?.text ?? "").replace(/\s+/g, " ").trim();
    if (!text) return;
    const wordCount = countRungWords(text);
    // Padded, or "improved" by deleting one of their points — either way it
    // stops being a repair of THEIR answer, so it teaches the wrong lesson.
    if (wordCount > maxWords) {
      drop(target, `${wordCount} words > budget ${maxWords}`);
      return;
    }
    if (wordCount < minWords) {
      drop(target, `${wordCount} words < floor ${minWords} (content was cut, not fixed)`);
      return;
    }

    const changes: ScoreRungChange[] = [];
    const taken: { start: number; end: number }[] = [];
    for (const c of asArr(o?.changes)) {
      if (changes.length >= MAX_CHANGES_PER_RUNG) break;
      const co = c as Record<string, unknown>;
      const span = findTextSpan(text, String(co?.exactQuote ?? "").trim());
      if (!span) continue;
      // No overlapping highlights — the renderer walks spans in order.
      if (taken.some((t) => span.start < t.end && span.end > t.start)) continue;
      const noteTh = String(co?.noteTh ?? "").trim();
      const noteEn = String(co?.noteEn ?? "").trim();
      if (!noteTh && !noteEn) continue;
      taken.push(span);
      changes.push({
        id: `sr-${idPrefix}-${rungIdx}-${changes.length}`,
        start: span.start,
        end: span.end,
        category: normalizeCategory(co?.category),
        original: String(co?.original ?? "").trim(),
        noteTh,
        noteEn,
      });
    }
    if (changes.length === 0) {
      // A rung whose edits can't be located in its own text can't be highlighted,
      // and an un-highlighted rewrite teaches nothing.
      drop(target, "no change quote resolved against the rung text");
      return;
    }

    changes.sort((a, b) => a.start - b.start);
    rungs.push({
      id: `sr-${idPrefix}-r${target}`,
      target160: target,
      bandLabel: bandLabel(target),
      text,
      wordCount,
      changes,
      headlineEn: String(o?.headlineEn ?? "").trim(),
      headlineTh: String(o?.headlineTh ?? "").trim(),
    });
  });

  if (rungs.length === 0) return null;
  rungs.sort((a, b) => a.target160 - b.target160);
  return {
    currentScore160: ctx.currentScore160,
    learnerWordCount: ctx.learnerWordCount,
    rungs,
  };
}
