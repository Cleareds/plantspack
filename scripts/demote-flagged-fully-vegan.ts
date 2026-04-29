/**
 * Demotes places tagged `websearch_review_flag` out of the `fully_vegan` tier
 * into the appropriate lower tier (mostly_vegan / vegan_friendly / vegan_options)
 * based on their description. These places already failed Tier 2 web-search
 * verification - the question is no longer "are they fully vegan" (they aren't)
 * but "where do they belong now."
 *
 * Uses gpt-4o-mini with the description as input. ~$0.08 for the full 788-row
 * batch on usage tier 2 ratelimits. Each demotion gets tagged
 * `auto_demoted_from_flagged_<date>` so the change is reversible.
 *
 * Usage:
 *   tsx scripts/demote-flagged-fully-vegan.ts --dry-run
 *   tsx scripts/demote-flagged-fully-vegan.ts --apply
 */
import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 20000, maxRetries: 0 });

const APPLY = process.argv.includes('--apply');
const CONCURRENCY = 50;
const SLEEP_MS = 100;
const TODAY_TAG = `auto_demoted_from_flagged_${new Date().toISOString().slice(0, 10)}`;

type Tier = 'mostly_vegan' | 'vegan_friendly' | 'vegan_options';

async function classify(place: { name: string; description: string | null; city: string | null; country: string | null }): Promise<Tier | null> {
  const location = [place.city, place.country].filter(Boolean).join(', ');
  const prompt = `A web-search verification has determined that this place is NOT 100% fully vegan. Classify it into the most accurate of three lower tiers.

Name: ${place.name}${location ? ` (${location})` : ''}
Description: ${(place.description || '').slice(0, 600)}

Tiers:
- mostly_vegan: 85-99% vegan menu, dedicated vegan/plant-based identity, with rare animal-product exceptions (e.g. honey, one cheese option)
- vegan_friendly: not a vegan place, but has a real vegan section or 4+ dedicated vegan dishes (vegetarian places, health cafes, places that explicitly cater)
- vegan_options: mainstream/regular place with 1-3 vegan items, or where being vegan is a side note rather than a focus

Reply with ONLY one of: mostly_vegan / vegan_friendly / vegan_options`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 12,
        temperature: 0,
      });
      const text = (resp.choices[0]?.message?.content ?? '').toLowerCase();
      if (text.includes('mostly_vegan')) return 'mostly_vegan';
      if (text.includes('vegan_friendly')) return 'vegan_friendly';
      if (text.includes('vegan_options')) return 'vegan_options';
      return 'vegan_friendly'; // safe default if model didn't return a clean token
    } catch (e: any) {
      if ((e.status === 429 || e.status === 503) && attempt < 2) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
        continue;
      }
      return null;
    }
  }
  return null;
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);

  const { data: places, error } = await sb.from('places')
    .select('id, name, city, country, description, tags')
    .eq('vegan_level', 'fully_vegan')
    .is('archived_at', null)
    .contains('tags', ['websearch_review_flag'])
    .order('id');
  if (error) { console.error('Fetch error:', error.message); process.exit(1); }
  if (!places?.length) { console.log('No flagged places to demote.'); return; }

  console.log(`Flagged places: ${places.length}`);

  let mostly = 0, friendly = 0, options = 0, failed = 0;
  const start = Date.now();

  for (let i = 0; i < places.length; i += CONCURRENCY) {
    const batch = places.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map(p => classify(p)));
    for (let j = 0; j < batch.length; j++) {
      const place = batch[j];
      const result = results[j];
      const tier = result.status === 'fulfilled' ? result.value : null;
      if (!tier) { failed++; continue; }
      if (tier === 'mostly_vegan') mostly++;
      else if (tier === 'vegan_friendly') friendly++;
      else options++;

      if (APPLY) {
        const newTags = [...(place.tags || []), TODAY_TAG].filter((t, idx, arr) => arr.indexOf(t) === idx);
        const { error: updErr } = await sb.from('places').update({
          vegan_level: tier,
          tags: newTags,
          updated_at: new Date().toISOString(),
        }).eq('id', place.id);
        if (updErr) { console.error(`  ERR ${place.name}: ${updErr.message}`); failed++; }
      }
    }
    const done = Math.min(i + CONCURRENCY, places.length);
    const rate = done / Math.max(1, (Date.now() - start) / 1000);
    process.stdout.write(`\r  ${done}/${places.length} (${Math.round(rate * 60)}/min) | mostly=${mostly} friendly=${friendly} options=${options} failed=${failed}`);
    if (done < places.length) await new Promise(r => setTimeout(r, SLEEP_MS));
  }

  console.log(`\n\nDone.`);
  console.log(`  mostly_vegan:  ${mostly}`);
  console.log(`  vegan_friendly: ${friendly}`);
  console.log(`  vegan_options:  ${options}`);
  console.log(`  failed:         ${failed}`);

  if (APPLY) {
    const { error: rErr } = await sb.rpc('refresh_directory_views');
    console.log('Views refreshed:', rErr ? 'ERR ' + rErr.message : 'OK');
    console.log(`\nRevert: UPDATE places SET vegan_level='fully_vegan' WHERE '${TODAY_TAG}' = ANY(tags);`);
  } else {
    console.log('\nDRY RUN: no changes written. Re-run with --apply to commit.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
