#!/usr/bin/env tsx
/**
 * Live-network smoke test for src/lib/places/website-verify.ts.
 *
 * Hits a handful of real websites (both vegan-restaurant and known-dead) and
 * prints the extracted signal. Keep the URL list short since every run costs
 * real network I/O. Run with:
 *
 *   tsx scripts/test-website-verify.ts
 */

import { verifyWebsite } from '../src/lib/places/website-verify'

const targets = [
  // Known-live vegan spots (various TLDs + langs)
  { label: 'vegan-live (nora cooks blog)', url: 'https://www.noracooks.com/' },
  { label: 'vegan-live (rainbow plant life)', url: 'https://rainbowplantlife.com/' },
  { label: 'vegan-live (biancas)', url: 'https://biancazapatka.com/' },
  // Our own site (expects fine response)
  { label: 'plantspack', url: 'https://www.plantspack.com/' },
  // Known-dead domain
  { label: 'dead (random nonsense)', url: 'https://this-domain-does-not-exist-1234567.com/' },
  // Non-http input
  { label: 'no-scheme', url: 'example.com/' },
]

async function main() {
  for (const t of targets) {
    console.log(`\n---- ${t.label} (${t.url}) ----`)
    const s = await verifyWebsite(t.url, { includeExcerpt: false, timeoutMs: 8000 })
    console.log({
      ok: s.ok,
      status: s.status,
      reason: s.reason,
      final: s.final_url,
      title: s.title?.slice(0, 80),
      lang: s.lang,
      og_count: Object.keys(s.og).length,
      ld_count: s.ld_json.length,
      menu_links: s.menu_links.length,
      parking: s.parking,
      closure_hint: s.closure_hint,
      body_size: s.body_size,
    })
  }
}

main().catch(e => { console.error(e); process.exit(1) })
