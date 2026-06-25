/**
 * Import 100+ recipes from NEW 100%-vegan sources (vetted 2026-06-25).
 *
 * Sources are all confirmed exclusively vegan and scrapable (sitemap + JSON-LD
 * Recipe schema verified). Harvests recipe URLs from each site's sitemap, scrapes
 * JSON-LD, runs a per-recipe vegan safety check, dedupes against existing recipe
 * posts, and inserts into posts(category='recipe') matching the existing shape.
 *
 * Rollback: every row carries recipe_data.import_batch = BATCH so the whole run
 * can be reverted with one query.
 *
 * Usage:  node scripts/import-new-vegan-sources.mjs --dry     (scrape+validate, no insert)
 *         node scripts/import-new-vegan-sources.mjs           (real import)
 */
import { config } from 'dotenv'; config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const DRY = process.argv.includes('--dry');
const BATCH = 'new-vegan-sources-2026-06-25';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const HEADERS = { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9' };

// source name (attribution) -> { domain, sitemap, target, defaultCuisine }
// NOTE: The Banana Diaries was DROPPED after verification — it publishes
// non-vegan recipes (e.g. "Traditional Challah French Toast" with real eggs),
// so per the content policy it is disqualified. Its slots were redistributed
// to Full of Plants (400+ catalog) and Addicted to Dates.
const SOURCES = [
  { name: 'Full of Plants',          domain: 'fullofplants.com',            target: 40, cuisine: 'International' },
  { name: 'Addicted to Dates',       domain: 'addictedtodates.com',         target: 25, cuisine: 'Desserts' },
  { name: 'The Curious Chickpea',    domain: 'www.thecuriouschickpea.com',  target: 22, cuisine: 'International' },
  { name: 'Woon Heng',               domain: 'woonheng.com',                target: 18, cuisine: 'Chinese' },
  { name: 'The Foodie Takes Flight', domain: 'thefoodietakesflight.com',    target: 18, cuisine: 'Asian' },
];

const SKIP_PATH = /\/(about|contact|privacy|terms|recipes?|category|tag|shop|cookbook|blog|page\/|wp-|feed|author|subscribe|disclosure|work-with|videos?|press|web-stories|story|guide|guides|top-|best-of|gift|holiday-gift|roundup|how-to-do|steps-to|my-|where-|travel)/i;

// ── Vegan safety net. Sources are pre-vetted 100% vegan, so this only catches a
// mis-scraped non-recipe. Flags unambiguous animal ingredients; allows the vegan
// qualified forms (flax egg, vegan butter, coconut milk, eggplant, peanut butter…).
const ANIMAL = [
  { re: /\b(beef|pork|chicken|turkey|bacon|ham|lamb|veal|sausage|prosciutto|pepperoni|salami|duck|gelatin|gelatine|lard|tallow|suet|anchov|oyster sauce|fish sauce|fish\b|salmon|tuna|shrimp|prawn|crab|lobster|cod|tilapia|squid|clam|mussel|scallop|caviar|bone broth|chicken broth|beef broth|whey|casein)\b/i, allow: /\b(vegan|plant[- ]?based|mock|faux|no[- ]|imitation|soy|seitan|jackfruit|mushroom|tofu|tempeh|vegetable broth|veggie broth)\b/i },
  { re: /\bhoney\b/i,   allow: /\b(vegan|no[- ]honey|honey[- ]?free|maple|agave|date|alternative)\b/i },
  { re: /\beggs?\b/i,   allow: /\b(eggplant|flax|chia|vegan|replace|substitute|free|just egg|aquafaba|tofu|kala namak|no[- ]egg|egg[- ]?free|jojee)\b/i },
];
function veganFlags(ingredients) {
  const flags = [];
  for (const raw of ingredients) {
    const s = String(raw).toLowerCase();
    for (const a of ANIMAL) { if (a.re.test(s) && !a.allow.test(s)) flags.push(raw); }
  }
  return [...new Set(flags)];
}

function parseDuration(iso) {
  if (!iso) return 0;
  const m = String(iso).match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  return m ? (parseInt(m[1] || '0') * 60) + parseInt(m[2] || '0') : 0;
}
function toSlug(name) {
  return String(name).replace(/&amp;/g, 'and').replace(/&/g, 'and').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}
function classifyDifficulty(totalMin, ingCount) {
  if (totalMin <= 35 && ingCount <= 12) return 'easy';
  if (totalMin >= 60 || ingCount >= 18) return 'hard';
  return 'medium';
}
const SKIP_CUISINE = new Set(['vegan', 'gluten-free', 'dairy-free', 'grain-free', 'oil-free', 'egg-free', 'nut-free', 'plant-based', 'plant based']);
function cleanCuisine(c, fallback) {
  const arr = (Array.isArray(c) ? c : [c]).map((x) => String(x || '').trim()).filter((x) => x.length >= 3 && !SKIP_CUISINE.has(x.toLowerCase()));
  return arr[0] || fallback;
}
function mealType(categories, keywords, name) {
  const hay = [...(Array.isArray(categories) ? categories : [categories]), keywords, name].join(' ').toLowerCase();
  if (/dessert|cake|cookie|brownie|muffin|pie|sweet|chocolate|ice cream|cheesecake|pudding|frosting|donut|tart|truffle/.test(hay)) return 'desserts';
  if (/breakfast|pancake|waffle|oatmeal|granola|smoothie bowl|overnight oats|scone|toast/.test(hay)) return 'breakfast';
  if (/bread|bagel|focaccia|roll|loaf|bun/.test(hay)) return 'breads';
  if (/soup|stew|chili|broth|bisque/.test(hay)) return 'soups';
  if (/salad/.test(hay)) return 'salads';
  if (/pasta|noodle|spaghetti|lasagna|mac and cheese|ramen|udon/.test(hay)) return 'pasta';
  if (/drink|smoothie|latte|juice|cocktail|beverage|tea\b/.test(hay)) return 'drinks';
  if (/snack|dip|hummus|bites|bar\b|cracker|popcorn/.test(hay)) return 'snacks';
  if (/lunch|wrap|sandwich|bowl\b/.test(hay)) return 'lunch';
  if (/dinner|main|entree|curry|stir fry|stir-fry|bake|casserole|burger|taco|pizza/.test(hay)) return 'dinner';
  return 'mains';
}

async function get(url, timeout = 18000) {
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), timeout);
    const r = await fetch(url, { headers: HEADERS, redirect: 'follow', signal: c.signal });
    clearTimeout(t);
    return { status: r.status, body: await r.text() };
  } catch (e) { return { status: 'ERR:' + (e.message || e.name), body: '' }; }
}
function locs(xml) { const o = []; const re = /<loc>([^<]+)<\/loc>/gi; let m; while ((m = re.exec(xml))) o.push(m[1].trim()); return o; }

