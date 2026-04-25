/**
 * Targeted reclassification: vegan_friendly → vegan_options
 *
 * Only downgrades vegan_friendly places whose descriptions signal they're
 * mainstream non-vegan venues with only 1-2 vegan items. Never upgrades.
 *
 * Usage:
 *   npx tsx scripts/reclassify-to-vegan-options.ts --dry-run
 *   npx tsx scripts/reclassify-to-vegan-options.ts
 *   npx tsx scripts/reclassify-to-vegan-options.ts --limit=500
 */
import { config } from 'dotenv'; config({ path: '.env.local' });
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { createWriteStream } from 'fs';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '0') || 0;
const CONCURRENCY = 8;
const CSV_PATH = '/tmp/reclassify-to-vegan-options.csv';

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// Strict prompt: only downgrade signal, model must be confident
const PROMPT = (p: { name: string; category: string; description: string; tags: string[] }) => `
You are deciding whether a place belongs in "vegan_friendly" or "vegan_options".

Place: ${p.name}
Category: ${p.category}
Description: ${p.description}
Tags: ${p.tags.filter(t => !t.startsWith('staging-') && !t.startsWith('admin-') && !t.startsWith('batch-')).join(', ') || 'none'}

Definitions:
- vegan_friendly: genuine vegan section OR 4+ clearly dedicated vegan dishes, Thai/Indian/
  Middle-Eastern/East-Asian places with a strong plant-based selection, places where a vegan
  eats comfortably with real choices
- vegan_options: mainstream non-vegan venue with only 1–3 token vegan items; hotel breakfast
  with one vegan option; steakhouse / pizza / burger / seafood place with a single vegan dish;
  place that "can accommodate" vegans on request but has no dedicated vegan section

Answer ONLY with one of:
vegan_friendly
vegan_options

If in doubt → vegan_friendly`.trim();

// Pre-filter: if the name or description strongly signals vegetarian/vegan identity, skip the API call
const VEGAN_IDENTITY_RE = /\b(vegan|vegetarian|veggie|plant[- ]based|herbivore|tofu shop|vegane|végétal)\b/i

function isClearlyVeganFriendly(place: any): boolean {
  const haystack = `${place.name} ${place.description ?? ''}`
  return VEGAN_IDENTITY_RE.test(haystack)
}

async function classify(place: any): Promise<'vegan_friendly' | 'vegan_options' | null> {
  if (isClearlyVeganFriendly(place)) return 'vegan_friendly'
  try {
    const resp = await ai.chat.completions.create(
      { model: 'gpt-4o-mini', max_tokens: 10, temperature: 0, messages: [{ role: 'user', content: PROMPT(place) }] },
      { timeout: 20000 },
    );
    const text = resp.choices[0]?.message?.content?.trim().toLowerCase() ?? '';
    if (text.includes('vegan_options')) return 'vegan_options';
    if (text.includes('vegan_friendly')) return 'vegan_friendly';
    return null;
  } catch (e: any) {
    if (e?.status === 429) { await sleep(5000); return classify(place); }
    return null;
  }
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);

  const PAGE = 1000;
  const places: any[] = [];
  let offset = 0;
  while (true) {
    let q = sb.from('places')
      .select('id, name, category, description, tags, city, country')
      .eq('vegan_level', 'vegan_friendly')
      .is('archived_at', null)
      .not('description', 'is', null)
      .neq('description', '')
      .order('id')
      .range(offset, offset + PAGE - 1);
    if (LIMIT > 0) q = q.limit(Math.min(PAGE, LIMIT - places.length));
    const { data, error } = await q;
    if (error) { console.error(error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    places.push(...data);
    process.stdout.write(`\rFetched ${places.length}...`);
    if (data.length < PAGE || (LIMIT > 0 && places.length >= LIMIT)) break;
    offset += PAGE;
  }
  console.log(`\nTotal vegan_friendly with description: ${places.length}`);

  let downgraded = 0, kept = 0, failed = 0;
  const csv = DRY_RUN ? createWriteStream(CSV_PATH) : null;
  if (csv) csv.write('id,name,city,country,proposed_level\n');

  const batches: any[][] = [];
  for (let i = 0; i < places.length; i += CONCURRENCY) batches.push(places.slice(i, i + CONCURRENCY));

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const results = await Promise.all(batch.map(p => classify(p)));

    for (let i = 0; i < batch.length; i++) {
      const place = batch[i];
      const result = results[i];
      if (!result) { failed++; continue; }
      if (result === 'vegan_friendly') { kept++; continue; }
      // result === 'vegan_options'
      downgraded++;
      console.log(`[DOWNGRADE] ${place.name} (${place.city}, ${place.country})`);
      if (csv) {
        csv.write(`${place.id},"${place.name.replace(/"/g, '""')}","${place.city}","${place.country}",vegan_options\n`);
      } else {
        const { error } = await sb.from('places').update({ vegan_level: 'vegan_options' }).eq('id', place.id);
        if (error) console.error(`  Failed ${place.id}: ${error.message}`);
      }
    }

    const pct = Math.round(((b + 1) / batches.length) * 100);
    process.stdout.write(`\r${Math.min((b + 1) * CONCURRENCY, places.length)}/${places.length} (${pct}%) — downgraded: ${downgraded}`);
    if (b < batches.length - 1) await sleep(200);
  }

  if (csv) csv.end();
  console.log(`\n\nDone. Downgraded: ${downgraded} | Kept vegan_friendly: ${kept} | Failed: ${failed}`);
  if (DRY_RUN && downgraded > 0) {
    console.log(`Review: ${CSV_PATH}`);
    console.log(`Then run without --dry-run to apply.`);
  }
}

main().catch(console.error);
