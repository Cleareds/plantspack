import fs from 'node:fs'; import {createClient} from '@supabase/supabase-js'
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim()]))
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY)
const {data:reps}=await sb.from('place_reports').select('id,place_id,related_place_id,note').eq('type','duplicate').eq('status','pending').ilike('note','%different city labels%').limit(1000)
const ids=[...new Set(reps.flatMap(r=>[r.place_id,r.related_place_id]))]
const P={}
for(let i=0;i<ids.length;i+=200){const {data}=await sb.from('places').select('id,name,city,country,address,latitude,longitude,source,created_by,review_count,archived_at,website').in('id',ids.slice(i,i+200));for(const p of data)P[p.id]=p}
const out=reps.map(r=>({report:r.id,a:P[r.place_id],b:P[r.related_place_id]}))
fs.writeFileSync('reports/label-check/city-pairs-2026-10-15.json',JSON.stringify(out,null,1))
console.log(reps.length)
for(const x of out.slice(0,40))console.log(`${x.a.city} | ${x.b.city} || ${x.a.name} / ${x.b.name} || ${x.a.address} / ${x.b.address} || ${x.a.source}/${x.b.source}`)
