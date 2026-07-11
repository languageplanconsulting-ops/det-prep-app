// Bulk-import "Write about the Photo" / "Speak about the Photo" content into Supabase.
//
//   node scripts/import-photo-speak-items.mjs <path-to-items.json>            # DRY RUN
//   node scripts/import-photo-speak-items.mjs <path-to-items.json> --apply    # writes
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
const jsonPath = process.argv[2];
const apply = process.argv.includes("--apply");

if (!url || !key) { console.error("Missing Supabase env in .env.local"); process.exit(1); }
if (!jsonPath) { console.error("Usage: node scripts/import-photo-speak-items.mjs <path-to-items.json> [--apply]"); process.exit(1); }

const items = JSON.parse(readFileSync(jsonPath, "utf8"));
if (!Array.isArray(items) || items.length === 0) {
  console.error("Input JSON must be a non-empty array.");
  process.exit(1);
}

const REQUIRED = ["id", "title_en", "image_url", "prompt_en"];
const errors = [];
for (const [i, it] of items.entries()) {
  for (const field of REQUIRED) {
    if (!it[field] || typeof it[field] !== "string") errors.push(`item[${i}] (${it.id ?? "?"}) missing ${field}`);
  }
  if (it.license && /^by/.test(it.license) && (!it.creator || !it.attribution || !it.landing_url)) {
    errors.push(`item[${i}] (${it.id}) is CC-BY licensed but missing creator/attribution/landing_url`);
  }
}
if (errors.length) {
  console.error(`Validation failed (${errors.length} issue(s)):`);
  for (const e of errors.slice(0, 20)) console.error(" -", e);
  process.exit(1);
}

console.log(`Loaded ${items.length} items from ${jsonPath}.`);
const licenseCounts = items.reduce((acc, it) => { acc[it.license ?? "none"] = (acc[it.license ?? "none"] ?? 0) + 1; return acc; }, {});
console.log("License breakdown:", licenseCounts);

if (!apply) {
  console.log("\nDRY RUN — no writes made. Re-run with --apply to upsert into photo_speak_items.");
  process.exit(0);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const rows = items.map((it) => ({
  id: it.id,
  title_en: it.title_en,
  title_th: it.title_th ?? "",
  image_url: it.image_url,
  prompt_en: it.prompt_en,
  prompt_th: it.prompt_th ?? "",
  keywords: it.keywords ?? [],
  context_en: it.context_en ?? null,
  license: it.license ?? null,
  license_version: it.license_version ?? null,
  license_url: it.license_url ?? null,
  creator: it.creator ?? null,
  attribution: it.attribution ?? null,
  landing_url: it.landing_url ?? null,
  provider: it.provider ?? null,
  is_active: it.is_active ?? true,
  sort_order: it.sort_order ?? 0,
}));

const { error, count } = await supabase
  .from("photo_speak_items")
  .upsert(rows, { onConflict: "id", count: "exact" });

if (error) {
  console.error("Upsert failed:", error.message);
  process.exit(1);
}
console.log(`Upserted ${count ?? rows.length} rows into photo_speak_items.`);
