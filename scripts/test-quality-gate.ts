#!/usr/bin/env tsx
/**
 * Smoke test for src/lib/places/quality-gate.ts.
 *
 * Runs the hard-filter against a few known-good and known-bad synthetic rows
 * plus a sample of real FSQ discovery candidates to sanity-check the strict-
 * vegan name filter and rejection counts.
 *
 *   tsx scripts/test-quality-gate.ts
 */

import { readFileSync, existsSync } from 'fs'
import { hardFilter, DEFAULT_CONFIG, ULTRA_STRICT_CONFIG, type QualityGateInput, type QualityGateConfig } from '../src/lib/places/quality-gate'

const synthetic: Array<{ name: string; row: QualityGateInput; expected: string | null; config?: QualityGateConfig }> = [
  { name: 'valid vegan', row: { name: 'Vegan Kitchen', latitude: 52.5, longitude: 13.4, city: 'Berlin', country: 'Germany', website: 'https://vegankitchen.de', address: 'Some St 1' }, expected: null },
  { name: 'missing name', row: { latitude: 0.1, longitude: 0.1, city: 'X', country: 'Y', website: 'https://x.com', address: 'a' }, expected: 'name_missing' },
  { name: 'bad coords', row: { name: 'Vegan X', latitude: 0, longitude: 0, city: 'X', country: 'Y', website: 'https://x.com', address: 'a' }, expected: 'coords_invalid' },
  { name: 'out-of-range coords', row: { name: 'Vegan X', latitude: 200, longitude: 0.1, city: 'X', country: 'Y', website: 'https://x.com', address: 'a' }, expected: 'coords_invalid' },
  { name: 'missing city', row: { name: 'Vegan X', latitude: 0.1, longitude: 0.1, country: 'Y', website: 'https://x.com', address: 'a' }, expected: 'city_missing' },
  { name: 'missing country', row: { name: 'Vegan X', latitude: 0.1, longitude: 0.1, city: 'X', website: 'https://x.com', address: 'a' }, expected: 'country_missing' },
  { name: 'no website', row: { name: 'Vegan X', latitude: 0.1, longitude: 0.1, city: 'City', country: 'Country', address: 'a' }, expected: 'website_missing' },
  { name: 'Russia', row: { name: 'Vegan Moscow', latitude: 55.75, longitude: 37.6, city: 'Moscow', country: 'Russia', website: 'https://x.ru', address: 'a' }, expected: 'excluded_region' },
  { name: 'chain', row: { name: 'Starbucks Vegan', latitude: 52.5, longitude: 13.4, city: 'Berlin', country: 'Germany', website: 'https://sb.de', address: 'a' }, expected: 'chain_name' },
  { name: 'stale data 4y', row: { name: 'Vegan Old', latitude: 52.5, longitude: 13.4, city: 'Berlin', country: 'Germany', website: 'https://x.de', address: 'a', date_refreshed: '2021-01-01' }, expected: 'stale_data' },
  { name: 'vegetarian in name (ultra)', row: { name: 'Vegan & Vegetarian Cafe', latitude: 52.5, longitude: 13.4, city: 'Berlin', country: 'Germany', website: 'https://x.de', address: 'a' }, expected: 'name_mentions_vegetarian', config: ULTRA_STRICT_CONFIG },
  { name: 'no vegan in name (ultra)', row: { name: 'Green Kitchen', latitude: 52.5, longitude: 13.4, city: 'Berlin', country: 'Germany', website: 'https://x.de', address: 'a' }, expected: 'name_lacks_vegan', config: ULTRA_STRICT_CONFIG },
  { name: 'vegetarian in name (default)', row: { name: 'Vegan & Vegetarian Cafe', latitude: 52.5, longitude: 13.4, city: 'Berlin', country: 'Germany', website: 'https://x.de', address: 'a' }, expected: null },
  { name: 'generic name (default)', row: { name: 'Sol Kitchen', latitude: 52.5, longitude: 13.4, city: 'Berlin', country: 'Germany', website: 'https://x.de', address: 'a' }, expected: null },
  { name: 'vegano (ES)', row: { name: 'El Lugar Vegano', latitude: 40.4, longitude: -3.7, city: 'Madrid', country: 'Spain', website: 'https://x.es', address: 'a' }, expected: null },
  { name: 'vegan + plantbased', row: { name: 'Plantbased Vegan House', latitude: 52.5, longitude: 13.4, city: 'Berlin', country: 'Germany', website: 'https://x.de', address: 'a' }, expected: null },
]

let passed = 0, failed = 0
console.log('=== Synthetic rows ===')
for (const t of synthetic) {
  const result = hardFilter(t.row, t.config ?? DEFAULT_CONFIG)
  const ok = result.reject === t.expected
  if (ok) passed++; else failed++
  console.log(`${ok ? '✓' : '✗'} ${t.name.padEnd(28)} got=${String(result.reject).padEnd(28)} expected=${t.expected ?? 'null (accept)'}`)
}
console.log(`\nSynthetic: ${passed}/${passed + failed} passed\n`)

// ---- Real FSQ sample ----
const fsqFile = 'logs/fsq-discover-candidates.jsonl'
if (existsSync(fsqFile)) {
  const lines = readFileSync(fsqFile, 'utf-8').split('\n').filter(l => l.trim())
  const sampleSize = Math.min(2000, lines.length)
  const reasons: Record<string, number> = { accepted: 0 }
  for (const line of lines.slice(0, sampleSize)) {
    try {
      const d = JSON.parse(line)
      const row: QualityGateInput = {
        name: d.name,
        latitude: d.lat,
        longitude: d.lng,
        city: d.fsq_locality || d.city_search,
        country: d.fsq_country === 'US' ? 'United States' : (d.country_search ?? null),
        address: d.address,
        website: d.website,
        date_refreshed: d.date_refreshed,
        categories: d.categories,
      }
      const result = hardFilter(row)
      const k = result.reject ?? 'accepted'
      reasons[k] = (reasons[k] ?? 0) + 1
    } catch {}
  }
  console.log(`=== Real FSQ sample (${sampleSize} rows) ===`)
  for (const [k, v] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(30)} ${v}  (${((v / sampleSize) * 100).toFixed(1)}%)`)
  }
  console.log(`\nAccept rate with strict-vegan filter: ${((reasons.accepted / sampleSize) * 100).toFixed(1)}%`)
}

process.exit(failed > 0 ? 1 : 0)
