/**
 * Recipe Import Script (DRY RUN by default)
 *
 * Imports vegan-recipes.json into posts table with category='recipe'.
 * Each recipe becomes a post owned by @admin.
 *
 * Usage:
 *   npx tsx scripts/import-recipes-to-supabase.ts           # dry run
 *   npx tsx scripts/import-recipes-to-supabase.ts --execute  # real import
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const INPUT = 'scripts/vegan-recipes.json'
const EXECUTE = process.argv.includes('--execute')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function toSlug(name: string): string {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

interface Recipe {
  name: string
  description: string
  ingredients: string[]
  instructions: string
  prep_time_min: number
  cook_time_min: number
  total_time_min: number
  servings: number
  difficulty: 'easy' | 'medium' | 'hard'
  image_url: string | null
  cuisine: string
  categories: string[]
  nutrition: {
    calories: string
    protein: string
    fat: string
    carbs: string
    fiber: string
  }
  keywords: string[]
  source_attribution: string
}

function mapRecipeToPost(recipe: Recipe, userId: string) {
  // Build post content: description + instructions
  const content = `${recipe.description}\n\n${recipe.instructions}`

  // Build slug
  const slug = toSlug(recipe.name)

  // Recipe data (matches RecipeData interface)
  const recipe_data = {
    ingredients: recipe.ingredients,
    prep_time_min: recipe.prep_time_min,
    cook_time_min: recipe.cook_time_min,
    servings: recipe.servings,
    difficulty: recipe.difficulty,
    // Extra data beyond current schema — stored for future use
    nutrition: recipe.nutrition,
    cuisine: recipe.cuisine,
    total_time_min: recipe.total_time_min,
    source_attribution: recipe.source_attribution,
  }

  return {
    user_id: userId,
    content,
    title: recipe.name,
    slug,
    category: 'recipe' as const,
    recipe_data,
    images: recipe.image_url ? [recipe.image_url] : [],
    privacy: 'public' as const,
    secondary_tags: recipe.keywords.slice(0, 3),
  }
}

async function main() {
  console.log('🌿 Recipe Import Script')
  console.log('========================')
  console.log(`Mode: ${EXECUTE ? '🔴 EXECUTE' : '🟡 DRY RUN'}`)
  console.log(`Input: ${INPUT}\n`)

  const data = JSON.parse(fs.readFileSync(INPUT, 'utf-8'))
  const recipes: Recipe[] = data.recipes
  console.log(`Loaded ${recipes.length} recipes`)
  console.log(`Distribution: ${JSON.stringify(data.metadata.distribution)}`)

  // Get admin user
  const { data: admin } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'admin')
    .limit(1)
    .single()

  if (!admin) {
    console.error('❌ No admin user found')
    process.exit(1)
  }
  console.log(`Admin user: ${admin.id}`)

  // Map all recipes
  const posts = recipes.map(r => mapRecipeToPost(r, admin.id))

  // Show samples
  console.log('\n═══ SAMPLE MAPPED POSTS ═══')
  for (const diff of ['easy', 'medium', 'hard'] as const) {
    const sample = posts.find(p => (p.recipe_data as any).difficulty === diff)
    if (sample) {
      console.log(`\n  ${diff.toUpperCase()}: ${sample.title}`)
      console.log(`    Slug: ${sample.slug}`)
      console.log(`    Ingredients: ${(sample.recipe_data as any).ingredients.length}`)
      console.log(`    Content length: ${sample.content.length} chars`)
      console.log(`    Tags: ${sample.secondary_tags.join(', ')}`)
    }
  }

  // Analysis
  console.log('\n═══ SCHEMA ANALYSIS ═══')
  console.log('Fields that map directly to current schema:')
  console.log('  ✅ title → post.title')
  console.log('  ✅ content → post.content (description + instructions)')
  console.log('  ✅ slug → post.slug')
  console.log('  ✅ category → "recipe"')
  console.log('  ✅ ingredients → recipe_data.ingredients')
  console.log('  ✅ prep_time_min → recipe_data.prep_time_min')
  console.log('  ✅ cook_time_min → recipe_data.cook_time_min')
  console.log('  ✅ servings → recipe_data.servings')
  console.log('  ✅ difficulty → recipe_data.difficulty')
  console.log('  ✅ keywords → post.secondary_tags (first 3)')
  console.log('  ✅ images → post.images')

  console.log('\nExtra data stored in recipe_data JSONB (for future features):')
  console.log('  📦 nutrition (calories, protein, fat, carbs, fiber)')
  console.log('  📦 cuisine (e.g., "Italian", "Thai")')
  console.log('  📦 total_time_min')
  console.log('  📦 source_attribution')

  console.log('\nRecommended schema additions for full recipe support:')
  console.log('  → Add nutrition display to RecipeCard component')
  console.log('  → Add cuisine filter to /recipes page')
  console.log('  → Add total_time_min to RecipeData interface')
  console.log('  → Add source_attribution display for transparency')

  if (!EXECUTE) {
    console.log('\n⏭️  DRY RUN — no data written')
    console.log('   Run with --execute to import')
    return
  }

  // Execute import
  console.log(`\n═══ IMPORTING ${posts.length} RECIPES ═══`)
  const BATCH = 20
  let inserted = 0
  let errors = 0

  for (let i = 0; i < posts.length; i += BATCH) {
    const batch = posts.slice(i, i + BATCH)
    const { data: result, error } = await supabase
      .from('posts')
      .insert(batch)
      .select('id')

    if (error) {
      console.error(`  ❌ Batch ${Math.floor(i / BATCH) + 1}: ${error.message}`)
      errors += batch.length
    } else {
      inserted += result?.length || 0
    }
    process.stdout.write(`\r  ${Math.min(i + BATCH, posts.length)}/${posts.length}`)
  }

  console.log(`\n\n✅ Imported ${inserted} recipes, ${errors} errors`)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
