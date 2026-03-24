/**
 * Vegan Recipe Scraper & Analyzer
 *
 * Scrapes top vegan recipes from public recipe sites, extracts structured data,
 * downloads images, and outputs import-ready JSON.
 *
 * Target: 100 recipes (60 easy, 30 medium, 10 hard)
 *
 * Sources: Public recipe sites with JSON-LD Recipe schema
 * Method: Google search → recipe page → extract JSON-LD/microdata
 *
 * Usage: node scripts/scrape-vegan-recipes.js
 */

const fs = require('fs');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const OUTPUT = 'scripts/vegan-recipes.json';

// ─── Recipe search queries targeting different difficulties ──────────────

const SEARCH_QUERIES = {
  easy: [
    'easy vegan recipes 15 minutes',
    'simple vegan dinner recipes beginners',
    'quick vegan lunch ideas',
    'easy vegan breakfast recipes',
    'simple vegan pasta recipes',
    'easy vegan salad recipes',
    'vegan smoothie bowl recipes',
    'easy vegan sandwich wraps',
    'simple vegan soup recipes',
    'quick vegan snack recipes',
    'easy vegan one pot meals',
    'vegan avocado toast recipes',
    'easy vegan stir fry',
    'simple vegan curry quick',
    'easy vegan dessert no bake',
  ],
  medium: [
    'vegan curry recipes from scratch',
    'vegan burger recipes homemade',
    'vegan lasagna recipe',
    'vegan pad thai recipe',
    'vegan ramen recipe',
    'vegan enchiladas recipe',
    'vegan risotto recipe',
    'vegan pizza dough recipe',
    'vegan sushi rolls recipe',
    'vegan shepherd pie recipe',
  ],
  hard: [
    'vegan croissant recipe from scratch',
    'vegan cheese aged recipe',
    'vegan Wellington recipe',
    'vegan tiramisu recipe',
    'vegan macarons recipe',
  ],
};

// ─── Extract recipes from HTML using JSON-LD ─────────────────────────────

function extractRecipeFromHtml(html, url) {
  if (!html) return null;

  // Try JSON-LD first (most reliable)
  const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatches) {
    for (const match of jsonLdMatches) {
      try {
        const jsonStr = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '').trim();
        const data = JSON.parse(jsonStr);

        // Handle @graph arrays
        const items = data['@graph'] || (Array.isArray(data) ? data : [data]);
        for (const item of items) {
          if (item['@type'] === 'Recipe' || (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))) {
            return parseJsonLdRecipe(item, url);
          }
        }
      } catch {
        // Continue to next match
      }
    }
  }

  // Fallback: extract from meta tags and visible content
  return extractFromMeta(html, url);
}

