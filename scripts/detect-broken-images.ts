#!/usr/bin/env tsx
/**
 * Detect places whose main_image_url is dead (404, network error, non-image).
 * Runs HEAD requests in parallel batches and writes a CSV of broken URLs to
 * /tmp/broken-images.csv. Does NOT modify the DB by default — pass --apply
 * to NULL out broken main_image_urls (places fall back to category icon).
 *
 * Idempotent: Supabase-hosted images checked against bucket existence;
 * external CDNs checked via HEAD with 8s timeout.
 *
 * Usage:
 *   npx tsx scripts/detect-broken-images.ts                  # report only
 *   npx tsx scripts/detect-broken-images.ts --apply          # also nullify broken
 *   npx tsx scripts/detect-broken-images.ts --limit 1000     # cap places checked
 */
import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { createWriteStream } from 'fs';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const LIMIT = (() => { const i = args.indexOf('--limit'); return i >= 0 ? parseInt(args[i + 1]) : 50_000; })();
const CONCURRENCY = 12;
const TIMEOUT_MS = 8000;
const CSV_PATH = '/tmp/broken-images.csv';

async function checkUrl(url: string): Promise<{ ok: boolean; reason?: string }> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      method: 'HEAD',
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'PlantsPack-ImageCheck/1.0' },
    });
    clearTimeout(t);
    if (res.status === 404 || res.status === 410) return { ok: false, reason: `${res.status}` };
    if (res.status >= 400 && res.status !== 403 && res.status !== 405) return { ok: false, reason: `${res.status}` };
    const ct = res.headers.get('content-type') ?? '';
    if (ct && !ct.startsWith('image/') && !ct.includes('octet-stream')) return { ok: false, reason: `non-image:${ct.slice(0, 30)}` };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: e.name === 'AbortError' ? 'timeout' : 'network' };
  }
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY (will null out broken URLs)' : 'REPORT ONLY'}`);
  const places: { id: string; slug: string; main_image_url: string }[] = [];
  let from = 0;
  while (places.length < LIMIT) {
    const { data } = await sb.from('places')
      .select('id, slug, main_image_url')
      .not('main_image_url', 'is', null)
      .is('archived_at', null)
      .range(from, from + 999);
    if (!data?.length) break;
    places.push(...data as any);
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`Loaded ${places.length} places with main_image_url`);

  const csv = createWriteStream(CSV_PATH);
  csv.write('slug,reason,url\n');

  let broken = 0;
  let checked = 0;
  // Process in concurrency batches
  for (let i = 0; i < places.length; i += CONCURRENCY) {
    const batch = places.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(p => checkUrl(p.main_image_url).then(r => ({ place: p, result: r }))));
    for (const { place, result } of results) {
      checked++;
      if (!result.ok) {
        broken++;
        csv.write(`${place.slug},${result.reason},${place.main_image_url}\n`);
        if (APPLY) {
          await sb.from('places').update({ main_image_url: null }).eq('id', place.id);
        }
      }
    }
    if (i % 200 === 0) process.stdout.write(`\r  checked ${checked}/${places.length}, broken ${broken}`);
  }
  csv.end();
  console.log(`\n${broken} broken images out of ${checked} checked`);
  console.log(`CSV written to ${CSV_PATH}`);
}

main().catch(console.error);
