// Sanity-check ambiguous German city names by coordinates before merging:
// - "Halle" might be Halle (Saale) [Saxony-Anhalt, ~51.48N 11.97E] OR Halle (Westfalen) [~52.06N 8.36E]
// - "Frankfurt am Main" vs Frankfurt (Oder) [~52.34N 14.55E]
// - "Munster" might be Münster (NRW, ~51.96N 7.63E) or actually be a smaller Munster (Niedersachsen)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

async function main() {
  const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a: any, l) => {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) a[m[1]] = m[2].replace(/^["']|["']$/g, ''); return a
  }, {})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  for (const name of ['Halle', 'Halle (Saale)', 'Frankfurt am Main', 'Frankfurt', 'Munster', 'Münster']) {
    const { data } = await sb.from('places')
      .select('id, name, latitude, longitude').eq('country', 'Germany').eq('city', name)
      .is('archived_at', null).limit(500)
    const lats = (data || []).map(r => r.latitude).filter((x): x is number => typeof x === 'number')
    const lngs = (data || []).map(r => r.longitude).filter((x): x is number => typeof x === 'number')
    if (!lats.length) { console.log(`${name}: no coords`); continue }
    const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length
    const min = (a: number[]) => Math.min(...a)
    const max = (a: number[]) => Math.max(...a)
    console.log(`${name} (${data!.length}): lat ${min(lats).toFixed(2)}–${max(lats).toFixed(2)} (avg ${avg(lats).toFixed(2)}), lng ${min(lngs).toFixed(2)}–${max(lngs).toFixed(2)} (avg ${avg(lngs).toFixed(2)})`)

    // For wide spreads, count by region
    const latSpread = max(lats) - min(lats)
    if (latSpread > 0.5) {
      console.log(`  ⚠ wide latitude spread, sampling some entries:`)
      for (const r of (data || []).slice(0, 5)) console.log(`    ${r.name} → ${r.latitude}, ${r.longitude}`)
      // Bucket by lat to find clusters
      const buckets: Record<string, number> = {}
      for (const r of data || []) {
        const b = `lat=${Math.floor((r.latitude as number) * 10) / 10}`
        buckets[b] = (buckets[b] || 0) + 1
      }
      console.log('  buckets:', Object.entries(buckets).sort((a, b) => b[1] - a[1]).slice(0, 5))
    }
  }
}
main().catch(e => { console.error(e); process.exit(1) })
