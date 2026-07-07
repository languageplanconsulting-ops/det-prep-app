import { readFileSync } from "node:fs";
const env = readFileSync(".env.local","utf8");
const get=(k)=>(env.match(new RegExp(`^${k}=\\s*['"]?([^'"\\n]+)`,"m"))||[])[1];
const url=get("NEXT_PUBLIC_SUPABASE_URL"), key=get("SUPABASE_SERVICE_ROLE_KEY");
const h={apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"};
const APPLY = process.argv.includes("--apply");
const nowIso = new Date().toISOString();

// Victims: tier=free but tier_expires_at in the FUTURE (a genuine free user has no future expiry).
const vics = await (await fetch(`${url}/rest/v1/profiles?select=id,email,tier,tier_expires_at,vip_granted_by_course,stripe_customer_id&tier=eq.free&tier_expires_at=gte.${encodeURIComponent(nowIso)}`,{headers:h})).json();
console.log(`Downgrade victims (tier=free + FUTURE expiry): ${vics.length}\n`);

for (const v of vics) {
  // determine correct tier: latest succeeded payment, else infer from expiry existence
  const pays = await (await fetch(`${url}/rest/v1/payment_history?select=tier,status,created_at,amount&user_id=eq.${v.id}&status=eq.succeeded&order=created_at.desc&limit=1`,{headers:h})).json();
  const paidTier = pays[0]?.tier || null;
  const correct = ["basic","premium","vip"].includes(paidTier) ? paidTier : null;
  console.log(`  ${v.email.padEnd(34)} expiry=${String(v.tier_expires_at).slice(0,10)}  lastPaid=${paidTier||"(none)"} -> restore to: ${correct||"CANNOT INFER (skip)"}`);
  if (APPLY && correct) {
    const r = await fetch(`${url}/rest/v1/profiles?id=eq.${v.id}`,{method:"PATCH",headers:{...h,Prefer:"return=minimal"},body:JSON.stringify({tier:correct,updated_at:new Date().toISOString()})});
    console.log(`     ${r.ok?"✅ restored":"❌ FAILED "+r.status+" "+(await r.text())}`);
  }
}
console.log(APPLY ? "\n=== APPLIED ===" : "\n(dry run — re-run with --apply to restore)");
