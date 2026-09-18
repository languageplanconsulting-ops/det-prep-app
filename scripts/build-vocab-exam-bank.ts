/**
 * Rebuilds the vocabulary bank (เติมคำในบทอ่าน) to the item-writing spec, per round and difficulty.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/build-vocab-exam-bank.ts --dry
 *   npx tsx --tsconfig tsconfig.json scripts/build-vocab-exam-bank.ts --preview=medium:1
 *   npx tsx --tsconfig tsconfig.json scripts/build-vocab-exam-bank.ts --apply [--only=3:hard]
 *
 * The spec is docs/reading-vocabulary/question-spec.md — the user's own taxonomy, reverse-engineered
 * from 40 real DET blanks — extended by docs/reading-vocabulary/easy-sets-clauses.md for easy.
 * The bank that was in Supabase before this script did NOT follow it: 4 options instead of 5, six
 * unrelated sentences instead of one passage, every blank a "same root / same first letter" word
 * drill, and Thai explanations that were bare glosses rather than "here is the clue, here is how you
 * eliminate". `conforms()` below re-checks whatever is already in the bank and keeps only what
 * passes, so a re-run tops up instead of duplicating.
 *
 * What the spec pins down, and therefore what `problems()` rejects:
 *  - exactly 5 options, same part of speech and form, all grammatically insertable (except on the
 *    one designated grammar blank, where wrong forms are the point)
 *  - the distractor formula: 1 answer + 1 opposite + 1–2 same-topic-wrong-slot + 1 near-synonym,
 *    and at least one synonym PAIR per passage (two options that mean the same thing are both wrong,
 *    because a single-answer MCQ cannot have two keys)
 *  - a per-level type mix (collocation / context / logic / grammar / …), not a bag of random gaps
 *  - the clue for a context or logic blank sits within one sentence of the gap
 *  - the answer word appears nowhere else in the passage
 *  - the Thai explanation quotes the real clue from the passage
 *  - the key is never option A, and is spread across B–E across the bank
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import type {
  VocabBlankQuestion,
  VocabFullBank,
  VocabPassageContentLevel,
  VocabPassageUnit,
} from "../src/types/vocab";

const TARGET_PER_LEVEL = 20;
const ROUNDS = [1, 2, 3, 4, 5] as const;
const LEVELS = ["easy", "medium", "hard"] as const;
const BATCH = 1;
const CONCURRENCY = 14;
/** The single set slot each round already publishes (ep-vocab-admin-uploaded-v1 is {r:[1]}). */
const SET_NUMBER = 1;

const DRY = process.argv.includes("--dry");
const preview = process.argv.find((a) => a.startsWith("--preview="))?.slice(10);
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
/** Judge hand-authored passages against the spec without writing anything. */
const validate = process.argv.find((a) => a.startsWith("--validate="))?.slice(11);
/** Publish hand-authored passages that pass, into the round and level each file declares. */
const ingest = process.argv.find((a) => a.startsWith("--ingest="))?.slice(9);
/** Print the authoring brief for one level, for whoever is writing passages by hand. */
const specFor = process.argv.find((a) => a.startsWith("--spec="))?.slice(7);

type Level = (typeof LEVELS)[number];

/** One blank's job. The mix per level is the spec's table, not a free choice. */
type BlankType =
  | "collocation-colloquial"
  | "collocation-academic"
  | "phrasal"
  | "context"
  | "logic"
  | "grammar"
  | "relative"
  | "transitional"
  | "verbform"
  | "appropriateness"
  | "oddoneout"
  | "c1";

/** What each option is doing in the trap. Generated, validated, then dropped — never stored. */
type OptionRole =
  | "answer"
  | "opposite"
  | "wrongSlot"
  | "nearSynonym"
  | "wrongForm"
  | "synonymPair"
  | "samePolarity"
  | "wrongType";

type GenBlank = {
  type: BlankType;
  correctAnswer: string;
  options: { text: string; role: OptionRole }[];
  clue: string;
  explanationThai: string;
  meaningTh: string;
  synonyms: string[];
};

type GenPassage = {
  titleEn: string;
  passageText: string;
  blanks: GenBlank[];
};

/**
 * docs/reading-vocabulary/question-spec.md §3, with easy taking the 10-gap shape the user later
 * authored in easy-sets-clauses.md (relative pronoun / transitional / verb form on top of the
 * collocation core). Word bands sit inside the spec's 100–200 and widen with level.
 */
const BLUEPRINT: Record<Level, { cefr: string; words: [number, number]; mix: BlankType[]; tone: string }> = {
  easy: {
    cefr: "B1",
    words: [110, 165],
    mix: [
      "collocation-colloquial",
      "collocation-colloquial",
      "collocation-academic",
      "phrasal",
      "context",
      "context",
      "logic",
      "relative",
      "transitional",
      "verbform",
    ],
    tone:
      "plain non-fiction about one concrete case. Common vocabulary, mostly simple and compound sentences, one subordinate clause at most.",
  },
  medium: {
    cefr: "B2",
    words: [130, 190],
    mix: [
      "collocation-colloquial",
      "collocation-academic",
      "context",
      "context",
      "context",
      "logic",
      "logic",
      "logic",
      "grammar",
      "grammar",
    ],
    tone:
      "informational or lightly academic non-fiction about one concrete case. Abstract nouns, cause-and-effect linking, one or two subordinate clauses per sentence.",
  },
  hard: {
    cefr: "C1",
    words: [125, 185],
    mix: [
      "appropriateness",
      "phrasal",
      "phrasal",
      "collocation-colloquial",
      "oddoneout",
      "oddoneout",
      "grammar",
      "c1",
    ],
    tone:
      "a close third-person or first-person account of one person meeting and beating a specific obstacle, or a precise account of one research finding. Precise vocabulary, hedged claims.",
  },
};

/**
 * Topic seeds. "A library" is a filler topic and the next passage about a library collides with it;
 * "the scroll-copying room of the library at Pergamon, after Egypt cut off the papyrus supply" is a
 * passage. Each request gets one domain × one setting × one angle, so batches spread instead of
 * clustering on the same few defaults.
 */
const DOMAINS = [
  "an environmental problem and one new fix being tried",
  "a popular-science explanation of what a phenomenon actually is",
  "a technology changing how one city works",
  "a first-person account of an ordinary routine",
  "one person getting past a specific obstacle",
  "an archaeological or historical find and what it settled",
  "a craft or trade that nearly died and came back",
  "a food or farming tradition under pressure",
  "an animal behaviour that surprised the people studying it",
  "a public-health or medical programme and its result",
  "a transport or infrastructure decision and who it affected",
  "a school, library or literacy project",
  "a sport, training method or an athlete's adjustment",
  "a music, film or art scene forming somewhere unexpected",
  "a materials, engineering or space-programme advance",
  "a water, waste or energy scheme in one town",
  "a labour, migration or small-business shift",
  "a weather or climate observation and what it changed",
  "a building or neighbourhood being reused for something else",
  "a language, script or archive being rescued",
];

