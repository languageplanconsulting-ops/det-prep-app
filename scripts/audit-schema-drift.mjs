/**
 * Schema-drift auditor.
 *
 * Every `.from("table").select("cols")` in src/ is checked against the LIVE
 * Supabase schema. When a migration is written but never applied, PostgREST
 * answers the query with 400/42703 and supabase-js hands the caller
 * `{ data: null }` — which most call sites treat as "no row" rather than "the
 * database is broken".
 *
 * That failure mode has already cost real money once: getAiCreditStateForUser()
 * selected profiles.ai_quota_mode (migration 025, never deployed), got null
 * back, resolved the tier to "free", and returned HTTP 402 to every paying
 * customer asking for Instant Feedback.
 *
 *   node scripts/audit-schema-drift.mjs          # report
 *   node scripts/audit-schema-drift.mjs --strict # exit 1 if anything is broken
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const STRICT = process.argv.includes("--strict");

const env = readFileSync(join(REPO, ".env.local"), "utf8");
const readEnv = (k) => (env.match(new RegExp(`^${k}=\\s*['"]?([^'"\\n]+)`, "m")) || [])[1];
const SUPABASE_URL = readEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = readEnv("SUPABASE_SERVICE_ROLE_KEY");
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const HEADERS = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

/**
 * Features deliberately not launched yet — their migrations are expected to be
 * undeployed, so flagging them would train you to ignore this report.
 * Remove an entry the moment the feature ships.
 */
const IGNORED_TABLE_PREFIXES = [
  "course", // migrations 038-040 — Duolingo Fast Track course, still being built
];
const isIgnoredTable = (t) => IGNORED_TABLE_PREFIXES.some((p) => t.startsWith(p));

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  }
  return out;
}

// `.from("x")` … `.select("a,b")`, allowing chained calls/newlines in between.
const QUERY_RE = /\.from\(\s*["'`]([a-z0-9_]+)["'`]\s*\)([\s\S]{0,400}?)\.select\(\s*["'`]([^"'`]*)["'`]/g;

const queries = new Map(); // "table|cols" -> [relative file paths]
for (const file of walk(join(REPO, "src"))) {
  for (const [, table, between, cols] of readFileSync(file, "utf8").matchAll(QUERY_RE)) {
    if (between.includes(".from(")) continue; // regex ran into the next query
    if (!cols.trim() || cols.includes("${")) continue; // dynamic select — can't check statically
    if (isIgnoredTable(table)) continue;
    const key = `${table}|${cols}`;
    const rel = file.slice(REPO.length + 1);
    const seen = queries.get(key) ?? [];
    if (!seen.includes(rel)) seen.push(rel);
    queries.set(key, seen);
  }
}

const broken = [];
for (const [key, files] of queries) {
  const [table, cols] = key.split("|");
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?limit=0&select=${encodeURIComponent(cols)}`,
    { headers: HEADERS },
  );
  if (res.ok) continue;
  const body = await res.json().catch(() => ({}));
  const kind =
    body.code === "42P01" || body.code === "PGRST205"
      ? "MISSING TABLE"
      : body.code === "42703"
        ? "MISSING COLUMN"
        : `HTTP ${res.status}${body.code ? ` ${body.code}` : ""}`;
  broken.push({ kind, table, cols, message: body.message ?? "", files });
}

console.log(`checked ${queries.size} static (table, select) pairs against ${SUPABASE_URL}\n`);

if (!broken.length) {
  console.log("✅ no schema drift — every static select resolves against the live database");
  process.exit(0);
}

broken.sort((a, b) => a.kind.localeCompare(b.kind) || a.table.localeCompare(b.table));
for (const b of broken) {
  console.log(`${b.kind} — ${b.table}`);
  console.log(`  ${b.message}`);
  console.log(`  select : ${b.cols.length > 150 ? `${b.cols.slice(0, 150)}…` : b.cols}`);
  console.log(`  callers: ${b.files.join(", ")}\n`);
}
console.log(`❌ ${broken.length} broken quer${broken.length === 1 ? "y" : "ies"}`);
console.log("   Deploy the matching file in supabase/migrations/ (see supabase/manual_run_schema_drift_fix.sql).");
process.exit(STRICT ? 1 : 0);
