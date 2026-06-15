#!/usr/bin/env node
/**
 * HEAD sweep across every live place with a website on file.
 * Categorises each URL as live / dead / hostile, writes a preview to
 * /tmp/website-head-sweep-preview.json. NO DB writes — pure read.
 *
 * Apply step (separate script) will set website=NULL on rows whose URL
 * fails two consecutive HEAD checks with a soft category (DNS_FAIL /
 * 4XX_HARD / 5XX / CERT_ERROR / TIMEOUT). Soft categories: NETWORK,
 * 3XX_LOOP, BOT_BLOCKED (403 with cloudflare/akamai) — those stay
 * because they often resolve on a real browser hit.
 *
 * Concurrency: 40. Timeout: 6s per attempt + 1 retry. ETA ~30-45 min.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import fs from 'node:fs'
config({ path: '.env.local' })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const CONCURRENCY = 40
const TIMEOUT_MS = 6_000
const UA = 'Mozilla/5.0 (compatible; PlantsPackHealthBot/1.0; +https://plantspack.com)'

// HEAD a URL with timeout + 1 retry. Returns { category, status }.
async function probe(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'user-agent': UA, accept: '*/*' },
      })
      clearTimeout(timer)
      const s = res.status
      if (s >= 200 && s < 300) return { category: 'LIVE', status: s }
      if (s >= 300 && s < 400) return { category: '3XX_LOOP', status: s }
      if (s === 403) {
        // Cloudflare/Akamai bot challenge — keep, it's likely live on a real browser.
        const server = (res.headers.get('server') || '').toLowerCase()
        const cfRay = res.headers.get('cf-ray')
        if (cfRay || server.includes('cloudflare') || server.includes('akamai')) {
          return { category: 'BOT_BLOCKED', status: s }
        }
        return { category: '4XX_HARD', status: s }
      }
      if (s === 405) {
        // HEAD not allowed — try GET-as-HEAD to confirm reachability.
        try {
          const res2 = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal, headers: { 'user-agent': UA } })
          if (res2.status >= 200 && res2.status < 400) return { category: 'LIVE', status: res2.status }
        } catch {}
        return { category: '4XX_HARD', status: s }
      }
      if (s >= 400 && s < 500) return { category: '4XX_HARD', status: s }
      if (s >= 500 && s < 600) return { category: '5XX', status: s }
      return { category: 'OTHER', status: s }
    } catch (e) {
      clearTimeout(timer)
      const msg = (e?.cause?.code || e?.code || e?.name || e?.message || '').toString()
      if (attempt === 0) continue // one retry
      if (msg.includes('ENOTFOUND') || msg.includes('EAI_AGAIN')) return { category: 'DNS_FAIL', status: 0 }
      if (msg.includes('AbortError') || msg.includes('TimeoutError')) return { category: 'TIMEOUT', status: 0 }
      if (msg.includes('CERT') || msg.includes('SELF_SIGNED') || msg.includes('SSL') || msg.includes('UNABLE_TO_VERIFY')) return { category: 'CERT_ERROR', status: 0 }
      if (msg.includes('ECONNREFUSED') || msg.includes('ECONNRESET') || msg.includes('EHOSTUNREACH') || msg.includes('ENETUNREACH')) return { category: 'NETWORK', status: 0 }
      return { category: 'NETWORK', status: 0 }
    }
  }
}

// Load all rows with a usable website.
console.log('Loading rows…')
let lastId = '00000000-0000-0000-0000-000000000000'
const rows = []
while (true) {
  const { data } = await sb.from('places')
    .select('id, slug, name, country, website')
    .gt('id', lastId).is('archived_at', null).not('website', 'is', null).order('id').limit(1000)
  if (!data?.length) break
  for (const r of data) {
    const w = (r.website ?? '').trim()
    if (w.length < 8) continue
    rows.push(r)
  }
  lastId = data[data.length - 1].id
  if (data.length < 1000) break
}
console.log(`Total rows with website: ${rows.length}`)

const tally = {}
const apply = []   // candidates that should have website cleared
const keep = []    // soft-fail or LIVE — keep as-is
let done = 0
const startedAt = Date.now()

async function worker(items) {
  for (const r of items) {
    const { category, status } = await probe(r.website)
    tally[category] = (tally[category] || 0) + 1
    const rec = { id: r.id, name: r.name, country: r.country, website: r.website, category, status }
    if (['DNS_FAIL', '4XX_HARD', '5XX', 'CERT_ERROR', 'TIMEOUT', 'NETWORK'].includes(category)) {
      apply.push(rec)
    } else {
      keep.push(rec)
    }
    done++
    if (done % 500 === 0) {
      const pct = ((done / rows.length) * 100).toFixed(1)
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0)
      console.log(`  ${done}/${rows.length} (${pct}%) — ${elapsed}s — tally:`, tally)
    }
  }
}

// Shard rows across CONCURRENCY workers.
const shards = Array.from({ length: CONCURRENCY }, () => [])
rows.forEach((r, i) => shards[i % CONCURRENCY].push(r))
await Promise.all(shards.map(worker))

const out = {
  generated_at: new Date().toISOString(),
  total_scanned: rows.length,
  tally,
  apply_count: apply.length,
  keep_count: keep.length,
  apply: apply,    // would set website=NULL on these
  keep_sample: keep.slice(0, 50),
}
fs.writeFileSync('/tmp/website-head-sweep-preview.json', JSON.stringify(out, null, 2))

console.log('\n=== SWEEP COMPLETE ===')
console.log(`Scanned: ${rows.length}`)
console.log('Tally:', tally)
console.log(`Would clear website on: ${apply.length}`)
console.log(`Keeping as-is:          ${keep.length}`)
console.log(`Preview file: /tmp/website-head-sweep-preview.json`)
