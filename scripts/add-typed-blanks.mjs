/**
 * Adds typed prefix-hint vocabulary blanks to the บทเรียน write-about-photo and
 * read-&-write banks.
 *
 * Each added blank is `mode:"type"` — the learner sees the first 2–3 letters in
 * blue, one empty box per remaining letter, and a Thai-meaning hint. Existing
 * dropdown blanks are preserved untouched and tagged `mode:"choose"`.
 *
 * Rewrites, in place:
 *   DET APP 1/src/lib/{readwrite-lessons-data,photo-write-lessons-data}.ts
 *   det-mobile/src/lib/{readwrite-lessons-data,photo-write-lessons-data}.ts
 *
 * Run:  node scripts/add-typed-blanks.mjs
 */
import fs from "fs";
import path from "path";

const WEB = process.cwd();
const MOBILE = path.resolve(WEB, "../det-mobile");

const STOP = new Set(
  "the a an and or but so if then than that this these those there here of in on at to for with from by as is are was were be been being am do does did have has had will would can could should may might must not no nor it its they them their we our you your my me he she his her him who whom which what when where why how all any both each few more most other some such only own same too very just also into about over under again once during before after above below down out off now".split(" "),
);

/** words that read badly as a typed blank even when a gloss exists */
const BLOCK = new Set("cannot going want like really thing things very much many".split(" "));

const TARGET_BY_TIER = { easy: 5, medium: 7, advanced: 8 };
/** Photo captions are capped at 4 sentences, so they hold fewer typed blanks. */
const PHOTOWRITE_TYPED_TARGET = 5;

function load(file) {
  const t = fs.readFileSync(file, "utf8");
  const head = t.slice(0, t.indexOf("= [") + 2);
  const body = t.slice(t.indexOf("= [") + 2, t.lastIndexOf("];") + 1);
  return { head, items: JSON.parse(body.replace(/,\s*\]$/, "]")) };
}

function write(file, head, items) {
  const rows = items.map((i) => "  " + JSON.stringify(i)).join(",\n");
  fs.writeFileSync(file, `${head}[\n${rows},\n];\n`);
}

function prefixLenFor(word) {
  if (word.length <= 6) return 2;
  return 3;
}

/** split a template into text / blank parts, keeping blank ids */
function parts(template) {
  const out = [];
  const re = /\[\[(\d+)\]\]/g;
  let last = 0;
  let m;
  while ((m = re.exec(template))) {
    if (m.index > last) out.push({ text: template.slice(last, m.index) });
    out.push({ blank: Number(m[1]) });
    last = m.index + m[0].length;
  }
  if (last < template.length) out.push({ text: template.slice(last) });
  return out;
}

const extraGloss = JSON.parse(fs.readFileSync(path.join(WEB, "scripts/th-gloss-extra.json"), "utf8"));

function buildGlossary(banks) {
  const th = new Map();
  const en = new Map();
  for (const items of banks) {
    for (const it of items) {
      for (const v of it.vocab || []) {
        const k = v.word.toLowerCase();
        if (!th.has(k)) {
          th.set(k, v.th);
          en.set(k, v.en);
        }
      }
    }
  }
  for (const [k, v] of Object.entries(extraGloss)) if (!th.has(k)) th.set(k, v);
  return { th, en };
}

/**
 * Pick target words for one item and rewrite its template + blanks.
 * New blanks are appended, then everything is renumbered in reading order so the
 * "ช่องที่ N" labels match the passage.
 */
