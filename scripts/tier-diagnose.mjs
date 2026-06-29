import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const get = (k) => (env.match(new RegExp(`^${k}=\\s*['"]?([^'"\\n]+)`, "m")) || [])[1];
const url = get("NEXT_PUBLIC_SUPABASE_URL");
const key = get("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) { console.error("missing env"); process.exit(1); }

const res = await fetch(`${url}/rest/v1/profiles?select=tier,tier_expires_at,vip_granted_by_course,stripe_subscription_id&tier=neq.free`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
if (!res.ok) { console.error("query failed", res.status, await res.text()); process.exit(1); }
const rows = await res.json();
const now = Date.now();

const tally = {};
for (const r of rows) {
  const t = r.tier;
  tally[t] ??= { total: 0, no_expiry: 0, future: 0, past: 0, course_vip: 0, stripe: 0 };
  tally[t].total++;
  if (!r.tier_expires_at) tally[t].no_expiry++;
  else if (new Date(r.tier_expires_at).getTime() >= now) tally[t].future++;
  else tally[t].past++;
  if (r.vip_granted_by_course) tally[t].course_vip++;
  if (r.stripe_subscription_id) tally[t].stripe++;
}

console.log(`Total non-free profiles: ${rows.length}\n`);
for (const [t, c] of Object.entries(tally)) {
  console.log(`${t.toUpperCase().padEnd(8)} total=${c.total}  no_expiry=${c.no_expiry}  future=${c.future}  PAST(→free)=${c.past}  courseVIP=${c.course_vip}  stripeSub=${c.stripe}`);
}
console.log(`\nSample (tier · expiry · courseVIP · stripeSub):`);
for (const r of rows.slice(0, 12)) {
  const status = !r.tier_expires_at ? "null" : (new Date(r.tier_expires_at) >= new Date() ? "future" : "PAST");
  console.log(`  ${r.tier.padEnd(8)} ${String(r.tier_expires_at).slice(0, 16).padEnd(16)} (${status})  course=${!!r.vip_granted_by_course}  stripe=${!!r.stripe_subscription_id}`);
}
