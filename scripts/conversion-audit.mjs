// READ-ONLY conversion audit. Writes nothing to the DB.
//   node scripts/conversion-audit.mjs
//
// Answers: of everyone who signed up, who paid, who tried-but-failed (unsynced),
// who lapsed, and who never even engaged. Plus the real signup->purchase funnel.
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

const now = Date.now();
const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : "—");
const hr = (t) => console.log(`\n${"─".repeat(60)}\n${t}\n${"─".repeat(60)}`);

// Pull everything we need (paginate profiles in case > 1000 rows).
const MISSING = new Set();
async function fetchAll(table, select) {
  const all = [];
  let from = 0;
  const page = 1000;
  for (;;) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + page - 1);
    if (error) {
      if (/Could not find the table|does not exist/i.test(error.message)) { MISSING.add(table); return []; }
      console.error(`${table}:`, error.message); process.exit(1);
    }
    all.push(...(data ?? []));
    if (!data || data.length < page) break;
    from += page;
  }
  return all;
}

const profiles = await fetchAll(
  "profiles",
  "id, email, tier, tier_expires_at, stripe_customer_id, stripe_subscription_id, vip_granted_by_course, created_at",
);
const payments = await fetchAll("payment_history", "user_id, amount, status, tier, created_at");
const events = await fetchAll("business_events", "user_id, event_type, created_at");
const sessions = await fetchAll("study_sessions", "user_id, completed, created_at");

// ---- index helpers ----
const paidUserIds = new Set(
  payments.filter((p) => p.status === "succeeded" && (p.tier ?? "free") !== "free").map((p) => p.user_id),
);
const revenueTHB = payments
  .filter((p) => p.status === "succeeded")
  .reduce((s, p) => s + (p.amount ?? 0), 0) / 100;

const engagedUserIds = new Set(sessions.map((s) => s.user_id));
const completedUserIds = new Set(sessions.filter((s) => s.completed).map((s) => s.user_id));

const eventUsers = (type) => new Set(events.filter((e) => e.event_type === type).map((e) => e.user_id));
const ev_account = eventUsers("account_created");
const ev_diag = eventUsers("mini_diagnosis_started");
const ev_mock = eventUsers("mock_test_started");
const ev_plan = eventUsers("plan_purchased");

// ===================== OVERVIEW =====================
hr("OVERVIEW");
const total = profiles.length;
const byTier = profiles.reduce((m, p) => ((m[p.tier ?? "free"] = (m[p.tier ?? "free"] ?? 0) + 1), m), {});
if (MISSING.size) console.log(`⚠️  Tables not found in DB (tracking not deployed): ${[...MISSING].join(", ")}\n`);
console.log(`Total signed-up profiles: ${total}`);
console.log(`Current tier breakdown:`, byTier);
console.log(`Users who EVER paid (succeeded, non-free): ${paidUserIds.size}  (${pct(paidUserIds.size, total)})`);
console.log(`Total succeeded revenue: ฿${revenueTHB.toLocaleString()}`);

// ===================== SEGMENT THE "FREE" =====================
hr('SEGMENTING USERS CURRENTLY SHOWING AS "free"');
const free = profiles.filter((p) => (p.tier ?? "free") === "free");
console.log(`Currently free: ${free.length} (${pct(free.length, total)} of all users)\n`);

const seg = {
  lapsed_paid: [],        // ever paid (payment_history) but now free  => churned / day-30 lapse
  unsynced_paid: [],      // has stripe_customer_id, no subscription, never recorded as paid OR expiry still future => webhook miss / bug
  bug_future_expiry: [],  // free but tier_expires_at STILL in the future => login-downgrade victim
  never_paid_engaged: [], // no payment, no stripe customer, but DID practice => real non-converter to win back
  never_paid_ghost: [],   // signed up, never practiced, never paid => dead lead
};

