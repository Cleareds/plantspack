/**
 * Import 25 more recipes from Nora Cooks, Rainbow Plant Life, Ela Vegan
 * Usage: npx tsx scripts/import-more-recipes.ts
 */
import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

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

function classifyMealType(cats: string[], name: string): string {
  const n = name.toLowerCase();
  const c = cats.map(s => s.toLowerCase()).join(' ');
  if (c.includes('breakfast') || c.includes('brunch') || n.includes('pancake') || n.includes('oat') || n.includes('muffin') || n.includes('waffle')) return 'breakfast';
  if (c.includes('dessert') || c.includes('sweet') || n.includes('cookie') || n.includes('cake') || n.includes('brownie') || n.includes('ice cream') || n.includes('chocolate')) return 'desserts';
  if (c.includes('snack') || c.includes('appetizer') || n.includes('dip') || n.includes('energy') || n.includes('bite')) return 'snacks';
  if (c.includes('drink') || c.includes('smoothie') || c.includes('beverage') || n.includes('latte') || n.includes('smoothie')) return 'drinks';
  if (c.includes('salad') || c.includes('sandwich') || c.includes('wrap') || c.includes('lunch')) return 'lunch';
  return 'dinner';
}

function classifyTags(cats: string[], ings: string[], name: string): string[] {
  const tags: string[] = [];
  const n = name.toLowerCase();
  const c = cats.map(s => s.toLowerCase()).join(' ');
  const ingStr = ings.join(' ').toLowerCase();

  if (c.includes('gluten-free') || c.includes('gluten free')) tags.push('gluten-free');
  if (c.includes('1-pot') || c.includes('one pot') || c.includes('1 pot') || n.includes('1-pot') || n.includes('one pot')) tags.push('one-pot');
  if (c.includes('no-bake') || n.includes('no-bake') || n.includes('no bake')) tags.push('no-bake');
  if (c.includes('raw') || n.includes('raw')) tags.push('raw');
  if (n.includes('quick') || n.includes('easy') || n.includes('simple') || n.includes('5 min') || n.includes('10 min') || n.includes('15 min')) tags.push('quick & easy');
  if (ingStr.includes('tofu') || ingStr.includes('tempeh') || ingStr.includes('seitan') || ingStr.includes('lentil') || ingStr.includes('chickpea') || ingStr.includes('bean')) tags.push('high-protein');
  if (n.includes('comfort') || n.includes('chili') || n.includes('soup') || n.includes('stew') || n.includes('mac') || n.includes('pot pie')) tags.push('comfort food');

  return tags.slice(0, 3);
}

// Curated URLs from Nora Cooks, Rainbow Plant Life, Ela Vegan
const URLS: { url: string; source: string }[] = [
  // Nora Cooks — comfort food & baking
  { url: 'https://www.noracooks.com/vegan-banana-bread/', source: 'Nora Cooks' },
  { url: 'https://www.noracooks.com/vegan-pancakes/', source: 'Nora Cooks' },
  { url: 'https://www.noracooks.com/vegan-chocolate-chip-cookies/', source: 'Nora Cooks' },
  { url: 'https://www.noracooks.com/vegan-french-toast/', source: 'Nora Cooks' },
  { url: 'https://www.noracooks.com/vegan-chocolate-cake/', source: 'Nora Cooks' },
  { url: 'https://www.noracooks.com/vegan-waffles/', source: 'Nora Cooks' },
  { url: 'https://www.noracooks.com/vegan-shepherds-pie/', source: 'Nora Cooks' },
  { url: 'https://www.noracooks.com/simple-vegan-pancakes/', source: 'Nora Cooks' },
  { url: 'https://www.noracooks.com/vegan-brownies/', source: 'Nora Cooks' },
  { url: 'https://www.noracooks.com/vegan-bolognese/', source: 'Nora Cooks' },
  { url: 'https://www.noracooks.com/vegan-alfredo-sauce/', source: 'Nora Cooks' },
  { url: 'https://www.noracooks.com/vegan-lasagna/', source: 'Nora Cooks' },
  { url: 'https://www.noracooks.com/vegan-chili/', source: 'Nora Cooks' },
  // Rainbow Plant Life — global flavors
  { url: 'https://rainbowplantlife.com/vegan-red-lentil-curry/', source: 'Rainbow Plant Life' },
  { url: 'https://rainbowplantlife.com/vegan-broccoli-salad/', source: 'Rainbow Plant Life' },
  { url: 'https://rainbowplantlife.com/the-best-vegan-chili/', source: 'Rainbow Plant Life' },
  { url: 'https://rainbowplantlife.com/vegan-bolognese/', source: 'Rainbow Plant Life' },
  { url: 'https://rainbowplantlife.com/vegan-mushroom-risotto/', source: 'Rainbow Plant Life' },
  { url: 'https://rainbowplantlife.com/vegan-stuffed-peppers/', source: 'Rainbow Plant Life' },
  { url: 'https://rainbowplantlife.com/vegan-lentil-soup/', source: 'Rainbow Plant Life' },
  { url: 'https://rainbowplantlife.com/vegan-carbonara/', source: 'Rainbow Plant Life' },
  // Ela Vegan — international
  { url: 'https://elavegan.com/vegan-falafel/', source: 'Ela Vegan' },
  { url: 'https://elavegan.com/vegan-chocolate-cake/', source: 'Ela Vegan' },
  { url: 'https://elavegan.com/creamy-vegan-tomato-soup/', source: 'Ela Vegan' },
  { url: 'https://elavegan.com/vegan-sushi-rolls/', source: 'Ela Vegan' },
  // Bianca Zapatka — European
  { url: 'https://biancazapatka.com/en/vegan-pizza/', source: 'Bianca Zapatka' },
  { url: 'https://biancazapatka.com/en/vegan-carbonara/', source: 'Bianca Zapatka' },
  { url: 'https://biancazapatka.com/en/vegan-ramen/', source: 'Bianca Zapatka' },
];

