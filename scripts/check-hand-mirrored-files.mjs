// READ-ONLY parity check. Writes nothing, only reads files on disk.
//   node scripts/check-hand-mirrored-files.mjs
//   DET_MOBILE_PATH=/path/to/det-mobile node scripts/check-hand-mirrored-files.mjs
//
// Some logic is hand-duplicated between this repo and the sibling det-mobile repo
// (no shared package exists yet) because both need it and there's no build step
// that could import across repos. That's fine as long as it's actually kept in
// sync — this script is the thing that actually checks that, instead of trusting
// manual copy-paste discipline. Exits non-zero on any drift so it can gate a PR.
import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const mobileRoot = process.env.DET_MOBILE_PATH
  ? path.resolve(process.env.DET_MOBILE_PATH)
  : path.resolve(repoRoot, "..", "det-mobile");

function readOrNull(p) {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

/** Strips a file's own leading /** ... *\/ block comment — the one place these pairs are EXPECTED to differ (each names its own path / the other file's path). */
function stripLeadingBlockComment(src) {
  return src.replace(/^\s*\/\*\*[\s\S]*?\*\/\s*/, "");
}

let failures = 0;

function reportPass(label) {
  console.log(`  OK   ${label}`);
}
function reportFail(label, detail) {
  failures++;
  console.log(`  FAIL ${label}`);
  if (detail) console.log(detail.split("\n").map((l) => `       ${l}`).join("\n"));
}

/** Pair 1: pure calendar-shape generator — must be byte-identical below the header comment. */
function checkExactMirror({ label, aPath, bPath }) {
  const aRaw = readOrNull(aPath);
  const bRaw = readOrNull(bPath);
  if (aRaw == null) return reportFail(label, `missing: ${aPath}`);
  if (bRaw == null) return reportFail(label, `missing: ${bPath}`);

  const a = stripLeadingBlockComment(aRaw).trim();
  const b = stripLeadingBlockComment(bRaw).trim();
  if (a === b) return reportPass(label);

  const aLines = a.split("\n");
  const bLines = b.split("\n");
  const max = Math.max(aLines.length, bLines.length);
  const diffLines = [];
  for (let i = 0; i < max; i++) {
    if (aLines[i] !== bLines[i]) {
      diffLines.push(`line ${i + 1}:`);
      diffLines.push(`  web:    ${aLines[i] ?? "(missing)"}`);
      diffLines.push(`  mobile: ${bLines[i] ?? "(missing)"}`);
      if (diffLines.length > 24) { diffLines.push("  ... (more differences omitted)"); break; }
    }
  }
  reportFail(label, diffLines.join("\n"));
}

/** Pair 2: access-control.ts <-> access.ts — mobile's is a deliberate minimal subset (helpers only,
 * no SET_LIMITS/AI_MONTHLY_LIMIT), so we can't byte-diff it. The one thing that MUST match is the
 * `Tier` union itself — if web adds/renames a tier and mobile doesn't know, isPaidTier/canStartMock
 * silently misclassify real users. */
function extractTierUnion(src, label) {
  const m = src.match(/export type Tier\s*=\s*([^;]+);/);
  if (!m) return null;
  return m[1]
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .sort();
  // eslint-disable-next-line no-unreachable
  void label;
}

function checkTierUnion({ label, aPath, bPath }) {
  const aRaw = readOrNull(aPath);
  const bRaw = readOrNull(bPath);
  if (aRaw == null) return reportFail(label, `missing: ${aPath}`);
  if (bRaw == null) return reportFail(label, `missing: ${bPath}`);

  const aTiers = extractTierUnion(aRaw);
  const bTiers = extractTierUnion(bRaw);
  if (!aTiers) return reportFail(label, `could not find "export type Tier = ..." in ${aPath}`);
  if (!bTiers) return reportFail(label, `could not find "export type Tier = ..." in ${bPath}`);

  const aSet = new Set(aTiers);
  const bSet = new Set(bTiers);
  const onlyInA = aTiers.filter((t) => !bSet.has(t));
  const onlyInB = bTiers.filter((t) => !aSet.has(t));
  if (onlyInA.length === 0 && onlyInB.length === 0) return reportPass(label);

  const detail = [];
  if (onlyInA.length) detail.push(`only in web:    ${onlyInA.join(", ")}`);
  if (onlyInB.length) detail.push(`only in mobile: ${onlyInB.join(", ")}`);
  reportFail(label, detail.join("\n"));
}

const PAIRS = [
  {
    check: checkExactMirror,
    label: "study-plan/schedule.ts <-> study-plan-schedule.ts (calendar generator, must be byte-identical)",
    aPath: path.join(repoRoot, "src/lib/study-plan/schedule.ts"),
    bPath: path.join(mobileRoot, "src/lib/study-plan-schedule.ts"),
  },
  {
    check: checkTierUnion,
    label: "access-control.ts <-> access.ts (Tier union, must list the same tiers)",
    aPath: path.join(repoRoot, "src/lib/access-control.ts"),
    bPath: path.join(mobileRoot, "src/lib/access.ts"),
  },
];

console.log(`Checking hand-mirrored files against: ${mobileRoot}\n`);
for (const pair of PAIRS) {
  pair.check(pair);
}

console.log("");
if (failures > 0) {
  console.log(`${failures} pair(s) have drifted. Fix the file(s) above before merging.`);
  process.exit(1);
} else {
  console.log("All hand-mirrored pairs are in sync.");
}
