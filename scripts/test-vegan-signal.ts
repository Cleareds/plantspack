#!/usr/bin/env tsx
/**
 * Smoke test for src/lib/places/vegan-signal.ts.
 *
 * Uses hand-crafted synthetic WebsiteSignals (no network), plus a short
 * live-network pass that runs verifyWebsite on a handful of real vegan sites
 * and pipes results through classifyVegan. Useful for tuning the lexicon.
 */

import { classifyVegan, type VeganSignalInput } from '../src/lib/places/vegan-signal'
import { verifyWebsite } from '../src/lib/places/website-verify'
import type { WebsiteSignal } from '../src/lib/places/website-verify'

function mkSignal(partial: Partial<WebsiteSignal> = {}): WebsiteSignal {
  return {
    ok: true, status: 200, reason: null, final_url: 'https://example.com',
    title: null, description: null, og: {}, lang: 'en',
    ld_json: [], menu_links: [], body_size: 1000, parking: false,
    closure_hint: null, checked_at: new Date().toISOString(),
    ...partial,
  }
}

const synthetic: Array<{ name: string; input: VeganSignalInput; expected: string }> = [
  {
    name: '100% vegan title',
    input: { name: 'Sol Kitchen', website: mkSignal({ title: 'Sol Kitchen — 100% vegan restaurant' }) },
    expected: 'fully_vegan',
  },
  {
    name: 'rein vegan (DE)',
    input: { name: 'Grüne Küche', website: mkSignal({ description: 'Unser Restaurant ist rein vegan' }) },
    expected: 'fully_vegan',
  },
  {
    name: 'LD-JSON Vegan cuisine',
    input: { name: 'X', website: mkSignal({ ld_json: [{ '@type': 'Restaurant', servesCuisine: 'Vegan' }] }) },
    expected: 'fully_vegan',
  },
  {
    name: 'name-only "Vegan Yolk"',
    input: { name: 'Vegan Yolk', website: mkSignal({ title: 'Vegan Yolk | Restaurant' }) },
    expected: 'fully_vegan',
  },
  {
    name: 'vegan options (soft)',
    input: { name: 'Bella Italia', website: mkSignal({ description: 'Italian food with vegan options' }) },
    expected: 'vegan_friendly',
  },
  {
    name: 'vegan-friendly DE',
    input: { name: 'X', website: mkSignal({ description: 'Wir haben veganen Optionen' }) },
    expected: 'vegan_friendly',
  },
  {
    name: 'strict vegetarian-only',
    input: { name: 'The Vegetarian Kitchen', website: mkSignal({ title: 'The Vegetarian Kitchen — Vegetarian restaurant', description: 'Classic vegetarian cuisine since 1982' }) },
    expected: 'vegetarian_reject',
  },
  {
    name: 'no signal at all',
    input: { name: 'Mystery Cafe', website: mkSignal({ title: 'Mystery Cafe', description: 'Coffee and pastries' }) },
    expected: 'unknown',
  },
  {
    name: 'osm diet only',
    input: { name: 'X', osmDietVegan: 'only' },
    expected: 'fully_vegan',
  },
  {
    name: 'osm diet yes → friendly',
    input: { name: 'X', osmDietVegan: 'yes' },
    expected: 'vegan_friendly',
  },
  {
    name: 'weak vegan mention',
    input: { name: 'Happy Cafe', website: mkSignal({ description: 'Serving burgers, salads, and a vegan dish' }) },
    expected: 'vegan_friendly',
  },
]

let pass = 0, fail = 0
console.log('=== Synthetic ===')
for (const t of synthetic) {
  const r = classifyVegan(t.input)
  const ok = r.level === t.expected
  if (ok) pass++; else fail++
  console.log(`${ok ? '✓' : '✗'} ${t.name.padEnd(30)} got=${r.level.padEnd(20)} conf=${r.confidence.toFixed(2)} via=${r.evidence[0]?.rule ?? '—'}`)
}
console.log(`\nSynthetic: ${pass}/${pass + fail}\n`)

async function liveSample() {
  const targets = [
    { url: 'https://www.noracooks.com/', hint: 'vegan blog — should be fully_vegan' },
    { url: 'https://biancazapatka.com/', hint: 'mixed vegan/vegetarian recipes blog' },
    { url: 'https://www.plantspack.com/', hint: 'our site — fully_vegan by own claim' },
  ]
  console.log('=== Live ===')
  for (const t of targets) {
    const ws = await verifyWebsite(t.url, { timeoutMs: 8000 })
    const r = classifyVegan({ name: 'test', website: ws })
    console.log(`${t.url}`)
    console.log(`  hint  : ${t.hint}`)
    console.log(`  level : ${r.level} (conf=${r.confidence.toFixed(2)}) via ${r.evidence[0]?.rule ?? '—'}`)
    if (r.evidence[0]?.match) console.log(`  match : ${r.evidence[0].match}`)
  }
}

liveSample().then(() => process.exit(fail > 0 ? 1 : 0)).catch(e => { console.error(e); process.exit(1) })
