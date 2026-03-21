import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Clock, ChefHat, Users, BarChart3 } from 'lucide-react'
import ImageSlider from '@/components/ui/ImageSlider'
import InlineComments from '@/components/posts/InlineComments'

type RecipePost = {
  id: string
  content: string
  category: string
  images?: string[] | null
  image_url?: string | null
  recipe_data?: {
    ingredients?: string[]
    prep_time_min?: number
    cook_time_min?: number
    servings?: number
    difficulty?: 'easy' | 'medium' | 'hard'
  } | null
  created_at: string
  users: {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  }
}

async function getRecipePost(id: string): Promise<RecipePost | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://plantspack.com'
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

  const title = post.content.split('\n')[0].substring(0, 80)
  const recipe = post.recipe_data
  const description = recipe
    ? `${(recipe.prep_time_min || 0) + (recipe.cook_time_min || 0)}min · ${recipe.servings || '?'} servings · ${recipe.difficulty || 'unknown'}`
    : post.content.substring(0, 160)

  return {
    title: `${title} - Recipe | PlantsPack`,
    description,
    openGraph: { title, description, type: 'article', siteName: 'PlantsPack' },
  }
}

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await getRecipePost(id)
  if (!post) notFound()

  const images = post.images?.length ? post.images : post.image_url ? [post.image_url] : []
  const recipe = post.recipe_data
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
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to feed
        </Link>

        <div className="bg-surface-container-lowest rounded-2xl editorial-shadow overflow-hidden">
          {images.length > 0 && (
            <div className="w-full">
              <ImageSlider images={images} aspectRatio="wide" />
            </div>
          )}

          <div className="p-6">
            <h1 className="text-2xl font-bold text-on-surface mb-4">
              {post.content.split('\n')[0]}
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

        <div className="mt-6 bg-surface-container-lowest rounded-2xl editorial-shadow p-6">
          <h2 className="text-lg font-semibold text-on-surface mb-4">Comments</h2>
          <InlineComments postId={post.id} />
        </div>
      </div>
    </div>
  )
}
