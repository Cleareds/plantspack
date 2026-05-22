import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { writeFileSync } from 'node:fs'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const summerHubCities = {
  Italy: ['Rome','Florence','Naples','Catania','Palermo','Milan','Venice','Turin','Bologna'],
  Spain: ['Barcelona','Madrid','Valencia','Sevilla','Granada','Málaga','Palma de Mallorca','Santa Cruz de Tenerife','Ibiza','Bilbao','San Sebastián'],
  Greece: ['Athens','Thessaloniki','Santorini','Mykonos','Crete'],
  Turkey: ['Istanbul','Antalya','Ankara','Izmir','Bodrum'],
}

async function statsForCountry(country, allowCities = null) {
  let from = 0
  const data = []
  while (true) {
    let q = sb.from('places').select('id,name,city,vegan_level,is_verified,main_image_url,verification_level,verification_method')
      .eq('country', country).is('archived_at', null).order('id').range(from, from+999)
    if (allowCities) q = q.in('city', allowCities)
    const { data: page } = await q
    if (!page?.length) break
    data.push(...page); if (page.length < 1000) break; from += 1000
  }
  return data
}

async function statsForCity(country, city) {
  let from = 0
  const data = []
  while (true) {
    const { data: page } = await sb.from('places').select('id,name,vegan_level,is_verified,main_image_url,verification_level,verification_method')
      .eq('country', country).eq('city', city).is('archived_at', null).order('id').range(from, from+999)
    if (!page?.length) break
    data.push(...page); if (page.length < 1000) break; from += 1000
  }
  return data
}

function score(places) {
  const total = places.length
  const fv = places.filter(p => p.vegan_level === 'fully_vegan')
  const verified = fv.filter(p => p.is_verified)
  const fvImg = fv.filter(p => p.main_image_url)
  const allImg = places.filter(p => p.main_image_url)
  return {
    total,
    fully_vegan: fv.length,
    fv_verified: verified.length,
    fv_pct_verified: fv.length ? Math.round(verified.length / fv.length * 100) : 0,
    fv_with_image: fvImg.length,
    fv_pct_image: fv.length ? Math.round(fvImg.length / fv.length * 100) : 0,
    all_with_image: allImg.length,
    all_pct_image: total ? Math.round(allImg.length / total * 100) : 0,
  }
}

const lines = []
function out(s) { lines.push(s); console.log(s) }

out('# Quality Assessment — 2026-05-15')
out('')
out('Scope: countries we worked on today (Croatia, Portugal, Turkey, Germany/Berlin) plus all summer-hub cities (Italy, Spain, Greece, Turkey).')
out('')
out('Metrics:')
out('- **FV** = fully_vegan count')
out('- **Verified%** = of FV places, % with `is_verified=true`')
out('- **Image%** = of FV places, % with a `main_image_url`')
out('- **All-Img%** = of all places (any level), % with a `main_image_url`')
out('')

// Countries (whole-country)
out('## Whole-country coverage (today\'s focus countries)')
out('')
out('| Country | Total | FV | Verified% | Image% | All-Img% |')
out('|---|---|---|---|---|---|')
for (const country of ['Croatia','Portugal','Turkey','Germany']) {
  const data = await statsForCountry(country)
  const s = score(data)
  out(`| ${country} | ${s.total} | ${s.fully_vegan} | ${s.fv_pct_verified}% (${s.fv_verified}/${s.fully_vegan}) | ${s.fv_pct_image}% (${s.fv_with_image}/${s.fully_vegan}) | ${s.all_pct_image}% |`)
}
out('')

// Summer hub: cities under each country
for (const [country, cities] of Object.entries(summerHubCities)) {
  out(`## ${country} — summer hub cities`)
  out('')
  out('| City | Total | FV | Verified% | Image% | All-Img% | Grade |')
  out('|---|---|---|---|---|---|---|')
  for (const city of cities) {
    const data = await statsForCity(country, city)
    const s = score(data)
    // Grade: weighted by FV verified + image
    let grade = 'D'
    if (s.fully_vegan === 0) grade = 'N/A'
    else {
      const composite = (s.fv_pct_verified * 0.4) + (s.fv_pct_image * 0.4) + (s.all_pct_image * 0.2)
      if (composite >= 80) grade = 'A'
      else if (composite >= 65) grade = 'B'
      else if (composite >= 50) grade = 'C'
      else if (composite >= 30) grade = 'D'
      else grade = 'F'
    }
    out(`| ${city} | ${s.total} | ${s.fully_vegan} | ${s.fv_pct_verified}% | ${s.fv_pct_image}% | ${s.all_pct_image}% | **${grade}** |`)
  }
  out('')
}

// Berlin specific
out('## Berlin (today\'s import)')
out('')
out('| Total | FV | Verified% | Image% | All-Img% |')
out('|---|---|---|---|---|')
const berlin = await statsForCity('Germany', 'Berlin')
const sb_score = score(berlin)
out(`| ${sb_score.total} | ${sb_score.fully_vegan} | ${sb_score.fv_pct_verified}% | ${sb_score.fv_pct_image}% | ${sb_score.all_pct_image}% |`)
out('')

// Today's contribution
out('## Today\'s contributions')
out('')
const { count: phase1 } = await sb.from('places').select('id', { count: 'exact', head: true }).eq('source','coverage-boost-2026-05-15')
const { count: phase2 } = await sb.from('places').select('id', { count: 'exact', head: true }).eq('source','blog-coverage-2026-05-15')
const { count: phase3 } = await sb.from('places').select('id', { count: 'exact', head: true }).eq('source','longtail-2026-05-15')
const { count: berlinImport } = await sb.from('places').select('id', { count: 'exact', head: true }).eq('source','berlin-google-map-2026-05-15')
const { count: hcPromote } = await sb.from('places').select('id', { count: 'exact', head: true }).eq('verification_method','happycow-vegan-tag-2026-05-15')
const { count: blogPromote } = await sb.from('places').select('id', { count: 'exact', head: true }).eq('verification_method','blog-coverage-2026-05-15')
out(`- New imports phase 1 (HappyCow vegan-only top cities): **${phase1}**`)
out(`- New imports phase 2 (multi-blog discovery): **${phase2}**`)
out(`- New imports phase 3 (long-tail HappyCow cities): **${phase3}**`)
out(`- Berlin Google Map import: **${berlinImport}**`)
out(`- Promotions to fully_vegan via HappyCow tag: **${hcPromote}**`)
out(`- Promotions to fully_vegan via blogs: **${blogPromote}**`)
out('')

writeFileSync('scripts/seo-out/coverage-boost-2026-05-15/QUALITY-ASSESSMENT.md', lines.join('\n'))
console.log('\n---\nReport written to scripts/seo-out/coverage-boost-2026-05-15/QUALITY-ASSESSMENT.md')
