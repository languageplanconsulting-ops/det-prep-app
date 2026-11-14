/**
 * Checks and imports hand-written Dialogue Summary sets (ฟังแล้วสรุป / "Write a summary of the
 * conversation you just had") into the shared content bank.
 *
 *   npx tsx --env-file=.env.local scripts/build-dialogue-summary-bank.ts --plan
 *   npx tsx --env-file=.env.local scripts/build-dialogue-summary-bank.ts --topics
 *   npx tsx --env-file=.env.local scripts/build-dialogue-summary-bank.ts --add=3:easy:/path/batch.json [--replace]
 *   npx tsx --env-file=.env.local scripts/build-dialogue-summary-bank.ts --check [--verbose]
 *   npx tsx --env-file=.env.local scripts/build-dialogue-summary-bank.ts --upload-only
 *
 * (Node ≥ 23 also runs it directly: `node --env-file=.env.local scripts/build-dialogue-summary-bank.ts`.)
 *
 * `--plan`    slot-by-slot view: set numbers live in the bank, saved locally, and still missing
 *             against TARGET_SET_NUMBERS (every slot should hold sets 1–20).
 * `--topics`  every title already used (live bank + saved files), to pick new topics from.
 * `--add`     validates a batch (`{"exams":[...]}` or a bare array) for one round × difficulty and
 *             appends the clean sets to generated-dialogue-summary/round<r>-<difficulty>.json.
 *             Rejected sets are listed with reasons and never saved.
 * `--check`   re-validates everything saved, including cross-file topic clashes. Read-only.
 * `--upload-only` merges every saved set into the live `content_bank_snapshots` row AND registers
 *             its set number in the admin occupancy map (learners only see occupied slots). It
 *             re-reads the row right before writing, writes a local backup first, refuses to
 *             overwrite a set number that is already live, and reads the row back to verify.
 *
 * Every mode except --upload-only only reads from Supabase.
 *
 * Authoring rules the checker enforces (the user's brief, 2026-11):
 *  - SHORT scenarios: five sentences, noticeably shorter than the older sets (31–87 words).
 *  - Vocabulary capped by level: easy = CEFR A2, medium = B1, hard = B2, never above B2.
 *  - "You" plus one named person, alternating turns, like the DET task this practises.
 *  - Specific everyday or campus situations; no topic repeated anywhere in the bank; no brands or
 *    real people.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { DialogueSummaryDifficulty, DialogueSummaryExam, DialogueTurn } from "../src/types/dialogue-summary";

const BANK_KEY = "ep-dialogue-summary-bank-v1";
const OCC_KEY = "ep-dialogue-summary-admin-uploaded-v1";
const OUT_DIR = "generated-dialogue-summary";
const ROUNDS = [1, 2, 3, 4, 5] as const;
const DIFFICULTIES = ["easy", "medium", "hard"] as const;
/** Every slot should show sets 1–20; numbers above 20 that are already live stay as they are. */
const TARGET_SET_NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1);
const MAX_SET_NUMBER = 40; // DIALOGUE_SUMMARY_SET_COUNT

type Difficulty = (typeof DIFFICULTIES)[number];
type Round = (typeof ROUNDS)[number];
type Bank = Record<string, Record<string, DialogueSummaryExam[]>>;
type Occ = Record<string, Record<string, number[]>>;

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const flag = (name: string) => process.argv.includes(`--${name}`);

/**
 * Length bands per level. Scenario = the five setup sentences together; the older sets ran 31–49
 * words (rounds 3–5) and 39–87 (rounds 1–2), so new ones stay clearly below that.
 */
const SHAPE: Record<Difficulty, {
  cefr: string;
  scenario: [number, number];
  scenarioSentenceMax: number;
  dialogue: [number, number];
  turnMax: number;
}> = {
  easy: { cefr: "A2", scenario: [15, 28], scenarioSentenceMax: 8, dialogue: [45, 85], turnMax: 14 },
  medium: { cefr: "B1", scenario: [18, 32], scenarioSentenceMax: 9, dialogue: [60, 100], turnMax: 17 },
  hard: { cefr: "B2", scenario: [22, 36], scenarioSentenceMax: 10, dialogue: [70, 115], turnMax: 20 },
};

