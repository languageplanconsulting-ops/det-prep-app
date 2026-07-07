import { readFileSync } from "node:fs";

const email = process.argv[2] || "dahyej0201@gmail.com";
const env = readFileSync(".env.local", "utf8");
const get = (k) => (env.match(new RegExp(`^${k}=\\s*['"]?([^'"\\n]+)`, "m")) || [])[1];
const url = get("NEXT_PUBLIC_SUPABASE_URL");
const key = get("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) { console.error("missing env"); process.exit(1); }

const h = { apikey: key, Authorization: `Bearer ${key}` };

// 1) find the auth user by email (admin API)
const au = await fetch(`${url}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`, { headers: h });
let userId = null;
if (au.ok) {
  const j = await au.json();
  const u = (j.users || j || []).find?.((x) => x.email?.toLowerCase() === email.toLowerCase());
  userId = u?.id ?? null;
  console.log("auth user:", u ? { id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at } : "NOT FOUND");
}

// 2) profiles row (this is what the app reads for tier)
const pr = await fetch(`${url}/rest/v1/profiles?select=*&${userId ? `id=eq.${userId}` : `email=eq.${encodeURIComponent(email)}`}`, { headers: h });
const profiles = await pr.json();
console.log("\n=== profiles row (source of truth for app tier) ===");
for (const p of profiles) {
  console.log(JSON.stringify({
    id: p.id, email: p.email, tier: p.tier, tier_expires_at: p.tier_expires_at,
    vip_granted_by_course: p.vip_granted_by_course, role: p.role,
    stripe_customer_id: p.stripe_customer_id, stripe_subscription_id: p.stripe_subscription_id,
  }, null, 2));
  if (!userId) userId = p.id;
}
if (!profiles.length) console.log("(no profiles row!)");

// 3) resolve effective tier the same way the app does
const now = Date.now();
for (const p of profiles) {
  const t = (p.tier === "basic" || p.tier === "premium" || p.tier === "vip") ? p.tier : "free";
  let eff;
  if (t === "free") eff = "free";
  else if (!p.tier_expires_at) eff = t;
  else eff = (new Date(p.tier_expires_at).getTime() > now) ? t : "free";
  console.log(`\n>>> resolveEffectiveTierFromProfile => "${eff}"  (raw tier="${p.tier}", expiry ${p.tier_expires_at ? (new Date(p.tier_expires_at).getTime() > now ? "FUTURE" : "PAST") : "null"})`);
}

// 4) payment_history for this user
if (userId) {
  const ph = await fetch(`${url}/rest/v1/payment_history?select=*&user_id=eq.${userId}&order=created_at.desc`, { headers: h });
  if (ph.ok) {
    const rows = await ph.json();
    console.log(`\n=== payment_history (${rows.length} rows) ===`);
    for (const r of rows.slice(0, 6)) {
      console.log(JSON.stringify({ created_at: r.created_at, status: r.status, tier: r.tier, amount: r.amount, provider: r.provider, stripe_session_id: r.stripe_session_id }, null, 2));
    }
  } else {
    console.log("\npayment_history query failed:", ph.status, await ph.text());
  }
}