async function harvest(domain) {
  const idx = await get(`https://${domain}/sitemap_index.xml`);
  if (typeof idx.status !== 'number' || idx.status >= 400) return [];
  let postUrls = [];
  if (/<sitemapindex/i.test(idx.body)) {
    const subs = locs(idx.body).filter((u) => /(post|recipe)/i.test(u) && !/(category|tag|author|image|product)/i.test(u)).slice(0, 4);
    for (const su of subs) { const r = await get(su); if (typeof r.status === 'number' && r.status < 400) postUrls.push(...locs(r.body)); }
  } else { postUrls = locs(idx.body); }
  return postUrls.filter((u) => { try { const p = new URL(u); const segs = p.pathname.replace(/\/$/, '').split('/').filter(Boolean); return segs.length === 1 && segs[0].length > 5 && !SKIP_PATH.test(p.pathname); } catch { return false; } });
}

function extractRecipe(html, url) {
  const ms = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const s of ms) {
    try {
      const j = JSON.parse(s.replace(/<script[^>]*>/, '').replace(/<\/script>/, '').trim());
      const items = j['@graph'] || (Array.isArray(j) ? j : [j]);
      for (const it of items) {
        const t = it['@type'];
        if (t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'))) {
          const instr = Array.isArray(it.recipeInstructions)
            ? it.recipeInstructions.flatMap((step) => step['@type'] === 'HowToSection'
                ? (step.itemListElement || []).map((x) => x.text || '')
                : [step.text || step]).filter(Boolean).map((x, i) => `${i + 1}. ${String(x).replace(/<[^>]+>/g, '').trim()}`).join('\n')
            : String(it.recipeInstructions || '').replace(/<[^>]+>/g, '');
          let img = it.image; if (Array.isArray(img)) img = img[0]; if (img && img.url) img = img.url;
          return {
            name: String(it.name || '').replace(/&amp;/g, '&').trim(),
            description: String(it.description || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').slice(0, 400),
            ingredients: (it.recipeIngredient || []).map((x) => String(x).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim()).filter(Boolean),
            instructions: instr,
            image: typeof img === 'string' ? img : null,
            prepTime: it.prepTime, cookTime: it.cookTime, totalTime: it.totalTime,
            servings: Array.isArray(it.recipeYield) ? it.recipeYield[0] : it.recipeYield,
            nutrition: it.nutrition ? { calories: it.nutrition.calories, protein: it.nutrition.proteinContent, fat: it.nutrition.fatContent, carbs: it.nutrition.carbohydrateContent, fiber: it.nutrition.fiberContent } : null,
            keywords: typeof it.keywords === 'string' ? it.keywords : (Array.isArray(it.keywords) ? it.keywords.join(', ') : ''),
            category: it.recipeCategory, cuisine: it.recipeCuisine, sourceUrl: url,
          };
        }
      }
    } catch {}
  }
  return null;
}

