#!/usr/bin/env node
/**
 * READ-ONLY triage of the osm_ref collisions blocking the unique index.
 * Writes nothing. Pass --apply to write (see the resolve script instead).
 *
 * A collision is two or more LIVE places claiming the same OSM element. Three
 * distinct causes, which need three different fixes:
 *
 *   SAME_VENUE  both rows are the same business -> a duplicate; one should be
 *               merged away. Overlaps the duplicate queue.
 *   MISLINKED   the rows are different businesses, so at most one can own the
 *               element -> clear osm_ref on the weaker claimant. Do NOT
 *               archive: the venue may be perfectly real, it just isn't that
 *               OSM element (e.g. way:337127148 was claimed by both
 *               "Ravi Shankar" and "Crown & Anchor" in London).
 *   FAR_APART   same element, rows far apart -> almost certainly mislinked.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const STOP = new Set(['the','le','la','el','il','de','het','een','a','an','and','of','restaurant',
  'restaurante','ristorante','cafe','caffe','coffee','bar','bistro','kitchen','house','vegan',
  'veganes','vegano','vegana','vegetarian','vegetariano','chay','gmbh','ltd','bv','inc','llc','co'])
const tok = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
  .replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(t=>t&&!STOP.has(t))
function nameMatch(a,b){
  const A=new Set(tok(a)),B=new Set(tok(b))
  if(!A.size||!B.size) return {score:0,shared:0}
  const shared=[...A].filter(t=>B.has(t)).length
  return {score: shared===Math.min(A.size,B.size)?1:shared/(A.size+B.size-shared), shared}
}
const dist=(a,b,c,d)=>{const r=x=>x*Math.PI/180
  const h=Math.sin(r(c-a)/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(r(d-b)/2)**2
  return Math.round(2*6371000*Math.asin(Math.sqrt(h)))}
const score = p => (p.review_count||0)*100 + (p.is_verified?40:0) + (p.verification_level||0)*5 +
  (p.website?8:0) + (p.opening_hours?5:0) + (p.main_image_url?4:0) +
  (p.description&&p.description.length>20?2:0) + (p.address&&p.address.length>12?3:0)
/** Prefer the row whose own source actually is OSM as the element's owner. */
const isOsmSourced = p => /osm|openstreetmap/i.test(p.source||'')
/**
 * True when the two names are written in different scripts. A token metric
 * scores "Gajimaru" vs "ガジマル" at 0.00 because they share no characters,
 * but they are the same venue transliterated - so a zero score across scripts
 * says nothing about whether the businesses differ, and must never be read as
 * evidence of a mislink.
 */
const NON_LATIN = /[^\u0000-\u024f\u1e00-\u1eff]/
const crossScript = (a, b) => NON_LATIN.test(a || '') !== NON_LATIN.test(b || '')

const rows=[]
for(let off=0;;off+=1000){
  const {data,error}=await sb.from('places')
    .select('id,name,slug,city,country,address,latitude,longitude,website,opening_hours,main_image_url,description,is_verified,verification_level,review_count,source,source_id,osm_ref,archived_at')
    .not('osm_ref','is',null).order('id').range(off,off+999)
  if(error) throw error
  rows.push(...data); if(data.length<1000) break
}
const live = rows.filter(r=>!r.archived_at)
const groups = {}
for(const r of live) (groups[r.osm_ref] = groups[r.osm_ref]||[]).push(r)
const colls = Object.entries(groups).filter(([,v])=>v.length>1)

const plan = { same:[], mislinked:[], far:[], ambiguous:[] }
for(const [ref,v] of colls){
  if(v.length>2){ plan.ambiguous.push({ref,v,why:`${v.length} rows claim this element`}); continue }
  const [a,b]=v
  const d=dist(a.latitude,a.longitude,b.latitude,b.longitude)
  const nm=nameMatch(a.name,b.name)
  // Which row should keep the element? The OSM-sourced one; else the richer one.
  const owner = isOsmSourced(a)===isOsmSourced(b)
    ? (score(a)>=score(b)?a:b)
    : (isOsmSourced(a)?a:b)
  const other = owner===a?b:a
  const xs = crossScript(a.name, b.name)
  if(nm.score===1 && nm.shared>=2 && d<=150) plan.same.push({ref,a,b,d,nm,owner,other})
  // Different scripts at touching distance: same venue, transliterated.
  else if(xs && d<=50) plan.same.push({ref,a,b,d,nm,owner,other,xs:true})
  else if(d>300) plan.far.push({ref,a,b,d,nm,owner,other})
  // Only a LOW score between two names in the SAME script is evidence of
  // two different businesses.
  else if(nm.score<0.34 && !xs) plan.mislinked.push({ref,a,b,d,nm,owner,other})
  else plan.ambiguous.push({ref,v,d,nm,owner,other,why: xs ? 'different scripts, not touching' : 'name partly overlaps at close range'})
}

console.log(`live rows with osm_ref: ${live.length}`)
console.log(`colliding osm_ref values: ${colls.length} (covering ${colls.reduce((n,[,v])=>n+v.length,0)} rows)\n`)
console.log(`  SAME_VENUE (duplicate -> merge)      : ${plan.same.length}`)
console.log(`  MISLINKED  (clear osm_ref on loser)  : ${plan.mislinked.length}`)
console.log(`  FAR_APART  (clear osm_ref on loser)  : ${plan.far.length}`)
console.log(`  AMBIGUOUS  (needs eyes)              : ${plan.ambiguous.length}`)

for (const [label,list] of [['SAME_VENUE',plan.same],['MISLINKED',plan.mislinked],['FAR_APART',plan.far],['AMBIGUOUS',plan.ambiguous]]) {
  if(!list.length) continue
  console.log(`\n--- ${label} (up to 6) ---`)
  for(const x of list.slice(0,6)){
    if(x.v && !x.owner){ console.log(`  ${x.ref}: ${x.why}`); for(const r of x.v) console.log(`      "${r.name}" (${r.city}) src=${r.source}`); continue }
    console.log(`  ${x.ref}  ${String(x.d).padStart(6)}m sim=${x.nm.score.toFixed(2)}`)
    console.log(`      KEEPS ref: "${x.owner.name}" (${x.owner.city}) src=${x.owner.source}`)
    console.log(`      loses ref: "${x.other.name}" (${x.other.city}) src=${x.other.source}`)
  }
}
