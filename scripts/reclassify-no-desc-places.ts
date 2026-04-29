/**
 * Reclassify places WITHOUT descriptions using name + city + country + category only.
 * Uses gpt-4o-mini knowledge about well-known restaurants, chains, and brands.
 * Conservative: only reclassifies when the model returns a DIFFERENT level with high signal.
 *
 * Usage:
 *   npx tsx scripts/reclassify-no-desc-places.ts --dry-run
 *   npx tsx scripts/reclassify-no-desc-places.ts
 *   npx tsx scripts/reclassify-no-desc-places.ts --vegan-level=vegan_friendly
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
const LEVEL_FILTER = args.find(a => a.startsWith('--vegan-level='))?.split('=')[1];
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '0') || 0;
const CONCURRENCY = 8;
const CSV_PATH = '/tmp/reclassify-no-desc.csv';
const VALID_LEVELS = ['fully_vegan', 'mostly_vegan', 'vegan_friendly', 'vegan_options'] as const;
type VeganLevel = typeof VALID_LEVELS[number];

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const PROMPT = (p: { name: string; category: string; city: string; country: string; current: string }) => `
Classify this restaurant or place into exactly one vegan level based on your knowledge of the business.

Name: ${p.name}
Category: ${p.category}
City: ${p.city}, ${p.country}
Current level: ${p.current}

Vegan levels:
- fully_vegan: 100% vegan menu, zero animal products
- mostly_vegan: 85%+ vegan, a few non-vegan items
- vegan_friendly: non-vegan place with genuine vegan options
- vegan_options: mainstream place with a few vegan items

If you don't know this specific place or are uncertain, reply with the current level (${p.current}).

Reply ONLY with one of: fully_vegan, mostly_vegan, vegan_friendly, vegan_options`.trim();

async function classify(place: any): Promise<VeganLevel | null> {
  try {
    const resp = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 20,
      temperature: 0,
      messages: [{ role: 'user', content: PROMPT(place) }],
    });
    const text = resp.choices[0]?.message?.content?.trim().toLowerCase() ?? '';
    for (const level of VALID_LEVELS) {
      if (text.includes(level)) return level;
    }
    return null;
  } catch (e: any) {
    if (e?.status === 429) { await sleep(5000); return classify(place); }
    return null;
  }
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'} | Filter: ${LEVEL_FILTER ?? 'all levels'}`);

  const PAGE = 1000;
  const places: any[] = [];
  let offset = 0;
  while (true) {
    let q = sb.from('places')
      .select('id, name, category, city, country, vegan_level')
      .is('archived_at', null)
      .is('description', null)
      .not('vegan_level', 'is', null)
      .order('vegan_level').order('id')
      .range(offset, offset + PAGE - 1);
    if (LEVEL_FILTER) q = q.eq('vegan_level', LEVEL_FILTER);
    if (LIMIT > 0) q = q.limit(Math.min(PAGE, LIMIT - places.length));
    const { data, error } = await q;
    if (error) { console.error(error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    places.push(...data);
    process.stdout.write(`\rFetched ${places.length}...`);
    if (data.length < PAGE || (LIMIT > 0 && places.length >= LIMIT)) break;
    offset += PAGE;
  }
  console.log(`\nTotal no-desc places: ${places.length}`);

  let changed = 0, unchanged = 0, failed = 0;
  const csv = DRY_RUN ? createWriteStream(CSV_PATH) : null;
  if (csv) csv.write('id,name,city,country,current_level,proposed_level\n');

  const batches: any[][] = [];
  for (let i = 0; i < places.length; i += CONCURRENCY) batches.push(places.slice(i, i + CONCURRENCY));

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const results = await Promise.all(batch.map(p => classify({ ...p, current: p.vegan_level })));

    for (let i = 0; i < batch.length; i++) {
      const place = batch[i];
      const proposed = results[i];
      if (!proposed) { failed++; continue; }
      if (proposed === place.vegan_level) { unchanged++; continue; }
      changed++;
      console.log(`[CHANGE] ${place.name} (${place.city}, ${place.country}) ${place.vegan_level} → ${proposed}`);
      if (csv) {
        csv.write(`${place.id},"${place.name.replace(/"/g, '""')}","${place.city}","${place.country}",${place.vegan_level},${proposed}\n`);
      } else {
        const { error } = await sb.from('places').update({ vegan_level: proposed }).eq('id', place.id);
        if (error) console.error(`  Failed ${place.id}: ${error.message}`);
      }
    }

    const pct = Math.round(((b + 1) / batches.length) * 100);
    process.stdout.write(`\r${Math.min((b + 1) * CONCURRENCY, places.length)}/${places.length} (${pct}%) — changed: ${changed}`);
    if (b < batches.length - 1) await sleep(300);
  }

  if (csv) csv.end();
  console.log(`\n\nDone. Changed: ${changed} | Unchanged: ${unchanged} | Failed: ${failed}`);
  if (DRY_RUN && changed > 0) console.log(`Review: ${CSV_PATH}\nThen run without --dry-run to apply.`);
}

main().catch(console.error);
