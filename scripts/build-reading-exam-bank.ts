/**
 * Tops the reading-exam bank up to a target count per round and difficulty.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/build-reading-exam-bank.ts --dry
 *   npx tsx --tsconfig tsconfig.json scripts/build-reading-exam-bank.ts --preview=easy:1
 *   npx tsx --tsconfig tsconfig.json scripts/build-reading-exam-bank.ts --no-upload [--only=5:hard]
 *   npx tsx --tsconfig tsconfig.json scripts/build-reading-exam-bank.ts --upload-only
 *
 * One exam = one passage answered four ways (missing paragraph, find the information, best title,
 * main idea), which is the shape `readingExamToIrSet` maps onto the real Interactive Reading screen.
 * Authoring rules come from docs/reading/det-interactive-reading-item-spec.md and the distractor
 * formula in docs/reading-vocabulary/question-spec.md.
 *
 * Everything generated is validated before it is kept — a passage whose find-the-information answer
 * is not a verbatim span of its own passage would break the highlight step, so it is regenerated
 * rather than shipped. Correct answers are spread across A–D on the way in.
 *
 * No highlighted vocabulary word repeats anywhere in the bank: every word already used (and every
 * word accepted during the run) is matched by root form, so "dying out" counts as "die out".
 *
 * Short sets (fewer than EXAMS_PER_SET exams) are topped up first; the rest become new sets.
 * Written by Claude (claude-opus-5-5) with structured JSON output.
 */
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import type { ReadingExamUnit, ReadingSet } from "../src/types/reading";

const TARGET_PER_DIFFICULTY = 30;
// round 5 was retired for reading (hidden in the apps), so the generator and uploader skip it
const ROUNDS = ["1", "2", "3", "4"] as const;
const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const EXAMS_PER_SET = 5;
const BATCH = 5;
const CONCURRENCY = 4;
const MODEL = "claude-opus-5-5";

const OUT_DIR = "generated-reading-exams";
const DRY = process.argv.includes("--dry");
/** `--preview=easy:3` generates a few items and prints them WITHOUT touching the bank. */
const preview = process.argv.find((a) => a.startsWith("--preview="))?.slice(10);
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
/** Skip generation and upload whatever a previous run already saved under generated-reading-exams/. */
const UPLOAD_ONLY = process.argv.includes("--upload-only");
/** Generate and save to generated-reading-exams/ but never write to the live content bank. */
const NO_UPLOAD = process.argv.includes("--no-upload");
/** `--add=2:medium:path.json` validates hand-written exams and appends the valid ones to the slot. */
const add = process.argv.find((a) => a.startsWith("--add="))?.slice(6);
/** Print every vocabulary item already used (bank + saved files), for writing new exams by hand. */
const listVocab = process.argv.includes("--list-vocab");

type Difficulty = (typeof DIFFICULTIES)[number];

/**
 * Real DET Interactive Reading passages run ~100–270 words (docs/reading/det-interactive-reading-
 * item-spec.md). The original bank sat at the short end (65–150); new passages aim for the middle
 * of the real range so a set feels like the 7–8 minute section it practises.
 */
const SHAPE: Record<Difficulty, { cefr: string; words: string; tone: string }> = {
  easy: {
    cefr: "B1",
    words: "paragraph 1 and paragraph 3 each 40–55 words, the missing middle paragraph 30–45 words (about 120 words in all)",
    tone: "an everyday topic (habits, hobbies, food, local services, animals, health). Common vocabulary, mostly simple and compound sentences.",
  },
  medium: {
    cefr: "B2",
    words: "paragraph 1 and paragraph 3 each 55–70 words, the missing middle paragraph 40–55 words (about 170 words in all)",
    tone: "an informational or lightly academic topic (work, technology, cities, education, environment). Some abstract nouns, cause-and-effect linking, one or two subordinate clauses per sentence.",
  },
  hard: {
    cefr: "C1",
    words: "paragraph 1 and paragraph 3 each 70–85 words, the missing middle paragraph 50–65 words (about 220 words in all)",
    tone: "an argument with two sides or a research finding (policy, science, economics, ethics). Precise academic vocabulary, hedged claims, nominalisation.",
  },
};

/** Visible words (paragraph 1 + paragraph 3) the validator accepts per level. */
const VISIBLE_BAND: Record<Difficulty, [number, number]> = {
  easy: [70, 120],
  medium: [100, 150],
  hard: [130, 185],
};

