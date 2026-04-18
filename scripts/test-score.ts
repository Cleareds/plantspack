#!/usr/bin/env tsx
/**
 * Synthetic score.ts tests.
 */

import { scoreCandidate } from '../src/lib/places/score'
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

const cases = [
  {
    name: 'strong fully_vegan → auto_import',
    input: {
      gate: { reject: null, required_fields_ok: true, freshness_ok: true, chain_filtered: false },
      website: mkSignal({ ld_json: [{ '@type': 'Restaurant' }], menu_links: ['https://x/menu'], lang: 'en' }),
      vegan: { level: 'fully_vegan' as const, confidence: 0.9, evidence: [] },
      hasPhone: true,
      dateRefreshed: new Date().toISOString(),
      country: 'United States',
    },
    expectDecision: 'auto_import',
  },
  {
    name: 'vegan_friendly sparse metadata → reject (correctly)',
    input: {
      gate: { reject: null, required_fields_ok: true, freshness_ok: true, chain_filtered: false },
      website: mkSignal({ lang: 'de' }),
      vegan: { level: 'vegan_friendly' as const, confidence: 0.7, evidence: [] },
      hasPhone: false,
      dateRefreshed: null,
      country: 'Germany',
    },
    expectDecision: 'reject',
  },
  {
    name: 'vegan_friendly rich metadata → auto_import (as vegan_friendly)',
    input: {
      gate: { reject: null, required_fields_ok: true, freshness_ok: true, chain_filtered: false },
      website: mkSignal({ lang: 'de', ld_json: [{ '@type': 'Restaurant' }], menu_links: ['https://x/menu'] }),
      vegan: { level: 'vegan_friendly' as const, confidence: 0.8, evidence: [] },
      hasPhone: true,
      dateRefreshed: new Date().toISOString(),
      country: 'Germany',
    },
    expectDecision: 'auto_import',
  },
  {
    name: 'vegetarian_reject → reject',
    input: {
      gate: { reject: null, required_fields_ok: true, freshness_ok: true, chain_filtered: false },
      website: mkSignal({ title: 'Vegetarian Kitchen' }),
      vegan: { level: 'vegetarian_reject' as const, confidence: 0.9, evidence: [] },
      hasPhone: true,
      dateRefreshed: null,
      country: 'Italy',
    },
    expectDecision: 'reject',
  },
  {
    name: 'closure hint → reject',
    input: {
      gate: { reject: null, required_fields_ok: true, freshness_ok: true, chain_filtered: false },
      website: mkSignal({ closure_hint: 'permanently closed' }),
      vegan: { level: 'fully_vegan' as const, confidence: 0.9, evidence: [] },
      hasPhone: true,
      dateRefreshed: null,
      country: 'United States',
    },
    expectDecision: 'reject',
  },
  {
    name: 'unknown vegan + sparse metadata → reject',
    input: {
      gate: { reject: null, required_fields_ok: true, freshness_ok: true, chain_filtered: false },
      website: mkSignal(),
      vegan: { level: 'unknown' as const, confidence: 0.2, evidence: [] },
      hasPhone: true,
      dateRefreshed: null,
      country: 'United States',
    },
    expectDecision: 'reject',
  },
  {
    name: 'unknown vegan + rich metadata → needs_review',
    input: {
      gate: { reject: null, required_fields_ok: true, freshness_ok: true, chain_filtered: false },
      website: mkSignal({ lang: 'en', ld_json: [{ '@type': 'Restaurant' }], menu_links: ['https://x/menu'] }),
      vegan: { level: 'unknown' as const, confidence: 0.2, evidence: [] },
      hasPhone: true,
      dateRefreshed: new Date().toISOString(),
      country: 'United States',
    },
    expectDecision: 'needs_review',
  },
]

let pass = 0, fail = 0
for (const c of cases) {
  const r = scoreCandidate(c.input as any)
  const ok = r.decision === c.expectDecision
  if (ok) pass++; else fail++
  console.log(`${ok ? '✓' : '✗'} ${c.name.padEnd(50)} score=${r.score} decision=${r.decision} reason=${r.reason}`)
}
console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail > 0 ? 1 : 0)
