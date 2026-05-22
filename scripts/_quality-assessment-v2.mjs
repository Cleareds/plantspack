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

async function statsForCountry(country) {
  let from = 0; const data = []
  while (true) {
    const { data: page } = await sb.from('places').select('id,name,city,vegan_level,is_verified,main_image_url')
      .eq('country', country).is('archived_at', null).order('id').range(from, from+999)
    if (!page?.length) break
    data.push(...page); if (page.length < 1000) break; from += 1000
  }
  return data
}
async function statsForCity(country, city) {
  let from = 0; const data = []
  while (true) {
    const { data: page } = await sb.from('places').select('id,name,vegan_level,is_verified,main_image_url')
      .eq('country', country).eq('city', city).is('archived_at', null).order('id').range(from, from+999)
    if (!page?.length) break
    data.push(...page); if (page.length < 1000) break; from += 1000
  }
  return data
}

function score(places) {
  const total = places.length
  const fv = places.filter(p => p.vegan_level === 'fully_vegan')
  const verified_fv = fv.filter(p => p.is_verified)
  const fv_with_img = fv.filter(p => p.main_image_url)
  return {
    total,
    fv: fv.length,
    verified_fv: verified_fv.length,
    // NEW: verified-FV as % of total listings (trust-grade share)
    verified_fv_pct_of_total: total ? Math.round(verified_fv.length / total * 100) : 0,
    // also: verified as % of fully_vegan (was prior metric)
    verified_pct_of_fv: fv.length ? Math.round(verified_fv.length / fv.length * 100) : 0,
    fv_with_img: fv_with_img.length,
    fv_img_pct: fv.length ? Math.round(fv_with_img.length / fv.length * 100) : 0,
  }
}

const lines = []
function out(s) { lines.push(s); console.log(s) }

out('# Quality Assessment v2 — 2026-05-15')
out('')
out('**Verified%** now = `(verified fully_vegan) / total listings × 100` — the share of the directory that is trust-grade content (admin-confirmed, 100% vegan menus). Higher = better directory quality.')
out('')

out('## Whole-country coverage')
out('')
out('| Country | Total | FV | Verified-FV | Verified% (of total) | of-FV-verified% | Image% (of FV) |')
out('|---|---|---|---|---|---|---|')
for (const country of ['Croatia','Portugal','Turkey','Germany']) {
  const d = await statsForCountry(country); const s = score(d)
  out(`| ${country} | ${s.total} | ${s.fv} | ${s.verified_fv} | **${s.verified_fv_pct_of_total}%** | ${s.verified_pct_of_fv}% | ${s.fv_img_pct}% |`)
}
out('')

for (const [country, cities] of Object.entries(summerHubCities)) {
  out(`## ${country} — summer hub cities`)
  out('')
  out('| City | Total | FV | Verified-FV | **Verified%** | of-FV-verified% | Image% (of FV) | Grade |')
  out('|---|---|---|---|---|---|---|---|')
  for (const city of cities) {
    const d = await statsForCity(country, city); const s = score(d)
    let grade = 'N/A'
    if (s.fv > 0) {
      const composite = (s.verified_fv_pct_of_total * 0.5) + (s.fv_img_pct * 0.3) + (Math.min(s.fv * 5, 100) * 0.2)
      if (composite >= 50) grade = 'A'
      else if (composite >= 35) grade = 'B'
      else if (composite >= 20) grade = 'C'
      else if (composite >= 10) grade = 'D'
      else grade = 'F'
    } else if (s.total === 0) grade = '—'
    out(`| ${city} | ${s.total} | ${s.fv} | ${s.verified_fv} | **${s.verified_fv_pct_of_total}%** | ${s.verified_pct_of_fv}% | ${s.fv_img_pct}% | **${grade}** |`)
  }
  out('')
}

out('## Berlin (today\'s import)')
out('')
const b = await statsForCity('Germany','Berlin'); const sb_score = score(b)
out(`| Total | FV | Verified-FV | **Verified%** | of-FV-verified% | Image% (of FV) |`)
out(`|---|---|---|---|---|---|`)
out(`| ${sb_score.total} | ${sb_score.fv} | ${sb_score.verified_fv} | **${sb_score.verified_fv_pct_of_total}%** | ${sb_score.verified_pct_of_fv}% | ${sb_score.fv_img_pct}% |`)
out('')

writeFileSync('scripts/seo-out/coverage-boost-2026-05-15/QUALITY-ASSESSMENT.md', lines.join('\n'))
console.log('\nWritten to QUALITY-ASSESSMENT.md')