/** Official DET instructions (englishtest.duolingo.com Help Center, Interactive Reading pages). */
const STEM = {
  missingSentence: "Select the best sentence to fill in the blank.",
  bestTitle: "Select the best title for the passage.",
  mainIdea: "Select the idea that is expressed in the passage.",
} as const;

/**
 * Angle pools. A passage about "beekeeping" reads like filler and collides with the next one about
 * beekeeping; a passage about a hive-monitoring technique used in northern India does not. Each
 * request is handed concrete place + field pairs so the batch spreads instead of clustering on the
 * same few Anglophone defaults.
 */
const PLACES = [
  "northern India", "rural Thailand", "Jakarta", "Kenya's Rift Valley", "coastal Vietnam", "Mexico City",
  "the Peruvian Andes", "Iceland", "rural Japan", "Morocco", "the Brazilian Amazon", "South Korea",
  "Finland's far north", "Egypt's Nile delta", "New Zealand", "Bangladesh", "Poland", "Ethiopia",
  "the Scottish Highlands", "Taiwan", "Senegal", "Chile's Atacama", "Nepal", "the Philippines",
  "Portugal", "Uzbekistan", "Ghana", "Sri Lanka", "Canada's prairies", "Sicily",
];
const FIELDS = [
  "a farming or fishing technique", "a public-health programme", "a transport or infrastructure decision",
  "a school or literacy initiative", "an archaeological or historical find", "a conservation project",
  "a small-business or market trend", "a water or energy scheme", "a food or cooking tradition changing",
  "a wildlife behaviour study", "a materials or engineering advance", "a labour or migration shift",
  "a weather or climate observation", "a sport or training method", "an art, craft or music revival",
  "a waste or recycling scheme", "a housing or urban-design experiment", "a medical device or treatment trial",
];

const PROMPT = (d: Difficulty, n: number, avoidTopics: string[], avoidVocab: string[], angles: string[]) => `
You write reading items for a Duolingo English Test preparation app used by Thai learners.

Produce ${n} INDEPENDENT reading exams at CEFR ${SHAPE[d].cefr}. Each is one passage answered four ways.

PASSAGE
- Three paragraphs. You write paragraph 1 and paragraph 3; paragraph 2 is REMOVED and becomes the
  missing-paragraph question, so it must be a real bridge: paragraph 3 must not make sense without it.
- Length: ${SHAPE[d].words}.
- Subject: ${SHAPE[d].tone}
- SPECIFIC, never generic. Write about one case: a named place, a named practice, a particular study,
  a stated period. "Beekeeping" is a bad topic; "a hive-monitoring method beekeepers adopted in
  northern India after 2019" is a good one. Invented specifics are fine, but they must be concrete
  and plausible — no real named people or organisations.
- Use one of these angles per exam, in order, one exam each:
${angles.map((a, i) => `  ${i + 1}. ${a}`).join("\n")}
- Neutral, factual, non-fiction. No dialogue, no second person, no lists, no headings, no markdown.
- Do NOT reuse any of these topics: ${avoidTopics.slice(-150).join("; ")}

THE FOUR QUESTIONS (every one has EXACTLY 4 options)
1. missingSentence — question is exactly "${STEM.missingSentence}". correctAnswer is the removed
   paragraph 2, verbatim. Distractors: one that is on-topic but leaves paragraph 3 without cause; one
   true-sounding but irrelevant detail; one that contradicts paragraph 3.
2. informationLocation — question is a specific question about the passage (e.g. "Which part of the
   passage explains why ...?"). correctAnswer MUST be an EXACT substring copied character-for-character
   from paragraph 1 or paragraph 3 (no ellipsis, no rewording, no trailing full stop unless it is in the
   passage), 8–16 words long. The three distractors must ALSO be exact substrings of paragraph 1 or 3,
   each answering a DIFFERENT question than the one asked. All four spans must be within 4 words of each
   other in length, and all four must be the same KIND of span — either all four are clause fragments
   or all four are whole sentences. Never let the key be the only complete sentence.
3. bestTitle — question is exactly "${STEM.bestTitle}". 3–6 words, Title Case. Distractors: one too
   narrow, one too broad, one that picks up a word from the passage but misses its point.
4. mainIdea — question is exactly "${STEM.mainIdea}". The key is an idea the passage explicitly states
   (often its topic sentence, reworded). Distractors: one that contradicts it, one that overreaches (a
   generalisation the passage never makes), one keyword-bait sentence that recycles a salient noun but
   says something the passage does not.

LENGTH — a learner must not be able to pick the key by shape alone:
- Within one question, the four options must be within 20% of each other in length.
- The correct answer must NEVER be the longest option. Aim for it to be mid-length.

Every question also needs "explanationThai": ONE concrete Thai sentence saying why the key is right
and what the traps do. Thai script only, no English words except quoted words from the passage.

VOCABULARY — give exactly 3 "highlightedVocab" entries per exam:
- Each word or phrasal verb must appear verbatim in paragraph 1 or paragraph 3 (not only in the
  missing paragraph), written exactly as it appears there.
- Useful, level-appropriate words a ${SHAPE[d].cefr} learner should learn — not names, numbers or the
  topic noun itself. Mix single words and phrasal verbs / collocations.
- All vocabulary must be DIFFERENT across the ${n} exams, and must NOT be any of these words already
  used in the bank (in any form — "dying out" counts as "die out"): ${avoidVocab.join(", ")}
- meaningEn: a short learner-friendly definition. meaningTh: the natural Thai meaning.
  example: a NEW example sentence (not copied from the passage) using the word.

titleEn: a 3–6 word SPECIFIC topic name naming the case, no numbering.
passage.p2 must be exactly "[MISSING PARAGRAPH]".
`.trim();