const SETTINGS = [
  "Alexandria in the 3rd century BCE", "a fishing village in coastal Vietnam", "Bogotá in the 1990s",
  "the Peruvian Andes above 4,000 metres", "post-war Osaka", "a Sámi community in Finland's far north",
  "the Nile delta after the Aswan dam", "an Icelandic geothermal town", "rural Isaan in Thailand",
  "Detroit after the plants closed", "a Kenyan tea estate in the Rift Valley", "medieval Timbuktu",
  "a Sicilian citrus grove", "Jakarta's sinking northern districts", "the Scottish Hebrides",
  "a Bangladeshi char island", "Seoul's old textile district", "the Atacama at 2,500 metres",
  "a Nepali trekking valley after the 2015 earthquake", "Havana's crumbling seafront",
  "a Ghanaian gold-mining town", "the Sea of Azov", "Uzbekistan's Aral shore", "Tasmania's east coast",
  "a Portuguese cork forest", "Mexico City's old lakebed", "the Faroe Islands in winter",
  "an Ethiopian highland monastery", "Sri Lanka's dry zone", "a Warsaw housing estate built in 1968",
  "a Louisiana bayou parish", "Kyoto's machiya quarter", "the Danube delta in Romania",
  "a Chilean salmon fjord", "Lagos's Makoko waterfront", "the Canadian prairie during the 1930s",
  "a Taiwanese mountain railway town", "the Camargue salt marshes", "a Moroccan oasis town",
  "Svalbard's seed vault road",
];

const ANGLES = [
  "what one measurement finally proved", "why the first attempt failed and the second did not",
  "the day the rule changed", "what the neighbours noticed before the scientists did",
  "the cost nobody had counted", "how a single family kept it going",
  "the object that turned out to be older than anyone thought", "what happened after the money ran out",
  "the compromise that made it work", "why the obvious solution was the wrong one",
  "what the old records showed", "the season it nearly stopped for good",
];

const TYPE_BRIEF: Record<BlankType, string> = {
  "collocation-colloquial":
    "COLLOCATION (everyday American). The key is half of a fixed pair a native speaker hears as one unit — packed with, full of, take a break, work up the courage, stay up, hop on. The four distractors must be words that TRANSLATE plausibly but do not pair with the neighbouring word.",
  "collocation-academic":
    "COLLOCATION (academic). The key is half of a written-register pair — carry out a survey, play a part in, adversely affect, pose a risk, of some kind, becomes detrimental. Distractors as above.",
  phrasal:
    "PHRASAL VERB (high-frequency American). The gap takes the verb of a two-word verb whose particle is already printed in the passage — set out, catch on, cut down, take on, wipe out, hold up. All five options are bare verbs; only one produces a real phrasal verb with that particle.",
  context:
    "CONTEXT-DEPENDENT. The vocabulary is easy but the gap is unanswerable unless the learner followed the sentence before it. The clue MUST sit within one sentence of the gap and must be a real content word from the passage, quoted in `clue`.",
  logic:
    "LOGIC OF WORDS. The key is forced by reason, not by feel: a clue word next to the gap makes exactly one option possible (submerged in ___ can only be water; ___ than after a comparison; because/until/unless steering the relation). Quote that clue word in `clue`.",
  grammar:
    "GRAMMAR. This is the ONE blank where the options are deliberately not all insertable: at least two are the wrong FORM (-ing vs -ed, comparative vs superlative, adjective vs adverb, finite vs non-finite). Two of the remaining options must be a SYNONYM PAIR — two words that mean the same thing, which a sharp learner strikes out on sight because a single-answer question cannot have two keys.",
  relative:
    "RELATIVE PRONOUN. who / which / where / whom / whose / that. The key is fixed by what the pronoun refers to and by its job in the clause; the other four are the wrong kind. Never put the pronoun after a comma and then key `that`.",
  transitional:
    "TRANSITION. However / Still / Meanwhile / Therefore / For example / Otherwise / Besides. The key is fixed by the relation between the two sentences around it — contrast, result, simultaneity, exemplification. That relation must be genuinely visible in the two sentences.",
  verbform:
    "VERB FORM. All five options are the same verb in different forms (base, -s, -ing, -ed, to-infinitive). Only one fits the slot: a participle after a complete clause, a past participle in a reduced relative, a finite verb agreeing with its subject.",
  appropriateness:
    "APPROPRIATENESS IN CONTEXT. All five options are grammatical and mean roughly 'the same kind of action', but only one is what a real person plausibly does in that situation (walked up to the house, not crawled / danced / rolled / appeared).",
  oddoneout:
    "ODD ONE OUT BY DIRECTION. Four options share one polarity (all positive or all negative) and the key is the single one pointing the other way; the surrounding sentence — a word like disappeared, expertly, at last — tells the learner which direction is needed.",
  c1: "C1 VOCABULARY. The key is an advanced word (tackled, squandered, mitigated, curtailed, galvanised); the four distractors are ordinary B1–B2 words that nearly fit but each miss the sentence in one identifiable way.",
};

const ROLE_BRIEF = `
Every blank carries EXACTLY 5 options and each option declares its role:
  "answer"       — the key (exactly one)
  "opposite"     — reverses the meaning of the sentence if inserted
  "wrongSlot"    — genuinely a word from this topic, but belonging to a different gap
  "nearSynonym"  — almost right, off by one shade; this is the option that decides the question
  "wrongForm"    — the wrong grammatical form (grammar and verb-form blanks only)
  "synonymPair"  — one of TWO options that mean the same as each other, so both must be wrong
  "samePolarity" — shares the polarity of the other three distractors (odd-one-out blanks only)
  "wrongType"    — the wrong kind of pronoun or connector (relative and transition blanks only)
Ordinary blanks use: answer + opposite + 1–2 wrongSlot + nearSynonym.
Grammar blanks use: answer + 2 wrongForm + 2 synonymPair.
Odd-one-out blanks use: answer + 4 samePolarity.
Relative and transition blanks use: answer + 4 wrongType.
Verb-form blanks use: answer + 4 wrongForm.

EXACTLY ONE gap in every passage carries the SYNONYM-PAIR trap — two options that mean the same as
each other, so a sharp learner strikes both out on sight. If the passage has a grammar gap, that is
where the pair goes. If it has no grammar gap, put the pair on ONE ordinary gap, and that gap's five
options are then: answer + synonymPair + synonymPair + opposite + wrongSlot (no nearSynonym on it).`.trim();

