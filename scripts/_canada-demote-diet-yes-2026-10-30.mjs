// Canada 2026-10-30: OSM diet:vegan=yes means "has vegan options"; imports mapped it to vegan_friendly.
// Demote those rows to vegan_options, keeping vegetarian/vegan-named/veg-cuisine/stores/human-checked rows. Needs ca_osmtags.json (Overpass dump). --apply writes.
import fs from 'fs'; import { createClient } from '@supabase/supabase-js'
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY)
const S='/private/tmp/claude-501/-Users-antonkravchuk-sidep-Cleareds-plantspack/0a0e7387-7531-42bf-a34f-e8d4ab8f09b4/scratchpad/'
const T=JSON.parse(fs.readFileSync(S+'ca_osmtags.json'))
let rows=[],last='00000000-0000-0000-0000-000000000000'
for(;;){const {data,error}=await sb.from('places').select('id,slug,name,city,vegan_level,verification_level,verification_method,is_verified,osm_ref,created_by,description,category').eq('country','Canada').is('archived_at',null).eq('vegan_level','vegan_friendly').gt('id',last).order('id').limit(1000);if(error)throw error;rows.push(...data);if(data.length<1000)break;last=data.at(-1).id}
const ADMIN='d27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
const KEEP_NAME=/vegan|veg[ae]t|végé|vege|plant|veggie|govinda|bhavan|dosa|thali|buddh|lotus|tofu|falafel|hummus|houmous|juice|raw|greens?\b|salad/i
const KEEP_CUISINE=/vegetarian|vegan|indian|ethiopian|falafel|middle_eastern|lebanese|juice|smoothie|salad|tibetan|nepalese/i
const HUMAN=/admin_review|websearch|web-check|label-check|audit|verify|verified|research|submission/i
const res={demote:[],keep:{}}
const k=(why,p)=>{(res.keep[why]??=[]).push(p.slug)}
for(const p of rows){
  const t=p.osm_ref?T[p.osm_ref]:null
  if(!t){k('no-osm-tags',p);continue}
  if(t['diet:vegan']!=='yes'){k('diet-not-yes:'+t['diet:vegan'],p);continue}
  if(p.created_by!==ADMIN){k('user-added',p);continue}
  if(p.is_verified||p.verification_level>=3||HUMAN.test(p.verification_method||'')){k('human-or-L3:'+p.verification_method,p);continue}
  if(['only','yes'].includes(t['diet:vegetarian'])&&t['diet:vegetarian']==='only'){k('vegetarian-only',p);continue}
  if(KEEP_NAME.test(p.name)){k('veg-name',p);continue}
  if(KEEP_CUISINE.test(t.cuisine||'')){k('veg-cuisine',p);continue}
  if(p.category!=='eat'){k('cat-'+p.category,p);continue}
  res.demote.push(p)
}
console.log('vf live',rows.length,'demote',res.demote.length)
for(const [w,l] of Object.entries(res.keep)) console.log(' keep',w,l.length)
console.log(res.demote.slice(0,40).map(p=>p.name).join(', '))
fs.writeFileSync(S+'ca_demote.json',JSON.stringify(res.demote))
if(process.argv.includes('--apply')){
  fs.writeFileSync('reports/canada-audit-2026-10-30/rollback-diet-yes-demote.json',JSON.stringify(res.demote.map(p=>({id:p.id,vegan_level:p.vegan_level,verification_method:p.verification_method}))))
  const ids=res.demote.map(p=>p.id)
  for(let i=0;i<ids.length;i+=100){const r=await sb.from('places').update({vegan_level:'vegan_options',verification_method:'canada-osm-diet-yes-demote-2026-10-30'}).in('id',ids.slice(i,i+100));if(r.error)throw r.error}
  console.log('applied',ids.length)
}