/** Structured-output schema: one object holding the batch of exams. */
const MC_BLOCK = {
  type: "object",
  additionalProperties: false,
  required: ["question", "correctAnswer", "options", "explanationThai"],
  properties: {
    question: { type: "string" },
    correctAnswer: { type: "string" },
    options: { type: "array", items: { type: "string" } },
    explanationThai: { type: "string" },
  },
} as const;
const EXAMS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["exams"],
  properties: {
    exams: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["titleEn", "passage", "highlightedVocab", "missingSentence", "informationLocation", "bestTitle", "mainIdea"],
        properties: {
          titleEn: { type: "string" },
          passage: {
            type: "object",
            additionalProperties: false,
            required: ["p1", "p2", "p3"],
            properties: { p1: { type: "string" }, p2: { type: "string" }, p3: { type: "string" } },
          },
          highlightedVocab: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["word", "meaningEn", "meaningTh", "example"],
              properties: {
                word: { type: "string" },
                meaningEn: { type: "string" },
                meaningTh: { type: "string" },
                example: { type: "string" },
              },
            },
          },
          missingSentence: MC_BLOCK,
          informationLocation: MC_BLOCK,
          bestTitle: MC_BLOCK,
          mainIdea: MC_BLOCK,
        },
      },
    },
  },
} as const;

const strip = (s: unknown) => String(s ?? "").replace(/\*\*\s*(.*?)\s*\*\*/g, "$1").replace(/\s+/g, " ").trim();
const hasThai = (s: string) => /[฀-๿]/.test(s);
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Root form of a vocabulary item for duplicate checks: lower-case, per token strip inflections
 * ("dying" → "di", "ironing" → "iron", "hinges" → "hing"), so inflected forms match their base.
 */
