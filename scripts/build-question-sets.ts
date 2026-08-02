/**
 * Generates the FIXED question set for every curriculum exercise.
 *
 *   npx tsx scripts/build-question-sets.ts
 *
 * Writes src/lib/course-plan/question-sets.ts.
 *
 * Nothing is randomised. Each exercise gets a specific, ordered list of item
 * ids taken from the content banks, so every learner at a given level sees the
 * same questions in the same order — which is what makes a score comparable
 * between two students and between two attempts by the same student.
 *
 * Selection is deterministic: filter the bank by task and tier, then take the
 * first N in file order. Re-running with unchanged banks produces an identical
 * file, so this is safe to commit and diff.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

import {
  EASY_TRACK,
  HARD_TRACK,
  MEDIUM_TRACK,
  type CurriculumBlock,
  type CurriculumExercise,
} from "../src/lib/course-plan/curriculum";

import { lessonRunnerRefFor } from "../src/lib/course-plan/exercise-content";
import { REWRITE_BANKS } from "../src/lib/course-plan/grammar-writing-bank";
import { SPEAK_PATTERN_ITEMS } from "../src/lib/course-plan/speak-pattern-bank";
import { DICTATION_LESSONS } from "../src/lib/dictation-lessons-data";
import { GRAMMAR_EXERCISES } from "../src/lib/grammar-fitb-data";
import { REALWORD_LESSON_ITEMS } from "../src/lib/realword-lesson-data";
import { READSPEAK_ITEMS } from "../src/lib/readspeak-lessons-data";
import { READWRITE_ITEMS } from "../src/lib/readwrite-lessons-data";
import { PHOTOWRITE_ITEMS } from "../src/lib/photo-write-lessons-data";
import { SPEAKPHOTO_ITEMS } from "../src/lib/speakphoto-lessons-data";

type Tier = "easy" | "medium" | "advanced";
type Item = { id: string; tier?: string };

/** Bank per task type. `null` where no bank exists yet. */
const BANKS: Record<string, Item[] | null> = {
  dictation: DICTATION_LESSONS as unknown as Item[],
  real_english_word: REALWORD_LESSON_ITEMS as unknown as Item[],
  read_then_speak: READSPEAK_ITEMS as unknown as Item[],
  read_and_write: READWRITE_ITEMS as unknown as Item[],
  write_about_photo: PHOTOWRITE_ITEMS as unknown as Item[],
  speak_about_photo: SPEAKPHOTO_ITEMS as unknown as Item[],
  reading_comprehension: null,
  vocabulary_reading: null,
  fill_in_blanks: GRAMMAR_EXERCISES as unknown as Item[],
  // Filled from the live content-bank snapshot in buildInteractiveRefs().
  interactive_speaking: null,
  interactive_conversation_mcq: null,
  dialogue_summary: null,
};

/** Curriculum block level -> bank tier. Banks call the top tier "advanced". */
const TIER_FOR_LEVEL: Record<string, Tier> = {
  easy: "easy",
  medium: "medium",
  hard: "advanced",
};

/**
 * Grammar exercises are topic-specific, and the bank's topics only cover some
 * of them. Unmapped keys are reported rather than filled with the wrong topic.
 */
const GRAMMAR_TOPIC: Record<string, string[]> = {
  "gr-present": ["present-tense"],
  "gr-transition": ["transitions"],
  "gr-tense": ["past-tense", "passive-voice", "perfect-tense"],
  // No bank topic yet: conjunctions, run-on sentences, relative clauses.
  "gr-conj": [],
  "gr-runon": [],
  "gr-relative": [],
};

