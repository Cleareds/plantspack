import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { Clock, ChefHat, Users, BarChart3 } from 'lucide-react'
import ImageSlider from '@/components/ui/ImageSlider'
import InlineComments from '@/components/posts/InlineComments'

type RecipePost = {
  id: string
  title?: string | null
  slug?: string | null
  content: string
  category: string
  images?: string[] | null
  image_url?: string | null
  recipe_data?: {
    ingredients?: string[]
    prep_time_min?: number
    cook_time_min?: number
    total_time_min?: number
    servings?: number
    difficulty?: 'easy' | 'medium' | 'hard'
    cuisine?: string
    nutrition?: { calories?: string; protein?: string; fat?: string; carbs?: string; fiber?: string }
    source_url?: string
    source_attribution?: string
  } | null
  secondary_tags?: string[] | null
  created_at: string
  users: {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  }
}

function SimilarRecipes({ postId }: { postId: string }) {
  // Client-side fetch for similar recipes
  return (
    <div className="mt-6 bg-surface-container-lowest rounded-2xl editorial-shadow p-6">
      <h2 className="text-lg font-semibold text-on-surface mb-4">More Recipes</h2>
      <SimilarRecipesClient postId={postId} />
    </div>
  )
}

async function SimilarRecipesClient({ postId }: { postId: string }) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://plantspack.com'
    const resp = await fetch(`${baseUrl}/api/recipes?limit=6&offset=0`, { next: { revalidate: 3600 } })
    if (!resp.ok) return <p className="text-sm text-on-surface-variant">No recipes found</p>
    const data = await resp.json()
    const similar = (data.recipes || []).filter((r: any) => r.id !== postId).slice(0, 3)
    if (similar.length === 0) return <p className="text-sm text-on-surface-variant">No recipes found</p>

    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {similar.map((r: any) => {
          const img = r.images?.[0] || r.image_url
          const title = r.title || r.content?.split('\n')[0]?.slice(0, 60)
          const rd = r.recipe_data
          const time = (rd?.prep_time_min || 0) + (rd?.cook_time_min || 0)
          return (
            <Link key={r.id} href={`/recipe/${r.slug || r.id}`} className="group block rounded-xl overflow-hidden ghost-border hover:border-primary/20 transition-all">
              <div className="aspect-[4/3] bg-surface-container-high overflow-hidden">
                {img ? <img src={img} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" /> : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-3xl text-outline">restaurant_menu</span></div>}
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium text-on-surface line-clamp-2 group-hover:text-primary transition-colors">{title}</h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-on-surface-variant">
                  {time > 0 && <span>{time}min</span>}
                  {rd?.difficulty && <span className="capitalize">{rd.difficulty}</span>}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    )
  } catch { return <p className="text-sm text-on-surface-variant">Could not load recipes</p> }
}

async function getRecipePost(id: string): Promise<RecipePost | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://plantspack.com'
    // The API handles both UUIDs and slugs
    const response = await fetch(`${baseUrl}/api/posts/${id}`, {
      next: { revalidate: 60 },
    })
    if (!response.ok) return null
    const data = await response.json()
    if (data.post?.category !== 'recipe') return null
    return data.post
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const post = await getRecipePost(id)
  if (!post) return { title: 'Recipe Not Found - PlantsPack' }

  const title = post.title || post.content.split('\n')[0].substring(0, 80)
  const recipe = post.recipe_data
  const description = recipe
    ? `${(recipe.prep_time_min || 0) + (recipe.cook_time_min || 0)}min · ${recipe.servings || '?'} servings · ${recipe.difficulty || 'unknown'}`
    : post.content.substring(0, 160)

  const image = post.images?.[0] || post.image_url
  return {
    title: `${title} - Recipe | PlantsPack`,
    description,
    alternates: { canonical: `https://plantspack.com/recipe/${post.slug || id}` },
    openGraph: { title, description, type: 'article', siteName: 'PlantsPack', ...(image ? { images: [image] } : {}) },
  }
}

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await getRecipePost(id)
  if (!post) notFound()

  const images = post.images?.length ? post.images : post.image_url ? [post.image_url] : []
  const recipe = post.recipe_data
  const recipeTitle = post.title || post.content.split('\n')[0].substring(0, 80)
  const displayName = post.users.first_name
    ? `${post.users.first_name} ${post.users.last_name || ''}`.trim()
    : post.users.username

  const difficultyColors: Record<string, string> = {
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    hard: 'bg-red-100 text-red-800',
  }

  return (
    <div className="min-h-screen bg-surface-container-low">
      {/* Recipe JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Recipe',
        name: recipeTitle,
        ...(images[0] ? { image: images[0] } : {}),
        author: { '@type': 'Person', name: displayName },
        datePublished: post.created_at,
        description: post.content.substring(0, 300),
        ...(recipe?.prep_time_min ? { prepTime: `PT${recipe.prep_time_min}M` } : {}),
        ...(recipe?.cook_time_min ? { cookTime: `PT${recipe.cook_time_min}M` } : {}),
        ...(recipe?.servings ? { recipeYield: `${recipe.servings} servings` } : {}),
        ...(recipe?.ingredients?.length ? { recipeIngredient: recipe.ingredients } : {}),
        recipeCategory: 'Vegan',
        recipeCuisine: 'Vegan',
      }) }} />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span className="text-outline">/</span>
          <Link href="/recipes" className="hover:text-primary transition-colors">Recipes</Link>
          <span className="text-outline">/</span>
          <span className="text-on-surface font-medium truncate max-w-[200px]">{post.title || post.content.split('\n')[0].substring(0, 40)}</span>
        </nav>

        <div className="bg-surface-container-lowest rounded-2xl editorial-shadow overflow-hidden">
          {images.length > 0 && (
            <div className="w-full">
              <ImageSlider images={images} aspectRatio="wide" />
            </div>
          )}

          <div className="p-6">
            <h1 className="text-2xl font-bold text-on-surface mb-4">
              {post.title || post.content.split('\n')[0]}
            </h1>

            {recipe && (
              <div className="flex flex-wrap items-center gap-4 mb-6 p-3 bg-primary-container/10 rounded-xl">
                {recipe.prep_time_min != null && recipe.prep_time_min > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-on-surface-variant">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>Prep {recipe.prep_time_min}m</span>
                  </div>
                )}
                {recipe.cook_time_min != null && recipe.cook_time_min > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-on-surface-variant">
                    <ChefHat className="h-4 w-4 text-primary" />
                    <span>Cook {recipe.cook_time_min}m</span>
                  </div>
                )}
                {recipe.servings != null && recipe.servings > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-on-surface-variant">
                    <Users className="h-4 w-4 text-primary" />
                    <span>{recipe.servings} servings</span>
                  </div>
                )}
                {recipe.difficulty && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${difficultyColors[recipe.difficulty] || ''}`}>
                      {recipe.difficulty}
                    </span>
                  </div>
                )}
              </div>
            )}

            {recipe?.ingredients && recipe.ingredients.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-on-surface mb-3">Ingredients</h2>
                <ul className="space-y-1.5">
                  {recipe.ingredients.map((ing: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-on-surface-variant">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      {ing}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {post.content.split('\n').length > 1 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-on-surface mb-3">Instructions</h2>
                <div className="text-on-surface-variant whitespace-pre-wrap leading-relaxed">
                  {post.content.split('\n').slice(1).join('\n').trim()}
                </div>
              </div>
            )}

            {/* Tags */}
            {post.secondary_tags && post.secondary_tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {post.secondary_tags.map((tag: string) => (
                  <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-surface-container-low text-on-surface-variant">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Nutrition */}
            {recipe?.nutrition && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-on-surface mb-3">Nutrition (per serving)</h2>
                <div className="grid grid-cols-5 gap-2 text-center">
                  {recipe.nutrition.calories && <div className="p-2 bg-surface-container-low rounded-lg"><div className="text-sm font-semibold text-on-surface">{recipe.nutrition.calories.replace(' kcal','')}</div><div className="text-[10px] text-on-surface-variant">kcal</div></div>}
                  {recipe.nutrition.protein && <div className="p-2 bg-surface-container-low rounded-lg"><div className="text-sm font-semibold text-on-surface">{recipe.nutrition.protein.replace(' g','')}</div><div className="text-[10px] text-on-surface-variant">protein</div></div>}
                  {recipe.nutrition.carbs && <div className="p-2 bg-surface-container-low rounded-lg"><div className="text-sm font-semibold text-on-surface">{recipe.nutrition.carbs.replace(' g','')}</div><div className="text-[10px] text-on-surface-variant">carbs</div></div>}
                  {recipe.nutrition.fat && <div className="p-2 bg-surface-container-low rounded-lg"><div className="text-sm font-semibold text-on-surface">{recipe.nutrition.fat.replace(' g','')}</div><div className="text-[10px] text-on-surface-variant">fat</div></div>}
                  {recipe.nutrition.fiber && <div className="p-2 bg-surface-container-low rounded-lg"><div className="text-sm font-semibold text-on-surface">{recipe.nutrition.fiber.replace(' g','')}</div><div className="text-[10px] text-on-surface-variant">fiber</div></div>}
                </div>
              </div>
            )}

            {/* Source attribution */}
            {recipe?.source_url && (
              <div className="mb-4 p-3 bg-surface-container-low rounded-lg">
                <p className="text-xs text-on-surface-variant">
                  Recipe from{' '}
                  <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {recipe.source_attribution || new URL(recipe.source_url).hostname}
                  </a>
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-outline-variant/15">
              <Link href={`/user/${post.users.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                {post.users.avatar_url ? (
                  <img src={post.users.avatar_url} alt={displayName} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-on-primary font-medium text-sm">{displayName[0].toUpperCase()}</span>
                  </div>
                )}
                <div>
                  <div className="font-medium text-sm text-on-surface">{displayName}</div>
                  <div className="text-xs text-on-surface-variant">@{post.users.username}</div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Similar Recipes */}
        <SimilarRecipes postId={post.id} />

        <div className="mt-6 bg-surface-container-lowest rounded-2xl editorial-shadow p-6">
          <h2 className="text-lg font-semibold text-on-surface mb-4">Comments</h2>
          <InlineComments postId={post.id} />
        </div>
      </div>
    </div>
  )
}