function vocabKey(word: string): string {
  const stem = (w: string) => {
    let t = w.toLowerCase().replace(/[^a-z'-]/g, "");
    if (t.endsWith("ying") && t.length > 5) t = `${t.slice(0, -4)}ie`;
    else if (t.endsWith("ing") && t.length > 5) t = t.slice(0, -3);
    else if (t.endsWith("ied") && t.length > 4) t = `${t.slice(0, -3)}y`;
    else if (t.endsWith("ed") && t.length > 4) t = t.slice(0, -2);
    else if (t.endsWith("es") && t.length > 4) t = t.slice(0, -2);
    else if (t.endsWith("s") && t.length > 3 && !t.endsWith("ss")) t = t.slice(0, -1);
    if (t.endsWith("e") && t.length > 3) t = t.slice(0, -1);
    // doubled final consonant from inflection ("planned" → "plann" → "plan")
    if (/([bdgmnprt])\1$/.test(t)) t = t.slice(0, -1);
    return t;
  };
  return word.trim().split(/\s+/).map(stem).filter(Boolean).join(" ");
}

/** Rejects anything the runner could not render correctly. Returns the reasons, empty when valid. */
function problems(ex: ReadingExamUnit, d: Difficulty, usedVocab: Set<string>): string[] {
  const bad: string[] = [];
  const p1 = strip(ex.passage?.p1);
  const p3 = strip(ex.passage?.p3);
  if (!p1 || !p3) return ["missing paragraphs"];
  if (!/^\s*\[?\s*missing paragraph\s*\]?\s*$/i.test(String(ex.passage?.p2 ?? ""))) bad.push("p2 not the placeholder");

  const total = words(p1) + words(p3);
  const [lo, hi] = VISIBLE_BAND[d];
  if (total < lo || total > hi) bad.push(`p1+p3 ${total} words, want ${lo}–${hi}`);

  for (const key of ["missingSentence", "informationLocation", "bestTitle", "mainIdea"] as const) {
    const b = ex[key];
    if (!b) { bad.push(`${key} missing`); continue; }
    const opts = (b.options ?? []).map(strip);
    if (opts.length !== 4) bad.push(`${key}: ${opts.length} options`);
    if (new Set(opts).size !== opts.length) bad.push(`${key}: duplicate options`);
    if (!opts.includes(strip(b.correctAnswer))) bad.push(`${key}: key not among options`);
    const why = String(b.explanationThai ?? "");
    if (!hasThai(why)) bad.push(`${key}: explanation not Thai`);
    // a Thai explanation that narrates in English ("Distractor 2 …") is not the house voice
    if ((why.match(/[A-Za-z]{3,}/g) ?? []).length > 8) bad.push(`${key}: explanation half in English`);
  }
  if (strip(ex.missingSentence?.question) !== STEM.missingSentence) bad.push("missingSentence stem not official wording");
  if (strip(ex.bestTitle?.question) !== STEM.bestTitle) bad.push("bestTitle stem not official wording");
  if (strip(ex.mainIdea?.question) !== STEM.mainIdea) bad.push("mainIdea stem not official wording");

  // "the longest option is the answer" is the oldest test-taking shortcut there is — but it only
  // reads as a tell on prose options; a three-word title being two syllables longer means nothing
  for (const key of ["missingSentence", "informationLocation", "mainIdea"] as const) {
    const b = ex[key];
    const opts = (b?.options ?? []).map(strip);
    if (opts.length !== 4 || !b) continue;
    const lens = opts.map((o) => o.length).sort((a, z) => z - a);
    if (Math.min(...lens) < 40) continue;
    const keyLen = strip(b.correctAnswer).length;
    if (keyLen === lens[0] && lens[0]! > lens[1]! * 1.4) bad.push(`${key}: key is the longest option by ${Math.round((lens[0]! / lens[1]! - 1) * 100)}%`);
  }

  // the highlight step grades a span of the passage — the key has to BE one
  const answer = strip(ex.informationLocation?.correctAnswer);
  const inPassage = (s: string) => p1.includes(s) || p3.includes(s);
  if (!inPassage(answer)) bad.push("informationLocation key is not a verbatim span");
  if (words(answer) < 6 || words(answer) > 20) bad.push(`informationLocation key ${words(answer)} words`);
  const spanWords = (ex.informationLocation?.options ?? []).map((o) => words(strip(o)));
  if (spanWords.length === 4 && Math.max(...spanWords) - Math.min(...spanWords) > 8) {
    bad.push(`informationLocation spans ${Math.min(...spanWords)}–${Math.max(...spanWords)} words apart`);
  }
  const spans = (ex.informationLocation?.options ?? []).map(strip).filter((o) => inPassage(o));
  if (spans.length < 4) bad.push(`informationLocation: only ${spans.length}/4 options are real spans`);

  // vocab must sit in a visible paragraph (it gets the ** highlight there) and never repeat
  const vocab = ex.highlightedVocab ?? [];
  if (vocab.length < 2) bad.push(`only ${vocab.length} vocab`);
  const seen = new Set<string>();
  for (const v of vocab) {
    const w = strip(v.word);
    if (!new RegExp(`\\b${escapeRe(w)}`, "i").test(`${p1} ${p3}`)) bad.push(`vocab "${w}" not in paragraph 1 or 3`);
    if (!hasThai(String(v.meaningTh ?? ""))) bad.push(`vocab "${w}" has no Thai meaning`);
    const k = vocabKey(w);
    if (usedVocab.has(k)) bad.push(`vocab "${w}" already used in the bank`);
    if (seen.has(k)) bad.push(`vocab "${w}" listed twice`);
    seen.add(k);
  }
  return bad;
}

const anthropic = new Anthropic();

async function generate(
  d: Difficulty,
  n: number,
  avoidTopics: string[],
  avoidVocab: string[],
  angles: string[],
): Promise<ReadingExamUnit[]> {
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: EXAMS_SCHEMA as unknown as Record<string, unknown> },
    },
    messages: [{ role: "user", content: PROMPT(d, n, avoidTopics, avoidVocab, angles) }],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") throw new Error("model declined the request");
  if (message.stop_reason === "max_tokens") throw new Error("hit max_tokens before finishing");
  const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  return (JSON.parse(text) as { exams?: ReadingExamUnit[] }).exams ?? [];
}