/** How many items an exercise needs, read from its gate. */
function countFor(ex: CurriculumExercise): number {
  switch (ex.gate.kind) {
    case "pass_ratio":
      return ex.gate.count;
    case "best_of":
      return ex.gate.attempts;
    case "consecutive":
      return ex.gate.needed + (ex.gate.thenNeeded ?? 0);
    case "min_score_group":
      return 1; // one fixed prompt per exercise (e.g. "people"); retries reuse it
    case "min_score":
    case "min_score_all_topics":
      // "unlimited attempts, spread over days" — one fresh topic per spread day.
      return ex.spreadDays ?? 3;
    case "average_tracked":
      return 5;
  }
}

const gaps: string[] = [];
const sets: Record<string, string[]> = {};
/**
 * How far into each pool we have already drawn.
 *
 * Without this, every exercise sharing a task+tier took the SAME first N items
 * — so "write about people", "write about objects" and "write about places"
 * were literally the same three prompts.
 */
const cursor = new Map<string, number>();

function baseKey(key: string): string {
  return key.replace(/^m/, "").replace(/^h/, "");
}

/** Exercises with their own hand-authored bank, keyed by curriculum key. */
const AUTHORED: Record<string, string[]> = {
  ...Object.fromEntries(
    Object.entries(REWRITE_BANKS).map(([k, items]) => [k, items.map((i) => i.id)]),
  ),
  "gr-present": SPEAK_PATTERN_ITEMS.map((i) => i.id),
};

/**
 * The MEDIUM/HARD "real submission" exercises (write/speak about photo,
 * read-and-write, read-then-speak) draw on admin-curated content that lives in
 * Supabase, not a static in-repo bank — the photo table directly, and the
 * writing/speaking topic banks via the same global content-bank snapshot the
 * app syncs into every learner's browser. "Fixed" here means a fixed ROUND and
 * a fixed slot within it, not a UUID baked into this file, since that content
 * bank is meant to keep growing under admin control.
 */
function loadEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env.local — production refs stay empty and are reported as gaps */
  }
  return out;
}

type WritingTopicRow = { id: string; round?: number };
type SpeakingTopicRow = { id: string; round?: number; questions: { id: string }[] };

/** Sequential, non-repeating slots drawn from a fixed-order pool. */
function takeSeq<T>(pool: T[], cursorKey: string, n: number, cur: Map<string, number>): T[] {
  if (pool.length === 0) return [];
  const from = cur.get(cursorKey) ?? 0;
  const chosen = Array.from({ length: Math.min(n, pool.length) }, (_, k) => pool[(from + k) % pool.length]);
  cur.set(cursorKey, from + chosen.length);
  return chosen;
}

