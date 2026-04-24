/**
 * Generate 2-3 sentence descriptions for places that have none using OpenAI gpt-4o-mini.
 * Cheap (~$0.04 per 5k places), fast, and consistent.
 *
 * Usage:
 *   npx tsx scripts/generate-descriptions.ts [--source=osm-import-2026-04] [--limit=500] [--dry-run]
 *
 * Cost estimate: ~$0.008 per 1,000 places at gpt-4o-mini rates.
 */
import { config } from 'dotenv'; config({ path: '.env.local' });
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { sleep } from './lib/place-pipeline';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function buildPrompt(p: {
  name: string;
  category: string;
  vegan_level: string;
  city: string | null;
  country: string;
  cuisine_types: string[] | null;
  tags: string[] | null;
  opening_hours: string | null;
  subcategory: string | null;
}): string {
  const veganLabel = p.vegan_level === 'fully_vegan' ? '100% vegan' : 'vegan-friendly';
  const cuisine = p.cuisine_types?.filter(Boolean).join(', ');
  const tags = p.tags?.filter(t => !['vegan shop', 'vegan stay', 'user_recommended'].includes(t)).join(', ');
  const location = [p.city, p.country].filter(Boolean).join(', ');
  const type = p.subcategory || p.category;

  return `Write a 2-3 sentence description for a vegan place directory entry. Be specific and informative. Don't start with "This" or the place name. Don't be generic ("a must-visit"). Focus on what kind of experience or food you'd actually find there. Output only the description, nothing else.

Name: ${p.name}
Type: ${veganLabel} ${type}
Location: ${location}
${cuisine ? `Cuisine/focus: ${cuisine}` : ''}
${tags ? `Notable for: ${tags}` : ''}`;
}

async function generateDescription(place: any): Promise<string | null> {
  try {
    const resp = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 150,
      messages: [{ role: 'user', content: buildPrompt(place) }],
    });
    const text = resp.choices[0]?.message?.content?.trim();
    if (!text || text.length < 20) return null;
    return text.slice(0, 400);
  } catch (e: any) {
    if (e?.status === 429) {
      await sleep(10000);
      return null;
    }
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '2000');
  const sourceFilter = args.find(a => a.startsWith('--source='))?.split('=')[1];

  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set in .env.local');
    process.exit(1);
  }

  console.log(`🤖 Generating descriptions via gpt-4o-mini${dryRun ? ' [DRY RUN]' : ''}${sourceFilter ? ` [source: ${sourceFilter}]` : ''}`);
  console.log(`Limit: ${limit}`);

  const places: any[] = [];
  let offset = 0;
  while (places.length < limit) {
    const pageSize = Math.min(1000, limit - places.length);
    let q = sb.from('places')
      .select('id, name, category, subcategory, vegan_level, city, country, cuisine_types, tags, opening_hours')
      .is('description', null)
      .range(offset, offset + pageSize - 1);
    if (sourceFilter) q = q.like('source', `%${sourceFilter}%`);
    const { data, error } = await q;
    if (error) { console.error('Query failed:', error); break; }
    if (!data || data.length === 0) break;
    places.push(...data);
    offset += data.length;
    if (data.length < pageSize) break;
  }

  console.log(`Found ${places.length} places without descriptions\n`);
  if (dryRun) {
    console.log('Sample prompt:');
    console.log(buildPrompt(places[0]));
    return;
  }

  let generated = 0, failed = 0;
  const CONCURRENCY = 10;

  for (let i = 0; i < places.length; i += CONCURRENCY) {
    const batch = places.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map(p => generateDescription(p)));

    for (let j = 0; j < batch.length; j++) {
      const p = batch[j];
      const r = results[j];
      const desc = r.status === 'fulfilled' ? r.value : null;
      if (desc) {
        await sb.from('places').update({ description: desc }).eq('id', p.id);
        generated++;
      } else {
        failed++;
      }
    }

    if ((i + CONCURRENCY) % 100 === 0 || i + CONCURRENCY >= places.length) {
      process.stdout.write(`  ${Math.min(i + CONCURRENCY, places.length)}/${places.length} | generated: ${generated} | failed: ${failed}\r`);
    }

    if (i + CONCURRENCY < places.length) await sleep(100);
  }

  console.log(`\n✅ Done: ${generated} descriptions generated, ${failed} failed`);
  console.log(`Estimated cost: ~$${(generated * 0.000008).toFixed(4)}`);
}

main().catch(console.error);