function parseJsonLdRecipe(recipe, url) {
  const name = recipe.name || '';
  if (!name) return null;

  // Parse ingredients
  let ingredients = [];
  if (Array.isArray(recipe.recipeIngredient)) {
    ingredients = recipe.recipeIngredient.map(i => cleanText(i)).filter(Boolean);
  }

  // Parse times
  const prepTime = parseDuration(recipe.prepTime);
  const cookTime = parseDuration(recipe.cookTime);
  const totalTime = parseDuration(recipe.totalTime) || (prepTime + cookTime);

  // Parse servings
  let servings = 4;
  if (recipe.recipeYield) {
    const yieldStr = Array.isArray(recipe.recipeYield) ? recipe.recipeYield[0] : recipe.recipeYield;
    const num = parseInt(String(yieldStr).replace(/[^\d]/g, ''));
    if (num > 0 && num < 100) servings = num;
  }

  // Parse instructions
  let instructions = '';
  if (typeof recipe.recipeInstructions === 'string') {
    instructions = cleanText(recipe.recipeInstructions);
  } else if (Array.isArray(recipe.recipeInstructions)) {
    instructions = recipe.recipeInstructions
      .map((step, i) => {
        if (typeof step === 'string') return `${i + 1}. ${cleanText(step)}`;
        if (step.text) return `${i + 1}. ${cleanText(step.text)}`;
        if (step['@type'] === 'HowToSection') {
          const sectionSteps = (step.itemListElement || [])
            .map((s, j) => `${j + 1}. ${cleanText(s.text || '')}`)
            .join('\n');
          return `**${step.name || 'Steps'}**\n${sectionSteps}`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  // Parse image
  let image = null;
  if (recipe.image) {
    if (typeof recipe.image === 'string') image = recipe.image;
    else if (Array.isArray(recipe.image)) image = recipe.image[0];
    else if (recipe.image.url) image = recipe.image.url;
  }

  // Parse categories/cuisine
  const cuisine = recipe.recipeCuisine
    ? (Array.isArray(recipe.recipeCuisine) ? recipe.recipeCuisine : [recipe.recipeCuisine])
    : [];
  const categories = recipe.recipeCategory
    ? (Array.isArray(recipe.recipeCategory) ? recipe.recipeCategory : [recipe.recipeCategory])
    : [];

  // Parse nutrition
  let nutrition = null;
  if (recipe.nutrition) {
    nutrition = {
      calories: recipe.nutrition.calories?.replace(/[^\d]/g, '') || null,
      protein: recipe.nutrition.proteinContent?.replace(/[^\d.]/g, '') || null,
      fat: recipe.nutrition.fatContent?.replace(/[^\d.]/g, '') || null,
      carbs: recipe.nutrition.carbohydrateContent?.replace(/[^\d.]/g, '') || null,
      fiber: recipe.nutrition.fiberContent?.replace(/[^\d.]/g, '') || null,
    };
  }

  // Determine difficulty
  const difficulty = classifyDifficulty(totalTime, ingredients.length, instructions);

  // Description from recipe
  const description = cleanText(recipe.description || '').slice(0, 500);

  // Author
  const author = typeof recipe.author === 'string'
    ? recipe.author
    : recipe.author?.name || '';

  // Rating
  const rating = recipe.aggregateRating?.ratingValue
    ? parseFloat(recipe.aggregateRating.ratingValue)
    : null;
  const ratingCount = recipe.aggregateRating?.ratingCount
    ? parseInt(recipe.aggregateRating.ratingCount)
    : null;

  // Keywords
  const keywords = recipe.keywords
    ? (typeof recipe.keywords === 'string' ? recipe.keywords.split(',').map(k => k.trim()) : recipe.keywords)
    : [];

  return {
    name: cleanText(name),
    description,
    ingredients,
    instructions,
    prep_time_min: prepTime || null,
    cook_time_min: cookTime || null,
    total_time_min: totalTime || null,
    servings,
    difficulty,
    image,
    cuisine,
    categories,
    nutrition,
    author,
    source_url: url,
    rating,
    rating_count: ratingCount,
    keywords: keywords.filter(Boolean).slice(0, 10),
  };
}

function extractFromMeta(html, url) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '';
  const desc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i)?.[1]?.trim() || '';
  const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1] || null;

  if (!title || title.length < 10) return null;

  return {
    name: cleanText(title.replace(/ \|.*$/, '').replace(/ -.*$/, '')),
    description: cleanText(desc).slice(0, 500),
    ingredients: [],
    instructions: '',
    prep_time_min: null,
    cook_time_min: null,
    total_time_min: null,
    servings: 4,
    difficulty: 'easy',
    image: ogImage,
    cuisine: [],
    categories: [],
    nutrition: null,
    author: '',
    source_url: url,
    rating: null,
    rating_count: null,
    keywords: [],
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function parseDuration(iso) {
  if (!iso) return 0;
  const match = String(iso).match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) {
    const mins = parseInt(String(iso).replace(/[^\d]/g, ''));
    return mins > 0 && mins < 1000 ? mins : 0;
  }
  return (parseInt(match[1] || '0') * 60) + parseInt(match[2] || '0');
}

function classifyDifficulty(totalTime, ingredientCount, instructions) {
  const stepCount = (instructions.match(/^\d+\./gm) || []).length;
  if (totalTime <= 20 && ingredientCount <= 8) return 'easy';
  if (totalTime <= 30 && ingredientCount <= 10 && stepCount <= 6) return 'easy';
  if (totalTime >= 90 || ingredientCount >= 20 || stepCount >= 12) return 'hard';
  return 'medium';
}

function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchPage(url, timeout = 12000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const resp = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en' },
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const ct = resp.headers.get('content-type') || '';
    if (!ct.includes('text/html')) return null;

    const reader = resp.body.getReader();
    const chunks = [];
    let size = 0;
    while (size < 200 * 1024) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
    }
    reader.cancel();
    return Buffer.concat(chunks).toString('utf-8');
  } catch {
    return null;
  }
}

async function searchGoogle(query, num = 10) {
  // Use Google's public search to get recipe URLs
  const url = `https://www.google.com/search?q=${encodeURIComponent(query + ' recipe site:minimalistbaker.com OR site:rainbowplantlife.com OR site:pickuplimes.com OR site:biancazapatka.com OR site:veganricha.com OR site:noracooks.com OR site:elavegan.com OR site:simplyveganized.com OR site:thissavoryvegan.com OR site:makeitmindful.com')}&num=${num}`;

  const html = await fetchPage(url);
  if (!html) return [];

  const urls = [];
  const linkMatches = html.matchAll(/href="\/url\?q=([^&"]+)/g);
  for (const match of linkMatches) {
    try {
      const decoded = decodeURIComponent(match[1]);
      if (decoded.includes('http') && !decoded.includes('google.') && !decoded.includes('youtube.')) {
        urls.push(decoded);
      }
    } catch {}
  }
  return [...new Set(urls)].slice(0, num);
}