async function buildProductionRefs(): Promise<Record<string, string[]>> {
  const env = loadEnv();
  const refs: Record<string, string[]> = {};
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    gaps.push("production refs — no .env.local / service-role key; run locally to fill these");
    return refs;
  }
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const photoCursor = new Map<string, number>();

  // Photo bank: grouped into rounds of 10 by sort_order, same convention the
  // app already uses (photoSpeakRoundNumber). MEDIUM draws round 2, HARD round 3.
  const { data: photoItems, error: photoErr } = await supabase
    .from("photo_speak_items")
    .select("id, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (photoErr) {
    gaps.push(`photo_speak_items query failed: ${photoErr.message}`);
  } else {
    const items = photoItems ?? [];
    const round2 = items.filter((i) => i.sort_order >= 10 && i.sort_order < 20).map((i) => i.id);
    const round3 = items.filter((i) => i.sort_order >= 20 && i.sort_order < 30).map((i) => i.id);
    if (round2.length < 6) gaps.push(`photo round 2 has only ${round2.length} items, wanted 6`);
    if (round3.length < 6) gaps.push(`photo round 3 has only ${round3.length} items, wanted 6`);
    for (const [prefix, pool] of [["m", round2], ["h", round3]] as const) {
      const [people, objects, places] = takeSeq(pool, `photo:${prefix}`, 3, photoCursor);
      if (people) refs[`${prefix}wp-people`] = [people];
      if (objects) refs[`${prefix}wp-objects`] = [objects];
      if (places) refs[`${prefix}wp-places`] = [places];
      const [sPeople, sObjects, sPlaces] = takeSeq(pool, `photo:${prefix}`, 3, photoCursor);
      if (sPeople) refs[`${prefix}sp-people`] = [sPeople];
      if (sObjects) refs[`${prefix}sp-objects`] = [sObjects];
      if (sPlaces) refs[`${prefix}sp-places`] = [sPlaces];
    }
  }

  // Writing/speaking topic banks: the same global snapshot every learner's
  // browser syncs from (content_bank_snapshots, id="global").
  const { data: snapshot, error: snapErr } = await supabase
    .from("content_bank_snapshots")
    .select("payload")
    .eq("id", "global")
    .maybeSingle();
  if (snapErr) {
    gaps.push(`content_bank_snapshots query failed: ${snapErr.message}`);
  } else if (snapshot?.payload) {
    const payload = snapshot.payload as Record<string, string>;
    const writingTopics: WritingTopicRow[] = JSON.parse(payload["ep-writing-topics"] ?? "[]");
    const speakingTopics: SpeakingTopicRow[] = JSON.parse(payload["ep-speaking-topics"] ?? "[]");

    const writingRound = (r: number) => writingTopics.filter((t) => t.round === r).map((t) => t.id);
    const wEasy = writingRound(1);
    const wMedium = writingRound(2);
    const wHard = writingRound(3);
    if (wEasy.length < 3) gaps.push(`writing round 1 has only ${wEasy.length} topics, wanted 3`);
    if (wMedium.length < 3) gaps.push(`writing round 2 has only ${wMedium.length} topics, wanted 3`);
    if (wHard.length < 3) gaps.push(`writing round 3 has only ${wHard.length} topics, wanted 3`);
    const wCursor = new Map<string, number>();
    // Three separate one-topic exercises, so the planner spreads them over three
    // days (see the "write-topic" spreadGroup in curriculum.ts).
    for (const [prefix, pool, tag] of [
      ["wt", wEasy, "writing:e"],
      ["mwt", wMedium, "writing:m"],
      ["hwt", wHard, "writing:h"],
    ] as const) {
      takeSeq(pool, tag, 3, wCursor).forEach((ref, i) => {
        refs[`${prefix}-real${i + 1}`] = [ref];
      });
    }

    const speakingPairs = (r: number) =>
      speakingTopics
        .filter((t) => t.round === r)
        .flatMap((t) => t.questions.map((q) => `${t.id}::${q.id}::${r}`));
    const sEasy = speakingPairs(1);
    const sMedium = speakingPairs(3);
    const sHard = speakingPairs(5);
    if (sEasy.length < 3) gaps.push(`speaking round 1 has only ${sEasy.length} question pairs, wanted 3`);
    if (sMedium.length < 3) gaps.push(`speaking round 3 has only ${sMedium.length} question pairs, wanted 3`);
    if (sHard.length < 3) gaps.push(`speaking round 5 has only ${sHard.length} question pairs, wanted 3`);
    const sCursor = new Map<string, number>();
    // The three un-guided speaking runs are separate exercises, one question
    // each, so the planner can put them on three different days (see the
    // "speak-topic" spreadGroup in curriculum.ts) instead of stacking them.
    for (const [prefix, pool, tag] of [
      ["st", sEasy, "speaking:e"],
      ["mst", sMedium, "speaking:m"],
      ["hst", sHard, "speaking:h"],
    ] as const) {
      const picked = takeSeq(pool, tag, 3, sCursor);
      picked.forEach((ref, i) => {
        refs[`${prefix}-real${i + 1}`] = [ref];
      });
    }
  }

  return refs;
}

/**
 * Fixed interactive speaking / conversation / dialogue-summary slots drawn
 * from the live content-bank snapshot. Conversation currently only has the
 * "easy" difficulty uploaded, so MEDIUM/HARD escalate by round instead.
 *
 * Ref shapes:
 *   interactive_speaking → scenario id
 *   interactive_conversation_mcq → "round:difficulty:setNumber"
 *   dialogue_summary → exam id (ds-r{n}-{diff}-s{NN})
 */