const PROMPT = (
  level: Level,
  n: number,
  plans: BlankType[][],
  seeds: { domain: string; setting: string; angle: string }[],
  avoidTitles: string[],
  avoidAnswers: string[],
) => {
  const bp = BLUEPRINT[level];
  const used = [...new Set(plans.flat())];
  return `
You write vocabulary-in-context items for a Duolingo English Test preparation app used by Thai learners.
This is the DET Interactive Reading task "select the best option for each missing word": one passage
with numbered gaps, five options per gap.

Produce ${n} INDEPENDENT passages at CEFR ${bp.cefr}. Return JSON only, in the schema at the bottom.

THE PASSAGE
- ${bp.words[0]}–${bp.words[1]} words, one or two paragraphs, ${bp.tone}
- Every gap is written as [BLANK] — plain, unnumbered, in reading order, and nothing else in square brackets.
- The topic must be SPECIFIC, never a category. "A library" is not a topic; "the scroll-copying room of
  the library at Pergamon after Egypt cut off the papyrus supply" is. Invent concrete detail freely, but
  no real named living people and no real organisations.
${seeds
  .map(
    (s, i) =>
      `  Passage ${i + 1}: ${s.domain}, set in ${s.setting}. Angle: ${s.angle}.`,
  )
  .join("\n")}
- No dialogue, no lists, no headings, no markdown, no second person.
- Do NOT write about any of these, they already exist: ${avoidTitles.slice(0, 90).join("; ") || "(none yet)"}

THE GAPS — each passage has EXACTLY ${bp.mix.length} gaps, and gap n must be of the type given here:
${plans
  .map((plan, i) => `  Passage ${i + 1}: ${plan.map((t, j) => `${j + 1}=${t}`).join(", ")}`)
  .join("\n")}

WHAT EACH TYPE MEANS
${used.map((t) => `- ${t}: ${TYPE_BRIEF[t]}`).join("\n")}

THE FIVE OPTIONS
${ROLE_BRIEF}
Hard rules that decide whether an item is usable at all:
- All five options are the same part of speech AND the same form, so grammar alone can never eliminate
  — the ONLY exceptions are the grammar and verb-form blanks, where wrong forms are the trap.
- All five must be within one word of each other in length (all single words, or all two-word phrasal verbs).
- The key must appear NOWHERE ELSE in the passage. If the word is already printed somewhere, choose another key.
- No key may be a word already overused in this bank: ${avoidAnswers.slice(0, 60).join(", ") || "(none yet)"}
- Options must never be numbered or lettered; give the bare word or phrase.

FOR EVERY GAP ALSO GIVE
- "clue": the exact run of words FROM THE PASSAGE that forces the key — copied character-for-character,
  2–8 words and never spanning a sentence boundary. You may quote the gap's own frame by leaving its marker in, e.g. "threatened to [BLANK] out";
  everything on either side of that marker still has to be the passage's exact words. PROXIMITY IS A HARD RULE: the clue must sit in the SAME sentence as its gap, or in the
  single sentence immediately before or after it. A clue two sentences away makes the item unfair and
  the item is thrown out. Write the passage so the clue lands next to its own gap.
- "explanationThai": two or three sentences of Thai that (a) contain that clue COPIED VERBATIM in
  English letters inside the Thai sentence — not translated, not paraphrased, the exact same words as
  the "clue" field, (b) say why the key is right, and (c) name at least TWO of the wrong options by
  their English spelling and say what each does wrong (reverses the meaning / belongs to another gap /
  means the same as another option / is the wrong form). Thai script, except those quoted English words.
- "meaningTh": the Thai meaning of the key alone, for the learner's notebook.
- "synonyms": 2–3 English synonyms of the key. On a relative-pronoun or transition gap the key has no
  real synonyms — send an empty list there rather than inventing them.

Return JSON only:
{"passages":[{
  "titleEn": "<3–7 words naming this specific case, Title Case, no numbering, no colon>",
  "passageText": "<the passage with [BLANK] markers>",
  "blanks": [
    {"type":"<one of the types listed for this gap>",
     "correctAnswer":"<the key>",
     "options":[{"text":"...","role":"..."},{"text":"...","role":"..."},{"text":"...","role":"..."},{"text":"...","role":"..."},{"text":"...","role":"..."}],
     "clue":"<verbatim from the passage>",
     "explanationThai":"...",
     "meaningTh":"...",
     "synonyms":["...","..."]}
  ]
}]}
`.trim();
};

