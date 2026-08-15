/**
 * Tops the reading-exam bank up to a target count per round and difficulty.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/build-reading-exam-bank.ts --dry
 *   npx tsx --tsconfig tsconfig.json scripts/build-reading-exam-bank.ts --apply [--only=5:hard]
 *
 * One exam = one passage answered four ways (missing paragraph, find the information, best title,
 * main idea), which is the shape `readingExamToIrSet` maps onto the real Interactive Reading screen.
 * Authoring rules come from docs/reading/det-interactive-reading-item-spec.md and the distractor
 * formula in docs/reading-vocabulary/question-spec.md; the measured house style comes from the 145
 * passages already in the bank.
 *
 * Everything generated is validated before it is kept — a passage whose find-the-information answer
 * is not a verbatim span of its own passage would break the highlight step, so it is regenerated
 * rather than shipped. Correct answers are spread across A–D on the way in.
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import type { ReadingExamUnit, ReadingSet } from "../src/types/reading";

const TARGET_PER_DIFFICULTY = 30;
const ROUNDS = ["1", "2", "3", "4", "5"] as const;
const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const EXAMS_PER_SET = 5;
const BATCH = 5;
const CONCURRENCY = 4;

const OUT_DIR = "generated-reading-exams";
const DRY = process.argv.includes("--dry");
/** `--preview=easy:3` generates a few items and prints them WITHOUT touching the bank. */
const preview = process.argv.find((a) => a.startsWith("--preview="))?.slice(10);
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
/** Skip generation and upload whatever a previous run already saved under generated-reading-exams/. */
const UPLOAD_ONLY = process.argv.includes("--upload-only");

type Difficulty = (typeof DIFFICULTIES)[number];

/** Measured off the existing bank, so new passages sit in the same band as the old ones. */
const SHAPE: Record<Difficulty, { cefr: string; words: string; tone: string }> = {
  easy: {
    cefr: "B1",
    words: "each of the two visible paragraphs 30–45 words, the missing middle paragraph 30–45 words",
    tone: "an everyday topic (habits, hobbies, food, local services, animals, health). Common vocabulary, mostly simple and compound sentences.",
  },
  medium: {
    cefr: "B2",
    words: "each of the two visible paragraphs 40–55 words, the missing middle paragraph 40–55 words",
    tone: "an informational or lightly academic topic (work, technology, cities, education, environment). Some abstract nouns, cause-and-effect linking, one or two subordinate clauses per sentence.",
  },
  hard: {
    cefr: "C1",
    words: "each of the two visible paragraphs 50–65 words, the missing middle paragraph 50–65 words",
    tone: "an argument with two sides or a research finding (policy, science, economics, ethics). Precise academic vocabulary, hedged claims, nominalisation.",
  },
};

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

const PROMPT = (d: Difficulty, n: number, avoid: string[], angles: string[]) => `
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
- Do NOT reuse any of these topics: ${avoid.slice(0, 120).join("; ")}

THE FOUR QUESTIONS (every one has EXACTLY 4 options)
1. missingSentence — correctAnswer is the removed paragraph 2, verbatim. Distractors: one that is
   on-topic but leaves paragraph 3 without cause; one true-sounding but irrelevant detail; one that
   contradicts paragraph 3.
2. informationLocation — asks which part of the passage answers a specific question. correctAnswer
   MUST be an EXACT substring copied character-for-character from paragraph 1 or paragraph 3 (no
   ellipsis, no rewording, no trailing full stop unless it is in the passage), 8–16 words long. The
   three distractors must ALSO be exact substrings of paragraph 1 or 3, each answering a DIFFERENT
   question than the one asked. All four spans must be within 4 words of each other in length, and
   all four must be the same KIND of span — either all four are clause fragments or all four are
   whole sentences. Never let the key be the only complete sentence.
3. bestTitle — 3–6 words, Title Case. Distractors: one too narrow, one too broad, one that picks up
   a word from the passage but misses its point.
4. mainIdea — a restatement of what the passage actually says. Distractors: one that contradicts it,
   one that overreaches (a generalisation the passage never makes), one true detail that is not the
   main idea.

LENGTH — a learner must not be able to pick the key by shape alone:
- Within one question, the four options must be within 20% of each other in length.
- The correct answer must NEVER be the longest option. Aim for it to be mid-length.

Every question also needs "explanationThai": ONE concrete Thai sentence saying why the key is right
and what the traps do. Thai script only, no English words except quoted words from the passage.

Also give 2–3 "highlightedVocab" entries. Each word must appear verbatim in paragraph 1 or 3.

Return JSON only: {"exams":[{
 "titleEn": "<3–6 word SPECIFIC topic name naming the case, no numbering>",
 "passage": {"p1":"...","p2":"[MISSING PARAGRAPH]","p3":"..."},
 "highlightedVocab":[{"word":"...","meaningEn":"...","meaningTh":"...","example":"..."}],
 "missingSentence":{"question":"Choose the sentence or paragraph that best fills the gap between paragraph 1 and paragraph 3.","correctAnswer":"...","options":["...","...","...","..."],"explanationThai":"..."},
 "informationLocation":{"question":"...","correctAnswer":"...","options":["...","...","...","..."],"explanationThai":"..."},
 "bestTitle":{"question":"Choose the best title for this passage.","correctAnswer":"...","options":["...","...","...","..."],"explanationThai":"..."},
 "mainIdea":{"question":"Which statement best expresses the main idea of the passage?","correctAnswer":"...","options":["...","...","...","..."],"explanationThai":"..."}
}]}
`.trim();