async function buildInteractiveRefs(): Promise<Record<string, string[]>> {
  const env = loadEnv();
  const refs: Record<string, string[]> = {};
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    gaps.push("interactive refs — no .env.local / service-role key; run locally to fill these");
    return refs;
  }
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data: snapshot, error: snapErr } = await supabase
    .from("content_bank_snapshots")
    .select("payload")
    .eq("id", "global")
    .maybeSingle();
  if (snapErr || !snapshot?.payload) {
    gaps.push(
      `interactive refs — content_bank_snapshots failed: ${snapErr?.message ?? "empty"}`,
    );
    return refs;
  }
  const payload = snapshot.payload as Record<string, string>;

  // --- Interactive speaking: 4 fixed scenarios per level (spreadDays: 4) ---
  type IsScenario = { id: string };
  let scenarios: IsScenario[] = [];
  try {
    scenarios = JSON.parse(payload["ep-interactive-speaking-scenarios-v1"] ?? "[]") as IsScenario[];
  } catch {
    scenarios = [];
  }
  const isIds = scenarios.map((s) => s.id).filter(Boolean);
  // Skip the demo scenario when we have enough real ones.
  const isPool = isIds.filter((id) => id !== "is-demo-first-week");
  const isSource = isPool.length >= 4 ? isPool : isIds;
  if (isSource.length < 4) {
    gaps.push(`interactive speaking — only ${isSource.length} scenarios in bank, wanted ≥4`);
  } else {
    const isCursor = new Map<string, number>();
    refs["is-real"] = takeSeq(isSource, "is", 4, isCursor);
    refs["mis-real"] = takeSeq(isSource, "is", 4, isCursor);
    refs["his-real"] = takeSeq(isSource, "is", 4, isCursor);
  }

  // --- Interactive conversation: 3 fixed sets per level (best_of: 3) ---
  // Bank shape: { [round]: { [difficulty]: { [slot]: exam } } } or arrays.
  type ConvExam = { id?: string; setNumber?: number; difficulty?: string };
  type ConvBank = Record<string, Record<string, Record<string, ConvExam> | ConvExam[]>>;
  let convBank: ConvBank = {};
  try {
    convBank = JSON.parse(payload["ep-conversation-bank-v2"] ?? "{}") as ConvBank;
  } catch {
    convBank = {};
  }
  function convRefs(round: number, difficulty: string, setNumbers: number[]): string[] {
    const slot = convBank[String(round)]?.[difficulty];
    if (!slot) return [];
    const exams = Array.isArray(slot) ? slot : Object.values(slot);
    const bySet = new Map(
      exams
        .filter((e) => e && typeof e.setNumber === "number")
        .map((e) => [e.setNumber as number, e]),
    );
    return setNumbers
      .filter((n) => bySet.has(n))
      .map((n) => `${round}:${difficulty}:${n}`);
  }
  // Only "easy" difficulty is populated today — escalate by round.
  const icEasy = convRefs(1, "easy", [1, 2, 3]);
  const icMed = convRefs(3, "easy", [25, 26, 27]);
  const icHard = convRefs(5, "easy", [34, 35, 36]);
  if (icEasy.length === 3) refs["ic-set"] = icEasy;
  else gaps.push(`ic-set — wanted 3, got ${icEasy.length} from R1 easy`);
  if (icMed.length === 3) refs["mic-set"] = icMed;
  else gaps.push(`mic-set — wanted 3, got ${icMed.length} from R3 easy`);
  if (icHard.length === 3) refs["hic-set"] = icHard;
  else gaps.push(`hic-set — wanted 3, got ${icHard.length} from R5 easy`);

  // --- Dialogue summary: 3 fixed topics per level ---
  type DsExam = { id?: string; setNumber?: number };
  type DsBank = Record<string, Record<string, Record<string, DsExam> | DsExam[]>>;
  let dsBank: DsBank = {};
  try {
    dsBank = JSON.parse(payload["ep-dialogue-summary-bank-v1"] ?? "{}") as DsBank;
  } catch {
    dsBank = {};
  }
  function dsRefs(round: number, difficulty: string, setNumbers: number[]): string[] {
    const slot = dsBank[String(round)]?.[difficulty];
    if (!slot) return [];
    const exams = Array.isArray(slot) ? slot : Object.values(slot);
    const bySet = new Map(
      exams
        .filter((e) => e && typeof e.setNumber === "number" && typeof e.id === "string")
        .map((e) => [e.setNumber as number, e.id as string]),
    );
    return setNumbers.map((n) => bySet.get(n)).filter((id): id is string => Boolean(id));
  }
  const dsEasy = dsRefs(1, "easy", [1, 2, 3]);
  const dsMed = dsRefs(1, "medium", [11, 12, 13]);
  const dsHard = dsRefs(1, "hard", [16, 17, 18]);
  if (dsEasy.length === 3) refs["ds-set"] = dsEasy;
  else gaps.push(`ds-set — wanted 3, got ${dsEasy.length}`);
  if (dsMed.length === 3) refs["mds-set"] = dsMed;
  else gaps.push(`mds-set — wanted 3, got ${dsMed.length}`);
  if (dsHard.length === 3) refs["hds-set"] = dsHard;
  else gaps.push(`hds-set — wanted 3, got ${dsHard.length}`);

  return refs;
}

