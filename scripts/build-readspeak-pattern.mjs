/**
 * Rewrites อ่านแล้วพูด (read-and-speak) lesson items from the hand-authored
 * pattern source: a QUESTION topic plus a four-move model answer
 * (direct → explain → example → conclude).
 *
 * Items not present in the source are left exactly as they are, so this can be
 * run repeatedly while the remaining units are still being authored.
 *
 * Blanks are inserted automatically from readspeak-pattern-bank.json, which
 * targets the connectives and signature verbs of the pattern itself
 * (For example / Overall / allows for / promotes / essential …).
 *
 * Run:  node scripts/build-readspeak-pattern.mjs
 */
import fs from "fs";
import path from "path";

const WEB = process.cwd();
const MOBILE = path.resolve(WEB, "../det-mobile");
const FILE = "src/lib/readspeak-lessons-data.ts";

const MAX_BLANKS = 5;
/** Model answers must land in this band — long enough to show all four moves. */
const MIN_WORDS = 120;
const MAX_WORDS = 150;

const source = JSON.parse(fs.readFileSync(path.join(WEB, "scripts/readspeak-pattern-source.json"), "utf8"));
const bank = JSON.parse(fs.readFileSync(path.join(WEB, "scripts/readspeak-pattern-bank.json"), "utf8")).entries;

function parse(src) {
  const i = src.indexOf("= [");
  const j = src.lastIndexOf("];");
  return JSON.parse(src.slice(i + 2, j + 1).replace(/,\s*\]$/, "]"));
}

function write(file, items) {
  const existing = fs.readFileSync(file, "utf8");
  const head = existing.slice(0, existing.indexOf("= [") + 2);
  const rows = items.map((i) => "  " + JSON.stringify(i)).join(",\n");
  fs.writeFileSync(file, `${head}[\n${rows},\n];\n`);
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Blank out up to MAX_BLANKS pattern phrases in the answer, spread across the
 * four moves so every move carries at most two.
 */
function buildTemplate(answer, moves) {
  // candidate matches, in reading order, longest phrase first at each position
  const hits = [];
  for (const entry of bank) {
    const re = new RegExp(`(^|[^A-Za-z])(${escapeRe(entry.match)})(?![A-Za-z])`, "g");
    let m;
    while ((m = re.exec(answer))) {
      hits.push({ start: m.index + m[1].length, end: m.index + m[1].length + m[2].length, text: m[2], entry });
    }
  }
  hits.sort((a, b) => a.start - b.start || b.end - a.end);

  // which move does each hit fall in? (moves are concatenated in order)
  const bounds = [];
  let at = 0;
  for (const mv of moves) {
    bounds.push([at, at + mv.en.length]);
    at += mv.en.length + 1; // the space used to join
  }
  const moveOf = (pos) => bounds.findIndex(([s, e]) => pos >= s && pos < e);

  const chosen = [];
  const perMove = new Map();
  for (const h of hits) {
    if (chosen.length >= MAX_BLANKS) break;
    if (chosen.some((c) => h.start < c.end && c.start < h.end)) continue; // overlap
    const mi = moveOf(h.start);
    if ((perMove.get(mi) || 0) >= 2) continue;
    perMove.set(mi, (perMove.get(mi) || 0) + 1);
    chosen.push(h);
  }
  chosen.sort((a, b) => a.start - b.start);

  let template = "";
  let cursor = 0;
  const blanks = [];
  chosen.forEach((h, i) => {
    template += answer.slice(cursor, h.start) + `[[${i}]]`;
    cursor = h.end;
    // Keep the exact casing that appears in the answer (sentence-initial ones
    // are capitalised); options follow suit so the dropdown reads naturally.
    const capitalised = h.text[0] === h.text[0].toUpperCase() && h.entry.match[0] === h.entry.match[0].toLowerCase();
    const cap = (s) => (capitalised ? s[0].toUpperCase() + s.slice(1) : s);
    blanks.push({
      answer: h.text,
      options: h.entry.options.map(cap),
      ruleEn: h.entry.ruleEn,
      ruleTh: h.entry.ruleTh,
    });
  });
  template += answer.slice(cursor);
  return { template, blanks };
}

const problems = [];
for (const it of source.items) {
  const words = it.moves.map((m) => m.en).join(" ").split(/\s+/).length;
  if (words < MIN_WORDS || words > MAX_WORDS) problems.push(`${it.id}: ${words} words (want ${MIN_WORDS}-${MAX_WORDS})`);
  if (!it.topic.trim().endsWith("?")) problems.push(`${it.id}: topic is not a question`);
  const kinds = it.moves.map((m) => m.kind).join(",");
  if (kinds !== "direct,explain,example,conclude") problems.push(`${it.id}: moves are ${kinds}`);
  for (const m of it.moves) if (!m.th?.trim()) problems.push(`${it.id}: ${m.kind} move has no Thai`);
}
if (problems.length) {
  console.error("SOURCE PROBLEMS:\n  " + problems.join("\n  "));
  process.exit(1);
}

const rewrites = new Map(source.items.map((i) => [i.id, i]));
const web = parse(fs.readFileSync(path.join(WEB, FILE), "utf8"));

let done = 0;
const next = web.map((item) => {
  const src = rewrites.get(item.id);
  if (!src) return item;
  const answer = src.moves.map((m) => m.en).join(" ");
  const { template, blanks } = buildTemplate(answer, src.moves);
  if (blanks.length < 3) throw new Error(`${item.id}: only ${blanks.length} pattern blanks found — add pattern language to the answer`);
  done++;
  return {
    ...item,
    topic: src.topic,
    topicTh: src.topicTh,
    family: src.family,
    template,
    blanks,
    answer,
    moves: src.moves,
    vocab: src.vocab ?? item.vocab,
  };
});

for (const root of [WEB, MOBILE]) {
  const dest = path.join(root, FILE);
  if (!fs.existsSync(dest)) {
    console.log("skip (missing):", dest);
    continue;
  }
  write(dest, next);
  console.log("wrote", dest);
}

const rewritten = next.filter((i) => i.moves);
const words = rewritten.map((i) => i.answer.split(/\s+/).length).sort((a, b) => a - b);
console.log(`rewritten ${done}/${web.length} items`);
if (rewritten.length) {
  console.log(`  answer words: min ${words[0]} median ${words[Math.floor(words.length / 2)]} max ${words.at(-1)}`);
  console.log(`  blanks: ${Math.min(...rewritten.map((i) => i.blanks.length))}-${Math.max(...rewritten.map((i) => i.blanks.length))}`);
  console.log(`  questions: ${rewritten.filter((i) => i.topic.trim().endsWith("?")).length}/${rewritten.length}`);
}