// ─── Curated recipe list (reliable, known vegan recipe sites) ────────────

const CURATED_RECIPES = {
  easy: [
    'https://minimalistbaker.com/easy-vegan-fried-rice/',
    'https://minimalistbaker.com/creamy-vegan-garlic-pasta/',
    'https://minimalistbaker.com/the-best-vegan-banana-pancakes/',
    'https://minimalistbaker.com/5-minute-microwave-peanut-butter-cookie/',
    'https://minimalistbaker.com/simple-vegan-pesto/',
    'https://minimalistbaker.com/easy-overnight-oats/',
    'https://minimalistbaker.com/best-vegan-grilled-cheese/',
    'https://minimalistbaker.com/best-damn-vegan-caesar-salad/',
    'https://rainbowplantlife.com/vegan-broccoli-salad/',
    'https://rainbowplantlife.com/15-minute-sesame-noodles/',
    'https://rainbowplantlife.com/the-best-vegan-chili/',
    'https://www.noracooks.com/vegan-banana-bread/',
    'https://www.noracooks.com/vegan-chocolate-chip-cookies/',
    'https://www.noracooks.com/vegan-pancakes/',
    'https://www.noracooks.com/the-best-vegan-mac-and-cheese/',
    'https://elavegan.com/creamy-vegan-tomato-soup/',
    'https://elavegan.com/easy-vegan-hummus/',
    'https://elavegan.com/vegan-guacamole-recipe/',
    'https://biancazapatka.com/en/vegan-pesto-pasta/',
    'https://biancazapatka.com/en/vegan-banana-bread/',
    'https://www.pickuplimes.com/recipe/peanut-butter-banana-oatmeal-106',
    'https://veganricha.com/vegan-quesadillas/',
    'https://veganricha.com/easy-vegan-tacos/',
    'https://minimalistbaker.com/easy-vegan-stir-fry/',
    'https://minimalistbaker.com/5-ingredient-peanut-butter-energy-bites/',
    'https://rainbowplantlife.com/vegan-avocado-pasta/',
    'https://www.noracooks.com/vegan-french-toast/',
    'https://elavegan.com/vegan-chia-pudding/',
    'https://minimalistbaker.com/perfect-baked-sweet-potato/',
    'https://minimalistbaker.com/vegan-greek-salad/',
    'https://rainbowplantlife.com/quick-chickpea-curry/',
    'https://www.noracooks.com/vegan-mug-cake/',
    'https://elavegan.com/vegan-smoothie-bowl/',
    'https://minimalistbaker.com/easy-vegan-breakfast-burritos/',
    'https://minimalistbaker.com/blueberry-muffin-smoothie/',
    'https://rainbowplantlife.com/vegan-lentil-soup/',
    'https://www.noracooks.com/easy-vegan-chocolate-mousse/',
    'https://elavegan.com/vegan-avocado-toast/',
    'https://biancazapatka.com/en/vegan-pancakes/',
    'https://veganricha.com/vegan-garlic-bread/',
    'https://minimalistbaker.com/10-minute-coconut-curry/',
    'https://minimalistbaker.com/easy-vegan-miso-soup/',
    'https://rainbowplantlife.com/vegan-black-bean-soup/',
    'https://www.noracooks.com/vegan-oatmeal-cookies/',
    'https://elavegan.com/vegan-bruschetta/',
    'https://minimalistbaker.com/simple-vegan-peanut-soup/',
    'https://minimalistbaker.com/the-best-vegan-gluten-free-brownies/',
    'https://rainbowplantlife.com/vegan-minestrone-soup/',
    'https://www.noracooks.com/vegan-waffles/',
    'https://minimalistbaker.com/vegan-chocolate-truffles/',
    'https://elavegan.com/vegan-spring-rolls/',
    'https://minimalistbaker.com/easy-tofu-scramble/',
    'https://rainbowplantlife.com/creamy-vegan-mushroom-soup/',
    'https://www.noracooks.com/vegan-peanut-butter-cups/',
    'https://biancazapatka.com/en/vegan-overnight-oats/',
    'https://veganricha.com/instant-pot-dal/',
    'https://minimalistbaker.com/vegan-gluten-free-granola/',
    'https://elavegan.com/vegan-energy-balls/',
    'https://minimalistbaker.com/best-vegan-white-bean-soup/',
    'https://rainbowplantlife.com/easy-vegan-pho/',
  ],
  medium: [
    'https://rainbowplantlife.com/vegan-red-lentil-curry/',
    'https://rainbowplantlife.com/vegan-bolognese/',
    'https://minimalistbaker.com/best-vegan-lasagna/',
    'https://minimalistbaker.com/easy-vegan-pad-thai/',
    'https://biancazapatka.com/en/vegan-lasagna/',
    'https://biancazapatka.com/en/vegan-burger/',
    'https://biancazapatka.com/en/vegan-pizza/',
    'https://veganricha.com/vegan-tikka-masala/',
    'https://veganricha.com/vegan-butter-chicken/',
    'https://rainbowplantlife.com/vegan-mushroom-risotto/',
    'https://minimalistbaker.com/best-vegan-enchiladas/',
    'https://minimalistbaker.com/simple-vegan-ramen/',
    'https://www.noracooks.com/vegan-shepherds-pie/',
    'https://elavegan.com/vegan-sushi-rolls/',
    'https://biancazapatka.com/en/vegan-ramen/',
    'https://rainbowplantlife.com/vegan-mac-and-cheese/',
    'https://veganricha.com/vegan-samosas/',
    'https://minimalistbaker.com/the-best-vegan-banana-bread/',
    'https://elavegan.com/vegan-chocolate-cake/',
    'https://rainbowplantlife.com/vegan-stuffed-peppers/',
    'https://minimalistbaker.com/vegan-pot-pie/',
    'https://biancazapatka.com/en/vegan-dumplings/',
    'https://www.noracooks.com/vegan-chocolate-cake/',
    'https://veganricha.com/vegan-biryani/',
    'https://minimalistbaker.com/vegan-lentil-meatballs/',
    'https://rainbowplantlife.com/vegan-carbonara/',
    'https://elavegan.com/vegan-falafel/',
    'https://minimalistbaker.com/vegan-carrot-cake/',
    'https://biancazapatka.com/en/vegan-carbonara/',
    'https://veganricha.com/vegan-palak-paneer/',
  ],
  hard: [
    'https://minimalistbaker.com/simple-vegan-croissants/',
    'https://rainbowplantlife.com/vegan-wellington/',
    'https://biancazapatka.com/en/vegan-tiramisu/',
    'https://minimalistbaker.com/vegan-cinnamon-rolls/',
    'https://rainbowplantlife.com/vegan-bao-buns/',
    'https://elavegan.com/vegan-brioche/',
    'https://www.noracooks.com/vegan-cheesecake/',
    'https://biancazapatka.com/en/vegan-croissants/',
    'https://minimalistbaker.com/vegan-baklava/',
    'https://veganricha.com/vegan-naan-bread/',
  ],
};

