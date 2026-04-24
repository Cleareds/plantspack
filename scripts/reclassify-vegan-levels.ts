/**
 * Bulk re-classify existing places into the 4-tier vegan level system.
 * Uses OpenAI gpt-4o-mini to classify each place based on name, description, category, and tags.
 *
 * Usage:
 *   npx tsx scripts/reclassify-vegan-levels.ts --dry-run       # preview CSV only
 *   npx tsx scripts/reclassify-vegan-levels.ts                  # apply changes
 *   npx tsx scripts/reclassify-vegan-levels.ts --limit=500      # subset test
 *   npx tsx scripts/reclassify-vegan-levels.ts --source=vegguide # specific source
 *
 * Runs fully_vegan places first (highest risk of misclassification).
 * Cost estimate: ~$0.30 for all 37K places at gpt-4o-mini rates.
 * Places without description keep their current level (insufficient signal).
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

const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VALID_LEVELS = ['fully_vegan', 'mostly_vegan', 'vegan_friendly', 'vegan_options'] as const;
type VeganLevel = typeof VALID_LEVELS[number];

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '0') || 0;
const SOURCE_FILTER = args.find(a => a.startsWith('--source='))?.split('=')[1];
const CONCURRENCY = 10;
const CSV_PATH = '/tmp/reclassify-preview.csv';

const CLASSIFY_PROMPT = (p: { name: string; category: string; description: string | null; tags: string[] | null; current: string }) => `
Classify this place into exactly one vegan level based on what you know and the information provided.

Name: ${p.name}
Category: ${p.category}
Current level: ${p.current}
Description: ${p.description || '(none)'}
Tags: ${(p.tags || []).filter(t => !t.startsWith('staging-') && !t.startsWith('admin-') && !t.startsWith('batch-')).join(', ') || '(none)'}

Vegan levels:
- fully_vegan: 100% vegan menu, zero animal products, the place's entire identity is vegan
- mostly_vegan: 85%+ vegan menu, but a small number of non-vegan items exist (exceptions, not sections)
- vegan_friendly: non-vegan place with genuine vegan section or multiple dedicated vegan dishes (3+)
- vegan_options: mainstream place with a few vegan items available but not a vegan-focused place

IMPORTANT: If you don't have enough information to confidently reclassify, output the same level as current (${p.current}).

Reply with ONLY one of: fully_vegan, mostly_vegan, vegan_friendly, vegan_options`.trim();

async function classifyPlace(place: any): Promise<VeganLevel | null> {
  try {
    const resp = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 20,
      temperature: 0,
      messages: [{ role: 'user', content: CLASSIFY_PROMPT(place) }],
    });
    const raw = resp.choices[0]?.message?.content?.trim().toLowerCase().replace(/[^a-z_]/g, '');
    if (!raw || !VALID_LEVELS.includes(raw as VeganLevel)) return null;
    return raw as VeganLevel;
  } catch (e: any) {
    if (e?.status === 429) { await sleep(5000); return classifyPlace(place); }
    return null;
  }
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no DB writes)' : 'LIVE'}`);
  if (DRY_RUN) console.log(`Preview CSV: ${CSV_PATH}`);

  // Fetch places — fully_vegan first (highest-risk), then others
  let query = sb
    .from('places')
    .select('id, slug, name, category, description, vegan_level, tags, source')
    .is('archived_at', null)
    .not('vegan_level', 'is', null)
    .order('vegan_level', { ascending: true }) // fully_vegan sorts first alphabetically
    .order('name');

  if (SOURCE_FILTER) query = query.eq('source', SOURCE_FILTER);
  if (LIMIT > 0) query = query.limit(LIMIT);
  else query = query.limit(100000);

  const { data: places, error } = await query;
  if (error) { console.error('Fetch failed:', error.message); process.exit(1); }

  // Skip places with no description (insufficient signal)
  const withData = (places || []).filter(p => p.description && p.description.length > 20);
  const skipped = (places || []).length - withData.length;

  console.log(`Total places: ${(places || []).length}`);
  console.log(`With description: ${withData.length}`);
  console.log(`Skipped (no description): ${skipped}`);

  // Sort: fully_vegan first, then others
  withData.sort((a, b) => {
    if (a.vegan_level === 'fully_vegan' && b.vegan_level !== 'fully_vegan') return -1;
    if (b.vegan_level === 'fully_vegan' && a.vegan_level !== 'fully_vegan') return 1;
    return 0;
  });

  let changed = 0, unchanged = 0, failed = 0;
  const csv = DRY_RUN ? createWriteStream(CSV_PATH) : null;
  if (csv) csv.write('id,slug,name,current_level,proposed_level,description_excerpt\n');

  const batches: any[][] = [];
  for (let i = 0; i < withData.length; i += CONCURRENCY) {
    batches.push(withData.slice(i, i + CONCURRENCY));
  }

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const results = await Promise.all(batch.map(p => classifyPlace(p)));

    for (let i = 0; i < batch.length; i++) {
      const place = batch[i];
      const proposed = results[i];

      if (!proposed) { failed++; continue; }
      if (proposed === place.vegan_level) { unchanged++; continue; }

      changed++;
      const excerpt = (place.description || '').replace(/\n/g, ' ').slice(0, 80);
      console.log(`[CHANGE] ${place.name} (${place.city}) ${place.vegan_level} → ${proposed}`);

      if (csv) {
        csv.write(`${place.id},"${place.slug || ''}","${place.name.replace(/"/g, '""')}",${place.vegan_level},${proposed},"${excerpt.replace(/"/g, '""')}"\n`);
      } else {
        const { error: upErr } = await sb
          .from('places')
          .update({ vegan_level: proposed })
          .eq('id', place.id);
        if (upErr) console.error(`  Failed to update ${place.id}: ${upErr.message}`);
      }
    }

    const pct = Math.round(((b + 1) / batches.length) * 100);
    process.stdout.write(`\r${(b + 1) * CONCURRENCY}/${withData.length} (${pct}%) — changed: ${changed}, unchanged: ${unchanged}, failed: ${failed}`);
    if (b < batches.length - 1) await sleep(100);
  }

  if (csv) csv.end();
  console.log(`\n\nDone.`);
  console.log(`Changed: ${changed}`);
  console.log(`Unchanged: ${unchanged}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped (no description): ${skipped}`);
  if (DRY_RUN && changed > 0) console.log(`\nReview changes: ${CSV_PATH}\nThen run without --dry-run to apply.`);
}

main().catch(console.error);