/**
 * Fixed reading + vocab exam slots (right/wrong scoring, no AI).
 *
 * Ref shapes:
 *   reading_comprehension → "round:difficulty:setNumber:examNumber"
 *   vocabulary_reading    → "round:setNumber:level:passageNumber"
 */
async function buildComprehensionRefs(): Promise<Record<string, string[]>> {
  const env = loadEnv();
  const refs: Record<string, string[]> = {};
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    gaps.push("comprehension refs — no .env.local / service-role key; run locally to fill these");
    return refs;
  }
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data: snapshot, error: snapErr } = await supabase
    .from("content_bank_snapshots")
    .select("payload")
    .eq("id", "global")
    .maybeSingle();
  if (snapErr || !snapshot?.payload) {
    gaps.push(
      `comprehension refs — content_bank_snapshots failed: ${snapErr?.message ?? "empty"}`,
    );
    return refs;
  }
  const payload = snapshot.payload as Record<string, string>;

  // --- Reading: 5 fixed exams per level (average_tracked → count 5) ---
  type ReadingSet = { setNumber?: number; exams?: unknown[] };
  type ReadingBank = Record<string, Record<string, ReadingSet[] | Record<string, ReadingSet>>>;
  let readingBank: ReadingBank = {};
  try {
    readingBank = JSON.parse(payload["ep-reading-sets"] ?? "{}") as ReadingBank;
  } catch {
    readingBank = {};
  }
  function readingRefs(
    round: number,
    difficulty: string,
    setNumber: number,
    examNumbers: number[],
  ): string[] {
    const slot = readingBank[String(round)]?.[difficulty];
    if (!slot) return [];
    const sets = Array.isArray(slot) ? slot : Object.values(slot);
    const found = sets.find((s) => s && s.setNumber === setNumber);
    const examCount = found?.exams?.length ?? 0;
    return examNumbers
      .filter((n) => n >= 1 && n <= examCount)
      .map((n) => `${round}:${difficulty}:${setNumber}:${n}`);
  }
  // Mix within each track (5 slots = average_tracked count):
  //   EASY   → all easy
  //   MEDIUM → 2 easy + 3 medium
  //   HARD   → 2 medium + 3 hard
  const rsEasy = readingRefs(1, "easy", 1, [1, 2, 3, 4, 5]);
  const rsMed = [
    ...readingRefs(1, "easy", 1, [1, 2]),
    ...readingRefs(1, "medium", 1, [1, 2, 3]),
  ];
  const rsHard = [
    ...readingRefs(1, "medium", 1, [1, 2]),
    ...readingRefs(1, "hard", 1, [1, 2, 3]),
  ];
  if (rsEasy.length === 5) refs["rs-exam"] = rsEasy;
  else gaps.push(`rs-exam — wanted 5, got ${rsEasy.length}`);
  if (rsMed.length === 5) refs["mrs-exam"] = rsMed;
  else gaps.push(`mrs-exam — wanted 5 (2 easy + 3 medium), got ${rsMed.length}`);
  if (rsHard.length === 5) refs["hrs-exam"] = rsHard;
  else gaps.push(`hrs-exam — wanted 5 (2 medium + 3 hard), got ${rsHard.length}`);

  // --- Vocab: 5 fixed passages per level from R1 set 1 ---
  type VocabPassage = { passageNumber?: number; contentLevel?: string };
  type VocabSet = { setNumber?: number; passages?: VocabPassage[] };
  type VocabBank = Record<string, VocabSet[] | Record<string, VocabSet>>;
  let vocabBank: VocabBank = {};
  try {
    vocabBank = JSON.parse(payload["ep-vocab-sets"] ?? "{}") as VocabBank;
  } catch {
    vocabBank = {};
  }
  function vocabRefs(
    round: number,
    setNumber: number,
    level: string,
    passageNumbers: number[],
  ): string[] {
    const slot = vocabBank[String(round)];
    if (!slot) return [];
    const sets = Array.isArray(slot) ? slot : Object.values(slot);
    const found = sets.find((s) => s && s.setNumber === setNumber);
    if (!found?.passages) return [];
    const byLevel = found.passages.filter((p) => p.contentLevel === level);
    const available = new Set(
      byLevel.map((p) => p.passageNumber).filter((n): n is number => typeof n === "number"),
    );
    return passageNumbers
      .filter((n) => available.has(n))
      .map((n) => `${round}:${setNumber}:${level}:${n}`);
  }
  // Same mix as reading: EASY all easy · MEDIUM 2e+3m · HARD 2m+3h
  const rvEasy = vocabRefs(1, 1, "easy", [1, 2, 3, 4, 5]);
  const rvMed = [
    ...vocabRefs(1, 1, "easy", [1, 2]),
    ...vocabRefs(1, 1, "medium", [1, 2, 3]),
  ];
  const rvHard = [
    ...vocabRefs(1, 1, "medium", [1, 2]),
    ...vocabRefs(1, 1, "hard", [1, 2, 3]),
  ];
  if (rvEasy.length === 5) refs["rv-exam"] = rvEasy;
  else gaps.push(`rv-exam — wanted 5, got ${rvEasy.length}`);
  if (rvMed.length === 5) refs["mrv-exam"] = rvMed;
  else gaps.push(`mrv-exam — wanted 5 (2 easy + 3 medium), got ${rvMed.length}`);
  if (rvHard.length === 5) refs["hrv-exam"] = rvHard;
  else gaps.push(`hrv-exam — wanted 5 (2 medium + 3 hard), got ${rvHard.length}`);

  return refs;
}