const strip = (s: unknown) =>
  String(s ?? "")
    .replace(/\*\*\s*(.*?)\s*\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
const hasThai = (s: string) => /[฀-๿]/.test(s);
const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;
const norm = (s: string) => strip(s).toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"');
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** `[BLANK 3]`, `[ blank ]`, `[BLANK3]` → the canonical `[BLANK]` the runner splits on. */
function canonicalBlanks(text: string): string {
  return strip(text).replace(/\[\s*BLANK\s*\d*\s*\]/gi, "[BLANK]");
}

function countMarkers(text: string): number {
  return (text.match(/\[BLANK\]/g) ?? []).length;
}

/** The passage as the learner reads it, with the gaps taken out — used for word counts and echo checks. */
function passageProse(text: string): string {
  return text.replace(/\[BLANK\]/g, " ");
}

/**
 * A clue may be quoted with its own gap still in it ("threatened to [BLANK] out") — that is the
 * frame that forces the key, and it is the more useful thing to show a teacher. Each side of the gap
 * still has to be real text from the passage.
 */
function clueSegments(clue: string): string[] {
  return canonicalBlanks(clue)
    .split("[BLANK]")
    .map((s) => strip(s))
    .filter(Boolean);
}

/** The part of the clue worth matching against — the longest run of real words in it. */
function clueAnchor(clue: string): string {
  return clueSegments(clue).sort((a, b) => wordCount(b) - wordCount(a))[0] ?? "";
}

const ORDINARY_ROLES: OptionRole[] = ["opposite", "wrongSlot", "nearSynonym"];

/** Types whose key is a function word, so "the key appears nowhere else" cannot apply. */
const FUNCTION_TYPES: BlankType[] = ["relative", "transitional"];

/**
 * Everything that would make an item unusable, wrong, or guessable by shape. Returns the reasons;
 * empty means the item ships. Anything rejected here is regenerated rather than repaired, because a
 * half-right trap teaches the wrong elimination.
 */
function problems(p: GenPassage, level: Level, plan: BlankType[]): string[] {
  const bad: string[] = [];
  const title = strip(p.titleEn);
  const text = canonicalBlanks(p.passageText);
  const prose = passageProse(text);
  const bp = BLUEPRINT[level];

  if (!title || wordCount(title) < 2 || wordCount(title) > 9) bad.push(`title "${title}" is ${wordCount(title)} words`);
  if (/\b(set|passage|exam|part)\s*\d/i.test(title)) bad.push("title is a slot number, not a topic");

  const w = wordCount(prose);
  if (w < bp.words[0] || w > bp.words[1]) bad.push(`passage ${w} words, want ${bp.words[0]}–${bp.words[1]}`);

  const markers = countMarkers(text);
  if (markers !== plan.length) bad.push(`${markers} [BLANK] markers, want ${plan.length}`);
  if (/\[(?!BLANK\])[^\]]*\]/.test(text)) bad.push("stray square brackets in the passage");

  const blanks = Array.isArray(p.blanks) ? p.blanks : [];
  if (blanks.length !== plan.length) {
    bad.push(`${blanks.length} blanks, want ${plan.length}`);
    return bad;
  }

  let synonymPairSeen = false;

  blanks.forEach((b, i) => {
    const at = `blank ${i + 1}`;
    const want = plan[i]!;
    if (b.type !== want) bad.push(`${at}: type ${b.type}, want ${want}`);

    const opts = (b.options ?? []).map((o) => ({ text: strip(o?.text), role: o?.role }));
    if (opts.length !== 5) {
      bad.push(`${at}: ${opts.length} options, want 5`);
      return;
    }
    if (opts.some((o) => !o.text)) {
      bad.push(`${at}: empty option`);
      return;
    }
    if (new Set(opts.map((o) => norm(o.text))).size !== 5) bad.push(`${at}: duplicate options`);
    if (opts.some((o) => /^[A-Ea-e][).\s]/.test(o.text))) bad.push(`${at}: options are lettered`);

    const key = strip(b.correctAnswer);
    const keyed = opts.filter((o) => o.role === "answer");
    if (keyed.length !== 1) bad.push(`${at}: ${keyed.length} options marked answer`);
    if (!opts.some((o) => norm(o.text) === norm(key))) bad.push(`${at}: key not among the options`);
    else if (keyed[0] && norm(keyed[0].text) !== norm(key)) bad.push(`${at}: the option marked answer is not the key`);

    // shape: a learner must not be able to spot the key by length alone
    const lens = opts.map((o) => wordCount(o.text));
    if (Math.max(...lens) - Math.min(...lens) > 1) bad.push(`${at}: options ${Math.min(...lens)}–${Math.max(...lens)} words`);

    const roles = opts.filter((o) => o.role !== "answer").map((o) => o.role);
    const count = (r: OptionRole) => roles.filter((x) => x === r).length;
    if (count("synonymPair") === 2) synonymPairSeen = true;
    else if (count("synonymPair") !== 0) bad.push(`${at}: a synonym pair needs exactly 2 options`);

    if (want === "grammar") {
      if (count("wrongForm") < 2) bad.push(`${at}: grammar blank needs 2 wrong-form distractors`);
      if (count("synonymPair") !== 2) bad.push(`${at}: grammar blank needs the synonym-pair trap`);
    } else if (want === "verbform") {
      if (count("wrongForm") < 3) bad.push(`${at}: verb-form blank needs wrong forms`);
    } else if (want === "oddoneout") {
      if (count("samePolarity") < 3) bad.push(`${at}: odd-one-out needs 4 same-polarity distractors`);
    } else if (want === "relative" || want === "transitional") {
      if (count("wrongType") < 2) bad.push(`${at}: ${want} blank needs wrong-kind distractors`);
    } else if (count("synonymPair") === 2) {
      // the pair IS the near-synonym trap on this gap, so only the other two roles are still owed
      if (count("opposite") < 1) bad.push(`${at}: no opposite-direction distractor`);
      if (count("wrongSlot") < 1) bad.push(`${at}: no same-topic-wrong-slot distractor`);
    } else {
      if (count("opposite") < 1) bad.push(`${at}: no opposite-direction distractor`);
      if (count("nearSynonym") < 1) bad.push(`${at}: no near-synonym distractor`);
      if (count("wrongSlot") < 1) bad.push(`${at}: no same-topic-wrong-slot distractor`);
      if (roles.some((r) => !ORDINARY_ROLES.includes(r as OptionRole))) {
        bad.push(`${at}: role ${roles.find((r) => !ORDINARY_ROLES.includes(r as OptionRole))} does not belong on a ${want} blank`);
      }
    }

    // the key must not be printed elsewhere, or the learner matches words instead of understanding
    if (!FUNCTION_TYPES.includes(want)) {
      const echoes = prose.match(new RegExp(`\\b${esc(key)}\\b`, "gi"));
      if (echoes && echoes.length > 0) bad.push(`${at}: key "${key}" also appears in the passage`);
    }

    const clue = strip(b.clue);
    const segs = clueSegments(clue);
    const anchor = clueAnchor(clue);
    if (!clue || segs.length === 0) bad.push(`${at}: no clue given`);
    else if (segs.some((s) => !norm(prose).includes(norm(s)))) {
      bad.push(`${at}: clue "${clue}" is not verbatim in the passage`);
    }
    // a one-word clue is legitimate when the word itself forces the key (submerged → water), but
    // "the" or "a" points at nothing
    else if (wordCount(anchor) < 2 && anchor.replace(/[^A-Za-z]/g, "").length < 6) {
      bad.push(`${at}: clue "${clue}" is too thin to point at anything`);
    }

    // a context or logic gap is only fair if its clue is within one sentence of it
    if ((want === "context" || want === "logic") && anchor && norm(prose).includes(norm(anchor))) {
      const before = text.split("[BLANK]").slice(0, i + 1).join(" ");
      const after = text.split("[BLANK]").slice(i + 1).join(" ");
      const near = `${before.split(/(?<=[.!?])\s/).slice(-2).join(" ")} ${after.split(/(?<=[.!?])\s/).slice(0, 2).join(" ")}`;
      if (!norm(passageProse(near)).includes(norm(anchor))) bad.push(`${at}: clue is more than one sentence from the gap`);
    }

    const why = String(b.explanationThai ?? "");
    if (!hasThai(why)) bad.push(`${at}: explanation is not in Thai`);
    if (strip(why).length < 40) bad.push(`${at}: explanation too thin`);
    // "ยก clue จริงจากบทอ่านมาอ้าง" — the explanation has to point at the passage, not just gloss the word
    if (anchor && !norm(why).includes(norm(anchor).split(" ").slice(0, 2).join(" "))) {
      bad.push(`${at}: explanation does not quote the clue`);
    }
    const named = opts.filter((o) => o.role !== "answer" && norm(why).includes(norm(o.text))).length;
    if (named < 2) bad.push(`${at}: explanation names ${named} distractors, want 2`);

    if (!hasThai(String(b.meaningTh ?? ""))) bad.push(`${at}: meaningTh is not Thai`);
    // a relative pronoun or a connector has no synonyms worth putting in a learner's notebook
    if (!FUNCTION_TYPES.includes(want) && (!Array.isArray(b.synonyms) || b.synonyms.filter((s) => strip(s)).length < 2)) {
      bad.push(`${at}: needs 2 synonyms`);
    }
  });

  if (!synonymPairSeen) bad.push("no synonym-pair trap anywhere in the passage");
  return bad;
}

/**
 * Places the key at B–E, never A, keeping the four positions level across the whole bank so no
 * position pays off. `used` is carried across every round and level.
 */
function placeKey(options: { text: string; role: OptionRole }[], key: string, used: number[], rnd: () => number): string[] {
  const from = options.findIndex((o) => norm(o.text) === norm(key));
  const correct = from >= 0 ? options[from]!.text : key;
  const rest = options.filter((_, i) => i !== from).map((o) => o.text);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [rest[i], rest[j]] = [rest[j]!, rest[i]!];
  }
  const min = Math.min(...used);
  const pool = used.map((c, i) => (c === min ? i : -1)).filter((i) => i >= 0);
  const slot = pool[Math.floor(rnd() * pool.length)]!;
  used[slot] += 1;
  rest.splice(slot + 1, 0, correct); // +1 so index 0 (option A) is never the key
  return rest;
}

