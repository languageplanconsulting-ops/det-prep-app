// READ-ONLY audit of "unsynced" / downgraded paid users. Writes nothing.
//   node scripts/audit-unsynced.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const out = {};
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
  return out;
}
const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: rows, error } = await supabase
  .from("profiles")
  .select("email, tier, tier_expires_at, stripe_customer_id, stripe_subscription_id, vip_granted_by_course, updated_at");
if (error) { console.error(error.message); process.exit(1); }

const now = Date.now();
const unsynced = (rows ?? []).filter(
  (r) => (r.tier ?? "free") === "free" && r.stripe_customer_id && !r.stripe_subscription_id,
);

const likelyBug = []; // free, but tier_expires_at STILL in the future => paid then knocked down early
const expiredOrAmbiguous = []; // free + customer id + no/past expiry => genuine month-end OR webhook miss
for (const r of unsynced) {
  const exp = r.tier_expires_at ? new Date(r.tier_expires_at).getTime() : null;
  if (exp && exp > now) likelyBug.push(r);
  else expiredOrAmbiguous.push(r);
}

console.log(`\nTotal profiles: ${rows?.length ?? 0}`);
console.log(`"unsynced" (free + has Stripe customer, no subscription): ${unsynced.length}`);
console.log(`\n— Likely login-downgrade victims (free but expiry still in FUTURE): ${likelyBug.length}`);
for (const r of likelyBug) console.log(`   ${r.email}  expires=${r.tier_expires_at}`);
console.log(`\n— Expired / ambiguous (re-sync from Stripe to confirm real payment): ${expiredOrAmbiguous.length}`);
for (const r of expiredOrAmbiguous) console.log(`   ${r.email}  expiry=${r.tier_expires_at ?? "none"}`);
