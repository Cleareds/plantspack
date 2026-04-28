/**
 * Bulk re-classify ALL places into the 4-tier vegan level system.
 *
 * Two-tier approach:
 *   Tier 1 — gpt-4o-mini (no web search, fast): places WITH a real description.
 *            AI-generated descriptions (tagged ai_generated_description) are excluded.
 *   Tier 2 — gpt-4o-mini-search-preview (web search, slow): places WITHOUT a real
 *            description, or those with only AI-generated descriptions.
 *
 * Covers ALL vegan_levels — fully_vegan, mostly_vegan, vegan_friendly, vegan_options.
 * vegan_friendly is intentionally too coarse; this script splits it properly.
 *
 * Usage:
 *   npx tsx scripts/reclassify-vegan-levels.ts --dry-run
 *   npx tsx scripts/reclassify-vegan-levels.ts
 *   npx tsx scripts/reclassify-vegan-levels.ts --limit=500
 *   npx tsx scripts/reclassify-vegan-levels.ts --source=vegguide
 *   npx tsx scripts/reclassify-vegan-levels.ts --tier=1    # description-only tier
 *   npx tsx scripts/reclassify-vegan-levels.ts --tier=2    # websearch-only tier
 *
 * Cost estimate: Tier 1 ~$0.30 for ~37K places; Tier 2 ~$0.005/place × no-desc places
 */
import { config } from 'dotenv'; config({ path: '.env.local' });
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { createWriteStream } from 'fs';
import { sleep } from './lib/place-pipeline';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 25000, maxRetries: 0 });

const VALID_LEVELS = ['fully_vegan', 'mostly_vegan', 'vegan_friendly', 'vegan_options'] as const;
type VeganLevel = typeof VALID_LEVELS[number];

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '0') || 0;
const SOURCE_FILTER = args.find(a => a.startsWith('--source='))?.split('=')[1];
const TIER_FILTER = args.find(a => a.startsWith('--tier='))?.split('=')[1];
// --since=<ISO 8601 timestamp> restricts processing to places created at or after the cutoff.
// Used by the territories cron to avoid re-scoring the entire 54K-row corpus nightly.
const SINCE_FILTER = args.find(a => a.startsWith('--since='))?.split('=')[1];
// --level=<vegan_level> restricts processing to one tier. Useful for spending
// only on the noisy `vegan_friendly` dump bucket instead of the whole corpus.
const LEVEL_FILTER = args.find(a => a.startsWith('--level='))?.split('=')[1];
const CSV_PATH = '/tmp/reclassify-preview.csv';

if (SINCE_FILTER && Number.isNaN(Date.parse(SINCE_FILTER))) {
  console.error(`Invalid --since value: ${SINCE_FILTER} (expected ISO 8601)`);
  process.exit(1);
}
if (LEVEL_FILTER && !VALID_LEVELS.includes(LEVEL_FILTER as any)) {
  console.error(`Invalid --level value: ${LEVEL_FILTER}. Expected one of: ${VALID_LEVELS.join(', ')}`);
  process.exit(1);
}

// Tier 1: description-based. Tier 2-friendly concurrency (RPM cap on
// gpt-4o-mini at usage tier 2 is ~5,000, so we can crank).
const T1_CONCURRENCY = 50;
const T1_SLEEP_MS = 100;

// Tier 2: web search. RPM is ~30-50 on usage tier 2, vs 5 on tier 1.
const T2_CONCURRENCY = 10;
const T2_SLEEP_MS = 1500;

const LEVEL_DESCRIPTIONS = `
- fully_vegan: 100% vegan — the entire menu/offering has zero animal products. The place's identity IS vegan.
- mostly_vegan: 85-99% vegan — presents as a vegan place but a small number of non-vegan items exist (exceptions, not a section). E.g. "mostly vegan café that added one honey latte".
- vegan_friendly: non-vegan place with a genuine vegan section or 4+ dedicated vegan dishes. Thai restaurants, health food cafés, vegetarian restaurants with some non-vegan items.
- vegan_options: mainstream place (steakhouse, pizzeria, regular café) with 1-3 vegan items available but veganism is not the focus.`.trim();

