import Link from 'next/link'

type RecipePost = {
  id: string
  slug?: string | null
  content: string
  images?: string[] | null
  image_url?: string | null
  recipe_data?: {
    prep_time_min?: number
    cook_time_min?: number
    servings?: number
    difficulty?: 'easy' | 'medium' | 'hard'
  } | null
  users: {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  }
}

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  hard: 'bg-red-100 text-red-800',
}

export default function RecipeCard({ recipe }: { recipe: RecipePost }) {
  const title = recipe.content.split('\n')[0].substring(0, 80)
  const images = recipe.images?.length ? recipe.images : recipe.image_url ? [recipe.image_url] : []
  const data = recipe.recipe_data
  const totalTime = (data?.prep_time_min || 0) + (data?.cook_time_min || 0)
  const displayName = recipe.users.first_name || recipe.users.username

  return (
    <Link
      href={`/recipe/${recipe.slug || recipe.id}`}
      className="group block bg-surface-container-lowest rounded-2xl editorial-shadow ghost-border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      {/* Image */}
      <div className="aspect-[4/3] bg-surface-container-high overflow-hidden">
        {images[0] ? (
          <img
            src={images[0]}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">restaurant_menu</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-on-surface text-sm line-clamp-2 mb-2">{title}</h3>

        {/* Metadata */}
        <div className="flex items-center gap-3 text-xs text-on-surface-variant mb-3">
          {totalTime > 0 && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>timer</span>
              {totalTime}min
            </span>
          )}
          {data?.servings && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>group</span>
              {data.servings}
            </span>
          )}
          {data?.difficulty && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${difficultyColors[data.difficulty] || ''}`}>
              {data.difficulty}
            </span>
          )}
        </div>

        {/* Author */}
        <div className="flex items-center gap-2">
          {recipe.users.avatar_url ? (
            <img src={recipe.users.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-primary">
              {displayName[0].toUpperCase()}
            </div>
          )}
          <span className="text-xs text-on-surface-variant">{displayName}</span>
        </div>
      </div>
    </Link>
  )
}
