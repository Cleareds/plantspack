import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const search = searchParams.get('search')
    const difficulty = searchParams.get('difficulty')
    const maxPrepTime = searchParams.get('maxPrepTime')
    const servings = searchParams.get('servings')
    const mealType = searchParams.get('mealType')
    const tag = searchParams.get('tag')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const hasJsFilters = !!(difficulty || maxPrepTime || servings || mealType)

    // When JS-side filters are active, fetch a larger batch to compensate
    // for rows that will be filtered out client-side
    const fetchLimit = hasJsFilters ? limit + offset + 100 : limit + 1
    const fetchOffset = hasJsFilters ? 0 : offset

    let query = supabase
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
      .range(fetchOffset, fetchOffset + fetchLimit - 1)

    if (search) {
      query = query.ilike('content', `%${search}%`)
    }

    // Filter by tag using Postgres array contains
    if (tag) {
      query = query.contains('secondary_tags', [tag])
    }

    const { data: posts, error } = await query

    if (error) {
      console.error('[Recipes API] Error:', error)
      throw error
    }

    let filtered = posts || []

    // Filter by difficulty in JS (JSON field)
    if (difficulty) {
      filtered = filtered.filter((p: any) => p.recipe_data?.difficulty === difficulty)
    }

    // Filter by meal type in JS (JSON field)
    if (mealType) {
      filtered = filtered.filter((p: any) => p.recipe_data?.meal_type === mealType)
    }

    // Filter by max prep time in JS
    if (maxPrepTime) {
      const maxMin = parseInt(maxPrepTime)
      filtered = filtered.filter((p: any) => {
        const total = (p.recipe_data?.prep_time_min || 0) + (p.recipe_data?.cook_time_min || 0)
        return total <= maxMin
      })
    }

    // Filter by servings in JS
    if (servings) {
      const [min, max] = servings.split('-').map(Number)
      filtered = filtered.filter((p: any) => {
        const s = p.recipe_data?.servings
        if (!s) return false
        if (max) return s >= min && s <= max
        return s >= min // "5+" case
      })
    }

    if (hasJsFilters) {
      const paginated = filtered.slice(offset, offset + limit)
      const hasMore = filtered.length > offset + limit
      return NextResponse.json({ recipes: paginated, hasMore })
    }

    // No JS filters — we fetched limit+1 rows starting at offset
    const hasMore = filtered.length > limit
    const paginated = hasMore ? filtered.slice(0, limit) : filtered

    return NextResponse.json({ recipes: paginated, hasMore })
  } catch (error) {
    console.error('[Recipes API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 })
  }
}
