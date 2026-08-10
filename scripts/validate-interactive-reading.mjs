/**
 * Checks every Interactive Reading set against the parameters measured from the six real DET
 * practice sets (docs/reading/det-interactive-reading-item-spec.md). Run after editing the bank:
 *
 *   node scripts/validate-interactive-reading.mjs
 *
 * Fails loudly rather than silently letting an off-format item into the bank — the whole point of
 * the rebuild is that our items behave like the real ones.
 */
import { readFileSync } from "node:fs";

const target = process.argv[2] ?? "../src/lib/interactive-reading-data.ts";
const src = readFileSync(target.startsWith("/") ? target : new URL(target, import.meta.url), "utf8");
const body = src.slice(src.indexOf("= [") + 2, src.lastIndexOf("];") + 1);
// the file is hand-authored TS, but every value in it is JSON-compatible
const SETS = eval(body); // eslint-disable-line no-eval

/** Words the real cloze targets that are NOT vocabulary — DET spends a third of its blanks here. */
const FUNCTION_WORDS = new Set(
  ("a an the is are was were be been being has have had do does did will would can could should must may might" +
    " who whom whose which that what when where why how if unless although though because since until before after" +
    " and but or so nor for yet in on at by with from of to into onto about over under between among during" +
    " not no enough more most many much few little both each every either neither some any as than there here it its" +
    " this these those his her their our your my")
    .split(/\s+/),
);

/** The nine stem families collected from the real sets. */
const STEM_FAMILIES = [
  [/^what happens as a result/i, "cause/result"],
  [/^(what is the reason|why )/i, "reason"],
  [/^how (do|does|did) .*(benefit|help|relate|work|choose|respond|feel)/i, "function/relation"],
  [/^where /i, "location"],
  [/^what (is|are) the (main )?(responsibility|role|point|purpose)/i, "role"],
  [/^in addition to/i, "addition"],
  [/^what (does|did) the author/i, "author preference/action"],
  [/^what (career|did) /i, "outcome"],
  [/^(which|what) /i, "identify"],
];

const LIMITS = {
  passageWords: [110, 270],
  blanks: [7, 10],
  optionsPerBlank: 5,
  gapOptions: 5,
  ideaOptions: 5,
  titleOptions: 5,
  titleWords: [3, 6],
  highlightChars: [15, 125],
  functionWordShare: 1 / 3,
};

const TIER_LEVEL = { easy: "B1", medium: "B2", advanced: "C1" };

let problems = 0;
const warn = (id, msg) => {
  problems += 1;
  console.log(`  ✗ ${id}: ${msg}`);
};

console.log(`Interactive Reading bank — ${SETS.length} sets\n`);

