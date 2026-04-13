import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// POST /api/cities/follow — toggle follow for a city
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { city, country, currentScore, currentGrade } = await request.json()
    if (!city || !country) return NextResponse.json({ error: 'city and country required' }, { status: 400 })

    // Check if already following
    const { data: existing } = await supabase
      .from('user_followed_cities')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('city', city)
      .eq('country', country)
      .maybeSingle()

    if (existing) {
      // Unfollow
      await supabase.from('user_followed_cities').delete().eq('id', existing.id)
      return NextResponse.json({ following: false })
    }

    // Follow — snapshot current score
    await supabase.from('user_followed_cities').insert({
      user_id: session.user.id,
      city,
      country,
      last_seen_score: currentScore || null,
      last_seen_grade: currentGrade || null,
    })

    return NextResponse.json({ following: true })
  } catch (error) {
    console.error('[Follow City] Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
