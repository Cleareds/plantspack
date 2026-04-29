import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

/**
 * GET /api/stats - Get platform impact counters
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const [placesResult, recipesResult, membersResult] = await Promise.all([
      supabase.from('places').select('*', { count: 'exact', head: true }).is('archived_at', null),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('category', 'recipe'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_banned', false),
    ])

    return NextResponse.json({
      places: placesResult.count || 0,
      recipes: recipesResult.count || 0,
      members: membersResult.count || 0,
    })
  } catch (error) {
    console.error('[Stats API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
