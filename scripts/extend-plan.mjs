// Extend a single user's monthly plan by 30 days (mirrors a Stripe monthly renewal).
//
//   node scripts/extend-plan.mjs <email>            # DRY RUN: reads + prints, no writes
//   node scripts/extend-plan.mjs <email> --apply    # writes the new expiry
//
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
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
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.argv[2] || "").trim().toLowerCase();
const apply = process.argv.includes("--apply");

if (!url || !key) { console.error("Missing Supabase env in .env.local"); process.exit(1); }
if (!email || !email.includes("@")) { console.error("Usage: node scripts/extend-plan.mjs <email> [--apply]"); process.exit(1); }

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: profile, error } = await supabase
  .from("profiles")
  .select("id, email, tier, tier_expires_at, vip_granted_by_course, stripe_subscription_id, stripe_customer_id")
  .eq("email", email)
  .maybeSingle();

if (error) { console.error("Lookup failed:", error.message); process.exit(1); }
if (!profile) { console.error("No profile found for", email); process.exit(1); }

const { data: grant } = await supabase
  .from("vip_course_grants")
  .select("is_active, grant_expires_at, notes")
  .eq("email", email)
  .maybeSingle();

console.log("\n=== BEFORE ===");
console.log(JSON.stringify({ profile, grant }, null, 2));

// New expiry: 30 days from now (the app's monthly convention).
const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
// She was using VIP; restore VIP if she has been knocked down to free.
const newTier = profile.tier === "free" ? "vip" : profile.tier;

console.log("\n=== PLANNED CHANGE ===");
console.log(JSON.stringify({ tier: newTier, tier_expires_at: newExpiry, ai_credits_used: 0 }, null, 2));

if (!apply) {
  console.log("\nDRY RUN — no changes written. Re-run with --apply to commit.");
  process.exit(0);
}

const { error: updErr } = await supabase
  .from("profiles")
  .update({
    tier: newTier,
    tier_expires_at: newExpiry,
    ai_credits_used: 0,
    ai_credits_reset_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  .eq("id", profile.id);

if (updErr) { console.error("Update failed:", updErr.message); process.exit(1); }
console.log("\n✅ Applied. User is now", newTier.toUpperCase(), "until", newExpiry);
console.log("Tell her to refresh the page (no logout needed).");
