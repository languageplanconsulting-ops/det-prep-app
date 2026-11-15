/**
 * Adaptive dictation for the fixed 20-step mock.
 *
 * Every mock has 4 dictation steps (3, 16, 17, 18). Instead of 4 fixed
 * sentences, each mock carries a small bank of sentences at four levels and the
 * learner climbs or drops one level per answer:
 *
 *   start at 110 → accuracy ≥ 85% moves UP one level, < 85% moves DOWN one
 *   Easy ↔ 110 ↔ 130 ↔ 150   (Easy stays Easy on a miss, 150 stays 150 on a pass)
 *
 * Item score = accuracy × the level's cap (Easy 80 · 110 · 130 · 150), so 85%
 * on a 150 sentence is worth 127.5 and a perfect Easy sentence is worth 80.
 *
 * The bank lives on the set's FIRST dictation item as `content.adaptive_dictation`
 * (no schema change). The server is the only place a sentence is chosen: the
 * session GET injects the chosen sentence into each dictation step it can
 * resolve, and submit-step re-resolves the same sentence to score against —
 * the client's copy is never trusted. Pure module (no server-only), shared by
 * routes and tests.
 */

import { dictationScoreFromDiff, diffDictationChars } from "@/lib/dictation-diff";

export type DictationLevel = "easy" | "110" | "130" | "150";

export const DICTATION_LEVEL_ORDER: readonly DictationLevel[] = ["easy", "110", "130", "150"];

export const DICTATION_LEVEL_CAP: Record<DictationLevel, number> = {
  easy: 80,
  "110": 110,
  "130": 130,
  "150": 150,
};

export const DICTATION_START_LEVEL: DictationLevel = "110";

/** Accuracy (0–1) needed to move up a level. Below this the next item drops a level. */
export const DICTATION_PASS_ACCURACY = 0.85;

export const ADAPTIVE_DICTATION_KEY = "adaptive_dictation";

export type AdaptiveDictationVariant = { sentence: string; audio_url?: string };

export type AdaptiveDictationBank = {
  version: 1;
  levels: Record<DictationLevel, AdaptiveDictationVariant[]>;
};

/** Stored on the dictation response entry so later steps (and the report) know what was served. */
export type AdaptiveDictationMeta = {
  level: DictationLevel;
  variant_index: number;
  /** 0–1 character accuracy against `sentence`. */
  accuracy: number;
  sentence: string;
};

type ItemLike = {
  step_index: number;
  task_type: string;
  content?: Record<string, unknown> | null;
  correct_answer?: unknown;
};

type ResponseLike = { step_index?: number; task_type?: string; adaptive?: unknown };

function isLevel(v: unknown): v is DictationLevel {
  return typeof v === "string" && (DICTATION_LEVEL_ORDER as readonly string[]).includes(v);
}

function isMeta(v: unknown): v is AdaptiveDictationMeta {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return isLevel(o.level) && Number.isFinite(Number(o.accuracy));
}

function parseBank(raw: unknown): AdaptiveDictationBank | null {
  if (!raw || typeof raw !== "object") return null;
  const levels = (raw as { levels?: unknown }).levels;
  if (!levels || typeof levels !== "object") return null;
  const out = {} as Record<DictationLevel, AdaptiveDictationVariant[]>;
  for (const lv of DICTATION_LEVEL_ORDER) {
    const arr = (levels as Record<string, unknown>)[lv];
    if (!Array.isArray(arr)) return null;
    const variants = arr
      .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : null))
      .filter((x): x is Record<string, unknown> => !!x && typeof x.sentence === "string" && x.sentence.trim() !== "")
      .map((x) => ({
        sentence: String(x.sentence).trim(),
        ...(typeof x.audio_url === "string" && x.audio_url ? { audio_url: x.audio_url } : {}),
      }));
    // Every level must be usable, or the ladder could strand a learner.
    if (variants.length === 0) return null;
    out[lv] = variants;
  }
  return { version: 1, levels: out };
}

function dictationItems<T extends ItemLike>(items: readonly T[]): T[] {
  return items.filter((i) => i.task_type === "dictation").sort((a, b) => a.step_index - b.step_index);
}

/** The set's adaptive bank, or null when this set is still a plain fixed mock. */
export function readAdaptiveDictationBank(items: readonly ItemLike[]): AdaptiveDictationBank | null {
  for (const item of dictationItems(items)) {
    const bank = parseBank(item.content?.[ADAPTIVE_DICTATION_KEY]);
    if (bank) return bank;
  }
  return null;
}

export function nextDictationLevel(level: DictationLevel, accuracy: number): DictationLevel {
  const i = DICTATION_LEVEL_ORDER.indexOf(level);
  const step = accuracy >= DICTATION_PASS_ACCURACY ? 1 : -1;
  const j = Math.max(0, Math.min(DICTATION_LEVEL_ORDER.length - 1, i + step));
  return DICTATION_LEVEL_ORDER[j]!;
}

