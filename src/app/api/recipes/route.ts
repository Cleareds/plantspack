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
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Fetch a larger batch for JS-side filtering
    const fetchLimit = limit + offset + 100

    let query = supabase
      .from('posts')
      .select(`
        *,
        users!inner(id, username, first_name, last_name, avatar_url, subscription_tier, is_banned),
        post_likes(id),
        comments(id)
      `)
      .eq('category', 'recipe')
      .eq('privacy', 'public')
      .is('deleted_at', null)
      .eq('users.is_banned', false)
      .not('recipe_data', 'is', null)
      .order('created_at', { ascending: false })
      .limit(fetchLimit)

    if (search) {
      query = query.ilike('content', `%${search}%`)
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

    const paginated = filtered.slice(offset, offset + limit)
    const hasMore = filtered.length > offset + limit

    return NextResponse.json({ recipes: paginated, hasMore })
  } catch (error) {
    console.error('[Recipes API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 })
  }
}