/** Spreads the key across A–D by question type, so no position and no per-exam pattern dominates. */
function spreadAnswers(exams: ReadingExamUnit[], used: Record<string, number[]>, rnd: () => number) {
  for (const ex of exams) {
    for (const key of ["missingSentence", "informationLocation", "bestTitle", "mainIdea"] as const) {
      const b = ex[key];
      const opts = b?.options;
      if (!b || !Array.isArray(opts) || opts.length < 2) continue;
      const from = opts.map(strip).indexOf(strip(b.correctAnswer));
      if (from < 0) continue;
      const correct = opts[from]!;
      const rest = opts.filter((_, i) => i !== from);
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [rest[i], rest[j]] = [rest[j]!, rest[i]!];
      }
      const counts = (used[key] ??= [0, 0, 0, 0]);
      const min = Math.min(...counts.slice(0, opts.length));
      const pool = counts.slice(0, opts.length).map((c, i) => (c === min ? i : -1)).filter((i) => i >= 0);
      const target = pool[Math.floor(rnd() * pool.length)]!;
      counts[target] += 1;
      rest.splice(target, 0, correct);
      b.options = rest;
    }
  }
}

/** Wraps the first occurrence of each highlighted word in paragraph 1/3 in **…** (house format). */
function markVocab(ex: ReadingExamUnit) {
  for (const v of ex.highlightedVocab ?? []) {
    const re = new RegExp(`\\b(${escapeRe(strip(v.word))})\\b`, "i");
    for (const key of ["p1", "p3"] as const) {
      const text = String(ex.passage[key] ?? "");
      if (text.includes(`**${strip(v.word)}**`)) break;
      if (re.test(text)) {
        ex.passage[key] = text.replace(re, "**$1**");
        break;
      }
    }
  }
}

type Bank = Record<string, Record<string, ReadingSet[]>>;

/**
 * Puts accepted exams into the bank: first tops up sets that have fewer than EXAMS_PER_SET exams,
 * then opens new sets. Exam titles are numbered by their position in their set.
 */
function placeExams(bank: Bank, round: string, d: Difficulty, exams: ReadingExamUnit[]): string[] {
  const log: string[] = [];
  const sets = ((bank[round] ??= {})[d] ??= []);
  const queue = [...exams];
  const title = (ex: ReadingExamUnit, n: number) => `Exam ${n} — ${String(ex.titleEn).replace(/^Exam\s*\d+\s*[—-]\s*/, "")}`;
  for (const set of [...sets].sort((a, z) => (a.setNumber ?? 0) - (z.setNumber ?? 0))) {
    while ((set.exams?.length ?? 0) < EXAMS_PER_SET && queue.length) {
      const ex = queue.shift()!;
      ex.titleEn = title(ex, set.exams.length + 1);
      set.exams.push(ex);
      log.push(`set ${set.setNumber} +1 → ${set.exams.length}`);
    }
  }
  let setNumber = sets.reduce((m, s) => Math.max(m, s.setNumber ?? 0), 0);
  while (queue.length) {
    const chunk = queue.splice(0, EXAMS_PER_SET);
    chunk.forEach((ex, j) => { ex.titleEn = title(ex, j + 1); });
    sets.push({ setNumber: ++setNumber, difficulty: d, round: Number(round) as ReadingSet["round"], exams: chunk });
    log.push(`new set ${setNumber} (${chunk.length})`);
  }
  return log;
}

function readBank(payload: Record<string, unknown>): Bank {
  const raw = payload["ep-reading-sets"];
  return (typeof raw === "string" ? JSON.parse(raw) : raw) as Bank;
}