export type DictationResolution =
  /** Set has no bank, or this session started before the bank existed: serve the fixed item. */
  | { kind: "fixed" }
  /** An earlier dictation step isn't answered yet, so the level isn't known. */
  | { kind: "pending" }
  | {
      kind: "adaptive";
      level: DictationLevel;
      variantIndex: number;
      variant: AdaptiveDictationVariant;
    };

/**
 * Which sentence a dictation step serves, from the answers to the dictation
 * steps before it. Deterministic, so the GET that shows the sentence and the
 * submit that scores it always agree.
 *
 * `allowGaps`: admin single-step preview / retakes may lack earlier answers —
 * skip them instead of waiting.
 */
export function resolveDictationStep(params: {
  items: readonly ItemLike[];
  responses: readonly ResponseLike[];
  stepIndex: number;
  allowGaps?: boolean;
}): DictationResolution {
  const bank = readAdaptiveDictationBank(params.items);
  if (!bank) return { kind: "fixed" };

  const used: Record<DictationLevel, number> = { easy: 0, "110": 0, "130": 0, "150": 0 };
  let level: DictationLevel = DICTATION_START_LEVEL;

  for (const prior of dictationItems(params.items)) {
    if (prior.step_index >= params.stepIndex) break;
    const resp = params.responses.find((r) => Number(r.step_index) === prior.step_index);
    if (!resp) {
      if (params.allowGaps) continue;
      return { kind: "pending" };
    }
    // Answered before this set got its bank (a run in flight at deploy time):
    // keep the whole run on the fixed sentences so it stays self-consistent.
    if (!isMeta(resp.adaptive)) return { kind: "fixed" };
    used[resp.adaptive.level] += 1;
    level = nextDictationLevel(resp.adaptive.level, Number(resp.adaptive.accuracy));
  }

  const variants = bank.levels[level];
  const variantIndex = used[level] % variants.length;
  return { kind: "adaptive", level, variantIndex, variant: variants[variantIndex]! };
}

export function adaptiveDictationScore(level: DictationLevel, accuracy: number): number {
  const a = Math.max(0, Math.min(1, accuracy));
  return Math.round(a * DICTATION_LEVEL_CAP[level] * 100) / 100;
}

/** Character accuracy (0–1), same alignment as practice dictation. */
export function dictationAccuracy(reference: string, typed: string): number {
  const { correctChars, totalChars } = diffDictationChars(reference, typed);
  return dictationScoreFromDiff(correctChars, totalChars, 1);
}

/** Pull the typed text out of whatever answer shape the dictation step sent. */
export function dictationTypedText(answer: unknown): string {
  if (typeof answer === "string") return answer;
  if (answer && typeof answer === "object") {
    const o = answer as Record<string, unknown>;
    if (typeof o.answer === "string") return o.answer;
    if (typeof o.text === "string") return o.text;
  }
  return "";
}

/**
 * Item as the learner should see it: the bank removed (it holds every level's
 * answer and audio), and the chosen sentence injected. A step whose level isn't
 * known yet is marked `adaptive_pending` with no sentence or audio, so the
 * client reloads before playing it instead of playing the wrong sentence.
 */
export function presentDictationItem<T extends ItemLike>(item: T, resolution: DictationResolution): T {
  const content = { ...(item.content ?? {}) };
  delete content[ADAPTIVE_DICTATION_KEY];
  if (resolution.kind === "fixed") return { ...item, content };
  if (resolution.kind === "pending") {
    delete content.reference_sentence;
    delete content.audio_url;
    return { ...item, content: { ...content, adaptive_pending: true }, correct_answer: null };
  }
  const { variant, level } = resolution;
  const next: Record<string, unknown> = {
    ...content,
    reference_sentence: variant.sentence,
    adaptive_level: level,
  };
  if (variant.audio_url) next.audio_url = variant.audio_url;
  else delete next.audio_url; // client falls back to TTS of reference_sentence
  return { ...item, content: next, correct_answer: null };
}

/** Apply `presentDictationItem` to every dictation step of a set for one session. */
export function presentSessionItems<T extends ItemLike>(
  items: readonly T[],
  responses: readonly ResponseLike[],
  allowGaps = false,
): T[] {
  return items.map((item) =>
    item.task_type === "dictation"
      ? presentDictationItem(
          item,
          resolveDictationStep({ items, responses, stepIndex: item.step_index, allowGaps }),
        )
      : item,
  );
}

/** Strip the bank from items for any read path that doesn't need it (reports, admin lists). */
export function stripAdaptiveBank<T extends ItemLike>(items: readonly T[]): T[] {
  return items.map((item) => {
    if (item.task_type !== "dictation" || !item.content?.[ADAPTIVE_DICTATION_KEY]) return item;
    const content = { ...item.content };
    delete content[ADAPTIVE_DICTATION_KEY];
    return { ...item, content };
  });
}