function addBlanks(item, gloss, target) {
  const ownVocab = new Set((item.vocab || []).map((v) => v.word.toLowerCase()));
  const segs = parts(item.template);
  const used = new Set(item.blanks.map((b) => b.answer.toLowerCase()));

  // candidate occurrences: {segIndex, start, end, word}
  const cands = [];
  segs.forEach((s, si) => {
    if (!("text" in s)) return;
    const re = /[A-Za-z]+/g;
    let m;
    while ((m = re.exec(s.text))) {
      const w = m[0];
      const lower = w.toLowerCase();
      if (w.length < 4 || STOP.has(lower) || BLOCK.has(lower)) continue;
      if (!gloss.th.has(lower)) continue;
      // Never blank a word that sits directly against another blank — runs of
      // adjacent blanks ("some __ __ __ a big __") are unreadable.
      const touchesPrev = si > 0 && !("text" in segs[si - 1]) && !s.text.slice(0, m.index).trim();
      const touchesNext = si < segs.length - 1 && !("text" in segs[si + 1]) && !s.text.slice(m.index + w.length).trim();
      if (touchesPrev || touchesNext) continue;
      cands.push({ si, start: m.index, end: m.index + w.length, word: w, lower });
    }
  });

  // prefer the item's own taught vocabulary, then spread across the passage
  cands.sort((a, b) => (ownVocab.has(b.lower) ? 1 : 0) - (ownVocab.has(a.lower) ? 1 : 0) || a.si - b.si);

  const chosen = [];
  const takenSeg = new Map();
  for (const c of cands) {
    if (chosen.length >= target) break;
    if (used.has(c.lower)) continue;
    if ((takenSeg.get(c.si) || 0) >= 2) continue; // don't stack blanks in one run of text
    // ...nor sit directly beside a blank we already picked in this same run
    const text = segs[c.si].text;
    const adjacent = chosen.some(
      (o) =>
        o.si === c.si &&
        ((o.end <= c.start && !text.slice(o.end, c.start).trim()) || (c.end <= o.start && !text.slice(c.end, o.start).trim())),
    );
    if (adjacent) continue;
    used.add(c.lower);
    takenSeg.set(c.si, (takenSeg.get(c.si) || 0) + 1);
    chosen.push(c);
  }

  // splice chosen occurrences into the segment text, right-to-left per segment
  const newBlanks = [];
  const bySeg = new Map();
  for (const c of chosen) {
    if (!bySeg.has(c.si)) bySeg.set(c.si, []);
    bySeg.get(c.si).push(c);
  }
  let nextId = item.blanks.length;
  // Existing blanks keep their behaviour; tag the mode explicitly and make sure
  // every typed one can show a Thai hint (older vocabulary blanks had none).
  const blankById = new Map(
    item.blanks.map((b, i) => {
      const mode = b.options?.length ? "choose" : "type";
      const next = { ...b, mode };
      if (mode === "type" && !next.meaningTh) next.meaningTh = gloss.th.get(b.answer.toLowerCase()) || b.ruleTh;
      return [i, next];
    }),
  );
  for (const [si, list] of bySeg) {
    list.sort((a, b) => b.start - a.start);
    let text = segs[si].text;
    for (const c of list) {
      const id = nextId++;
      text = text.slice(0, c.start) + `[[${id}]]` + text.slice(c.end);
      const lower = c.lower;
      blankById.set(id, {
        answer: c.word,
        prefixLength: prefixLenFor(c.word),
        kind: "vocabulary",
        mode: "type",
        meaningTh: gloss.th.get(lower),
        ruleEn: gloss.en.get(lower) || `Vocabulary in context: "${c.word}"`,
        ruleTh: gloss.th.get(lower),
      });
      newBlanks.push(id);
    }
    segs[si] = { text };
  }

  const template = segs.map((s) => ("text" in s ? s.text : `[[${s.blank}]]`)).join("");

  // renumber in reading order
  const order = [];
  template.replace(/\[\[(\d+)\]\]/g, (_, n) => order.push(Number(n)));
  const remap = new Map(order.map((oldId, i) => [oldId, i]));
  const finalTemplate = template.replace(/\[\[(\d+)\]\]/g, (_, n) => `[[${remap.get(Number(n))}]]`);
  const finalBlanks = order.map((oldId) => blankById.get(oldId));

  return { ...item, template: finalTemplate, blanks: finalBlanks, addedTyped: newBlanks.length };
}

function run() {
  const rwFile = "src/lib/readwrite-lessons-data.ts";
  const pwFile = "src/lib/photo-write-lessons-data.ts";
  const rw = load(path.join(WEB, rwFile));
  const pw = load(path.join(WEB, pwFile));
  const gloss = buildGlossary([rw.items, pw.items]);

  const stats = { rw: [], pw: [] };
  for (const [key, bank] of [["rw", rw], ["pw", pw]]) {
    bank.items = bank.items.map((it) => {
      // TARGET_BY_TIER is a ceiling on TOTAL typed blanks, not an increment: the
      // legacy `fill` items already ship 10-13 of them and must not be inflated.
      const existingTyped = it.blanks.filter((b) => !b.options?.length).length;
      const ceiling = key === "pw" ? PHOTOWRITE_TYPED_TARGET : TARGET_BY_TIER[it.tier] ?? 6;
      const target = Math.max(0, ceiling - existingTyped);
      const next = addBlanks(it, gloss, target);
      stats[key].push(next.addedTyped);
      delete next.addedTyped;
      return next;
    });
  }

  for (const root of [WEB, MOBILE]) {
    if (!fs.existsSync(root)) {
      console.log("skip (missing):", root);
      continue;
    }
    for (const [file, bank] of [[rwFile, rw], [pwFile, pw]]) {
      const dest = path.join(root, file);
      if (!fs.existsSync(dest)) {
        console.log("skip (missing):", dest);
        continue;
      }
      const existingHead = fs.readFileSync(dest, "utf8");
      const head = existingHead.slice(0, existingHead.indexOf("= [") + 2);
      write(dest, head, bank.items);
      console.log("wrote", dest);
    }
  }

  for (const k of ["rw", "pw"]) {
    const a = stats[k];
    console.log(`${k}: items ${a.length} · typed blanks added min ${Math.min(...a)} max ${Math.max(...a)} avg ${(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1)}`);
  }
}

run();
