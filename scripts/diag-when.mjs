import { readFileSync } from "node:fs";
const env = readFileSync(".env.local","utf8");
const get=(k)=>(env.match(new RegExp(`^${k}=\\s*['"]?([^'"\\n]+)`,"m"))||[])[1];
const url=get("NEXT_PUBLIC_SUPABASE_URL"), key=get("SUPABASE_SERVICE_ROLE_KEY");
const h={apikey:key,Authorization:`Bearer ${key}`};
const uid="b640cccb-5240-4d10-8b19-6db784fbf62d";
// her profile updated_at + all timestamped fields
const p=await (await fetch(`${url}/rest/v1/profiles?select=tier,updated_at,tier_expires_at,ai_credits_reset_at,created_at&id=eq.${uid}`,{headers:h})).json();
console.log("profile:",JSON.stringify(p,null,2));
// look for an audit table
for (const t of ["subscription_audit_log","admin_audit_log","audit_log","subscription_changes","business_events"]) {
  const r=await fetch(`${url}/rest/v1/${t}?select=*&limit=3`,{headers:h});
  if (r.ok) {
    const rows=await r.json();
    console.log(`\n[table ${t}] EXISTS, sample cols:`, rows[0]?Object.keys(rows[0]).join(","):"(empty)");
    // try to filter by her user
    const r2=await fetch(`${url}/rest/v1/${t}?or=(user_id.eq.${uid},email.eq.dahyej0201@gmail.com)&order=created_at.desc&limit=10`,{headers:h});
    if (r2.ok){ const rr=await r2.json(); console.log(`  her rows (${rr.length}):`); for(const x of rr) console.log("   ",JSON.stringify(x).slice(0,300)); }
  } else {
    console.log(`\n[table ${t}] not found (${r.status})`);
  }
}
