/**
 * Generate AI descriptions for places that have no description.
 * Uses gpt-4o-mini to write a 2-sentence description from name + city + country +
 * category + cuisine_types + vegan_level. No web search needed — pure generation.
 *
 * Cost: ~$0.000008/place × ~4K places ≈ $0.03
 *
 * Usage:
 *   npx tsx scripts/generate-missing-descriptions.ts --dry-run
 *   npx tsx scripts/generate-missing-descriptions.ts
 *   npx tsx scripts/generate-missing-descriptions.ts --limit=200
 */

import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { sleep } from './lib/place-pipeline';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 15000, maxRetries: 0 });

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '0') || 0;
const CONCURRENCY = 20;
const BATCH_SLEEP_MS = 300;

const VEGAN_LEVEL_DESC: Record<string, string> = {
  fully_vegan: '100% vegan',
  mostly_vegan: 'mostly vegan',
  vegan_friendly: 'vegan-friendly',
  vegan_options: 'with vegan options',
};

const CATEGORY_DESC: Record<string, string> = {
  eat: 'restaurant/café',
  store: 'shop/store',
  hotel: 'accommodation',
  event: 'event/experience',
  organisation: 'organisation',
};

function buildPrompt(p: {
  name: string; city: string | null; country: string | null;
  category: string | null; cuisine_types: string[] | null; vegan_level: string | null;
  tags: string[] | null;
}): string {
  const location = [p.city, p.country].filter(Boolean).join(', ');
  const category = CATEGORY_DESC[p.category ?? ''] ?? 'place';
  const level = VEGAN_LEVEL_DESC[p.vegan_level ?? ''] ?? 'vegan-friendly';
  const cuisine = p.cuisine_types?.filter(Boolean).slice(0, 3).join(', ');
  const tagHints = p.tags?.filter(t => !t.startsWith('staging-') && !t.startsWith('batch-') && !t.startsWith('admin-') && !t.startsWith('websearch')).slice(0, 5).join(', ');

  return `Write a 2-sentence description for a ${level} ${category}${location ? ` in ${location}` : ''}.

Name: ${p.name}
${cuisine ? `Cuisine: ${cuisine}` : ''}
${tagHints ? `Tags: ${tagHints}` : ''}

Rules:
- First sentence: what kind of place it is and what makes it special
- Second sentence: atmosphere, standout offerings, or why vegans love it
- Do NOT start with "Welcome to" or the place name
- Do NOT mention specific prices or hours
- Keep it factual but warm, 40-60 words total
- Write in English only

Output the description only, no quotes, no labels.`;
}

async function generateOne(p: any): Promise<string | null> {
  const prompt = buildPrompt(p);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 120,
        temperature: 0.7,
      });
      return res.choices[0]?.message?.content?.trim() ?? null;
    } catch (e: any) {
      if ((e.status === 429 || e.status === 503) && attempt < 2) {
        await sleep((attempt + 1) * 3000);
      } else break;
    }
  }
  return null;
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}${LIMIT ? ` | Limit: ${LIMIT}` : ''}`);

  // Fetch places missing descriptions
  const allPlaces: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb.from('places')
      .select('id, name, city, country, category, cuisine_types, vegan_level, tags, description')
      .is('archived_at', null)
      .or('description.is.null,description.eq.')
      .order('id')
      .range(from, from + 999);
    if (error) { console.error('DB error:', error.message); process.exit(1); }
    if (!data?.length) break;
    allPlaces.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }

  const todo = LIMIT ? allPlaces.slice(0, LIMIT) : allPlaces;
  console.log(`Places missing descriptions: ${allPlaces.length} | Processing: ${todo.length}`);
  if (!todo.length) { console.log('Nothing to do.'); return; }

  if (DRY_RUN) {
    console.log('Sample prompt:');
    console.log(buildPrompt(todo[0]));
    console.log('\nDRY RUN — no writes. Remove --dry-run to apply.');
    return;
  }

  let generated = 0, failed = 0;
  const startTime = Date.now();

  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const batch = todo.slice(i, i + CONCURRENCY);
    const batchNum = Math.floor(i / CONCURRENCY) + 1;
    const totalBatches = Math.ceil(todo.length / CONCURRENCY);
    process.stdout.write(`\n[${batchNum}/${totalBatches}] `);

    const results = await Promise.allSettled(batch.map(p => generateOne(p)));

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      const place = batch[j];
      if (result.status === 'rejected' || !result.value) {
        process.stdout.write('!');
        failed++;
        continue;
      }
      // Tag as AI-generated so reclassify falls through to websearch for classification
      const existingTags: string[] = place.tags || [];
      const newTags = existingTags.includes('ai_generated_description')
        ? existingTags
        : [...existingTags, 'ai_generated_description'];
      const { error } = await sb.from('places')
        .update({ description: result.value, tags: newTags, updated_at: new Date().toISOString() })
        .eq('id', place.id);
      if (error) {
        process.stdout.write('x');
        failed++;
      } else {
        process.stdout.write('.');
        generated++;
      }
    }

    const elapsed = (Date.now() - startTime) / 1000;
    const done = i + batch.length;
    const rate = done / elapsed;
    const eta = (todo.length - done) / rate;
    process.stdout.write(` (${done}/${todo.length} | ${Math.round(rate * 60)}/min | ETA ${Math.round(eta / 60)}min)`);

    if (i + CONCURRENCY < todo.length) await sleep(BATCH_SLEEP_MS);
  }

  console.log(`\n\nDone: ${generated} generated, ${failed} failed`);
}

main().catch(console.error);