for (const r of free) {
  const exp = r.tier_expires_at ? new Date(r.tier_expires_at).getTime() : null;
  const everPaid = paidUserIds.has(r.id);
  const hasCustomer = !!r.stripe_customer_id;
  const engaged = engagedUserIds.has(r.id);

  if (exp && exp > now && hasCustomer && !r.stripe_subscription_id) {
    seg.bug_future_expiry.push(r);
  } else if (everPaid) {
    seg.lapsed_paid.push(r);
  } else if (hasCustomer && !r.stripe_subscription_id) {
    seg.unsynced_paid.push(r);
  } else if (engaged) {
    seg.never_paid_engaged.push(r);
  } else {
    seg.never_paid_ghost.push(r);
  }
}

const line = (label, arr, note) =>
  console.log(`  ${label.padEnd(34)} ${String(arr.length).padStart(5)}  ${pct(arr.length, free.length).padStart(7)}   ${note}`);
console.log("  SEGMENT".padEnd(36) + "COUNT".padStart(5) + "  SHARE".padStart(9) + "   MEANING");
line("🔴 bug / future-expiry victims", seg.bug_future_expiry, "PAID, knocked to free early — restore now");
line("🟠 unsynced (paid, webhook miss?)", seg.unsynced_paid, "tried to pay? — Re-sync from Stripe to confirm");
line("🟡 lapsed payers (churned)", seg.lapsed_paid, "paid before, didn't renew — win-back campaign");
line("🟢 never-paid but ENGAGED", seg.never_paid_engaged, "real prospects — these are your conversion target");
line("⚪ never-paid ghosts", seg.never_paid_ghost, "signed up, never practiced — activation problem");

const recoverable = seg.bug_future_expiry.length + seg.unsynced_paid.length;
console.log(`\n  >> ${recoverable} of your "free" users are likely BILLING failures, not non-converters.`);
console.log(`  >> ${seg.never_paid_engaged.length} are genuine engaged prospects to convert with marketing/product.`);
console.log(`  >> ${seg.never_paid_ghost.length} never engaged at all (fix onboarding/activation first).`);

if (seg.bug_future_expiry.length) {
  console.log(`\n  Restore these (free but expiry still future):`);
  for (const r of seg.bug_future_expiry.slice(0, 30)) console.log(`     ${r.email}  expires=${r.tier_expires_at}`);
}
if (seg.unsynced_paid.length) {
  console.log(`\n  Re-sync these from Stripe (free + has customer, no subscription):`);
  for (const r of seg.unsynced_paid.slice(0, 30)) console.log(`     ${r.email}`);
}

// ===================== FUNNEL (business_events) =====================
hr("CONVERSION FUNNEL (from business_events)");
if (events.length === 0) {
  console.log("No business_events rows found — funnel tracking may be off. (This is itself a finding.)");
} else {
  const f_signup = ev_account.size || total; // fall back to profile count
  console.log(`  Step                         Users     % of signups`);
  console.log(`  1. Account created           ${String(f_signup).padStart(6)}     100%`);
  console.log(`  2. Started mini-diagnosis     ${String(ev_diag.size).padStart(6)}     ${pct(ev_diag.size, f_signup)}`);
  console.log(`  3. Started a mock test        ${String(ev_mock.size).padStart(6)}     ${pct(ev_mock.size, f_signup)}`);
  console.log(`  4. Purchased a plan           ${String(ev_plan.size).padStart(6)}     ${pct(ev_plan.size, f_signup)}`);
  console.log(`\n  Overall signup→paid conversion: ${pct(paidUserIds.size, total)}`);
}

// ===================== ENGAGEMENT vs CONVERSION =====================
hr("ENGAGEMENT (study_sessions)");
console.log(`Users who started ≥1 practice: ${engagedUserIds.size}  (${pct(engagedUserIds.size, total)})`);
console.log(`Users who COMPLETED ≥1 practice: ${completedUserIds.size}  (${pct(completedUserIds.size, total)})`);
const engagedNeverPaid = [...engagedUserIds].filter((id) => !paidUserIds.has(id)).length;
console.log(`Engaged but never paid: ${engagedNeverPaid}  <-- the high-intent free users to target`);

console.log("\nDone. (read-only — nothing was modified)\n");