/** Words that sit at C1/C2 (English Vocabulary Profile) and creep into "hard" academic dialogue. */
const ABOVE_B2 = new Set(
  `albeit ambiguity ameliorate articulate coherent commence compelling comprise constraint constraints
  contentious convoluted culminate deem deemed delve detrimental diligent discrepancy elicit endeavor
  endeavour entail entails exacerbate explicit explicitly facilitate feasible feasibility foster hinder
  implicit inherent inherently intricate juxtapose leverage meticulous mitigate notwithstanding nuance
  nuanced paradigm plausible pragmatic preliminary robust rigorous salient scrutinize scrutinise scrutiny
  subsequent subsequently substantiate synthesize synthesise thereby ubiquitous underpin underpinned
  viable whereby utilize utilise optimal holistic streamline bolster curtail adhere cohesive encompass
  expedite discern plethora myriad pertinent prudent reiterate stipulate tentative unwarranted hitherto
  henceforth inadvertently mandate mandatory allocate allocation incentive incentivize precede
  aforementioned conducive ramification ramifications paramount pivotal`.split(/\s+/).filter(Boolean),
);

/** Linkers above A2 (warn on easy) and above B1 (warn on medium). Warnings, not rejections. */
const LINKERS_ABOVE_A2 = ["although", "however", "therefore", "unless", "whereas", "otherwise", "instead of", "in case"];
const LINKERS_ABOVE_B1 = ["nevertheless", "furthermore", "consequently", "moreover", "whereas", "despite", "in spite of", "provided that"];

/** Long words that are still A1–A2, so the easy long-word warning stays quiet about them. */
const EASY_LONG_OK = new Set(
  `everything everywhere everybody restaurant university interesting dictionary information basketball
  photograph photographs photographer understand vegetables comfortable uncomfortable especially
  grandfather grandmother grandparents sunglasses strawberry strawberries television downstairs
  supermarket girlfriend department friendship hairdresser headphones invitation playground sandwiches
  skateboard temperature toothbrush underground volleyball whiteboard receptionist appointment
  conversation countryside competition celebration exhibition instructions international neighbours
  neighbourhood neighborhood presentation reservation timetables classmates classmate everyone's
  afternoons birthdays breakfasts tomorrow's yesterday's understood difference beautifully
  comfortable bookshop bookstore photocopy wonderful vacations backpacks motorcycle passengers
  something's somewhere`.split(/\s+/).filter(Boolean),
);

/**
 * Brands and platforms the brief rules out (no real companies). Matched as whole words, any case.
 * Brand names that are also everyday words (apple, grab, zoom, visa, canvas, excel) are left out.
 */
const BRANDS = [
  "starbucks", "mcdonald", "mcdonald's", "kfc", "uber", "lyft", "google", "facebook", "instagram",
  "tiktok", "youtube", "whatsapp", "line app", "netflix", "spotify", "iphone", "ipad", "macbook",
  "samsung", "amazon", "shopee", "lazada", "7-eleven", "ikea", "nike", "adidas", "microsoft",
  "powerpoint", "moodle", "gmail", "airbnb", "booking.com", "agoda", "mastercard", "paypal",
  "coca-cola", "pepsi", "toyota", "honda", "lego", "wikipedia", "chatgpt",
];

const TITLE_STOP = new Set(
  `a an the to for of in on at with about and or your my his her their our from before after by into
  new get getting ask asking make making find finding choose choosing plan planning book booking buy
  buying talk talking discuss discussing request requesting try trying join joining deal dealing handle
  handling help helping take taking go going have having do doing set setting look looking learn
  learning use using keep keeping change changing first one two some who what when why how is are be`.split(/\s+/),
);

const BODY_STOP = new Set(
  `you your yours the and that this with have will would could should about there their they them
  what when where which while from into just like really also very then than been were want wants
  need needs know think sure okay yes thanks thank please maybe here today tomorrow week time good
  great right well still much more some only other going does didn't don't can't i'm it's that's
  you're we're let's i'll you'll we'll there's what's`.split(/\s+/),
);

