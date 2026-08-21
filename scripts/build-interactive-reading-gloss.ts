/**
 * Builds the Thai gloss map the Interactive Reading feedback bar points at.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/build-interactive-reading-gloss.ts [--dry]
 *
 * The feedback bar shows `keyword (ความหมาย)` next to the word that decides an item. Exam and mock
 * passages ship their own `highlightedVocab`, and the built-in list in interactive-reading-explain.ts
 * covers function words — but the lesson bank has no vocabulary data at all, so its content-word
 * keywords rendered bare.
 *
 * This walks the bank, collects exactly the words the panel can point at (cloze answers, the
 * question-stem words that match a highlight sentence, the evidence words behind the idea and title
 * keys), and asks Gemini for a short Thai gloss for the ones nothing else covers. Output is a
 * generated data file; nothing is fetched at runtime.
 *
 * Re-runnable: existing entries are kept, so a re-run only prices the words that are new.
 */
import fs from "node:fs";
import path from "node:path";
import { IR_SETS } from "../src/lib/interactive-reading-data";
import {
  findEvidence,
  glossTh,
  quotedEvidence,
  sentenceContaining,
  stemMatches,
} from "../src/lib/interactive-reading-explain";
import { resolvedParagraphs } from "../src/lib/interactive-reading";

const OUT = path.join(process.cwd(), "src/lib/interactive-reading-gloss-data.ts");
const SEED = path.join(process.cwd(), "scripts/th-gloss-extra.json");
const DRY = process.argv.includes("--dry");

/** Every word the runner can put in front of a learner, and nothing else. */
function keywordsInBank(): string[] {
  const out = new Set<string>();
  for (const set of IR_SETS) {
    for (const b of set.blanks) out.add(b.answer);

    const resolved = resolvedParagraphs(set);
    for (const hl of set.highlights) {
      if (!hl.answer) continue;
      const para = resolved[hl.paragraph - 1] ?? "";
      const sentence = hl.clueEn ?? sentenceContaining(para, hl.answer);
      for (const w of stemMatches(hl.questionEn, sentence).words) out.add(w);
    }
    for (const list of [set.idea, set.title]) {
      const key = list.find((o) => o.correct);
      if (!key) continue;
      const pinned = key.clueEn ?? quotedEvidence(key.whyTh, resolved);
      const ev = pinned ? { sentence: pinned, ...stemMatches(key.text, pinned) } : findEvidence(resolved, key.text, 2);
      if (ev?.words[0]) out.add(ev.words[0]);
    }
  }
  // passages quote words ('left'), and a quote is not part of the word
  return [...out].map((w) => w.replace(/[^A-Za-z'-]/g, "").replace(/^['-]+|['-]+$/g, "")).filter((w) => w.length > 1);
}

async function askGemini(words: string[]): Promise<Record<string, string>> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing — add it to .env.local");
  const model = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
  const prompt = [
    "You are writing a Thai glossary for Thai learners of English preparing for the Duolingo English Test.",
    "For each English word below, give ONE short Thai meaning — the sense a B1–C1 reading passage would use.",
    "Rules: 1–4 Thai words, no English, no parentheses, no romanisation, no explanation, no part of speech.",
    "Return JSON only: an object mapping each input word (exactly as given) to its Thai meaning.",
    "",
    JSON.stringify(words),
  ].join("\n");

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "{}";
  return JSON.parse(text) as Record<string, string>;
}

/** Reads the generated file back line-wise — its keys are bare identifiers, so it is not JSON. */
function readExisting(): Record<string, string> {
  if (!fs.existsSync(OUT)) return {};
  const out: Record<string, string> = {};
  for (const m of fs.readFileSync(OUT, "utf8").matchAll(/^\s*(?:"([^"]+)"|([A-Za-z'-]+)):\s*"([^"]*)",\s*$/gm)) {
    out[(m[1] ?? m[2] ?? "").toLowerCase()] = m[3]!;
  }
  return out;
}

async function main() {
  const seed: Record<string, string> = fs.existsSync(SEED) ? JSON.parse(fs.readFileSync(SEED, "utf8")) : {};
  const have = { ...readExisting() };

  const words = keywordsInBank();
  // a word is missing only if nothing already covers it: the built-in list, a previous run, or the
  // hand-written extras another script already uses
  const seen = new Set<string>();
  const missing = words.filter((w) => {
    const lower = w.toLowerCase();
    // "City" and "city" are one entry — the map is keyed lowercase
    if (seen.has(lower)) return false;
    seen.add(lower);
    if (have[lower]) return false;
    if (seed[lower]) {
      have[lower] = seed[lower]!.replace(/\s*\([^)]*\)\s*/g, " ").trim();
      return false;
    }
    return !glossTh(w);
  });

  console.log(`keywords in bank: ${words.length} · already covered: ${words.length - missing.length} · to fetch: ${missing.length}`);
  if (DRY) {
    console.log(missing.slice(0, 60).join(", "));
    return;
  }

  for (let i = 0; i < missing.length; i += 60) {
    const batch = missing.slice(i, i + 60);
    const got = await askGemini(batch);
    for (const [w, th] of Object.entries(got)) {
      const clean = String(th).replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
      if (clean) have[w.toLowerCase()] = clean;
    }
    console.log(`  glossed ${Math.min(i + batch.length, missing.length)}/${missing.length}`);
  }

  const body = Object.keys(have)
    .sort()
    .map((k) => `  ${/^[a-z][a-z']*$/.test(k) ? k : JSON.stringify(k)}: ${JSON.stringify(have[k])},`)
    .join("\n");
  fs.writeFileSync(
    OUT,
    `/**\n * AUTO-GENERATED by scripts/build-interactive-reading-gloss.ts — do not edit by hand.\n *\n * Thai meanings for the words the Interactive Reading feedback bar points at. Only words the\n * runner can actually surface are in here; see the script for how they are collected.\n */\n\nexport const IR_GLOSS_TH: Record<string, string> = {\n${body}\n};\n`,
  );
  console.log(`wrote ${Object.keys(have).length} entries → ${path.relative(process.cwd(), OUT)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