async function main() {
  const { data: admin } = await sb.from('users').select('id').eq('role', 'admin').limit(1).single();
  if (!admin) { console.log('No admin user'); return; }

  // Dedupe sets from existing recipe posts.
  const { data: existing } = await sb.from('posts').select('slug, recipe_data').eq('category', 'recipe');
  const haveSlugs = new Set(existing.map((x) => x.slug));
  const haveUrls = new Set(existing.map((x) => x.recipe_data?.source_url).filter(Boolean));
  console.log(`Existing recipes: ${existing.length} | mode: ${DRY ? 'DRY RUN' : 'LIVE IMPORT'} | batch: ${BATCH}\n`);

  let totalImported = 0, totalFlagged = 0;
  const summary = [];

  for (const src of SOURCES) {
    const urls = await harvest(src.domain);
    let imported = 0, attempts = 0, skipDup = 0, skipNoRecipe = 0, flagged = 0;
    const samples = [];
    for (const url of urls) {
      if (imported >= src.target) break;
      if (attempts >= src.target * 4 + 40) break; // bound work per source
      if (haveUrls.has(url)) { skipDup++; continue; }
      attempts++;
      const r = await get(url, 15000);
      if (typeof r.status !== 'number' || r.status >= 400) { await sleep(250); continue; }
      const rec = extractRecipe(r.body, url);
      if (!rec || !rec.name || rec.ingredients.length < 2 || !rec.instructions) { skipNoRecipe++; await sleep(250); continue; }

      const slug = toSlug(rec.name);
      if (haveSlugs.has(slug)) { skipDup++; await sleep(250); continue; }

      const flags = veganFlags(rec.ingredients);
      if (flags.length) { flagged++; totalFlagged++; console.log(`  ⚠️  FLAG (skip) ${src.name}: "${rec.name}" — ${flags.join('; ')}`); await sleep(250); continue; }

      const prep = parseDuration(rec.prepTime), cook = parseDuration(rec.cookTime);
      const total = parseDuration(rec.totalTime) || (prep + cook);
      const row = {
        user_id: admin.id,
        content: (rec.description ? rec.description + '\n\n' : '') + rec.instructions,
        title: rec.name, slug,
        category: 'recipe', content_type: 'general', post_type: 'original', language: 'en',
        privacy: 'public', is_verified: false,
        images: rec.image ? [rec.image] : [],
        secondary_tags: rec.keywords.split(',').map((k) => k.trim()).filter(Boolean).slice(0, 3),
        recipe_data: {
          ingredients: rec.ingredients,
          prep_time_min: prep, cook_time_min: cook, total_time_min: total,
          servings: parseInt(String(rec.servings).replace(/[^\d]/g, '')) || 4,
          difficulty: classifyDifficulty(total, rec.ingredients.length),
          cuisine: cleanCuisine(rec.cuisine, src.cuisine),
          meal_type: mealType(rec.category, rec.keywords, rec.name),
          nutrition: rec.nutrition,
          source_url: url,
          source_attribution: src.name,
          import_batch: BATCH,
        },
      };

      if (!DRY) {
        const { error } = await sb.from('posts').insert(row);
        if (error) { console.log(`  ERR ${src.name}: ${error.message}`); await sleep(300); continue; }
      }
      haveSlugs.add(slug); haveUrls.add(url);
      imported++;
      if (samples.length < 3) samples.push(`${rec.name} [${row.recipe_data.meal_type}/${row.recipe_data.difficulty}/${row.recipe_data.cuisine}]`);
      await sleep(350);
    }
    totalImported += imported;
    summary.push(`  ${src.name.padEnd(24)} ${String(imported).padStart(3)}/${src.target}  (dup ${skipDup}, noRecipe ${skipNoRecipe}, flagged ${flagged})`);
    console.log(`✔ ${src.name}: ${imported}/${src.target}${samples.length ? '  e.g. ' + samples[0] : ''}`);
  }

  console.log(`\n──── ${DRY ? 'DRY RUN' : 'IMPORT'} SUMMARY ────`);
  summary.forEach((s) => console.log(s));
  console.log(`\n${DRY ? 'WOULD IMPORT' : 'IMPORTED'}: ${totalImported} recipes | flagged & skipped: ${totalFlagged}`);
  if (DRY) console.log('\nRun without --dry to insert.');
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
main().catch((e) => { console.error(e); process.exit(1); });
