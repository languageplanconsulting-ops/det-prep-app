import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const get = (k) => (env.match(new RegExp(`^${k}=\\s*['"]?([^'"\\n]+)`, "m")) || [])[1];
const url = get("NEXT_PUBLIC_SUPABASE_URL");
const key = get("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) { console.error("missing env"); process.exit(1); }
const h = { apikey: key, Authorization: `Bearer ${key}` };
const now = Date.now();
const DAY = 86400000;

// All non-free profiles
const pr = await fetch(`${url}/rest/v1/profiles?select=id,email,tier,tier_expires_at,vip_granted_by_course,stripe_customer_id,stripe_subscription_id&tier=neq.free`, { headers: h });
if (!pr.ok) { console.error("profiles query failed", pr.status, await pr.text()); process.exit(1); }
const rows = await pr.json();

const resolve = (r) => {
  const t = ["basic","premium","vip"].includes(r.tier) ? r.tier : "free";
  if (t === "free") return "free";
  if (!r.tier_expires_at) return t; // permanent
  return new Date(r.tier_expires_at).getTime() > now ? t : "free";
};

const active = [];        // resolves to a paid tier right now
const expired = [];       // paid tier in DB but expiry passed -> free (by design)
const expiringSoon = [];  // active but lapses within 7 days

for (const r of rows) {
  const eff = resolve(r);
  const exp = r.tier_expires_at ? new Date(r.tier_expires_at).getTime() : null;
  if (eff === "free") { expired.push(r); continue; }
  active.push(r);
  if (exp !== null && exp - now <= 7 * DAY) expiringSoon.push(r);
}

console.log(`\n================ PAID-USER AUDIT ================`);
console.log(`Non-free profiles in DB: ${rows.length}`);
console.log(`  • Active paid (resolve to a paid tier NOW): ${active.length}`);
console.log(`  • Expired (paid tier but expiry passed -> free by design): ${expired.length}`);
console.log(`  • Active but lapsing within 7 days: ${expiringSoon.length}`);

const byTier = {};
for (const r of active) byTier[r.tier] = (byTier[r.tier] || 0) + 1;
console.log(`\nActive breakdown:`, JSON.stringify(byTier));

if (expiringSoon.length) {
  console.log(`\n--- Lapsing within 7 days (will correctly drop to free unless they re-pay) ---`);
  for (const r of expiringSoon) console.log(`  ${r.email.padEnd(34)} ${r.tier.padEnd(8)} expires ${String(r.tier_expires_at).slice(0,10)}`);
}

if (expired.length) {
  console.log(`\n--- Expired (tier set but expiry in the past -> currently free) ---`);
  for (const r of expired) console.log(`  ${r.email.padEnd(34)} ${r.tier.padEnd(8)} expired ${String(r.tier_expires_at).slice(0,10)}  stripeCust=${!!r.stripe_customer_id}`);
}

// The scary class the old bug produced: tier=free in profiles but has a succeeded paid payment
// on record (i.e. they PAID but the profile says free). Cross-check payment_history.
const ph = await fetch(`${url}/rest/v1/payment_history?select=user_id,tier,status,created_at&status=eq.succeeded&order=created_at.desc`, { headers: h });
let mismatches = [];
if (ph.ok) {
  const pays = await ph.json();
  const paidUserIds = [...new Set(pays.map(p => p.user_id))];
  // fetch profiles for those users
  const chunks = [];
  for (let i = 0; i < paidUserIds.length; i += 50) chunks.push(paidUserIds.slice(i, i + 50));
  const profMap = {};
  for (const c of chunks) {
    const q = await fetch(`${url}/rest/v1/profiles?select=id,email,tier,tier_expires_at&id=in.(${c.join(",")})`, { headers: h });
    if (q.ok) for (const p of await q.json()) profMap[p.id] = p;
  }
  const latestPayByUser = {};
  for (const p of pays) if (!latestPayByUser[p.user_id]) latestPayByUser[p.user_id] = p;
  for (const uid of paidUserIds) {
    const prof = profMap[uid];
    if (!prof) continue;
    const eff = resolve(prof);
    const lastPay = latestPayByUser[uid];
    const payAge = (now - new Date(lastPay.created_at).getTime()) / DAY;
    // Flag: currently free but paid within the last 35 days (a monthly cycle) => likely wrongly free
    if (eff === "free" && payAge <= 35) {
      mismatches.push({ email: prof.email, tier: prof.tier, expiry: prof.tier_expires_at, paidTier: lastPay.tier, daysAgo: Math.round(payAge) });
    }
  }
} else {
  console.log(`\n(payment_history query failed: ${ph.status})`);
}

console.log(`\n================ WRONGLY-FREE SUSPECTS ================`);
if (mismatches.length === 0) {
  console.log(`✅ None. No user who paid within the last ~35 days currently resolves to free.`);
} else {
  console.log(`⚠️  ${mismatches.length} user(s) paid recently but currently resolve to FREE:`);
  for (const m of mismatches) {
    console.log(`  ${m.email.padEnd(34)} profile.tier=${String(m.tier).padEnd(8)} expiry=${String(m.expiry).slice(0,10)}  paid ${m.paidTier} ${m.daysAgo}d ago`);
  }
}
console.log(`\nNote: the code fix protects users whose profile tier is a paid tier with a valid/`);
console.log(`null expiry. The suspects above (if any) have profile.tier=free or a PAST expiry —`);
console.log(`those need a data fix (re-sync / extend), not a code fix.`);
