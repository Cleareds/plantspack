/**
 * Import recipes scraped via Chrome DevTools from approved vegan sites
 * Usage: npx tsx scripts/import-chrome-scraped.ts
 */
import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

function parseDuration(iso: string | undefined): number {
  if (!iso) return 0;
  const m = String(iso).match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return 0;
  return (parseInt(m[1] || '0') * 60) + parseInt(m[2] || '0');
}

function toSlug(name: string) {
  return name.replace(/&amp;/g, 'and').replace(/&/g, 'and').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function classifyDifficulty(totalMin: number, ingCount: number): 'easy' | 'medium' | 'hard' {
  if (totalMin <= 20 && ingCount <= 10) return 'easy';
  if (totalMin <= 35 && ingCount <= 12) return 'easy';
  if (totalMin >= 60 || ingCount >= 18) return 'hard';
  return 'medium';
}

const skipCuisines = ['Vegan', 'Gluten-Free', 'Dairy-Free', 'Grain-Free', 'Oil-Free', 'Egg-Free'];

async function main() {
  const { data: admin } = await sb.from('users').select('id').eq('role', 'admin').limit(1).single();
  if (!admin) { console.log('No admin user'); return; }

  const recipes = JSON.parse(readFileSync('scripts/scraped-recipes-chrome.json', 'utf-8'));
  console.log(`Importing ${recipes.length} Chrome-scraped recipes...\n`);

  // Get existing titles for dedup
  const { data: existing } = await sb.from('posts').select('title').eq('category', 'recipe');
  const existingTitles = new Set((existing || []).map(r => r.title?.toLowerCase()));

  let imported = 0;
  for (const r of recipes) {
    const name = (r.name || '').replace(/&amp;/g, '&');
    if (existingTitles.has(name.toLowerCase())) {
      console.log(`  SKIP (exists): ${name.slice(0, 50)}`);
      continue;
    }

    const prepMin = parseDuration(r.prepTime);
    const cookMin = parseDuration(r.cookTime);
    const totalMin = parseDuration(r.totalTime) || (prepMin + cookMin);
    const desc = (r.description || '').replace(/&amp;/g, '&');
    const difficulty = classifyDifficulty(totalMin, (r.ingredients || []).length);
    const cuisineArr = Array.isArray(r.cuisine) ? r.cuisine.filter((c: string) => !skipCuisines.includes(c)) : [];

    const { error } = await sb.from('posts').insert({
      user_id: admin.id,
      content: desc + '\n\n' + (r.instructions || ''),
      title: name,
      slug: toSlug(name),
      category: 'recipe',
      recipe_data: {
        ingredients: r.ingredients || [],
        prep_time_min: prepMin,
        cook_time_min: cookMin,
        total_time_min: totalMin,
        servings: parseInt(String(r.servings)) || 4,
        difficulty,
        cuisine: cuisineArr.join(', ') || undefined,
        nutrition: r.nutrition,
        source_url: r.sourceUrl,
        source_attribution: `${r.author || 'Unknown'} — ${r.sourceUrl}`,
      },
      images: r.image ? [r.image] : [],
      privacy: 'public',
      secondary_tags: (r.keywords || '').split(',').map((k: string) => k.trim()).filter(Boolean).slice(0, 3),
    });

    if (error) console.log(`  ERR: ${name.slice(0, 40)} — ${error.message}`);
    else { console.log(`  ✅ ${name.slice(0, 50)} [${difficulty}]`); imported++; }
  }

  console.log(`\n✅ Imported ${imported}/${recipes.length} recipes`);
}

main().catch(e => { console.error(e); process.exit(1); });
