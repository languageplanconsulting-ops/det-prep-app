import { readFileSync } from "node:fs";
const env=readFileSync(".env.local","utf8");
const get=(k)=>(env.match(new RegExp(`^${k}=\\s*['"]?([^'"\\n]+)`,"m"))||[])[1];
const url=get("NEXT_PUBLIC_SUPABASE_URL"),key=get("SUPABASE_SERVICE_ROLE_KEY");
const h={apikey:key,Authorization:`Bearer ${key}`};
const email="jonijonixstudy@gmail.com";
const p=await (await fetch(`${url}/rest/v1/profiles?select=*&email=eq.${encodeURIComponent(email)}`,{headers:h})).json();
const prof=p[0];
console.log("profile:",JSON.stringify({id:prof?.id,tier:prof?.tier,expiry:prof?.tier_expires_at,vip_course:prof?.vip_granted_by_course,stripe_cust:prof?.stripe_customer_id,sub:prof?.stripe_subscription_id,updated_at:prof?.updated_at},null,2));
if(prof){
  const pay=await (await fetch(`${url}/rest/v1/payment_history?select=*&user_id=eq.${prof.id}&order=created_at.desc`,{headers:h})).json();
  console.log(`\npayment_history (${pay.length} rows, all statuses):`);
  for(const x of pay) console.log("  ",JSON.stringify({created:x.created_at?.slice(0,16),status:x.status,tier:x.tier,amount:x.amount}));
}
const g=await (await fetch(`${url}/rest/v1/vip_course_grants?select=*&email=eq.${encodeURIComponent(email)}`,{headers:h})).json();
console.log(`\nvip_course_grants (${g.length}):`); for(const x of g) console.log("  ",JSON.stringify({active:x.is_active,granted_at:x.granted_at?.slice(0,10),grant_expires:x.grant_expires_at,notes:x.notes}));
