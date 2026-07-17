/**
 * One-time backfill: clamp historical study_sessions.duration_seconds to the
 * per-session ceiling (MAX_STUDY_SESSION_SECONDS = 90 min).
 *
 * Time-on-task is recorded as visible-tab seconds, so tabs left open produced
 * absurd rows (up to ~1019h) that skew every analytics dashboard. Going forward
 * the API clamps at write time; this fixes the rows already stored.
 *
 * Clamping a value that is already > cap to exactly `cap` is equivalent to
 * LEAST(duration_seconds, cap), so the update is a single idempotent statement
 * and safe to re-run.
 *
 * Usage:
 *   node scripts/backfill-session-duration-cap.mjs            # dry run (no writes)
 *   node scripts/backfill-session-duration-cap.mjs --apply    # perform the update
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const CAP = 90 * 60; // keep in sync with src/lib/study-session-limits.ts
const APPLY = process.argv.includes("--apply");

function loadEnv(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = loadEnv(process.env.ENV_FILE || ".env.local");
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const { count: affected, error: countErr } = await sb
  .from("study_sessions")
  .select("*", { count: "exact", head: true })
  .gt("duration_seconds", CAP);
if (countErr) {
  console.error("Count failed:", countErr.message);
  process.exit(1);
}

// Show the worst offenders so the impact is visible before writing.
const { data: worst } = await sb
  .from("study_sessions")
  .select("id, user_id, exercise_type, duration_seconds, started_at")
  .gt("duration_seconds", CAP)
  .order("duration_seconds", { ascending: false })
  .limit(10);

console.log(`Cap: ${CAP}s (${CAP / 3600}h)`);
console.log(`Rows above cap: ${affected}`);
console.log("Worst offenders:");
for (const r of worst ?? []) {
  console.log(
    `  ${(r.duration_seconds / 3600).toFixed(1)}h → 1.5h  ${r.exercise_type}  ${r.started_at?.slice(0, 10)}  user=${String(r.user_id).slice(0, 8)}`,
  );
}

if (!affected) {
  console.log("\nNothing to do — no rows exceed the cap.");
  process.exit(0);
}

if (!APPLY) {
  console.log("\nDRY RUN — no changes written. Re-run with --apply to clamp these rows.");
  process.exit(0);
}

const { data: updated, error: updErr } = await sb
  .from("study_sessions")
  .update({ duration_seconds: CAP })
  .gt("duration_seconds", CAP)
  .select("id");
if (updErr) {
  console.error("Update failed:", updErr.message);
  process.exit(1);
}
console.log(`\n✅ Clamped ${updated?.length ?? 0} rows to ${CAP}s.`);