function descriptionTier1Prompt(p: { name: string; category: string; description: string; tags: string[] | null; current: string; city: string | null; country: string | null }) {
  const location = [p.city, p.country].filter(Boolean).join(', ');
  const cleanTags = (p.tags || []).filter(t =>
    !t.startsWith('staging-') && !t.startsWith('admin-') &&
    !t.startsWith('batch-') && !t.startsWith('websearch') &&
    t !== 'ai_generated_description'
  ).join(', ');
  return `Classify this place into exactly one vegan level using the description provided.

Name: ${p.name}${location ? ` (${location})` : ''}
Category: ${p.category}
Current level: ${p.current}
Description: ${p.description.slice(0, 600)}
${cleanTags ? `Tags: ${cleanTags}` : ''}

${LEVEL_DESCRIPTIONS}

IMPORTANT: If the description does not give enough signal to confidently change the level, keep current (${p.current}).
Reply with ONLY one of: fully_vegan / mostly_vegan / vegan_friendly / vegan_options`;
}

function websearchTier2Prompt(p: { name: string; city: string | null; country: string | null; current: string; category: string }) {
  const location = [p.city, p.country].filter(Boolean).join(', ');
  return `Search for "${p.name}"${location ? ` in ${location}` : ''} and classify it into exactly one vegan level.

Look for: menu composition, vegan vs non-vegan items, how the place describes itself, reviews mentioning animal products.

${LEVEL_DESCRIPTIONS}

Reply with ONLY one of: fully_vegan / mostly_vegan / vegan_friendly / vegan_options
Then a one-sentence reason on the next line.`;
}

function parseLevel(text: string): VeganLevel | null {
  const t = text.toLowerCase();
  for (const level of VALID_LEVELS) {
    if (t.includes(level)) return level;
  }
  return null;
}

async function classifyWithDescription(place: any): Promise<VeganLevel | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await ai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 20,
        temperature: 0,
        messages: [{ role: 'user', content: descriptionTier1Prompt(place) }],
      });
      return parseLevel(resp.choices[0]?.message?.content?.trim() ?? '');
    } catch (e: any) {
      if (e?.status === 429 && attempt < 2) await sleep((attempt + 1) * 5000);
      else break;
    }
  }
  return null;
}

async function classifyWithWebsearch(place: any): Promise<VeganLevel | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await ai.chat.completions.create({
        model: 'gpt-4o-mini-search-preview',
        messages: [{ role: 'user', content: websearchTier2Prompt(place) }],
      });
      return parseLevel(resp.choices[0]?.message?.content?.trim() ?? '');
    } catch (e: any) {
      if ((e?.status === 429 || e?.status === 503) && attempt < 2) await sleep((attempt + 1) * 15000);
      else break;
    }
  }
  return null;
}

function hasRealDescription(p: any): boolean {
  if (!p.description || p.description.trim().length < 30) return false;
  if ((p.tags || []).includes('ai_generated_description')) return false;
  return true;
}

async function applyChange(id: string, proposed: VeganLevel) {
  const { error } = await sb.from('places').update({ vegan_level: proposed }).eq('id', id);
  if (error) console.error(`\n  DB error ${id}: ${error.message}`);
}

