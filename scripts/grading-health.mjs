/**
 * Is AI grading actually working right now?
 *
 * A grade that never happens leaves no report, no credit charge and no usage
 * row — so a dead provider key is invisible in every admin screen until a
 * learner writes in to say she cannot see her score. That is how the August
 * 2026 outage stayed up for a day and a half.
 *
 * This prints, per grading surface: the last successful grade and which
 * provider served it, plus the recent total failures with the provider's own
 * error text (logged by src/lib/grading-failure-log.ts).
 *
 *   node scripts/grading-health.mjs [days=7]
 */
import { readFileSync } from "node:fs";

const days = Number(process.argv[2]) || 7;
const env = readFileSync(".env.local", "utf8");
const get = (k) => (env.match(new RegExp(`^${k}=\\s*['"]?([^'"\\n]+)`, "m")) || [])[1];
const url = get("NEXT_PUBLIC_SUPABASE_URL");
const key = get("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const since = new Date(Date.now() - days * 86_400_000).toISOString();
const res = await fetch(
  `${url}/rest/v1/api_usage_logs?select=created_at,operation,provider,model,user_id,meta` +
    `&created_at=gte.${since}&order=created_at.desc&limit=5000`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } },
);
if (!res.ok) {
  console.error("query failed:", res.status, await res.text());
  process.exit(1);
}
const rows = await res.json();

const GRADING_OPS = [
  "writing_report",
  "speaking_report",
  "photo_speak_report",
  "interactive_speaking_report",
];

const ago = (iso) => {
  const h = (Date.now() - Date.parse(iso)) / 3_600_000;
  return h < 1 ? `${Math.round(h * 60)}m ago` : `${h.toFixed(1)}h ago`;
};

console.log(`Grading health — last ${days} day(s)\n`);

for (const op of GRADING_OPS) {
  const ok = rows.filter((r) => r.operation === op);
  const bad = rows.filter((r) => r.operation === `${op}_failed`);
  const last = ok[0];
  const status = last ? `last OK ${ago(last.created_at)} via ${last.provider}/${last.model}` : "NO SUCCESSFUL GRADE";
  console.log(`${last ? "  " : "!!"} ${op.padEnd(28)} ${String(ok.length).padStart(4)} ok  ${String(bad.length).padStart(4)} failed   ${status}`);
  // One example is enough to name the broken key; the rest repeat it.
  const sample = bad[0];
  if (sample) {
    console.log(`     ↳ ${ago(sample.created_at)}${sample.meta?.permanent ? " [permanent — a key is denied/revoked]" : ""}`);
    for (const f of sample.meta?.failures ?? []) console.log(`       · ${f}`);
  }
}

// A provider that used to serve grades and now serves none is the headline.
const providers = new Map();
for (const r of rows) {
  if (!GRADING_OPS.includes(r.operation)) continue;
  if (!providers.has(r.provider)) providers.set(r.provider, r.created_at);
}
console.log("\nLast successful grade per provider:");
for (const [p, at] of providers) console.log(`  ${p.padEnd(12)} ${at}  (${ago(at)})`);
if (providers.size === 0) console.log("  none — every provider is down");
