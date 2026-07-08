// READ-ONLY audit of notebook_sync entries for one user, by email. Writes nothing.
//   node scripts/audit-notebook-sync.mjs englishplaninfo@gmail.com
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

const email = process.argv[2];
if (!email) {
  console.error("usage: node scripts/audit-notebook-sync.mjs <email>");
  process.exit(1);
}

const { data: users, error: userErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
if (userErr) { console.error(userErr.message); process.exit(1); }
const user = users.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.log(`No auth user found for ${email}`);
  process.exit(0);
}
console.log(`user_id for ${email}: ${user.id}`);

const { data: rows, error } = await supabase
  .from("notebook_sync")
  .select("client_entry_id, payload, updated_at, created_at")
  .eq("user_id", user.id)
  .order("updated_at", { ascending: false });
if (error) { console.error(error.message); process.exit(1); }

console.log(`\nTotal notebook_sync rows: ${rows?.length ?? 0}`);
const mobileRows = (rows ?? []).filter((r) => r.client_entry_id.startsWith("mob-"));
const webRows = (rows ?? []).filter((r) => !r.client_entry_id.startsWith("mob-"));
console.log(`  from mobile (client_entry_id starts "mob-"): ${mobileRows.length}`);
console.log(`  from web: ${webRows.length}`);

console.log("\nSample rows:");
for (const r of (rows ?? []).slice(0, 15)) {
  const p = r.payload ?? {};
  console.log(
    `  [${r.client_entry_id}] "${p.titleEn ?? ""}" source=${p.source} categories=${JSON.stringify(p.categoryIds)} updated_at=${r.updated_at}`,
  );
}

const decant = (rows ?? []).find((r) => (r.payload?.titleEn ?? "").toLowerCase().includes("decant"));
console.log(`\n"decant" entry present: ${decant ? "YES — " + JSON.stringify(decant) : "NO"}`);