// ---------------------------------------------------------------------------------------------

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);
const wc = (s: string) => words(s).length;
const lowerTokens = (s: string) =>
  s.toLowerCase().replace(/[’']/g, "'").match(/[a-z][a-z'-]*/g) ?? [];

function stem(w: string): string {
  let s = w.toLowerCase().replace(/'s$/, "");
  if (s.length > 5 && s.endsWith("ies")) s = `${s.slice(0, -3)}y`;
  else if (s.length > 5 && s.endsWith("ing")) s = s.slice(0, -3);
  else if (s.length > 4 && s.endsWith("ed")) s = s.slice(0, -2);
  else if (s.length > 4 && s.endsWith("es")) s = s.slice(0, -2);
  else if (s.length > 3 && s.endsWith("s") && !s.endsWith("ss")) s = s.slice(0, -1);
  return s;
}

function titleKey(title: string): Set<string> {
  return new Set(lowerTokens(title).filter((t) => !TITLE_STOP.has(t)).map(stem).filter((t) => t.length > 1));
}

function bodyKey(ex: Pick<DialogueSummaryExam, "scenarioSentences" | "dialogue">): Set<string> {
  const text = [...ex.scenarioSentences, ...ex.dialogue.map((t) => t.text)].join(" ");
  return new Set(lowerTokens(text).filter((t) => t.length >= 4 && !BODY_STOP.has(t)).map(stem));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

const examId = (r: number, d: string, n: number) => `ds-r${r}-${d}-s${String(n).padStart(2, "0")}`;
const slotName = (r: number, d: string) => `r${r} ${d}`;
const savedPath = (r: number, d: string) => path.join(OUT_DIR, `round${r}-${d}.json`);

// ---------------------------------------------------------------------------------------------

interface Live {
  updatedAt: string;
  payload: Record<string, unknown>;
  bank: Bank;
  occ: Occ;
  bankWasString: boolean;
  occWasString: boolean;
}

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing (run with --env-file=.env.local)");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function readLive(): Promise<Live> {
  const { data, error } = await supabase()
    .from("content_bank_snapshots")
    .select("payload,updated_at")
    .eq("id", "global")
    .maybeSingle();
  if (error || !data) throw new Error(`snapshot read failed: ${error?.message ?? "no row"}`);
  const payload = (typeof data.payload === "string" ? JSON.parse(data.payload) : data.payload) as Record<string, unknown>;
  const bankRaw = payload[BANK_KEY];
  const occRaw = payload[OCC_KEY];
  const bank = ((typeof bankRaw === "string" ? JSON.parse(bankRaw) : bankRaw) ?? {}) as Bank;
  const occ = ((typeof occRaw === "string" ? JSON.parse(occRaw) : occRaw) ?? {}) as Occ;
  for (const r of ROUNDS) {
    bank[r] ??= {};
    occ[r] ??= {};
    for (const d of DIFFICULTIES) {
      bank[r]![d] ??= [];
      occ[r]![d] ??= [];
    }
  }
  return {
    updatedAt: data.updated_at as string,
    payload,
    bank,
    occ,
    bankWasString: typeof bankRaw === "string",
    occWasString: typeof occRaw === "string",
  };
}

function readSaved(r: number, d: string): DialogueSummaryExam[] {
  const p = savedPath(r, d);
  return fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, "utf8")) as DialogueSummaryExam[]) : [];
}

function writeSaved(r: number, d: string, exams: DialogueSummaryExam[]) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const sorted = [...exams].sort((a, b) => a.setNumber - b.setNumber);
  // write-then-rename so a concurrent --add/--check never reads a half-written file
  const tmp = `${savedPath(r, d)}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(sorted, null, 2)}\n`);
  fs.renameSync(tmp, savedPath(r, d));
}