const strip = (s: unknown) => String(s ?? "").replace(/\*\*\s*(.*?)\s*\*\*/g, "$1").replace(/\s+/g, " ").trim();
const hasThai = (s: string) => /[฀-๿]/.test(s);
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** Rejects anything the runner could not render correctly. Returns the reasons, empty when valid. */
function problems(ex: ReadingExamUnit, d: Difficulty): string[] {
  const bad: string[] = [];
  const p1 = strip(ex.passage?.p1);
  const p3 = strip(ex.passage?.p3);
  if (!p1 || !p3) return ["missing paragraphs"];
  if (!/^\s*\[?\s*missing paragraph\s*\]?\s*$/i.test(String(ex.passage?.p2 ?? ""))) bad.push("p2 not the placeholder");

  const total = words(p1) + words(p3);
  const [lo, hi] = d === "easy" ? [55, 105] : d === "medium" ? [75, 125] : [90, 145];
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
  const inPassage = (s: string) => strip(p1).includes(s) || strip(p3).includes(s);
  if (!inPassage(answer)) bad.push("informationLocation key is not a verbatim span");
  if (words(answer) < 6 || words(answer) > 20) bad.push(`informationLocation key ${words(answer)} words`);
  const spanWords = (ex.informationLocation?.options ?? []).map((o) => words(strip(o)));
  if (spanWords.length === 4 && Math.max(...spanWords) - Math.min(...spanWords) > 8) {
    bad.push(`informationLocation spans ${Math.min(...spanWords)}–${Math.max(...spanWords)} words apart`);
  }
  const spans = (ex.informationLocation?.options ?? []).map(strip).filter((o) => inPassage(o));
  if (spans.length < 4) bad.push(`informationLocation: only ${spans.length}/4 options are real spans`);

  // the gap answer is inserted into the passage the learner reads, so vocab may come from it too
  const visible = `${p1} ${p3} ${strip(ex.missingSentence?.correctAnswer)}`;
  for (const v of ex.highlightedVocab ?? []) {
    if (!new RegExp(`\\b${String(v.word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(visible)) {
      bad.push(`vocab "${v.word}" not in passage`);
    }
  }
  return bad;
}

async function generate(d: Difficulty, n: number, avoid: string[], angles: string[]): Promise<ReadingExamUnit[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: PROMPT(d, n, avoid, angles) }] }],
      generationConfig: { temperature: 1, responseMimeType: "application/json", maxOutputTokens: 24000 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "{}";
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

async function main() {
  if (preview) {
    const [d, n] = preview.split(":") as [Difficulty, string];
    const angles = Array.from({ length: Number(n ?? 2) }, (_, i) => `${FIELDS[i % FIELDS.length]} in ${PLACES[(i * 7) % PLACES.length]}`);
    const exams = await generate(d, Number(n ?? 2), [], angles);
    for (const ex of exams) {
      const bad = problems(ex, d);
      console.log(`\n${bad.length ? "✕ REJECTED: " + bad.join("; ") : "✓ valid"}\n`, JSON.stringify(ex, null, 1));
    }
    return;
  }
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await sb.from("content_bank_snapshots").select("payload,updated_at").eq("id", "global").maybeSingle();
  if (error || !data) throw new Error(`snapshot read failed: ${error?.message}`);
  const payload = (typeof data.payload === "string" ? JSON.parse(data.payload) : data.payload) as Record<string, unknown>;
  const raw = payload["ep-reading-sets"];
  const bank = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, Record<string, ReadingSet[]>>;

  const usedTitles: string[] = [];
  for (const byDiff of Object.values(bank)) {
    for (const sets of Object.values(byDiff ?? {})) {
      for (const s of sets ?? []) for (const ex of s.exams ?? []) usedTitles.push(String(ex.titleEn ?? "").replace(/^Exam\s*\d+\s*[—-]\s*/, ""));
    }
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
  console.log(`to reach ${TARGET_PER_DIFFICULTY}/difficulty: ${totalNeed} new passages`);
  for (const p of plan) console.log(`  round ${p.round} ${p.d.padEnd(6)} +${p.need}`);
  console.log(`projected bank growth ≈ ${((bankBytes / usedTitles.length) * totalNeed / 1e6).toFixed(2)} MB`);
  if (DRY) return;

  const backup = `content-bank-backup-${new Date(data.updated_at as string).toISOString().replace(/[:.]/g, "-")}.json`;
  if (!fs.existsSync(backup)) fs.writeFileSync(backup, JSON.stringify(payload));
  console.log("backup →", backup);

  let seed = 20260815;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const used: Record<string, number[]> = {};
  let made = 0;

  for (const { round, d, need } of plan) {
    const saved = `${OUT_DIR}/round${round}-${d}.json`;
    if (UPLOAD_ONLY) {
      if (!fs.existsSync(saved)) continue;
      const exams = JSON.parse(fs.readFileSync(saved, "utf8")) as ReadingExamUnit[];
      const sets = ((bank[round] ??= {})[d] ??= []);
      let n = sets.reduce((m, s2) => Math.max(m, s2.setNumber ?? 0), 0);
      for (let i = 0; i < exams.length; i += EXAMS_PER_SET) {
        sets.push({ setNumber: ++n, difficulty: d, round: Number(round) as ReadingSet["round"], exams: exams.slice(i, i + EXAMS_PER_SET) });
      }
      made += exams.length;
      console.log(`round ${round} ${d}: queued ${exams.length} from ${saved}`);
      continue;
    }
    const accepted: ReadingExamUnit[] = [];
    let attempts = 0;
    const maxAttempts = Math.ceil(need / BATCH) + 12;
    while (accepted.length < need && attempts < maxAttempts) {
      attempts++;
      const want = Math.min(BATCH, need - accepted.length);
      const batches = Array.from({ length: Math.min(CONCURRENCY, Math.ceil((need - accepted.length) / BATCH)) }, () =>
        generate(
          d,
          want,
          [...usedTitles, ...accepted.map((e) => String(e.titleEn))],
          Array.from({ length: want }, () => `${FIELDS[Math.floor(rnd() * FIELDS.length)]} in ${PLACES[Math.floor(rnd() * PLACES.length)]}`),
        ).catch((e) => {
          console.warn(`  ! ${round}:${d} batch failed — ${String(e).slice(0, 120)}`);
          return [] as ReadingExamUnit[];
        }),
      );
      for (const exams of await Promise.all(batches)) {
        for (const ex of exams) {
          if (accepted.length >= need) break;
          const bad = problems(ex, d);
          if (bad.length) { console.log(`  ✕ ${round}:${d} "${ex.titleEn}" — ${bad.slice(0, 2).join("; ")}`); continue; }
          if (usedTitles.some((t) => t.toLowerCase() === String(ex.titleEn).toLowerCase())) continue;
          usedTitles.push(String(ex.titleEn));
          accepted.push(ex);
        }
      }
      console.log(`  round ${round} ${d}: ${accepted.length}/${need}`);
    }

    // Generated passages are expensive and the model may be unavailable later: put them on disk
    // BEFORE any network write, so a failed or clobbered upload costs nothing but an upload.
    if (accepted.length) {
      fs.mkdirSync(OUT_DIR, { recursive: true });
      fs.writeFileSync(`${OUT_DIR}/round${round}-${d}.json`, JSON.stringify(accepted, null, 1));
      console.log(`  saved ${accepted.length} → ${OUT_DIR}/round${round}-${d}.json`);
    }

    // never let a shortfall pass as success
    if (accepted.length < need) console.warn(`  !! round ${round} ${d}: only ${accepted.length}/${need} passed validation after ${attempts} attempts`);

    spreadAnswers(accepted, used, rnd);

    const sets = (bank[round] ??= {})[d] ??= [];
    let setNumber = sets.reduce((m, s) => Math.max(m, s.setNumber ?? 0), 0);
    for (let i = 0; i < accepted.length; i += EXAMS_PER_SET) {
      setNumber += 1;
      const chunk = accepted.slice(i, i + EXAMS_PER_SET);
      chunk.forEach((ex, j) => { ex.titleEn = `Exam ${j + 1} — ${ex.titleEn}`; });
      sets.push({ setNumber, difficulty: d, round: Number(round) as ReadingSet["round"], exams: chunk });
    }
    made += accepted.length;
    console.log(`round ${round} ${d}: added ${accepted.length} (now ${sets.reduce((a, s) => a + s.exams.length, 0)})`);
  }

  // A browser running the app pushes its whole localStorage bank to this same row, so the snapshot
  // may have moved under us during a long generation run. Re-read, merge our sets into whatever is
  // there now, and verify the write actually stuck instead of trusting a silent success.
  const { data: fresh } = await sb.from("content_bank_snapshots").select("payload,updated_at").eq("id", "global").maybeSingle();
  if (!fresh) throw new Error("snapshot vanished");
  if (fresh.updated_at !== data.updated_at) console.warn(`! snapshot changed during the run (${data.updated_at} → ${fresh.updated_at}) — merging into the newer one`);
  const freshPayload = (typeof fresh.payload === "string" ? JSON.parse(fresh.payload) : fresh.payload) as Record<string, unknown>;
  const freshRaw = freshPayload["ep-reading-sets"];
  const freshBank = (typeof freshRaw === "string" ? JSON.parse(freshRaw) : freshRaw) as Record<string, Record<string, ReadingSet[]>>;
  for (const [round, byDiff] of Object.entries(bank)) {
    for (const [d, sets] of Object.entries(byDiff ?? {})) {
      const live = ((freshBank[round] ??= {})[d] ??= []);
      const known = new Set(live.flatMap((s) => (s.exams ?? []).map((e) => String(e.titleEn))));
      for (const set of sets) {
        const exams = (set.exams ?? []).filter((e) => !known.has(String(e.titleEn)));
        if (exams.length) live.push({ ...set, setNumber: live.reduce((m, s2) => Math.max(m, s2.setNumber ?? 0), 0) + 1, exams });
      }
    }
  }
  freshPayload["ep-reading-sets"] = typeof freshRaw === "string" ? JSON.stringify(freshBank) : freshBank;
  const { error: writeErr } = await sb
    .from("content_bank_snapshots")
    .update({ payload: freshPayload, updated_at: new Date().toISOString() })
    .eq("id", "global");
  if (writeErr) { console.error(`WRITE FAILED: ${writeErr.message}`); return; }

  const { data: check } = await sb.from("content_bank_snapshots").select("payload").eq("id", "global").maybeSingle();
  const checkRaw = (typeof check!.payload === "string" ? JSON.parse(check!.payload) : check!.payload)["ep-reading-sets"];
  const checkBank = typeof checkRaw === "string" ? JSON.parse(checkRaw) : checkRaw;
  const landed = Object.values(checkBank as Record<string, Record<string, ReadingSet[]>>)
    .flatMap((bd) => Object.values(bd ?? {}))
    .flatMap((ss) => ss ?? [])
    .reduce((a, s) => a + (s.exams?.length ?? 0), 0);
  console.log(`wrote ${made} new passages · bank now holds ${landed} (read back from the server)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