function collectUsed(bank: Bank) {
  const titles: string[] = [];
  const vocab = new Set<string>();
  const vocabWords: string[] = [];
  for (const byDiff of Object.values(bank)) {
    for (const sets of Object.values(byDiff ?? {})) {
      for (const s of sets ?? []) {
        for (const ex of s.exams ?? []) {
          titles.push(String(ex.titleEn ?? "").replace(/^Exam\s*\d+\s*[—-]\s*/, ""));
          for (const v of ex.highlightedVocab ?? []) {
            const k = vocabKey(strip(v.word));
            if (k && !vocab.has(k)) { vocab.add(k); vocabWords.push(strip(v.word).toLowerCase()); }
          }
        }
      }
    }
  }
  return { titles, vocab, vocabWords };
}

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await sb.from("content_bank_snapshots").select("payload,updated_at").eq("id", "global").maybeSingle();
  if (error || !data) throw new Error(`snapshot read failed: ${error?.message}`);
  const payload = (typeof data.payload === "string" ? JSON.parse(data.payload) : data.payload) as Record<string, unknown>;
  const bank = readBank(payload);
  const used = collectUsed(bank);
  // exams saved by earlier runs (any slot) count as used too, so nothing repeats across files
  if (fs.existsSync(OUT_DIR)) {
    for (const f of fs.readdirSync(OUT_DIR).filter((n) => /^round\d-(easy|medium|hard)\.json$/.test(n))) {
      for (const ex of JSON.parse(fs.readFileSync(`${OUT_DIR}/${f}`, "utf8")) as ReadingExamUnit[]) {
        used.titles.push(String(ex.titleEn ?? "").replace(/^Exam\s*\d+\s*[—-]\s*/, ""));
        for (const v of ex.highlightedVocab ?? []) {
          const k = vocabKey(strip(v.word));
          if (k && !used.vocab.has(k)) { used.vocab.add(k); used.vocabWords.push(strip(v.word).toLowerCase()); }
        }
      }
    }
  }

  if (listVocab) {
    console.log(`${used.vocabWords.length} vocabulary items already used:\n${[...used.vocabWords].sort().join(", ")}`);
    return;
  }

  if (add) {
    // Hand-written exams: same checks as generated ones, then appended to the slot's saved file.
    const [round, d, file] = add.split(":") as [string, Difficulty, string];
    if (!ROUNDS.includes(round as (typeof ROUNDS)[number]) || !DIFFICULTIES.includes(d)) throw new Error(`bad --add slot ${round}:${d}`);
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as { exams?: ReadingExamUnit[] } | ReadingExamUnit[];
    const incoming = Array.isArray(raw) ? raw : raw.exams ?? [];
    const saved = `${OUT_DIR}/round${round}-${d}.json`;
    const kept: ReadingExamUnit[] = fs.existsSync(saved) ? (JSON.parse(fs.readFileSync(saved, "utf8")) as ReadingExamUnit[]) : [];
    const have = (bank[round]?.[d] ?? []).reduce((a, s) => a + (s.exams?.length ?? 0), 0);
    const need = Math.max(0, TARGET_PER_DIFFICULTY - have);
    const fresh: ReadingExamUnit[] = [];
    for (const ex of incoming) {
      const bad = problems(ex, d, used.vocab);
      if (used.titles.some((t) => t.toLowerCase() === String(ex.titleEn).toLowerCase())) bad.push("topic title already used");
      if (bad.length) { console.log(`✕ "${ex.titleEn}" — ${bad.join("; ")}`); continue; }
      used.titles.push(String(ex.titleEn));
      for (const v of ex.highlightedVocab) { used.vocab.add(vocabKey(strip(v.word))); used.vocabWords.push(strip(v.word).toLowerCase()); }
      markVocab(ex);
      fresh.push(ex);
      console.log(`✓ "${ex.titleEn}"`);
    }
    let s = [...file].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
    spreadAnswers(fresh, {}, () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296));
    kept.push(...fresh);
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(saved, JSON.stringify(kept, null, 1));
    console.log(`round ${round} ${d}: +${fresh.length}/${incoming.length} accepted → ${kept.length}/${need} saved in ${saved}`);
    return;
  }

  if (preview) {
    const [d, n] = preview.split(":") as [Difficulty, string];
    const angles = Array.from({ length: Number(n ?? 2) }, (_, i) => `${FIELDS[(i * 5 + 3) % FIELDS.length]} in ${PLACES[(i * 7 + 2) % PLACES.length]}`);
    const exams = await generate(d, Number(n ?? 2), used.titles, used.vocabWords, angles);
    for (const ex of exams) {
      const bad = problems(ex, d, used.vocab);
      markVocab(ex);
      console.log(`\n${bad.length ? "✕ REJECTED: " + bad.join("; ") : "✓ valid"}\n`, JSON.stringify(ex, null, 1));
    }
    return;
  }

  const plan: { round: string; d: Difficulty; need: number }[] = [];
  for (const round of ROUNDS) {
    for (const d of DIFFICULTIES) {
      const have = (bank[round]?.[d] ?? []).reduce((a, s) => a + (s.exams?.length ?? 0), 0);
      const need = Math.max(0, TARGET_PER_DIFFICULTY - have);
      if (need && (!only || only === `${round}:${d}`)) plan.push({ round, d, need });
    }
  }
  const totalNeed = plan.reduce((a, p) => a + p.need, 0);
  const bankBytes = JSON.stringify(bank).length;
  console.log(`current reading bank: ${(bankBytes / 1e6).toFixed(2)} MB · whole content bank: ${(JSON.stringify(payload).length / 1e6).toFixed(2)} MB`);
  console.log(`vocabulary already used: ${used.vocab.size} words · topics: ${used.titles.length}`);
  console.log(`to reach ${TARGET_PER_DIFFICULTY}/difficulty: ${totalNeed} new passages`);
  for (const p of plan) console.log(`  round ${p.round} ${p.d.padEnd(6)} +${p.need}`);
  console.log(`projected bank growth ≈ ${((bankBytes / used.titles.length) * totalNeed * 1.6 / 1e6).toFixed(2)} MB`);
  if (DRY) return;

  let seed = 20261113;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const positions: Record<string, number[]> = {};
  const ready: { round: string; d: Difficulty; exams: ReadingExamUnit[] }[] = [];

  for (const { round, d, need } of plan) {
    const saved = `${OUT_DIR}/round${round}-${d}.json`;
    if (UPLOAD_ONLY) {
      if (!fs.existsSync(saved)) continue;
      ready.push({ round, d, exams: JSON.parse(fs.readFileSync(saved, "utf8")) as ReadingExamUnit[] });
      console.log(`round ${round} ${d}: queued from ${saved}`);
      continue;
    }
    // resume: a previous run may already have saved this slot
    const accepted: ReadingExamUnit[] = fs.existsSync(saved) ? (JSON.parse(fs.readFileSync(saved, "utf8")) as ReadingExamUnit[]) : [];
    for (const ex of accepted) {
      used.titles.push(String(ex.titleEn));
      for (const v of ex.highlightedVocab ?? []) { used.vocab.add(vocabKey(strip(v.word))); used.vocabWords.push(strip(v.word).toLowerCase()); }
    }
    let attempts = 0;
    const maxAttempts = Math.ceil(need / BATCH) + 12;
    while (accepted.length < need && attempts < maxAttempts) {
      attempts++;
      const want = Math.min(BATCH, need - accepted.length);
      const batches = Array.from({ length: Math.min(CONCURRENCY, Math.ceil((need - accepted.length) / BATCH)) }, () =>
        generate(
          d,
          want,
          used.titles,
          used.vocabWords,
          Array.from({ length: want }, () => `${FIELDS[Math.floor(rnd() * FIELDS.length)]} in ${PLACES[Math.floor(rnd() * PLACES.length)]}`),
        ).catch((e) => {
          console.warn(`  ! ${round}:${d} batch failed — ${String(e).slice(0, 160)}`);
          return [] as ReadingExamUnit[];
        }),
      );
      for (const exams of await Promise.all(batches)) {
        for (const ex of exams) {
          if (accepted.length >= need) break;
          // checked one by one against everything accepted so far, so parallel batches can't
          // slip the same word or topic in twice
          const bad = problems(ex, d, used.vocab);
          if (bad.length) { console.log(`  ✕ ${round}:${d} "${ex.titleEn}" — ${bad.slice(0, 2).join("; ")}`); continue; }
          if (used.titles.some((t) => t.toLowerCase() === String(ex.titleEn).toLowerCase())) continue;
          used.titles.push(String(ex.titleEn));
          for (const v of ex.highlightedVocab) { used.vocab.add(vocabKey(strip(v.word))); used.vocabWords.push(strip(v.word).toLowerCase()); }
          markVocab(ex);
          accepted.push(ex);
        }
      }
      console.log(`  round ${round} ${d}: ${accepted.length}/${need}`);
    }

    spreadAnswers(accepted, positions, rnd);

    // Generated passages are expensive: put them on disk BEFORE any network write, so a failed or
    // clobbered upload costs nothing but an upload.
    if (accepted.length) {
      fs.mkdirSync(OUT_DIR, { recursive: true });
      fs.writeFileSync(saved, JSON.stringify(accepted, null, 1));
      console.log(`  saved ${accepted.length} → ${saved}`);
    }
    // never let a shortfall pass as success
    if (accepted.length < need) console.warn(`  !! round ${round} ${d}: only ${accepted.length}/${need} passed validation after ${attempts} attempts`);
    ready.push({ round, d, exams: accepted });
  }

  const made = ready.reduce((a, r) => a + r.exams.length, 0);
  if (NO_UPLOAD) {
    console.log(`generated ${made} passages into ${OUT_DIR}/ — nothing uploaded (--no-upload)`);
    return;
  }

  const backup = `content-bank-backup-${new Date(data.updated_at as string).toISOString().replace(/[:.]/g, "-")}.json`;
  if (!fs.existsSync(backup)) fs.writeFileSync(backup, JSON.stringify(payload));
  console.log("backup →", backup);

  // A browser running the app pushes its whole localStorage bank to this same row, so the snapshot
  // may have moved under us during a long generation run. Re-read, place our exams into whatever is
  // there now (skipping any already present), and verify the write actually stuck.
  const { data: fresh } = await sb.from("content_bank_snapshots").select("payload,updated_at").eq("id", "global").maybeSingle();
  if (!fresh) throw new Error("snapshot vanished");
  if (fresh.updated_at !== data.updated_at) console.warn(`! snapshot changed during the run (${data.updated_at} → ${fresh.updated_at}) — placing into the newer one`);
  const freshPayload = (typeof fresh.payload === "string" ? JSON.parse(fresh.payload) : fresh.payload) as Record<string, unknown>;
  const freshRaw = freshPayload["ep-reading-sets"];
  const freshBank = readBank(freshPayload);
  const known = new Set(
    Object.values(freshBank).flatMap((bd) => Object.values(bd ?? {})).flatMap((ss) => ss ?? [])
      .flatMap((s) => (s.exams ?? []).map((e) => String(e.titleEn).replace(/^Exam\s*\d+\s*[—-]\s*/, "").toLowerCase())),
  );
  for (const { round, d, exams } of ready) {
    const fresh = exams.filter((e) => !known.has(String(e.titleEn).replace(/^Exam\s*\d+\s*[—-]\s*/, "").toLowerCase()));
    const log = placeExams(freshBank, round, d, fresh);
    console.log(`round ${round} ${d}: placed ${fresh.length} — ${log.join(", ")}`);
  }
  freshPayload["ep-reading-sets"] = typeof freshRaw === "string" ? JSON.stringify(freshBank) : freshBank;

  // Learners only see sets listed in the admin-occupancy map (composeReadingVisibleBank), so every
  // set we touched must be registered there or it stays invisible on web and mobile.
  const OCC_KEY = "ep-reading-admin-uploaded-v1";
  const occRaw = freshPayload[OCC_KEY];
  const occ = ((typeof occRaw === "string" ? JSON.parse(occRaw) : occRaw) ?? {}) as Record<string, Record<string, number[]>>;
  for (const { round, d } of ready) {
    const nums = (freshBank[round]?.[d] ?? []).filter((s) => (s.exams?.length ?? 0) > 0).map((s) => s.setNumber);
    const slot = ((occ[round] ??= {})[d] ??= []);
    occ[round]![d] = [...new Set([...slot, ...nums])].sort((a, z) => a - z);
  }
  freshPayload[OCC_KEY] = typeof occRaw === "string" ? JSON.stringify(occ) : occ;

  const { error: writeErr } = await sb
    .from("content_bank_snapshots")
    .update({ payload: freshPayload, updated_at: new Date().toISOString() })
    .eq("id", "global");
  if (writeErr) { console.error(`WRITE FAILED: ${writeErr.message}`); return; }

  const { data: check } = await sb.from("content_bank_snapshots").select("payload").eq("id", "global").maybeSingle();
  const checkBank = readBank((typeof check!.payload === "string" ? JSON.parse(check!.payload) : check!.payload) as Record<string, unknown>);
  const landed = Object.values(checkBank).flatMap((bd) => Object.values(bd ?? {})).flatMap((ss) => ss ?? [])
    .reduce((a, s) => a + (s.exams?.length ?? 0), 0);
  console.log(`wrote ${made} new passages · bank now holds ${landed} (read back from the server)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