function toPassageUnit(
  p: GenPassage,
  level: Level,
  passageNumber: number,
  used: number[],
  rnd: () => number,
): VocabPassageUnit {
  const blanks: VocabBlankQuestion[] = p.blanks.map((b, i) => ({
    question: `Which option best fits blank ${i + 1}?`,
    correctAnswer: strip(b.correctAnswer),
    options: placeKey(b.options.map((o) => ({ text: strip(o.text), role: o.role })), strip(b.correctAnswer), used, rnd),
    explanationThai: strip(b.explanationThai),
  }));
  return {
    passageNumber,
    contentLevel: level as VocabPassageContentLevel,
    titleEn: strip(p.titleEn),
    passageText: canonicalBlanks(p.passageText),
    blanks,
    correctWords: p.blanks.map((b) => ({
      word: strip(b.correctAnswer),
      synonyms: (b.synonyms ?? []).map(strip).filter(Boolean).slice(0, 3),
      meaningTh: strip(b.meaningTh),
    })),
  };
}

/**
 * Structural re-check of whatever is already in the bank. The pre-existing content fails on options
 * alone (4, not 5), which is why a first run replaces it wholesale rather than topping it up.
 */
function conforms(u: VocabPassageUnit, level: Level): boolean {
  const bp = BLUEPRINT[level];
  const text = canonicalBlanks(u.passageText ?? "");
  if (countMarkers(text) !== bp.mix.length) return false;
  if (!Array.isArray(u.blanks) || u.blanks.length !== bp.mix.length) return false;
  if (u.blanks.some((b) => (b.options ?? []).length !== 5)) return false;
  if (u.blanks.some((b) => !(b.options ?? []).some((o) => norm(o) === norm(b.correctAnswer)))) return false;
  if (u.blanks.some((b) => norm((b.options ?? [])[0] ?? "") === norm(b.correctAnswer))) return false;
  const w = wordCount(passageProse(text));
  if (w < bp.words[0] || w > bp.words[1]) return false;
  const title = strip(u.titleEn ?? "");
  if (!title || /\b(set|passage)\s*\d/i.test(title)) return false;
  return true;
}

/**
 * Closes a response that stopped one bracket short. Gemini reports finishReason STOP and still
 * omits the last `}` on long JSON often enough to cost a fifth of the run, and the answer up to
 * that point is complete and well-formed — so walk the brackets and shut them.
 */
function closeJson(text: string): string {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  for (const ch of text) {
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }
  let out = inString ? `${text}"` : text;
  while (stack.length) out += stack.pop() === "{" ? "}" : "]";
  return out;
}

/** The first complete top-level value, for responses that trail a second fragment after the object. */
function firstJsonValue(text: string): string {
  const start = text.search(/[{[]/);
  if (start < 0) return "";
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return "";
}

async function callGemini(prompt: string): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const model = process.env.GEMINI_MODEL ?? "gemini-3.7-flash";
  const body = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 1, responseMimeType: "application/json", maxOutputTokens: 65536 },
  });

  // 429/503 are load, not a bad request — a run of 150 calls will meet them, so back off and retry
  // rather than losing a whole batch to a spike.
  let res: Response | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    if (res.ok) break;
    if (res.status !== 429 && res.status !== 500 && res.status !== 503) break;
    await new Promise((r) => setTimeout(r, (2 ** attempt) * 4000 + Math.random() * 2000));
  }
  if (!res || !res.ok) throw new Error(`Gemini ${res?.status}: ${(await res?.text())?.slice(0, 200)}`);
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  };
  const finish = (json.candidates?.[0] as { finishReason?: string } | undefined)?.finishReason;
  // Gemini 3 returns its reasoning as extra parts flagged `thought` — concatenating those into the
  // answer is what turns a complete response into "unparseable JSON".
  const text =
    json.candidates?.[0]?.content?.parts
      ?.filter((p) => !p.thought)
      .map((p) => p.text ?? "")
      .join("") ?? "{}";
  try {
    return JSON.parse(text) as unknown;
  } catch (e) {
    // A finished response still fails to parse when a Thai explanation carries a raw newline: JSON
    // forbids literal control characters inside a string, and between tokens they are only
    // whitespace, so flattening them is safe and recovers the response instead of binning it.
    const flat = text.replace(/[\u0000-\u001F]+/g, " ");
    const open = flat.indexOf("{");
    const close = flat.lastIndexOf("}");
    for (const candidate of [
      closeJson(flat),
      firstJsonValue(flat),
      flat,
      open >= 0 && close > open ? flat.slice(open, close + 1) : "",
    ]) {
      if (!candidate) continue;
      try {
        return JSON.parse(candidate) as unknown;
      } catch {
        /* fall through to the next salvage */
      }
    }
    if (process.env.VOCAB_DUMP_BAD) fs.writeFileSync(`${process.env.VOCAB_DUMP_BAD}-${text.length}.txt`, text);
    throw new Error(
      `unparseable JSON (${text.length} chars, finish=${finish ?? "?"}, parts=${json.candidates?.[0]?.content?.parts?.length ?? 0}): ${String(e).slice(0, 140)} … ends "${text.slice(-60).replace(/\n/g, " ")}"`,
    );
  }
}

async function generate(
  level: Level,
  n: number,
  plans: BlankType[][],
  seeds: { domain: string; setting: string; angle: string }[],
  avoidTitles: string[],
  avoidAnswers: string[],
): Promise<GenPassage[]> {
  const out = (await callGemini(PROMPT(level, n, plans, seeds, avoidTitles, avoidAnswers))) as {
    passages?: GenPassage[];
  };
  return out.passages ?? [];
}

/**
 * Author-supplied passages declare their own gap types in any order, so the composition is checked
 * as a multiset against the level's mix and each gap is then judged against the type it claims.
 * This is the path `--validate` and `--ingest` use; the generator path pins the order up front.
 */
function ingestProblems(p: GenPassage, level: Level): string[] {
  const declared = (p.blanks ?? []).map((b) => b.type);
  const want = [...BLUEPRINT[level].mix].sort();
  const got = [...declared].sort();
  const bad: string[] = [];
  if (want.length !== got.length || want.some((t, i) => t !== got[i])) {
    const missing = want.filter((t) => !got.includes(t));
    const extra = got.filter((t) => !want.includes(t));
    bad.push(
      `gap-type mix is wrong for ${level}: want ${want.join(", ")}` +
        (missing.length ? ` · missing ${[...new Set(missing)].join(", ")}` : "") +
        (extra.length ? ` · unexpected ${[...new Set(extra)].join(", ")}` : ""),
    );
  }
  return [...bad, ...problems(p, level, declared.length ? declared : BLUEPRINT[level].mix)];
}

