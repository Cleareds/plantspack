import Link from 'next/link'

type RecipePost = {
  id: string
  title?: string | null
  slug?: string | null
  content: string
  images?: string[] | null
  image_url?: string | null
  secondary_tags?: string[] | null
  recipe_data?: {
    prep_time_min?: number
    cook_time_min?: number
    servings?: number
    difficulty?: 'easy' | 'medium' | 'hard'
    meal_type?: string
    cuisine?: string
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

const mealTypeLabels: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
  desserts: 'Desserts',
  drinks: 'Drinks',
}

export default function RecipeCard({ recipe, onTagClick }: { recipe: RecipePost; onTagClick?: (tag: string) => void }) {
  const title = recipe.title || recipe.content.split('\n')[0].substring(0, 80)
  const images = recipe.images?.length ? recipe.images : recipe.image_url ? [recipe.image_url] : []
  const data = recipe.recipe_data
  const totalTime = (data?.prep_time_min || 0) + (data?.cook_time_min || 0)
  const displayName = recipe.users.first_name || recipe.users.username
  const tags = recipe.secondary_tags || []

  return (
    <Link
      href={`/recipe/${recipe.slug || recipe.id}`}
      className="group block bg-surface-container-lowest rounded-2xl editorial-shadow ghost-border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      {/* Image */}
      <div className="aspect-[4/3] bg-surface-container-high overflow-hidden relative">
        {images[0] ? (
          <img
            src={images[0]}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">restaurant_menu</span>
          </div>
        )}
        {/* Meal type badge */}
        {data?.meal_type && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/60 text-white backdrop-blur-sm">
            {mealTypeLabels[data.meal_type] || data.meal_type}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-on-surface text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">{title}</h3>

        {/* Metadata */}
        <div className="flex items-center gap-3 text-xs text-on-surface-variant mb-2">
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

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.slice(0, 3).map(tag => (
              onTagClick ? (
                <button key={tag} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTagClick(tag); }}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-surface-container-low text-on-surface-variant hover:bg-primary hover:text-on-primary-btn transition-colors">
                  {tag}
                </button>
              ) : (
                <Link key={tag} href={`/recipes?tag=${encodeURIComponent(tag)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-surface-container-low text-on-surface-variant hover:bg-primary hover:text-on-primary-btn transition-colors">
                  {tag}
                </Link>
              )
            ))}
          </div>
        )}

        {/* Author */}
        <div className="flex items-center gap-2">
          {recipe.users.avatar_url ? (
            <img src={recipe.users.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-primary">
              {displayName[0]?.toUpperCase()}
            </div>
          )}
          <span className="text-xs text-on-surface-variant">{displayName}</span>
        </div>
      </div>
    </Link>
  )
}