async function scrapeRecipe(url: string): Promise<any> {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (!jsonLdMatches) return null;

    for (const match of jsonLdMatches) {
      try {
        const jsonStr = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '').trim();
        const data = JSON.parse(jsonStr);
        const items = data['@graph'] || (Array.isArray(data) ? data : [data]);
        for (const item of items) {
          if (item['@type'] === 'Recipe') {
            return {
              name: item.name,
              description: item.description?.slice(0, 300),
              image: Array.isArray(item.image) ? item.image[0] : (item.image?.url || item.image),
              ingredients: item.recipeIngredient,
              instructions: (item.recipeInstructions || []).map((s: any, j: number) => `${j + 1}. ${s.text || s}`).join('\n'),
              prepTime: item.prepTime, cookTime: item.cookTime, totalTime: item.totalTime,
              servings: Array.isArray(item.recipeYield) ? item.recipeYield[0] : item.recipeYield,
              nutrition: item.nutrition ? { calories: item.nutrition.calories, protein: item.nutrition.proteinContent, fat: item.nutrition.fatContent, carbs: item.nutrition.carbohydrateContent, fiber: item.nutrition.fiberContent } : null,
              keywords: item.keywords || '',
              category: item.recipeCategory,
              cuisine: item.recipeCuisine,
            };
          }
        }
      } catch {}
    }
    return null;
  } catch { return null; }
}

async function main() {
  const { data: admin } = await sb.from('users').select('id').eq('role', 'admin').limit(1).single();
  if (!admin) { console.log('No admin'); return; }

  // Check existing slugs to avoid duplicates
  const { data: existing } = await sb.from('posts').select('slug').eq('category', 'recipe');
  const existingSlugs = new Set((existing || []).map(p => p.slug));

  const skipCuisines = ['Vegan', 'Gluten-Free', 'Dairy-Free', 'Grain-Free', 'Oil-Free', 'Egg-Free', 'Gluten-Free (optional)', 'Nut-Free'];

  console.log('Scraping recipes from Nora Cooks, Rainbow Plant Life, Ela Vegan, Bianca Zapatka...\n');

  let imported = 0;
  for (const { url, source } of URLS) {
    if (imported >= 25) break;

    const slug_prefix = url.split('/').slice(-2, -1)[0] || '';
    process.stdout.write(`  ${slug_prefix.slice(0, 40).padEnd(40)}... `);

    const r = await scrapeRecipe(url);
    if (!r || !r.name || !r.ingredients?.length) { console.log('SKIP (no data)'); await sleep(500); continue; }

    const name = (r.name || '').replace(/&amp;/g, '&');
    const slug = toSlug(name);

    if (existingSlugs.has(slug)) { console.log('SKIP (duplicate)'); continue; }

    const prepMin = parseDuration(r.prepTime);
    const cookMin = parseDuration(r.cookTime);
    const totalMin = parseDuration(r.totalTime) || (prepMin + cookMin);
    const difficulty = classifyDifficulty(totalMin, r.ingredients.length);
    const cats = Array.isArray(r.category) ? r.category : (r.category ? [r.category] : []);
    const cuisineArr = Array.isArray(r.cuisine) ? r.cuisine.filter((c: string) => !skipCuisines.includes(c)) : [];
    const mealType = classifyMealType(cats, name);
    const tags = classifyTags([...cats, ...(cuisineArr || [])], r.ingredients, name);

    const { error } = await sb.from('posts').insert({
      user_id: admin.id,
      content: (r.description || '').replace(/&amp;/g, '&') + '\n\n' + r.instructions,
      title: name,
      slug,
      category: 'recipe',
      recipe_data: {
        ingredients: r.ingredients,
        prep_time_min: prepMin,
        cook_time_min: cookMin,
        total_time_min: totalMin,
        servings: parseInt(String(r.servings)) || 4,
        difficulty,
        meal_type: mealType,
        cuisine: cuisineArr.join(', ') || undefined,
        nutrition: r.nutrition,
        source_url: url,
        source_attribution: source,
      },
      images: r.image ? [r.image] : [],
      privacy: 'public',
      secondary_tags: tags,
    });

    if (error) { console.log('ERR: ' + error.message); }
    else { console.log('✅ ' + name.slice(0, 40) + ' [' + mealType + '/' + difficulty + '] ' + tags.join(', ')); imported++; existingSlugs.add(slug); }

    await sleep(800);
  }

  console.log(`\n✅ Imported ${imported} new recipes`);
}

main().catch(e => { console.error(e); process.exit(1) });