// ─── Main ────────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('🌿 Vegan Recipe Scraper');
  console.log('=======================\n');

  const allRecipes = [];
  const seen = new Set();
  const targets = { easy: 60, medium: 30, hard: 10 };
  const counts = { easy: 0, medium: 0, hard: 0 };

  for (const [difficulty, urls] of Object.entries(CURATED_RECIPES)) {
    console.log(`\n═══ ${difficulty.toUpperCase()} recipes (target: ${targets[difficulty]}) ═══`);

    for (const url of urls) {
      if (counts[difficulty] >= targets[difficulty]) break;
      if (seen.has(url)) continue;
      seen.add(url);

      process.stdout.write(`  Fetching: ${url.slice(0, 70)}... `);

      const html = await fetchPage(url);
      if (!html) { console.log('SKIP (fetch failed)'); await sleep(500); continue; }

      const recipe = extractRecipeFromHtml(html, url);
      if (!recipe || !recipe.name || recipe.ingredients.length === 0) {
        console.log('SKIP (no recipe data)');
        await sleep(500);
        continue;
      }

      // Override difficulty to match our target distribution
      recipe.difficulty = difficulty;

      // Check if it's actually vegan (search for non-vegan ingredients)
      const nonVegan = ['chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp', 'egg', 'milk', 'cream', 'butter', 'cheese', 'honey', 'gelatin'];
      const ingredientStr = recipe.ingredients.join(' ').toLowerCase();
      const hasNonVegan = nonVegan.some(nv => {
        if (nv === 'cream' && ingredientStr.includes('coconut cream')) return false;
        if (nv === 'milk' && (ingredientStr.includes('oat milk') || ingredientStr.includes('almond milk') || ingredientStr.includes('soy milk') || ingredientStr.includes('coconut milk') || ingredientStr.includes('plant milk'))) return false;
        if (nv === 'butter' && (ingredientStr.includes('peanut butter') || ingredientStr.includes('almond butter') || ingredientStr.includes('nut butter') || ingredientStr.includes('vegan butter'))) return false;
        if (nv === 'cheese' && (ingredientStr.includes('vegan cheese') || ingredientStr.includes('nutritional yeast'))) return false;
        return ingredientStr.includes(nv);
      });

      if (hasNonVegan) {
        console.log('SKIP (non-vegan ingredients)');
        await sleep(500);
        continue;
      }

      allRecipes.push(recipe);
      counts[difficulty]++;
      console.log(`OK — ${recipe.name.slice(0, 50)}`);

      await sleep(800); // Rate limit
    }

    console.log(`  ${difficulty}: ${counts[difficulty]}/${targets[difficulty]} collected`);
  }

  // ═══ Analysis ═══
  console.log('\n\n═══ ANALYSIS ═══');
  console.log(`Total recipes: ${allRecipes.length}`);
  console.log(`  Easy: ${counts.easy} (target 60)`);
  console.log(`  Medium: ${counts.medium} (target 30)`);
  console.log(`  Hard: ${counts.hard} (target 10)`);

  const withImage = allRecipes.filter(r => r.image).length;
  const withNutrition = allRecipes.filter(r => r.nutrition).length;
  const withInstructions = allRecipes.filter(r => r.instructions.length > 50).length;
  const withRating = allRecipes.filter(r => r.rating).length;
  const avgIngredients = Math.round(allRecipes.reduce((s, r) => s + r.ingredients.length, 0) / allRecipes.length);
  const avgPrepTime = Math.round(allRecipes.filter(r => r.prep_time_min).reduce((s, r) => s + r.prep_time_min, 0) / allRecipes.filter(r => r.prep_time_min).length);

  console.log(`\nContent completeness:`);
  console.log(`  With image: ${withImage} (${(withImage/allRecipes.length*100).toFixed(0)}%)`);
  console.log(`  With nutrition: ${withNutrition} (${(withNutrition/allRecipes.length*100).toFixed(0)}%)`);
  console.log(`  With instructions: ${withInstructions} (${(withInstructions/allRecipes.length*100).toFixed(0)}%)`);
  console.log(`  With rating: ${withRating} (${(withRating/allRecipes.length*100).toFixed(0)}%)`);
  console.log(`  Avg ingredients: ${avgIngredients}`);
  console.log(`  Avg prep time: ${avgPrepTime} min`);

  // Extra data analysis — fields we have but project doesn't support yet
  console.log(`\n═══ EXTRA DATA (not in current schema) ═══`);
  console.log(`  nutrition (calories/protein/carbs/fat): ${withNutrition} recipes have this`);
  console.log(`  cuisine tags: ${allRecipes.filter(r => r.cuisine.length > 0).length} recipes`);
  console.log(`  category tags: ${allRecipes.filter(r => r.categories.length > 0).length} recipes`);
  console.log(`  source_url: all recipes (for attribution)`);
  console.log(`  author: ${allRecipes.filter(r => r.author).length} recipes`);
  console.log(`  rating + count: ${withRating} recipes`);
  console.log(`  keywords/tags: ${allRecipes.filter(r => r.keywords.length > 0).length} recipes`);
  console.log(`\n  → Recommend adding to RecipeData: nutrition, cuisine, source_url, author`);
  console.log(`  → Recommend adding to Post: rating, tags/keywords`);

  // Source attribution
  const sources = {};
  allRecipes.forEach(r => {
    try { const host = new URL(r.source_url).hostname.replace('www.', ''); sources[host] = (sources[host] || 0) + 1; } catch {}
  });
  console.log(`\nSources:`);
  Object.entries(sources).sort((a, b) => b[1] - a[1]).forEach(([s, n]) => console.log(`  ${s}: ${n}`));

  // Difficulty distribution
  console.log(`\nSample recipes:`);
  for (const diff of ['easy', 'medium', 'hard']) {
    const samples = allRecipes.filter(r => r.difficulty === diff).slice(0, 3);
    console.log(`  ${diff}:`);
    samples.forEach(r => console.log(`    ${r.name} (${r.total_time_min || '?'}min, ${r.ingredients.length} ingredients)`));
  }

  // Write output
  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalRecipes: allRecipes.length,
      distribution: counts,
      sources,
    },
    recipes: allRecipes,
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2));
  const sizeMB = (fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅ Written ${allRecipes.length} recipes to ${OUTPUT} (${sizeMB} MB)`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