/** Everything a new set must not repeat: live sets + every saved file. */
function corpus(live: Live, skip?: { round: number; difficulty: string; setNumber: number }) {
  const out: { where: string; ex: DialogueSummaryExam; title: Set<string>; body: Set<string> }[] = [];
  const push = (where: string, ex: DialogueSummaryExam) => {
    if (skip && ex.round === skip.round && ex.difficulty === skip.difficulty && ex.setNumber === skip.setNumber) return;
    out.push({ where, ex, title: titleKey(ex.titleEn), body: bodyKey(ex) });
  };
  for (const r of ROUNDS) for (const d of DIFFICULTIES) {
    for (const ex of live.bank[r]![d]!) push(`live ${slotName(r, d)} s${ex.setNumber}`, ex);
    for (const ex of readSaved(r, d)) push(`saved ${slotName(r, d)} s${ex.setNumber}`, ex);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------

interface Verdict { errors: string[]; warnings: string[] }

/** Shape, length and level checks for one set. `raw` is whatever the author wrote. */
function checkShape(raw: unknown, round: Round, d: Difficulty): { exam: DialogueSummaryExam | null } & Verdict {
  const errors: string[] = [];
  const warnings: string[] = [];
  const shape = SHAPE[d];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { exam: null, errors: ["not an object"], warnings };
  const o = raw as Record<string, unknown>;

  if (o.round !== undefined && Number(o.round) !== round) errors.push(`round ${String(o.round)} ≠ slot round ${round}`);
  if (o.difficulty !== undefined && o.difficulty !== d) errors.push(`difficulty ${String(o.difficulty)} ≠ slot ${d}`);
  const setNumber = Number(o.setNumber);
  if (!Number.isInteger(setNumber) || setNumber < 1 || setNumber > MAX_SET_NUMBER) errors.push(`setNumber must be 1–${MAX_SET_NUMBER}`);

  const titleEn = typeof o.titleEn === "string" ? o.titleEn.trim() : "";
  const titleTh = typeof o.titleTh === "string" ? o.titleTh.trim() : "";
  if (!titleEn) errors.push("titleEn missing");
  else if (wc(titleEn) > 8) errors.push(`titleEn is ${wc(titleEn)} words (max 8)`);
  if (!titleTh) errors.push("titleTh missing");
  else if (!/[฀-๿]/.test(titleTh)) errors.push("titleTh has no Thai");

  const scen = Array.isArray(o.scenarioSentences) ? o.scenarioSentences : [];
  if (scen.length !== 5) errors.push(`scenarioSentences must be exactly 5 (got ${scen.length})`);
  const scenario = scen.map((s) => (typeof s === "string" ? s.trim() : ""));
  scenario.forEach((s, i) => {
    if (!s) errors.push(`scenario sentence ${i + 1} empty`);
    else {
      if (!/[.!?]$/.test(s)) errors.push(`scenario sentence ${i + 1} has no end punctuation`);
      if (wc(s) > shape.scenarioSentenceMax) errors.push(`scenario sentence ${i + 1} is ${wc(s)} words (max ${shape.scenarioSentenceMax} for ${d})`);
    }
  });
  const scenWords = scenario.reduce((a, s) => a + wc(s), 0);
  if (scenario.length === 5 && (scenWords < shape.scenario[0] || scenWords > shape.scenario[1])) {
    errors.push(`scenario is ${scenWords} words (want ${shape.scenario[0]}–${shape.scenario[1]} for ${d})`);
  }

  const rawTurns = Array.isArray(o.dialogue) ? o.dialogue : [];
  const dialogue: DialogueTurn[] = [];
  rawTurns.forEach((t, i) => {
    const tt = t as Partial<DialogueTurn> | null;
    const speaker = typeof tt?.speaker === "string" ? tt.speaker.trim() : "";
    const text = typeof tt?.text === "string" ? tt.text.trim() : "";
    if (!speaker || !text) errors.push(`turn ${i + 1}: speaker and text required`);
    dialogue.push({ speaker, text });
  });
  if (dialogue.length < 8 || dialogue.length > 10) errors.push(`dialogue has ${dialogue.length} turns (want 8–10)`);
  const speakers = [...new Set(dialogue.map((t) => t.speaker))];
  if (speakers.length !== 2) errors.push(`want exactly 2 speakers (got ${speakers.join(", ") || "none"})`);
  if (!speakers.includes("You")) errors.push(`one speaker must be "You"`);
  for (let i = 1; i < dialogue.length; i++) {
    if (dialogue[i]!.speaker === dialogue[i - 1]!.speaker) errors.push(`turns ${i} and ${i + 1} are both ${dialogue[i]!.speaker}`);
  }
  dialogue.forEach((t, i) => {
    if (t.text && !/[.!?]["”’)]?$/.test(t.text)) errors.push(`turn ${i + 1} has no end punctuation`);
    if (wc(t.text) > shape.turnMax) errors.push(`turn ${i + 1} is ${wc(t.text)} words (max ${shape.turnMax} for ${d})`);
  });
  const dlgWords = dialogue.reduce((a, t) => a + wc(t.text), 0);
  if (dlgWords < shape.dialogue[0] || dlgWords > shape.dialogue[1]) {
    errors.push(`dialogue is ${dlgWords} words (want ${shape.dialogue[0]}–${shape.dialogue[1]} for ${d})`);
  }

  // the other person must be introduced in the scenario so the summary has a name to use
  const other = speakers.find((s) => s !== "You");
  if (other) {
    const bare = other.replace(/^(Professor|Prof\.|Dr\.|Mr\.|Mrs\.|Ms\.|Coach|Nurse|Officer)\s+/i, "").split(/\s+/).pop() ?? other;
    if (!scenario.join(" ").includes(bare)) errors.push(`scenario never names "${other}"`);
  }

  // level and content rules
  const allText = [titleEn, ...scenario, ...dialogue.map((t) => t.text)].join(" ");
  const toks = lowerTokens(allText);
  // a speaker called "Mr. Foster" is a name, not the verb
  const nameTokens = new Set(speakers.flatMap((s) => lowerTokens(s)));
  const above = [...new Set(toks.filter((t) => ABOVE_B2.has(t) && !nameTokens.has(t)))];
  if (above.length) errors.push(`above-B2 vocabulary: ${above.join(", ")}`);
  const lower = ` ${allText.toLowerCase()} `;
  const brands = BRANDS.filter((b) => new RegExp(`(^|[^a-z])${b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`).test(lower));
  if (brands.length) errors.push(`brand/platform name: ${brands.join(", ")}`);
  if (/[😀-🙏]|[☀-➿]/u.test(allText)) errors.push("emoji in text");

  const spoken = ` ${[...scenario, ...dialogue.map((t) => t.text)].join(" ").toLowerCase()} `;
  if (d === "easy") {
    const l = LINKERS_ABOVE_A2.filter((w) => spoken.includes(` ${w} `));
    if (l.length) warnings.push(`B1 linkers in an A2 set: ${l.join(", ")}`);
    const long = [...new Set(toks.filter((t) => t.replace(/'.*$/, "").length >= 10 && !EASY_LONG_OK.has(t)))];
    if (long.length) warnings.push(`long words to double-check for A2: ${long.join(", ")}`);
  } else if (d === "medium") {
    const l = LINKERS_ABOVE_B1.filter((w) => spoken.includes(` ${w} `));
    if (l.length) warnings.push(`B2 linkers in a B1 set: ${l.join(", ")}`);
    const long = [...new Set(toks.filter((t) => t.length >= 12 && !EASY_LONG_OK.has(t)))];
    if (long.length) warnings.push(`long words to double-check for B1: ${long.join(", ")}`);
  } else {
    const long = [...new Set(toks.filter((t) => t.length >= 13))];
    if (long.length) warnings.push(`long words to double-check for B2: ${long.join(", ")}`);
  }

  if (errors.length) return { exam: null, errors, warnings };
  return {
    exam: {
      id: examId(round, d, setNumber),
      round,
      difficulty: d as DialogueSummaryDifficulty,
      setNumber,
      titleEn,
      titleTh,
      scenarioSentences: scenario,
      dialogue,
    },
    errors,
    warnings,
  };
}

/** Topic uniqueness against everything else in the bank. */
function checkTopic(ex: DialogueSummaryExam, others: ReturnType<typeof corpus>): Verdict {
  const errors: string[] = [];
  const warnings: string[] = [];
  const t = titleKey(ex.titleEn);
  const b = bodyKey(ex);
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  for (const o of others) {
    if (norm(o.ex.titleEn) === norm(ex.titleEn)) { errors.push(`same title as ${o.where} "${o.ex.titleEn}"`); continue; }
    const jt = jaccard(t, o.title);
    if (jt >= 0.5) errors.push(`topic too close to ${o.where} "${o.ex.titleEn}" (title overlap ${jt.toFixed(2)})`);
    else if (jt >= 0.34) warnings.push(`title resembles ${o.where} "${o.ex.titleEn}" (${jt.toFixed(2)})`);
    // calibrated on the live bank (Nov 2026): unrelated pairs median 0.05, p99 0.15; the bank's own
    // same-topic pairs (double major ×3, recommendation letter ×3) score 0.20–0.28
    const jb = jaccard(b, o.body);
    if (jb >= 0.25) errors.push(`content too close to ${o.where} "${o.ex.titleEn}" (word overlap ${jb.toFixed(2)})`);
    else if (jb >= 0.17) warnings.push(`content resembles ${o.where} "${o.ex.titleEn}" (${jb.toFixed(2)})`);
  }
  return { errors, warnings };
}

function parseSlot(s: string): { round: Round; d: Difficulty } {
  const [r, d] = s.split(":");
  const round = Number(r) as Round;
  if (!ROUNDS.includes(round)) throw new Error(`bad round in "${s}"`);
  if (!DIFFICULTIES.includes(d as Difficulty)) throw new Error(`bad difficulty in "${s}"`);
  return { round, d: d as Difficulty };
}

function stats(ex: DialogueSummaryExam) {
  const scen = ex.scenarioSentences.reduce((a, s) => a + wc(s), 0);
  const dlg = ex.dialogue.reduce((a, t) => a + wc(t.text), 0);
  return `scenario ${scen}w · ${ex.dialogue.length} turns · dialogue ${dlg}w`;
}

// ---------------------------------------------------------------------------------------------

async function plan() {
  const live = await readLive();
  console.log(`live snapshot updated_at ${live.updatedAt}`);
  let missingTotal = 0;
  for (const r of ROUNDS) for (const d of DIFFICULTIES) {
    const liveNums = live.bank[r]![d]!.map((e) => e.setNumber).sort((a, b) => a - b);
    const occNums = new Set(live.occ[r]![d]!);
    const hidden = liveNums.filter((n) => !occNums.has(n));
    const savedNums = readSaved(r, d).map((e) => e.setNumber).sort((a, b) => a - b);
    const missing = TARGET_SET_NUMBERS.filter((n) => !liveNums.includes(n) && !savedNums.includes(n));
    missingTotal += missing.length;
    console.log(
      `${slotName(r, d).padEnd(9)} live ${String(liveNums.length).padStart(2)} [${liveNums.join(",")}]` +
        `${hidden.length ? ` HIDDEN(not in occupancy) [${hidden.join(",")}]` : ""}` +
        ` · saved ${savedNums.length} [${savedNums.join(",")}] · missing ${missing.length} [${missing.join(",")}]`,
    );
  }
  console.log(`still missing: ${missingTotal}`);
}

async function topics() {
  const live = await readLive();
  for (const c of corpus(live)) console.log(`${c.where.padEnd(22)} ${c.ex.titleEn}`);
}

async function addBatch(spec: string) {
  const i = spec.indexOf(":", spec.indexOf(":") + 1);
  const { round, d } = parseSlot(spec.slice(0, i));
  const file = spec.slice(i + 1);
  const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
  const items = (Array.isArray(parsed) ? parsed : (parsed as { exams?: unknown[] }).exams) ?? [];
  if (!Array.isArray(items) || !items.length) throw new Error(`${file}: expected {"exams":[...]} or a non-empty array`);

  const live = await readLive();
  const liveNums = new Set(live.bank[round]![d]!.map((e) => e.setNumber));
  const saved = readSaved(round, d);
  const replace = flag("replace");
  const accepted: DialogueSummaryExam[] = [];
  let rejected = 0;

  for (const [idx, raw] of items.entries()) {
    const label = `#${idx + 1} s${String((raw as { setNumber?: unknown })?.setNumber ?? "?")} "${String((raw as { titleEn?: unknown })?.titleEn ?? "")}"`;
    const shape = checkShape(raw, round, d);
    const errors = [...shape.errors];
    const warnings = [...shape.warnings];
    if (shape.exam) {
      const n = shape.exam.setNumber;
      if (liveNums.has(n)) errors.push(`set ${n} is already live in ${slotName(round, d)} — pick a missing number`);
      if (!replace && saved.some((e) => e.setNumber === n)) errors.push(`set ${n} already saved (use --replace to overwrite)`);
      if (accepted.some((e) => e.setNumber === n)) errors.push(`set ${n} appears twice in this batch`);
      const others = corpus(live, { round, difficulty: d, setNumber: n });
      for (const a of accepted) others.push({ where: "this batch", ex: a, title: titleKey(a.titleEn), body: bodyKey(a) });
      const topic = checkTopic(shape.exam, others);
      errors.push(...topic.errors);
      warnings.push(...topic.warnings);
    }
    if (errors.length || !shape.exam) {
      rejected++;
      console.log(`  ✕ ${label}\n${errors.map((e) => `      - ${e}`).join("\n")}`);
      continue;
    }
    accepted.push(shape.exam);
    console.log(`  ✓ ${label} — ${stats(shape.exam)}${warnings.length ? `\n${warnings.map((w) => `      ! ${w}`).join("\n")}` : ""}`);
  }

  if (accepted.length) {
    const keep = saved.filter((e) => !accepted.some((a) => a.setNumber === e.setNumber));
    writeSaved(round, d, [...keep, ...accepted]);
  }
  console.log(`${slotName(round, d)}: accepted ${accepted.length}, rejected ${rejected} → ${savedPath(round, d)} now holds ${readSaved(round, d).length}`);
  if (rejected) process.exitCode = 2;
}

/** Re-validate every saved file; returns the number of sets with errors. */
async function checkAll(live?: Live): Promise<number> {
  live ??= await readLive();
  let bad = 0;
  let total = 0;
  let warned = 0;
  for (const r of ROUNDS) for (const d of DIFFICULTIES) {
    const liveNums = new Set(live.bank[r]![d]!.map((e) => e.setNumber));
    const seen = new Set<number>();
    for (const ex of readSaved(r, d)) {
      total++;
      const shape = checkShape(ex, r, d);
      const errors = [...shape.errors];
      const warnings = [...shape.warnings];
      if (shape.exam) {
        if (ex.id !== examId(r, d, ex.setNumber)) errors.push(`id ${ex.id} should be ${examId(r, d, ex.setNumber)}`);
        if (liveNums.has(ex.setNumber)) errors.push(`set ${ex.setNumber} is already live`);
        if (seen.has(ex.setNumber)) errors.push(`set ${ex.setNumber} saved twice`);
        const topic = checkTopic(shape.exam, corpus(live, { round: r, difficulty: d, setNumber: ex.setNumber }));
        errors.push(...topic.errors);
        warnings.push(...topic.warnings);
      }
      seen.add(ex.setNumber);
      if (errors.length) bad++;
      if (warnings.length) warned++;
      if (errors.length || (warnings.length && flag("verbose"))) {
        console.log(`${errors.length ? "✕" : "!"} ${slotName(r, d)} s${ex.setNumber} "${ex.titleEn}"`);
        for (const e of errors) console.log(`    - ${e}`);
        for (const w of warnings) console.log(`    ! ${w}`);
      }
    }
  }
  console.log(`checked ${total} saved sets: ${bad} with errors, ${warned} with warnings${flag("verbose") ? "" : " (--verbose prints them)"}`);
  return bad;
}

async function uploadOnly() {
  const first = await readLive();
  const bad = await checkAll(first);
  if (bad) throw new Error(`refusing to upload: ${bad} saved set(s) fail validation`);

  const queued: DialogueSummaryExam[] = [];
  for (const r of ROUNDS) for (const d of DIFFICULTIES) queued.push(...readSaved(r, d));
  if (!queued.length) { console.log("nothing saved under generated-dialogue-summary/ — nothing to upload"); return; }

  const stamp = first.updatedAt.replace(/[:.+]/g, "-");
  const backup = `content-bank-backup-dialogue-summary-${stamp}.json`;
  if (!fs.existsSync(backup)) fs.writeFileSync(backup, JSON.stringify(first.payload));
  console.log(`backup → ${backup}`);

  // A browser running the admin pushes its whole local bank to this row, so re-read right before
  // writing and place our sets into whatever is there now.
  const fresh = await readLive();
  if (fresh.updatedAt !== first.updatedAt) console.warn(`! snapshot changed since the first read (${first.updatedAt} → ${fresh.updatedAt}); merging into the newer one`);

  const placed: DialogueSummaryExam[] = [];
  for (const ex of queued) {
    const slot = fresh.bank[ex.round]![ex.difficulty]!;
    if (slot.some((e) => e.setNumber === ex.setNumber)) {
      console.warn(`  skip ${slotName(ex.round, ex.difficulty)} s${ex.setNumber}: a set with that number is already live`);
      continue;
    }
    slot.push(ex);
    slot.sort((a, b) => a.setNumber - b.setNumber);
    const occ = fresh.occ[ex.round]![ex.difficulty]!;
    fresh.occ[ex.round]![ex.difficulty] = [...new Set([...occ, ex.setNumber])].sort((a, b) => a - b);
    placed.push(ex);
  }
  if (!placed.length) { console.log("every saved set is already live — nothing to write"); return; }

  fresh.payload[BANK_KEY] = fresh.bankWasString ? JSON.stringify(fresh.bank) : fresh.bank;
  fresh.payload[OCC_KEY] = fresh.occWasString ? JSON.stringify(fresh.occ) : fresh.occ;

  // only write if nobody else wrote since our re-read
  const { data: written, error } = await supabase()
    .from("content_bank_snapshots")
    .update({ payload: fresh.payload, updated_at: new Date().toISOString() })
    .eq("id", "global")
    .eq("updated_at", fresh.updatedAt)
    .select("updated_at");
  if (error) throw new Error(`WRITE FAILED: ${error.message}`);
  if (!written?.length) throw new Error("WRITE SKIPPED: the snapshot changed between re-read and write — run --upload-only again");

  const check = await readLive();
  const missing = placed.filter(
    (ex) =>
      !check.bank[ex.round]![ex.difficulty]!.some((e) => e.setNumber === ex.setNumber && e.titleEn === ex.titleEn) ||
      !check.occ[ex.round]![ex.difficulty]!.includes(ex.setNumber),
  );
  for (const r of ROUNDS) {
    console.log(
      `round ${r}: ` +
        DIFFICULTIES.map((d) => `${d} ${check.bank[r]![d]!.length} sets / ${check.occ[r]![d]!.length} visible`).join(" · "),
    );
  }
  if (missing.length) throw new Error(`read-back is missing ${missing.length} set(s): ${missing.map((e) => e.id).join(", ")}`);
  console.log(`uploaded ${placed.length} sets and registered them in ${OCC_KEY} (verified by read-back, updated_at ${written[0]!.updated_at})`);
}

async function main() {
  const add = arg("add");
  if (flag("plan")) return plan();
  if (flag("topics")) return topics();
  if (add) return addBatch(add);
  if (flag("check")) { const bad = await checkAll(); if (bad) process.exitCode = 2; return; }
  if (flag("upload-only")) return uploadOnly();
  console.log("usage: --plan | --topics | --add=<round>:<difficulty>:<file.json> [--replace] | --check [--verbose] | --upload-only");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