async function processTier(
  label: string,
  places: any[],
  classifier: (p: any) => Promise<VeganLevel | null>,
  csv: ReturnType<typeof createWriteStream> | null,
  concurrency: number,
  sleepMs: number,
) {
  if (!places.length) { console.log(`\n${label}: nothing to process.`); return; }
  console.log(`\n${label}: ${places.length} places (concurrency=${concurrency})`);

  let changed = 0, unchanged = 0, failed = 0;
  const start = Date.now();

  for (let i = 0; i < places.length; i += concurrency) {
    const batch = places.slice(i, i + concurrency);
    const batchNum = Math.floor(i / concurrency) + 1;
    const totalBatches = Math.ceil(places.length / concurrency);
    process.stdout.write(`\n  [${batchNum}/${totalBatches}] `);

    const results = await Promise.allSettled(batch.map(p => classifier(p)));

    for (let j = 0; j < batch.length; j++) {
      const place = batch[j];
      const result = results[j];
      if (result.status === 'rejected' || !result.value) {
        process.stdout.write('!');
        failed++;
        continue;
      }
      const proposed = result.value;
      if (proposed === place.vegan_level) {
        process.stdout.write('·');
        unchanged++;
      } else {
        process.stdout.write('→');
        changed++;
        if (csv) {
          const excerpt = (place.description || '').replace(/\n/g, ' ').slice(0, 80).replace(/"/g, '""');
          csv.write(`${place.id},"${place.slug || ''}","${place.name.replace(/"/g, '""')}",${place.vegan_level},${proposed},"${excerpt}"\n`);
        } else {
          await applyChange(place.id, proposed);
        }
      }
    }

    const elapsed = (Date.now() - start) / 1000;
    const done = Math.min(i + concurrency, places.length);
    const rate = done / elapsed;
    const eta = (places.length - done) / rate;
    process.stdout.write(` (${done}/${places.length} | ETA ${Math.round(eta / 60)}min)`);

    if (i + concurrency < places.length) await sleep(sleepMs);
  }

  console.log(`\n  Done: ${changed} changed, ${unchanged} unchanged, ${failed} failed`);
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}${LIMIT ? ` | Limit: ${LIMIT}` : ''}${TIER_FILTER ? ` | Tier: ${TIER_FILTER}` : ''}${SINCE_FILTER ? ` | Since: ${SINCE_FILTER}` : ''}${LEVEL_FILTER ? ` | Level: ${LEVEL_FILTER}` : ''}`);

  // Fetch all active places
  const all: any[] = [];
  let offset = 0;
  while (true) {
    let q = sb.from('places')
      .select('id, slug, name, city, country, category, description, vegan_level, tags, source')
      .is('archived_at', null)
      .not('vegan_level', 'is', null)
      .order('vegan_level', { ascending: true })  // fully_vegan first
      .order('id')
      .range(offset, offset + 999);
    if (SOURCE_FILTER) q = q.eq('source', SOURCE_FILTER);
    if (SINCE_FILTER) q = q.gte('created_at', SINCE_FILTER);
    if (LEVEL_FILTER) q = q.eq('vegan_level', LEVEL_FILTER);
    const { data, error } = await q;
    if (error) { console.error('Fetch error:', error.message); process.exit(1); }
    if (!data?.length) break;
    all.push(...data);
    if (data.length < 1000) break;
    if (LIMIT > 0 && all.length >= LIMIT) break;
    offset += 1000;
    process.stdout.write(`\rFetched ${all.length} places...`);
  }
  console.log(`\rFetched ${all.length} places total.`);

  const todo = LIMIT ? all.slice(0, LIMIT) : all;

  // Split into tiers
  const tier1 = todo.filter(p => hasRealDescription(p));
  const tier2 = todo.filter(p => !hasRealDescription(p));

  console.log(`  Tier 1 (description-based): ${tier1.length}`);
  console.log(`  Tier 2 (websearch, no real desc): ${tier2.length}`);
  console.log(`  AI-generated descriptions (→ Tier 2): ${todo.filter(p => p.description && (p.tags || []).includes('ai_generated_description')).length}`);

  const csv = DRY_RUN ? createWriteStream(CSV_PATH) : null;
  if (csv) csv.write('id,slug,name,current_level,proposed_level,description_excerpt\n');

  if (!TIER_FILTER || TIER_FILTER === '1') {
    await processTier('TIER 1 — gpt-4o-mini (description)', tier1, classifyWithDescription, csv, T1_CONCURRENCY, T1_SLEEP_MS);
  }
  if (!TIER_FILTER || TIER_FILTER === '2') {
    await processTier('TIER 2 — gpt-4o-mini-search (websearch)', tier2, classifyWithWebsearch, csv, T2_CONCURRENCY, T2_SLEEP_MS);
  }

  if (csv) { csv.end(); console.log(`\nDry-run preview: ${CSV_PATH}`); }
  if (DRY_RUN) console.log('Remove --dry-run to apply changes.');
}

main().catch(console.error);