for (const s of SETS) {
  const words = s.paragraphs.join(" ").replace(/\{\d+\}/g, "x").split(/\s+/).filter(Boolean).length;
  const subItems = s.blanks.length + 5;
  const seconds = subItems >= 11 ? 480 : 420;
  console.log(`${s.id} ${s.tier}/${s.level} · ${words}w · ${s.blanks.length} blanks · ${subItems} sub-items · ${seconds / 60}min · ${s.topicTh}`);

  if (words < LIMITS.passageWords[0] || words > LIMITS.passageWords[1])
    warn(s.id, `passage is ${words} words, real range is ${LIMITS.passageWords.join("–")}`);

  if (TIER_LEVEL[s.tier] !== s.level) warn(s.id, `tier "${s.tier}" should carry level ${TIER_LEVEL[s.tier]}, not ${s.level}`);

  if (s.blanks.length < LIMITS.blanks[0] || s.blanks.length > LIMITS.blanks[1])
    warn(s.id, `${s.blanks.length} blanks, real range is ${LIMITS.blanks.join("–")}`);

  s.blanks.forEach((b, i) => {
    if (b.n !== i + 1) warn(s.id, `blank ${b.n} is out of order (position ${i + 1})`);
    if (b.options.length !== LIMITS.optionsPerBlank) warn(s.id, `blank ${b.n} has ${b.options.length} options, real is 5`);
    if (!b.options.includes(b.answer)) warn(s.id, `blank ${b.n} answer "${b.answer}" is not among its options`);
    if (new Set(b.options).size !== b.options.length) warn(s.id, `blank ${b.n} has a duplicate option`);
    if (!b.whyTh?.trim()) warn(s.id, `blank ${b.n} has no Thai explanation`);
  });

  const markers = s.paragraphs.join(" ").match(/\{(\d+)\}/g) ?? [];
  if (markers.length !== s.blanks.length) warn(s.id, `${markers.length} {n} markers but ${s.blanks.length} blanks defined`);

  const fnBlanks = s.blanks.filter((b) => FUNCTION_WORDS.has(b.answer.toLowerCase())).length;
  const share = fnBlanks / s.blanks.length;
  if (share < LIMITS.functionWordShare)
    warn(s.id, `only ${fnBlanks}/${s.blanks.length} blanks target function words — real sets run about a third or more`);

  if (s.gap.length !== LIMITS.gapOptions) warn(s.id, `${s.gap.length} sentence options, real is 5`);
  if (s.gap.filter((g) => g.correct).length !== 1) warn(s.id, "sentence completion must have exactly one key");
  if (s.gapAfter < 1 || s.gapAfter >= s.paragraphs.length) warn(s.id, `gapAfter ${s.gapAfter} leaves no block after the gap`);

  const resolved = s.paragraphs.map((p) => p.replace(/\{(\d+)\}/g, (_m, d) => s.blanks.find((b) => b.n === Number(d)).answer));
  resolved.splice(s.gapAfter, 0, s.gap.find((g) => g.correct).text);

  if (s.highlights.length !== 2) warn(s.id, `${s.highlights.length} highlight questions, real is 2`);
  let shortOne = false;
  s.highlights.forEach((h, i) => {
    const para = resolved[h.paragraph - 1];
    if (!para) return warn(s.id, `highlight ${i + 1} points at paragraph ${h.paragraph}, which does not exist`);
    if (!para.includes(h.answer)) warn(s.id, `highlight ${i + 1} answer is not an exact substring of paragraph ${h.paragraph}`);
    const len = h.answer.length;
    if (len < LIMITS.highlightChars[0] || len > LIMITS.highlightChars[1])
      warn(s.id, `highlight ${i + 1} answer is ${len} chars, real range is ${LIMITS.highlightChars.join("–")}`);
    if (len < 40) shortOne = true;
    if (!STEM_FAMILIES.some(([re]) => re.test(h.questionEn)))
      warn(s.id, `highlight ${i + 1} stem "${h.questionEn}" matches none of the real stem families`);
  });
  if (!shortOne) warn(s.id, "neither highlight answer is under 40 chars — real sets always include a short span");

  for (const [name, list, n] of [
    ["idea", s.idea, LIMITS.ideaOptions],
    ["title", s.title, LIMITS.titleOptions],
  ]) {
    if (list.length !== n) warn(s.id, `${name} has ${list.length} options, real is ${n}`);
    if (list.filter((o) => o.correct).length !== 1) warn(s.id, `${name} must have exactly one key`);
    if (list.some((o) => !o.whyTh?.trim())) warn(s.id, `${name} has an option with no Thai explanation`);
  }

  // DET keeps the idea options the same length so length is not a cue
  const ideaLens = s.idea.map((o) => o.text.split(/\s+/).length);
  if (Math.max(...ideaLens) - Math.min(...ideaLens) > 8)
    warn(s.id, `idea options range ${Math.min(...ideaLens)}–${Math.max(...ideaLens)} words — too uneven, length becomes a clue`);

  s.title.forEach((t) => {
    const n = t.text.split(/\s+/).length;
    if (n < LIMITS.titleWords[0] || n > LIMITS.titleWords[1]) warn(s.id, `title "${t.text}" is ${n} words, real is 3–6`);
    if (/[.!?]$/.test(t.text)) warn(s.id, `title "${t.text}" is punctuated like a sentence`);
  });
}

const tiers = SETS.reduce((a, s) => ({ ...a, [s.tier]: (a[s.tier] ?? 0) + 1 }), {});
console.log(`\ntier spread: ${JSON.stringify(tiers)}`);
console.log(problems ? `\n${problems} problem(s) found.` : "\nAll sets match the measured DET parameters.");
process.exit(problems ? 1 : 0);
