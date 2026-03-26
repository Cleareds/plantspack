import { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase-admin'
import { Suspense } from 'react'
import RecipeFilters from '@/components/recipes/RecipeFilters'

export const metadata: Metadata = {
  title: 'Vegan Recipes — Easy, Delicious Plant-Based Cooking | PlantsPack',
  description: 'Browse 170+ vegan recipes with step-by-step instructions, nutrition info, and beautiful photos. Filter by meal type, difficulty, and dietary tags.',
  alternates: { canonical: 'https://plantspack.com/recipes' },
  openGraph: {
    title: 'Vegan Recipes | PlantsPack',
    description: 'Easy, delicious vegan recipes for breakfast, lunch, dinner, and desserts. Community-curated with nutrition data.',
    type: 'website',
    siteName: 'PlantsPack',
  },
}

async function getRecipes() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('posts')
    .select(`
      id, title, slug, content, images, image_url, secondary_tags, created_at,
      recipe_data,
      users!inner(id, username, first_name, last_name, avatar_url)
    `)
    .eq('category', 'recipe')
    .eq('privacy', 'public')
    .is('deleted_at', null)
    .not('recipe_data', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200)

  return data || []
}

// Collect all unique tags and meal types for SEO links
function getFilterOptions(recipes: any[]) {
  const mealTypes = new Set<string>()
  const tags = new Set<string>()

  for (const r of recipes) {
    const rd = r.recipe_data as any
    if (rd?.meal_type) mealTypes.add(rd.meal_type)
    for (const t of (r.secondary_tags || [])) tags.add(t)
  }

  return {
    mealTypes: [...mealTypes].sort(),
    tags: [...tags].sort(),
  }
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast & Brunch',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks & Appetizers',
  desserts: 'Desserts & Sweets',
  drinks: 'Drinks & Smoothies',
}

export default async function RecipesPage() {
  const recipes = await getRecipes()
  const { mealTypes, tags } = getFilterOptions(recipes)

  // JSON-LD for the recipe collection
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Vegan Recipes',
    description: `${recipes.length} vegan recipes — breakfast, lunch, dinner, desserts, and more.`,
    numberOfItems: recipes.length,
  }

  return (
    <div className="min-h-screen bg-surface-container-low">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-headline font-bold text-on-surface mb-2 tracking-tight">
            Vegan Recipes
          </h1>
          <p className="text-on-surface-variant">
            {recipes.length} delicious plant-based recipes with step-by-step instructions
          </p>
        </div>

        {/* Hidden SEO links for Google crawling (not visible to users) */}
        <nav className="sr-only" aria-label="Recipe categories">
          {mealTypes.map(mt => (
            <Link key={mt} href={`/recipes?mealType=${mt}`}>{MEAL_LABELS[mt] || mt} recipes</Link>
          ))}
          {tags.slice(0, 15).map(tag => (
            <Link key={tag} href={`/recipes?tag=${encodeURIComponent(tag)}`}>{tag} vegan recipes</Link>
          ))}
        </nav>

        {/* Client-side filter + grid (Suspense needed for useSearchParams) */}
        <Suspense fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.slice(0, 6).map(r => <div key={r.id} className="h-64 bg-surface-container-lowest rounded-2xl animate-pulse" />)}
          </div>
        }>
          <RecipeFilters initialRecipes={recipes} />
        </Suspense>
      </div>
    </div>
  )
}
