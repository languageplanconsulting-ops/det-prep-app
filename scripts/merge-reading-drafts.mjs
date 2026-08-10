/**
 * Merges the authored draft batches in docs/reading/drafts/ into the live bank.
 *
 *   node scripts/merge-reading-drafts.mjs           # dry run — reports what would happen
 *   node scripts/merge-reading-drafts.mjs --write   # append to src/lib/interactive-reading-data.ts
 *
 * Refuses to merge if a draft is missing, unparseable, or would introduce a duplicate id. Run
 * scripts/validate-interactive-reading.mjs afterwards — merging is not a substitute for validating.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const DRAFT_DIR = new URL("../docs/reading/drafts/", import.meta.url);
const LIVE = new URL("../src/lib/interactive-reading-data.ts", import.meta.url);
const write = process.argv.includes("--write");

const parse = (src) => eval(src.slice(src.indexOf("= [") + 2, src.lastIndexOf("];") + 1)); // eslint-disable-line no-eval

const live = readFileSync(LIVE, "utf8");
const liveIds = new Set(parse(live).map((s) => s.id));

const files = readdirSync(DRAFT_DIR)
  .filter((f) => f.endsWith(".ts"))
  .sort();

let problems = 0;
const chunks = [];
const seen = new Set(liveIds);

for (const f of files) {
  const src = readFileSync(new URL(f, DRAFT_DIR), "utf8");
  let sets;
  try {
    sets = parse(src);
  } catch (e) {
    console.log(`  ✗ ${f}: cannot parse — ${e.message}`);
    problems += 1;
    continue;
  }
  const dupes = sets.map((s) => s.id).filter((id) => seen.has(id));
  if (dupes.length) {
    console.log(`  ✗ ${f}: duplicate id(s) ${dupes.join(", ")}`);
    problems += 1;
    continue;
  }
  sets.forEach((s) => seen.add(s.id));
  console.log(`  ✓ ${f}: ${sets.length} sets — ${sets.map((s) => s.id).join(", ")}`);

  // keep the authored source verbatim; only strip the import + export wrapper
  const body = src.slice(src.indexOf("= [") + 3, src.lastIndexOf("];"));
  chunks.push(`\n  // ── ${f} ──\n${body.replace(/^\s*\n/, "")}`);
}

console.log(`\n${files.length} draft file(s), ${seen.size - liveIds.size} new sets, ${liveIds.size} already live`);

if (problems) {
  console.log(`\n${problems} problem(s) — nothing written.`);
  process.exit(1);
}
if (!write) {
  console.log("\nDry run. Re-run with --write to append.");
  process.exit(0);
}

const cut = live.lastIndexOf("];");
writeFileSync(LIVE, live.slice(0, cut) + chunks.join("") + "\n];\n", "utf8");
console.log(`\nMerged into src/lib/interactive-reading-data.ts — now run:\n  node scripts/validate-interactive-reading.mjs`);