type IngestFile = { round: number; level: Level; passages: GenPassage[] };

function readIngestFile(path: string): IngestFile {
  const raw = JSON.parse(fs.readFileSync(path, "utf8")) as Partial<IngestFile>;
  if (!raw.level || !LEVELS.includes(raw.level)) throw new Error(`${path}: "level" must be easy | medium | hard`);
  if (!raw.round || !ROUNDS.includes(raw.round as (typeof ROUNDS)[number])) throw new Error(`${path}: "round" must be 1–5`);
  if (!Array.isArray(raw.passages) || raw.passages.length === 0) throw new Error(`${path}: "passages" must be a non-empty array`);
  return { round: raw.round, level: raw.level, passages: raw.passages };
}

/** Splits validator output into "the passage is wrong" and "gap n is wrong", which repair can fix. */
function splitProblems(bad: string[]): { global: string[]; byBlank: Map<number, string[]> } {
  const byBlank = new Map<number, string[]>();
  const global: string[] = [];
  for (const b of bad) {
    const m = /^blank (\d+): (.*)$/.exec(b);
    if (!m) global.push(b);
    else byBlank.set(Number(m[1]) - 1, [...(byBlank.get(Number(m[1]) - 1) ?? []), m[2]!]);
  }
  return { global, byBlank };
}

/**
 * Re-asks for only the gaps that failed, against the passage that already passed. Ten gaps is a lot
 * of constraint to satisfy at once, and throwing away nine good ones because the tenth quoted its
 * clue from two sentences away is how a run burns its budget.
 */
async function repair(
  level: Level,
  p: GenPassage,
  plan: BlankType[],
  byBlank: Map<number, string[]>,
  needSynonymPair: boolean,
): Promise<GenPassage> {
  const idx = [...byBlank.keys()].sort((a, b) => a - b);
  const prompt = `
You are fixing individual gaps in a DET vocabulary-in-context item. The passage below is FINAL and
must not change — every clue you cite has to be copied out of it word for word.

PASSAGE (gaps in reading order, [BLANK] = gap 1, 2, 3 …):
${canonicalBlanks(p.passageText)}

WHAT EACH TYPE MEANS
${[...new Set(idx.map((i) => plan[i]!))].map((t) => `- ${t}: ${TYPE_BRIEF[t]}`).join("\n")}

${ROLE_BRIEF}

Rewrite ONLY these gaps. Each was rejected for the reason given; fix exactly that, keep everything else
about the gap intact where it was already fine.
${idx
  .map((i) => {
    const b = p.blanks[i];
    return `Gap ${i + 1} (type ${plan[i]}) — rejected because: ${byBlank.get(i)!.join("; ")}
   current: key "${strip(b?.correctAnswer)}", options ${(b?.options ?? []).map((o) => `${o.text} [${o.role}]`).join(", ")}, clue "${strip(b?.clue)}"`;
  })
  .join("\n")}
${needSynonymPair ? "\nAt least one of the rewritten gaps must carry a synonymPair trap (exactly two options meaning the same thing, both wrong)." : ""}

Non-negotiables: exactly 5 options; all five the same part of speech and form and within one word of
each other in length (except the wrong forms on a grammar or verb-form gap); the key printed nowhere
else in the passage; the clue copied verbatim from the passage and sitting in the same sentence as its
gap or the one either side of it; explanationThai in Thai containing that clue verbatim in English
letters and naming at least two wrong options and what each does wrong.

Return every field for every gap you rewrite — a gap that comes back missing its clue, its Thai
explanation, its Thai meaning or its synonyms is thrown out along with the whole passage.

Return JSON only:
{"blanks":[{"index":<the gap number as given above>,"type":"...","correctAnswer":"...","options":[{"text":"...","role":"..."} × 5],"clue":"...","explanationThai":"...","meaningTh":"...","synonyms":["...","..."]}]}
`.trim();

  const fixed = (await callGemini(prompt)) as { blanks?: (GenBlank & { index?: number })[] };
  const next = { ...p, blanks: [...p.blanks] };
  for (const b of fixed.blanks ?? []) {
    const i = Number(b.index) - 1;
    if (!Number.isInteger(i) || i < 0 || i >= next.blanks.length) continue;
    next.blanks[i] = b;
  }
  return next;
}

