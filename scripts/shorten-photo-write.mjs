/**
 * Trims every บทเรียน "เขียนจากภาพ" caption to at most 4 sentences.
 *
 * The authored captions ran 5–12 sentences. Truncating drops the blanks that
 * lived in the removed tail, so this also caps how many dropdown blanks survive
 * (a 4-sentence caption can't carry ~7 dropdowns AND the typed vocabulary
 * blanks), renumbers what's left in reading order, and recomputes `answer`.
 *
 * Reads the PRE-typed-blank bank (git HEAD) so reruns never compound. Run this
 * BEFORE scripts/add-typed-blanks.mjs:
 *
 *   node scripts/shorten-photo-write.mjs && node scripts/add-typed-blanks.mjs
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const WEB = process.cwd();
const MOBILE = path.resolve(WEB, "../det-mobile");
const FILE = "src/lib/photo-write-lessons-data.ts";

const MAX_SENTENCES = 4;
/** A 4-sentence caption stays readable with at most this many dropdown blanks. */
const MAX_CHOOSE_BLANKS = 4;

/**
 * Authoring defects in the source bank, fixed on the way through.
 * wp-e2-4: blank 5's answer is "deep" and the very next word is also "deep", so
 * the model answer reads "taking deep deep breaths".
 */
const CORRECTIONS = {
  "wp-e2-4": (t) => t.replace("[[5]] deep breaths", "[[5]] breaths"),
};

function parse(source) {
  const i = source.indexOf("= [");
  const j = source.lastIndexOf("];");
  return JSON.parse(source.slice(i + 2, j + 1).replace(/,\s*\]$/, "]"));
}

function write(file, items) {
  const existing = fs.readFileSync(file, "utf8");
  const head = existing.slice(0, existing.indexOf("= [") + 2);
  const rows = items.map((i) => "  " + JSON.stringify(i)).join(",\n");
  fs.writeFileSync(file, `${head}[\n${rows},\n];\n`);
}

/** Split on sentence enders, keeping `[[n]]` tokens intact. */
function sentences(template) {
  return template.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length);
}

function shorten(item) {
  // Cut, cap, and re-measure until stable: dropping a blank substitutes its
  // answer back in, and some answers ARE sentence enders ("." / "!"), which can
  // push the caption back over the limit on the first pass.
  let text = CORRECTIONS[item.id] ? CORRECTIONS[item.id](item.template) : item.template;
  let keptIds = [];

  for (let pass = 0; pass < 6; pass++) {
    const cut = sentences(text).slice(0, MAX_SENTENCES).join(" ").trim();

    const order = [];
    cut.replace(/\[\[(\d+)\]\]/g, (_m, n) => order.push(Number(n)));
    const keep = new Set(order.slice(0, MAX_CHOOSE_BLANKS));

    // Blanks that didn't make the cut become plain words again.
    const next = cut.replace(/\[\[(\d+)\]\]/g, (_m, n) => {
      const id = Number(n);
      return keep.has(id) ? `[[${id}]]` : item.blanks[id].answer;
    });

    keptIds = order.filter((id) => keep.has(id));
    if (next === text && sentences(next).length <= MAX_SENTENCES) {
      text = next;
      break;
    }
    text = next;
    if (sentences(text).length <= MAX_SENTENCES) {
      // one more pass only if the cap still has blanks to drop
      const remaining = (text.match(/\[\[\d+\]\]/g) || []).length;
      if (remaining <= MAX_CHOOSE_BLANKS) break;
    }
  }

  // Renumber the survivors in reading order.
  const finalOrder = [];
  text.replace(/\[\[(\d+)\]\]/g, (_m, n) => finalOrder.push(Number(n)));
  const remap = new Map(finalOrder.map((id, i) => [id, i]));
  const template = text.replace(/\[\[(\d+)\]\]/g, (_m, n) => `[[${remap.get(Number(n))}]]`);
  const blanks = finalOrder.map((id) => item.blanks[id]);
  const answer = template.replace(/\[\[(\d+)\]\]/g, (_m, n) => blanks[Number(n)].answer);

  return { ...item, template, blanks, answer };
}

const original = parse(execFileSync("git", ["show", `HEAD:${FILE}`], { cwd: WEB, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
const items = original.map(shorten);

for (const root of [WEB, MOBILE]) {
  const dest = path.join(root, FILE);
  if (!fs.existsSync(dest)) {
    console.log("skip (missing):", dest);
    continue;
  }
  write(dest, items);
  console.log("wrote", dest);
}

const sc = items.map((i) => sentences(i.template).length);
const bl = items.map((i) => i.blanks.length);
console.log(`items ${items.length} · sentences max ${Math.max(...sc)} · dropdown blanks min ${Math.min(...bl)} max ${Math.max(...bl)}`);