function pick(block: CurriculumBlock, ex: CurriculumExercise): string[] {
  // MEDIUM/HARD reuse the same drills under an m-/h- prefix.
  const authored = AUTHORED[ex.key] ?? AUTHORED[baseKey(ex.key)];
  if (authored) return authored;

  const bank = BANKS[ex.taskType];
  if (bank === null) {
    gaps.push(`${ex.key} (${ex.taskType}) — no item bank; runs live`);
    return [];
  }
  if (!bank) {
    gaps.push(`${ex.key} (${ex.taskType}) — UNKNOWN task type`);
    return [];
  }

  const want = countFor(ex);
  const tier = TIER_FOR_LEVEL[block.level] ?? "easy";

  let pool = bank as (Item & { topic?: string; difficulty?: string })[];

  if (ex.taskType === "fill_in_blanks") {
    // Grammar is selected by topic first, then difficulty.
    const topics = GRAMMAR_TOPIC[baseKey(ex.key)] ?? GRAMMAR_TOPIC[ex.key];
    if (topics && topics.length === 0) {
      gaps.push(`${ex.key} — "${ex.titleTh}" has no matching grammar topic in the bank`);
      return [];
    }
    const diff = tier === "advanced" ? "hard" : tier;
    pool = pool.filter(
      (i) => (!topics || topics.includes(i.topic ?? "")) && i.difficulty === diff,
    );
  } else {
    const tiered = pool.filter((i) => i.tier === tier);
    // Some banks have no tier field at all (campus vocab) — use them whole.
    pool = tiered.length > 0 ? tiered : pool;
  }

  const poolKey = `${ex.taskType}:${block.level}:${
    ex.taskType === "fill_in_blanks" ? baseKey(ex.key) : ""
  }`;
  const from = cursor.get(poolKey) ?? 0;
  // Wrap rather than run dry when a bank is smaller than the total demand.
  const chosen =
    pool.length === 0
      ? []
      : Array.from({ length: Math.min(want, pool.length) }, (_, k) =>
          pool[(from + k) % pool.length].id,
        );
  cursor.set(poolKey, from + chosen.length);

  if (chosen.length < want) {
    gaps.push(
      `${ex.key} — wanted ${want}, bank only had ${chosen.length} at tier "${tier}"`,
    );
  }
  return chosen;
}