async function main() {
  let seed = 20260816;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)]!;
  /** The blueprint order shuffled per passage, so gap 1 is not always a collocation. */
  const planFor = (level: Level): BlankType[] => {
    const m = [...BLUEPRINT[level].mix];
    for (let i = m.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [m[i], m[j]] = [m[j]!, m[i]!];
    }
    return m;
  };
  const seedsFor = (n: number) =>
    Array.from({ length: n }, () => ({ domain: pick(DOMAINS), setting: pick(SETTINGS), angle: pick(ANGLES) }));

  // `--spec=<level>` prints the authoring brief for a human or an agent writing passages by hand,
  // built from the same constants the validator uses so the two can never drift apart.
  if (specFor) {
    const lvl = specFor as Level;
    if (!LEVELS.includes(lvl)) throw new Error(`--spec must be one of ${LEVELS.join(" | ")}`);
    const bp = BLUEPRINT[lvl];
    console.log(`# Authoring brief — ${lvl} (CEFR ${bp.cefr})

PASSAGE
- ${bp.words[0]}–${bp.words[1]} words (gaps not counted), one or two paragraphs.
- ${bp.tone}
- The topic must be SPECIFIC, never a category: not "a library" but "the scroll-copying room of the
  library at Pergamon after Egypt cut off the papyrus supply". Invent concrete detail freely; no real
  named living people, no real organisations.
- Every gap is written [BLANK] — plain, unnumbered, in reading order. Nothing else in square brackets.
- titleEn: 2–9 words naming that specific case. Never "Set 1 Passage 3".

GAPS — exactly ${bp.mix.length}, and the mix must be exactly this (the ORDER is yours to choose):
${[...new Set(bp.mix)].map((t) => `  ${bp.mix.filter((x) => x === t).length} × ${t}`).join("\n")}

WHAT EACH TYPE MEANS
${[...new Set(bp.mix)].map((t) => `- ${t}: ${TYPE_BRIEF[t]}`).join("\n")}

THE FIVE OPTIONS
${ROLE_BRIEF}

HARD RULES
- All five options share one part of speech and one form, and sit within one word of each other in
  length — the ONLY exception is a grammar or verb-form gap, where wrong forms are the trap.
- The key must appear NOWHERE ELSE in the passage (relative-pronoun and transition gaps excepted).
- "clue": 2–8 words copied character-for-character out of the passage, never spanning a sentence
  boundary. You may leave the gap's own marker in it, e.g. "threatened to [BLANK] out". For context
  and logic gaps the clue must sit in the same sentence as its gap or the one either side of it.
- "explanationThai": Thai, containing that clue VERBATIM in English letters, saying why the key is
  right, and naming at least TWO wrong options by their English spelling with what each does wrong.
- "meaningTh": Thai meaning of the key. "synonyms": 2–3 English synonyms (empty for relative and
  transition gaps, which have none).
- Do not letter or number the options; give the bare word or phrase.

FILE FORMAT — one file per round+level:
{"round": 1, "level": "${lvl}", "passages": [
  {"titleEn": "...", "passageText": "... [BLANK] ...",
   "blanks": [
     {"type": "context", "correctAnswer": "...",
      "options": [{"text": "...", "role": "answer"}, {"text": "...", "role": "opposite"},
                  {"text": "...", "role": "wrongSlot"}, {"text": "...", "role": "wrongSlot"},
                  {"text": "...", "role": "nearSynonym"}],
      "clue": "...", "explanationThai": "...", "meaningTh": "...", "synonyms": ["...", "..."]}
   ]}
]}

CHECK YOUR WORK (writes nothing, exit code 1 until everything passes):
  npx tsx --tsconfig tsconfig.json scripts/build-vocab-exam-bank.ts --validate=<your-file.json>`);
    return;
  }

  if (preview) {
    const [lvl, n] = preview.split(":") as [Level, string];
    const count = Number(n ?? 1);
    const plans = Array.from({ length: count }, () => planFor(lvl));
    const out = await generate(lvl, count, plans, seedsFor(count), [], []);
    for (const [i, p] of out.entries()) {
      const itemPlan = plans[i]!;
      const first = problems(p, lvl, itemPlan);
      let cur = p;
      if (first.length) {
        const { global, byBlank } = splitProblems(first);
        const onlySynonym = global.length === 1 && global[0]!.startsWith("no synonym-pair");
        console.log(`\n… first pass rejected — ${first.join("; ")}`);
        if ((!global.length || onlySynonym) && byBlank.size > 0 && byBlank.size <= 6) {
          cur = await repair(lvl, cur, itemPlan, byBlank, onlySynonym);
        }
      }
      const bad = problems(cur, lvl, itemPlan);
      console.log(`\n${bad.length ? `✕ REJECTED — ${bad.join("; ")}` : "✓ valid"}\n`, JSON.stringify(cur, null, 1));
    }
    return;
  }

  // `--validate=<file|dir>` judges hand-authored passages with the same rules and writes nothing —
  // this is what an author iterates against until every passage comes back clean.
  if (validate) {
    const files = fs.statSync(validate).isDirectory()
      ? fs.readdirSync(validate).filter((f) => f.endsWith(".json")).map((f) => `${validate}/${f}`)
      : [validate];
    let clean = 0;
    let total = 0;
    for (const file of files.sort()) {
      let parsed: IngestFile;
      try {
        parsed = readIngestFile(file);
      } catch (e) {
        console.log(`✕ ${file}: ${String(e).replace(/^Error: /, "")}`);
        continue;
      }
      console.log(`\n${file} — round ${parsed.round} ${parsed.level}, ${parsed.passages.length} passages`);
      parsed.passages.forEach((p, i) => {
        total++;
        const bad = ingestProblems(p, parsed.level);
        if (!bad.length) {
          clean++;
          console.log(`  ✓ ${i + 1}. ${strip(p.titleEn)}`);
        } else {
          console.log(`  ✕ ${i + 1}. ${strip(p.titleEn) || "(no title)"}\n${bad.map((b) => `      - ${b}`).join("\n")}`);
        }
      });
    }
    console.log(`\n${clean}/${total} passages pass the spec`);
    if (clean < total) process.exitCode = 1;
    return;
  }

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await sb
    .from("content_bank_snapshots")
    .select("payload,updated_at")
    .eq("id", "global")
    .maybeSingle();
  if (error || !data) throw new Error(`snapshot read failed: ${error?.message}`);
  const payload = (typeof data.payload === "string" ? JSON.parse(data.payload) : data.payload) as Record<string, unknown>;
  const raw = payload["ep-vocab-sets"];
  const bank = (typeof raw === "string" ? JSON.parse(raw) : raw) as VocabFullBank;

  // what survives the spec, per round and level
  const keep: Record<string, VocabPassageUnit[]> = {};
  /** Untouched copy, so a `--only=…` run cannot wipe the slices it was not asked to rebuild. */
  const original: Record<string, VocabPassageUnit[]> = {};
  let dropped = 0;
  for (const round of ROUNDS) {
    const set = (bank[round] ?? []).find((s) => s.setNumber === SET_NUMBER);
    for (const level of LEVELS) {
      const all = (set?.passages ?? []).filter((p) => p.contentLevel === level);
      const good = all.filter((p) => conforms(p, level));
      dropped += all.length - good.length;
      original[`${round}:${level}`] = all;
      keep[`${round}:${level}`] = good;
    }
  }

  const plan: { round: number; level: Level; need: number }[] = [];
  for (const round of ROUNDS) {
    for (const level of LEVELS) {
      const need = Math.max(0, TARGET_PER_LEVEL - keep[`${round}:${level}`]!.length);
      if (need && (!only || only === `${round}:${level}`)) plan.push({ round, level, need });
    }
  }
  const totalNeed = plan.reduce((a, p) => a + p.need, 0);
  console.log(`vocab bank now ${(JSON.stringify(bank).length / 1e6).toFixed(2)} MB · whole content bank ${(JSON.stringify(payload).length / 1e6).toFixed(2)} MB`);
  console.log(`${dropped} existing passages fail the spec and will be replaced`);
  console.log(`to reach ${TARGET_PER_LEVEL} per level per round: ${totalNeed} new passages`);
  for (const p of plan) console.log(`  round ${p.round} ${p.level.padEnd(6)} +${p.need}`);
  if (DRY) return;

  const backup = `content-bank-backup-${new Date(data.updated_at as string).toISOString().replace(/[:.]/g, "-")}.json`;
  if (!fs.existsSync(backup)) fs.writeFileSync(backup, JSON.stringify(payload));
  console.log("backup →", backup);

  const usedTitles: string[] = [];
  const answerUse = new Map<string, number>();
  for (const key of Object.keys(keep)) {
    for (const p of keep[key]!) {
      usedTitles.push(strip(p.titleEn ?? ""));
      for (const b of p.blanks) answerUse.set(norm(b.correctAnswer), (answerUse.get(norm(b.correctAnswer)) ?? 0) + 1);
    }
  }
  const keyPositions = [0, 0, 0, 0];
  let made = 0;

  /**
   * Publishes what is finished so far. A full rebuild is 300 passages and hours of calls; writing
   * only at the end would throw all of it away on one crash, and a half-written bank is still a
   * valid bank — every slice it contains is spec-shaped, and a re-run tops up the rest.
   */
  const rebuilt = new Set<string>();
  const flush = async (note: string) => {
    for (const round of ROUNDS) {
      const passages = LEVELS.flatMap((level) => {
        const k = `${round}:${level}`;
        return rebuilt.has(k) ? keep[k]! : original[k]!;
      });
      bank[round] = [{ setNumber: SET_NUMBER, round, passages }];
    }
    payload["ep-vocab-sets"] = typeof raw === "string" ? JSON.stringify(bank) : bank;
    const { error: writeErr } = await sb
      .from("content_bank_snapshots")
      .update({ payload, updated_at: new Date().toISOString() })
      .eq("id", "global");
    console.log(
      writeErr
        ? `  WRITE FAILED (${note}): ${writeErr.message}`
        : `  published ${note} · vocab bank ${(JSON.stringify(bank).length / 1e6).toFixed(2)} MB`,
    );
  };

  // `--ingest=<file|dir>` publishes hand-authored passages. Same validator, same key placement, same
  // numbering as the generated path — the only difference is where the passages came from.
  if (ingest) {
    const files = fs.statSync(ingest).isDirectory()
      ? fs.readdirSync(ingest).filter((f) => f.endsWith(".json")).map((f) => `${ingest}/${f}`)
      : [ingest];
    let taken = 0;
    let refused = 0;
    for (const file of files.sort()) {
      let parsed: IngestFile;
      try {
        parsed = readIngestFile(file);
      } catch (e) {
        console.log(`✕ ${file}: ${String(e).replace(/^Error: /, "")}`);
        continue;
      }
      const k = `${parsed.round}:${parsed.level}`;
      const good: VocabPassageUnit[] = [];
      for (const p of parsed.passages) {
        if (keep[k]!.length + good.length >= TARGET_PER_LEVEL) break;
        const bad = ingestProblems(p, parsed.level);
        if (bad.length) {
          refused++;
          console.log(`  ✕ ${file} "${strip(p.titleEn)}" — ${bad.slice(0, 3).join("; ")}`);
          continue;
        }
        if (usedTitles.some((t) => norm(t) === norm(p.titleEn))) {
          refused++;
          console.log(`  ✕ ${file} "${strip(p.titleEn)}" — a passage with this title is already in the bank`);
          continue;
        }
        usedTitles.push(strip(p.titleEn));
        good.push(toPassageUnit(p, parsed.level, keep[k]!.length + good.length + 1, keyPositions, rnd));
      }
      keep[k] = [...keep[k]!, ...good].map((u, i) => ({ ...u, passageNumber: i + 1 }));
      taken += good.length;
      console.log(`${file}: +${good.length} → round ${parsed.round} ${parsed.level} (now ${keep[k]!.length})`);
      if (good.length > 0) rebuilt.add(k);
    }
    if (taken > 0) await flush(`${taken} ingested passages`);
    console.log(`ingested ${taken} passages · refused ${refused} · key positions B/C/D/E = ${keyPositions.join("/")}`);
    return;
  }

  for (const { round, level, need } of plan) {
    const accepted: GenPassage[] = [];
    let attempts = 0;
    const maxAttempts = Math.ceil(need / BATCH) + 14;

    while (accepted.length < need && attempts < maxAttempts) {
      attempts++;
      const overused = [...answerUse.entries()].filter(([, c]) => c >= 3).map(([w]) => w);
      const jobs = Array.from({ length: Math.min(CONCURRENCY, Math.ceil((need - accepted.length) / BATCH)) }, () => {
        const want = Math.min(BATCH, need - accepted.length);
        const plans = Array.from({ length: want }, () => planFor(level));
        return generate(level, want, plans, seedsFor(want), [...usedTitles, ...accepted.map((p) => strip(p.titleEn))], overused)
          .then((out) => out.map((p, i) => ({ p, plan: plans[i] ?? plans[0]! })))
          .catch((e) => {
            console.warn(`  ! r${round} ${level} batch failed — ${String(e).slice(0, 140)}`);
            return [] as { p: GenPassage; plan: BlankType[] }[];
          });
      });

      const candidates = (await Promise.all(jobs)).flat();
      const settled = await Promise.all(
        candidates.map(async ({ p, plan: itemPlan }) => {
          let cur = p;
          for (let pass = 0; pass < 3; pass++) {
            const bad = problems(cur, level, itemPlan);
            if (!bad.length) return { p: cur, plan: itemPlan, bad };
            const { global, byBlank } = splitProblems(bad);
            const onlySynonym = global.length === 1 && global[0]!.startsWith("no synonym-pair");
            // a wrong passage (length, markers, title) is not repairable — the gaps depend on it
            if (global.length && !onlySynonym) return { p: cur, plan: itemPlan, bad };
            // a passage that is only missing its synonym pair needs one ordinary gap reworked
            if (byBlank.size === 0 && onlySynonym) {
              const host = itemPlan.findIndex((t) => !["grammar", "verbform", "relative", "transitional", "oddoneout"].includes(t));
              if (host < 0) return { p: cur, plan: itemPlan, bad };
              byBlank.set(host, ["this passage has no synonym-pair trap anywhere; put it on this gap"]);
            }
            if (byBlank.size === 0 || byBlank.size > 6) return { p: cur, plan: itemPlan, bad };
            cur = await repair(level, cur, itemPlan, byBlank, onlySynonym).catch(() => cur);
          }
          return { p: cur, plan: itemPlan, bad: problems(cur, level, itemPlan) };
        }),
      );

      {
        for (const { p, bad } of settled) {
          if (accepted.length >= need) break;
          if (bad.length) {
            console.log(`  ✕ r${round} ${level} "${strip(p.titleEn)}" — ${bad.slice(0, 3).join("; ")}`);
            continue;
          }
          if (usedTitles.some((t) => norm(t) === norm(p.titleEn))) continue;
          const contentKeys = p.blanks
            .filter((b) => !FUNCTION_TYPES.includes(b.type))
            .map((b) => norm(b.correctAnswer));
          if (contentKeys.some((k) => (answerUse.get(k) ?? 0) >= 3)) {
            console.log(`  ✕ r${round} ${level} "${strip(p.titleEn)}" — reuses a key already in the bank 3 times`);
            continue;
          }
          usedTitles.push(strip(p.titleEn));
          for (const k of contentKeys) answerUse.set(k, (answerUse.get(k) ?? 0) + 1);
          accepted.push(p);
        }
      }
      console.log(`  round ${round} ${level}: ${accepted.length}/${need}`);
    }

    if (accepted.length < need) {
      console.warn(`  !! round ${round} ${level}: only ${accepted.length}/${need} passed validation after ${attempts} attempts`);
    }

    const kept = keep[`${round}:${level}`]!;
    const units = accepted.map((p, i) => toPassageUnit(p, level, kept.length + i + 1, keyPositions, rnd));
    keep[`${round}:${level}`] = [...kept, ...units].map((p, i) => ({ ...p, passageNumber: i + 1 }));
    made += units.length;
    console.log(`round ${round} ${level}: +${units.length} (now ${keep[`${round}:${level}`]!.length})`);
    if (units.length > 0) {
      rebuilt.add(`${round}:${level}`);
      await flush(`round ${round} ${level}`);
    }
  }

  console.log(`done — ${made} new passages · key positions B/C/D/E = ${keyPositions.join("/")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
