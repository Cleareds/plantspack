// OSM cross-reference audit of the *-fv-l3-upgrade-2026-05-25 batch.
//
// For OSM-sourced, category='eat' places the batch marked fully_vegan, re-query
// OSM by source_id and check the CURRENT diet tags. We ONLY downgrade when OSM
// gives POSITIVE contrary evidence (it never demotes a merely-untagged place):
//   diet:vegan=only OR cuisine~vegan   -> SUPPORTED, keep fully_vegan
//   diet:vegan=yes                     -> "has vegan options" -> vegan_friendly
//   diet:vegan=limited                 -> vegan_options
//   diet:vegetarian=only (not vegan)   -> vegan_options
//   no diet:vegan / cuisine tag        -> AMBIGUOUS, keep + flag for review only
//   element gone from OSM              -> skip
//
// Reversible: verification_method='osm-diet-crossref-downgrade-2026-07-03'.
// Read-only Overpass (no OpenAI). Resumable via a tag cache. Dry-run by default.
//   node scripts/osm-crossref-audit.mjs            # fetch + classify + report
//   node scripts/osm-crossref-audit.mjs --apply    # also downgrade the contradicted set
import { createClient } from '@supabase/supabase-js'; import fs from 'fs'
const APPLY = process.argv.includes('--apply')
const OVERPASS='https://overpass-api.de/api/interpreter'
const UA='PlantsPack-OSM-crossref/1.0 (hello@plantspack.com)'
const CACHE='performance/osm-crossref-cache.json'
const REPORT='performance/osm-crossref-2026-07-03.json'
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i).trim(),l.slice(i+1).trim()]}))
const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY||env.SERVICE_ROLE_KEY)
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
fs.mkdirSync('performance',{recursive:true})

async function overpass(body,tries=6){
  for(let i=0;i<tries;i++){
    try{
      const res=await fetch(OVERPASS,{method:'POST',body:'data='+encodeURIComponent(body),headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':UA}})
      if(res.status===429||res.status===504){ console.log(`   ${res.status}, backoff`); await sleep(15000*(i+1)); continue }
      if(!res.ok){ await sleep(8000); continue }
      return (await res.json()).elements||[]
    }catch(e){ console.log('   fetch fail '+(e?.name||e)); await sleep(10000*(i+1)) }
  }
  return null
}

async function main(){
  // Load batch: OSM-sourced, eat, fully_vegan
  let rows=[],from=0
  for(;;){ const {data}=await db.from('places').select('id,name,slug,city,country,source_id,tags,vegan_level').like('verification_method','%-fv-l3-upgrade-2026-05-25').eq('vegan_level','fully_vegan').eq('category','eat').like('source_id','osm-%').order('id').range(from,from+999); if(!data?.length)break; rows.push(...data); if(data.length<1000)break; from+=1000 }
  console.log('OSM-sourced eat fully_vegan in batch:', rows.length)

  const parse=s=>{ const m=String(s).match(/^osm-(node|way|relation)-(\d+)$/); return m?{type:m[1],id:m[2]}:null }
  const parsed=rows.map(r=>({r,osm:parse(r.source_id)})).filter(x=>x.osm)
  const byType={node:[],way:[],relation:[]}; parsed.forEach(x=>byType[x.osm.type].push(x.osm.id))

  let cache={}; try{ cache=JSON.parse(fs.readFileSync(CACHE,'utf8')) }catch{}
  // Fetch missing tags per type in chunks
  for(const type of ['node','way','relation']){
    const ids=[...new Set(byType[type])].filter(id=>!(`${type}/${id}` in cache))
    for(let i=0;i<ids.length;i+=150){
      const chunk=ids.slice(i,i+150)
      const q=`[out:json][timeout:120];${type}(id:${chunk.join(',')});out tags;`
      const els=await overpass(q)
      if(els===null){ console.log(`  ${type} chunk ${i} failed permanently, skipping`); continue }
      const got=new Set()
      for(const e of els){ cache[`${type}/${e.id}`]=e.tags||{}; got.add(String(e.id)) }
      for(const id of chunk) if(!got.has(String(id))) cache[`${type}/${id}`]='GONE' // deleted from OSM
      fs.writeFileSync(CACHE,JSON.stringify(cache))
      console.log(`  ${type}: cached ${Object.keys(cache).length} total (chunk ${i}-${i+chunk.length})`)
      await sleep(4000)
    }
  }

  // Classify
  const out={supported:0,ambiguous:0,gone:0,downgrade:[]}
  for(const {r,osm} of parsed){
    const t=cache[`${osm.type}/${osm.id}`]
    if(t==='GONE'){ out.gone++; continue }
    if(!t){ out.ambiguous++; continue }
    const dv=t['diet:vegan'], cuisine=(t.cuisine||'')
    if(dv==='only'||/vegan/.test(cuisine)){ out.supported++; continue }
    let level=null
    if(dv==='yes') level='vegan_friendly'
    else if(dv==='limited') level='vegan_options'
    else if(t['diet:vegetarian']==='only') level='vegan_options'
    if(level) out.downgrade.push({slug:r.slug,name:r.name,city:r.city,country:r.country,osm:`${osm.type}/${osm.id}`,diet_vegan:dv||null,diet_veg:t['diet:vegetarian']||null,to:level})
    else out.ambiguous++  // has tags but no vegan/veg diet info -> ambiguous, keep
  }
  fs.writeFileSync(REPORT,JSON.stringify(out,null,2))
  console.log(`\nSUPPORTED (keep fully_vegan): ${out.supported}`)
  console.log(`AMBIGUOUS (no OSM diet signal -> keep + review): ${out.ambiguous}`)
  console.log(`GONE from OSM: ${out.gone}`)
  console.log(`CONTRADICTED (downgrade): ${out.downgrade.length}`)
  const byLevel={}; out.downgrade.forEach(d=>byLevel[d.to]=(byLevel[d.to]||0)+1)
  console.log('  by target level:', JSON.stringify(byLevel))
  console.log('  sample:'); out.downgrade.slice(0,25).forEach(d=>console.log(`   ${d.name} — ${d.city}, ${d.country} | diet:vegan=${d.diet_vegan} veg=${d.diet_veg} -> ${d.to}`))

  if(APPLY){
    let n=0
    for(const d of out.downgrade){
      const {data:p}=await db.from('places').select('id,tags').eq('slug',d.slug).single()
      if(!p) continue
      const tags=(p.tags||[]).filter(x=>x!=='websearch_confirmed_vegan')
      const {error}=await db.from('places').update({vegan_level:d.to,tags,verification_status:'unverified',verification_method:'osm-diet-crossref-downgrade-2026-07-03',verification_level:1,updated_at:new Date().toISOString()}).eq('id',p.id)
      if(!error)n++
    }
    console.log(`\nDowngraded ${n}. Reversible: verification_method='osm-diet-crossref-downgrade-2026-07-03'.`)
  } else console.log('\nDRY RUN - pass --apply to downgrade the CONTRADICTED set.')
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)})
