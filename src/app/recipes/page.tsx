import { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase-admin'
import { Suspense } from 'react'
import RecipeFilters from '@/components/recipes/RecipeFilters'

// Always fresh: new recipes added through the post composer must appear in
// the directory immediately, not after the next ISR window. The page is not
// a hot route (~30 visits/day) so the extra invocations are negligible.
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Vegan Recipes — Plant-Based Cooking Made Easy | PlantsPack',
  description: 'Browse 580+ vegan recipes from verified 100% vegan creators. Step-by-step instructions, nutrition data, prep times, and photos. Filter by meal, cuisine, and difficulty.',
  alternates: { canonical: 'https://www.plantspack.com/recipes' },
  openGraph: {
    title: 'Vegan Recipes — Plant-Based Cooking Made Easy | PlantsPack',
    description: 'Browse 580+ vegan recipes from verified 100% vegan creators. Step-by-step, nutrition data, and photos — filter by meal, cuisine, and difficulty.',
    type: 'website',
    siteName: 'PlantsPack',
  },
}

const PAGE_SIZE = 50

// Username that always appears at the top of the recipes list. Pinned ahead
// of community/imported recipes for editorial reasons. Pin is by username
// (not user_id) so it survives any future ID rotation; the user must exist
// in public.users with this exact username for the pin to take effect.
const PINNED_USERNAME = 'sonna_moka'

const RECIPE_SELECT = `
  id, title, slug, content, images, image_url, secondary_tags, created_at,
  recipe_data,
  users!inner(id, username, first_name, last_name, avatar_url)
`

async function getRecipes() {
  const supabase = createAdminClient()

  // Pinned author first — fetch all their recent recipes (capped at PAGE_SIZE
  // as a sanity bound). When the pinned author has zero recipes this query
  // returns []` and the list falls through to the everyone-else query
  // unchanged. Two-query approach keeps pagination predictable; ordering
  // inside a single SQL query against an embedded relation is awkward in
  // PostgREST.
  const { data: pinned } = await supabase
    .from('posts')
    .select(RECIPE_SELECT)
    .eq('category', 'recipe')
    .eq('privacy', 'public')
    .is('deleted_at', null)
    .not('recipe_data', 'is', null)
    .eq('users.username', PINNED_USERNAME)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  const pinnedRows = pinned ?? []
  const pinnedIds = pinnedRows.map((r) => r.id)
  const remaining = PAGE_SIZE + 1 - pinnedRows.length

  let restRows: typeof pinnedRows = []
  if (remaining > 0) {
    let restQuery = supabase
      .from('posts')
      .select(RECIPE_SELECT)
      .eq('category', 'recipe')
      .eq('privacy', 'public')
      .is('deleted_at', null)
      .not('recipe_data', 'is', null)
      .order('created_at', { ascending: false })
      .limit(remaining)
    if (pinnedIds.length > 0) {
      restQuery = restQuery.not('id', 'in', `(${pinnedIds.map((id) => `"${id}"`).join(',')})`)
    }
    const { data } = await restQuery
    restRows = data ?? []
  }

  const combined = [...pinnedRows, ...restRows]
  const hasMore = combined.length > PAGE_SIZE

  return {
    recipes: hasMore ? combined.slice(0, PAGE_SIZE) : combined,
    hasMore,
  }
}

// Separate query to get total count for the header (cheap exact count)
async function getRecipeCount() {
  const supabase = createAdminClient()
  const { count } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('category', 'recipe')
    .eq('privacy', 'public')
    .is('deleted_at', null)
    .not('recipe_data', 'is', null)

  return count || 0
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
  const [{ recipes, hasMore }, totalCount] = await Promise.all([
    getRecipes(),
    getRecipeCount(),
  ])
  const { mealTypes, tags } = getFilterOptions(recipes)

  // JSON-LD for the recipe collection
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Vegan Recipes',
    description: `${totalCount} vegan recipes — breakfast, lunch, dinner, desserts, and more.`,
    numberOfItems: totalCount,
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
            {totalCount} delicious plant-based recipes with step-by-step instructions
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
          <RecipeFilters initialRecipes={recipes} initialHasMore={hasMore} pageSize={PAGE_SIZE} totalCount={totalCount} />
        </Suspense>
      </div>
    </div>
  )
}