async function main() {
  Object.assign(AUTHORED, await buildProductionRefs());
  Object.assign(AUTHORED, await buildInteractiveRefs());
  Object.assign(AUTHORED, await buildComprehensionRefs());

  for (const track of [EASY_TRACK, MEDIUM_TRACK, HARD_TRACK]) {
    for (const block of track) {
      for (const ex of block.exercises) {
        if (ex.isLesson) continue; // teaching steps, not scored items
        if (lessonRunnerRefFor(ex.key)) continue; // resolved by {tier, unit}, not a fixed item list
        sets[ex.key] = pick(block, ex);
      }
    }
  }

  const filled = Object.values(sets).filter((v) => v.length > 0).length;
  const empty = Object.entries(sets).filter(([, v]) => v.length === 0);

  const out = `// GENERATED by scripts/build-question-sets.ts — do not edit by hand.
// Re-run that script after changing the curriculum or the content banks.
//
// Fixed question sets: every exercise maps to specific item ids, in order.
// Nothing is randomised, so two learners at the same level answer the same
// questions and their scores mean the same thing.

/** Exercise key -> the exact item ids that exercise runs, in order. */
export const QUESTION_SETS: Record<string, string[]> = ${JSON.stringify(sets, null, 2)};

/** Exercises with no items yet — see the build log for why. */
export const UNFILLED_EXERCISES: string[] = ${JSON.stringify(
    empty.map(([k]) => k),
    null,
    2,
  )};

export function questionsFor(exerciseKey: string): string[] {
  return QUESTION_SETS[exerciseKey] ?? [];
}
`;

  writeFileSync("src/lib/course-plan/question-sets.ts", out);

  console.log("");
  console.log(`  exercises with a fixed set : ${filled}`);
  console.log(`  exercises still empty      : ${empty.length}`);
  console.log("");
  if (gaps.length) {
    console.log("  Gaps that need content or a decision:");
    for (const g of [...new Set(gaps)]) console.log(`    · ${g}`);
    console.log("");
  }
  console.log("  wrote src/lib/course-plan/question-sets.ts");
  console.log("");
}

main();
